#!/usr/bin/env python3
"""Bounded PostgreSQL backup. Credentials stay in process memory and are never logged."""
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import resource
import subprocess
import tempfile
from datetime import datetime, timezone
from urllib.parse import unquote, urlencode, urlsplit
from urllib.request import Request, urlopen
from uuid import uuid4

MAX_BYTES = 128 * 1024 * 1024


def database_environment(database_url: str) -> dict[str, str]:
    parsed = urlsplit(database_url)
    if parsed.scheme not in ("postgres", "postgresql") or not parsed.hostname or not parsed.username or not parsed.password or not parsed.path.strip("/"):
        raise ValueError("Invalid database configuration")
    # Neon pooled endpoints are for application traffic, not consistent dump sessions.
    host = re.sub(r"-pooler(?=\.)", "", parsed.hostname)
    if not host.endswith(".neon.tech"):
        raise ValueError("Expected the dedicated Neon database")
    return {
        **{key: value for key, value in os.environ.items() if not key.startswith("PG") and key != "DATABASE_URL"},
        "PGHOST": host,
        "PGPORT": str(parsed.port or 5432),
        "PGUSER": unquote(parsed.username),
        "PGPASSWORD": unquote(parsed.password),
        "PGDATABASE": unquote(parsed.path.lstrip("/")),
        "PGSSLMODE": "verify-full",
        "PGSSLROOTCERT": "system",
        "PGCONNECT_TIMEOUT": "15",
        "PGAPPNAME": "remainder-nightly-backup",
    }


def safe_run(args: list[str], env: dict[str, str], timeout: int) -> subprocess.CompletedProcess:
    # Never send raw PostgreSQL error messages, URIs, or table data into Cloud Logging.
    result = subprocess.run(args, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout, check=False)
    if result.returncode:
        raise RuntimeError(f"{Path(args[0]).name} failed (exit {result.returncode})")
    return result


def metadata_token() -> str:
    request = Request("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", headers={"Metadata-Flavor": "Google"})
    with urlopen(request, timeout=10) as response:
        return json.loads(response.read(16384))["access_token"]


def upload_dump(path: Path, bucket: str, object_name: str) -> dict:
    digest, md5 = hashlib.sha256(), hashlib.md5(usedforsecurity=False)
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
            md5.update(chunk)
    query = urlencode({"uploadType": "media", "name": object_name, "ifGenerationMatch": "0"})
    with path.open("rb") as source:
        request = Request(
            f"https://storage.googleapis.com/upload/storage/v1/b/{bucket}/o?{query}",
            data=source,
            method="POST",
            headers={"Authorization": f"Bearer {metadata_token()}", "Content-Type": "application/octet-stream", "Content-Length": str(path.stat().st_size)},
        )
        with urlopen(request, timeout=60) as response:
            metadata = json.loads(response.read(32768))
    expected_md5 = base64.b64encode(md5.digest()).decode("ascii")
    if int(metadata.get("size", -1)) != path.stat().st_size or metadata.get("md5Hash") != expected_md5:
        raise RuntimeError("Cloud Storage integrity verification failed")
    return {"bucket": bucket, "object": object_name, "generation": metadata["generation"], "bytes": path.stat().st_size, "sha256": digest.hexdigest(), "md5Verified": True}


def main() -> None:
    stage = "configuration"
    try:
        bucket = os.environ.get("BACKUP_BUCKET", "")
        if not re.fullmatch(r"remainder-backups-[0-9]{6,20}", bucket):
            raise ValueError("Invalid Remainder backup bucket")
        env = database_environment(os.environ["DATABASE_URL"])
        os.environ.pop("DATABASE_URL", None)
        # The job has 512 MiB RAM, including its temporary filesystem.
        resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_BYTES, MAX_BYTES))
        with tempfile.TemporaryDirectory(prefix="remainder-backup-") as temporary:
            dump = Path(temporary) / "remainder.dump"
            stage = "dump"
            safe_run(["pg_dump", "--format=custom", "--no-owner", "--no-privileges", "--lock-wait-timeout=15s", "--file", str(dump)], env, 210)
            if dump.stat().st_size < 100 or dump.stat().st_size > MAX_BYTES:
                raise RuntimeError("Backup size outside configured bounds")
            stage = "archive_validation"
            table_of_contents = safe_run(["pg_restore", "--list", str(dump)], env, 15)
            entries = sum(1 for line in table_of_contents.stdout.splitlines() if line and not line.startswith(b";"))
            if not entries:
                raise RuntimeError("Backup contains no archive entries")
            # Read and decompress every archive entry, rather than checking only its index.
            safe_run(["pg_restore", "--file=/dev/null", str(dump)], env, 30)
            stage = "upload"
            timestamp = datetime.now(timezone.utc).strftime("%Y/%m/%d/%Y%m%dT%H%M%SZ")
            uploaded = upload_dump(dump, bucket, f"postgres/{timestamp}-{uuid4().hex[:12]}.dump")
            print(json.dumps({"event": "remainder_backup_complete", "archiveEntries": entries, **uploaded}), flush=True)
    except Exception as error:
        # Exception class and stage identify the failing boundary without exposing secrets.
        print(json.dumps({"event": "remainder_backup_failed", "stage": stage, "errorType": type(error).__name__}), flush=True)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
