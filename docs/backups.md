# Scheduled database backups

Remainder has a dedicated nightly database backup job. This protects the hosted Neon database independently of the application process. It does not back up provider credentials, original uploaded files, or external Evorozen memory; those files are not stored as application documents.

## Resources and access

| Resource | Configuration |
| --- | --- |
| GCP project | `gen-lang-client-0444960702` |
| Private bucket | `gs://remainder-backups-359201230061` in `europe-west1` |
| Cloud Run Job | `remainder-database-backup` in `europe-west1` |
| Cloud Scheduler | `remainder-nightly-backup`, daily at 03:00 UTC |
| Runtime identity | `remainder-backup@gen-lang-client-0444960702.iam.gserviceaccount.com` |
| Scheduler identity | `remainder-backup-scheduler@gen-lang-client-0444960702.iam.gserviceaccount.com` |
| Database secret | Only `remainder-database-url` |
| Container limits | One task, one CPU, 512 MiB, 300 seconds, one retry |
| Backup limit | 128 MiB per compressed archive; larger databases require an explicit capacity review |
| Retention | Delete objects under `postgres/` when they reach 14 days; lifecycle deletion is asynchronous |

The bucket enforces public access prevention and uniform bucket-level access. Google Cloud encrypts objects at rest by default. Soft delete is disabled for this dedicated bucket so deleted objects do not receive an additional seven-day retention period. No public grants or downloadable service-account keys are used.

The backup identity can access only the database secret and create new objects in this bucket. It cannot list, read, overwrite, or delete previous backups. The scheduler identity can invoke only this Cloud Run Job. The authenticated deployment operator receives Storage Admin on this bucket only so the operator can inspect and restore backups. No project-wide storage role is installed by the deployment script.

## What each execution checks

1. Derive the direct Neon hostname by removing `-pooler` from the application endpoint. Read the password from the injected secret, never a command-line argument or source file.
2. Force PostgreSQL `sslmode=verify-full` and `sslrootcert=system`, regardless of weaker parameters in the supplied URL.
3. Use PostgreSQL 17 `pg_dump` to create a transactionally consistent custom-format archive, without restoring ownership or privileges. A 15-second lock wait and 210-second dump timeout bound execution.
4. Verify the archive index and read/decompress all entries with `pg_restore --file=/dev/null`.
5. Upload a unique object using short-lived Google metadata credentials. `ifGenerationMatch=0` prevents accidental overwrites. Verify the returned size and MD5 against the local file.
6. Log only object metadata, byte count, archive-entry count, and SHA-256. Remove the temporary dump when the process ends. Failures log only their stage and exception class, never database credentials or raw data.

A successful job reports `remainder_backup_complete`. A failed job reports `remainder_backup_failed` and exits with a nonzero status. Check the Cloud Run execution result, not just the scheduler result: the scheduler confirms that a job was started, not that its database dump completed.

## Reproduce deployment

Authenticate `gcloud` with an authorized operator account. The named database secret and Remainder Artifact Registry repository must already exist. Required APIs are Cloud Run, Cloud Scheduler, Cloud Build, Artifact Registry, Secret Manager, and Cloud Storage. The production project already has these enabled.

```bash
GCLOUD_BIN=/opt/homebrew/bin/gcloud scripts/deploy-backups.sh
```

On other systems, use the default `gcloud` on `PATH`. The script is scoped to the named Remainder resources, verifies bucket ownership, creates or updates the daily schedule, and performs one verification execution. It submits only `ops/backup` to Cloud Build. Application files, `.env` files, and private artifacts are excluded from that build context.

Run the backup configuration tests without a database or cloud account:

```bash
python3 -m unittest discover -s ops/backup -p 'test_*.py'
```

## Monitor and restore

Inspect executions and the most recent successful object regularly, especially after database or permission changes:

```bash
gcloud run jobs executions list \
  --job=remainder-database-backup --region=europe-west1 \
  --project=gen-lang-client-0444960702

gcloud storage ls --long \
  'gs://remainder-backups-359201230061/postgres/**'
```

For an additional manual backup, run the same job. This creates one new immutable-by-runtime object:

```bash
gcloud run jobs execute remainder-database-backup \
  --region=europe-west1 --project=gen-lang-client-0444960702 --wait
```

Restore into an isolated, empty database first. An authorized operator can download one chosen object into an ignored directory with restrictive filesystem permissions. Verify the SHA-256 against its successful job log, then run `pg_restore --list`. Set the target connection in `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE`; set `PGSSLMODE=verify-full` and `PGSSLROOTCERT=system`. Do not place passwords in shell arguments or commit a dump.

```bash
# Target variables must point to the isolated restore database.
pg_restore --exit-on-error --no-owner --no-privileges \
  --clean --if-exists --dbname="$PGDATABASE" .artifacts/remainder-restore.dump
```

Compare schema versions and application record counts, run a read-only health check, and verify representative case balances. Remove the isolated restore database and local dump after the rehearsal. Restoring over production is a separate, deliberate incident procedure and is not performed by the scheduled job.

A daily schedule has an intended recovery point of the last successful daily backup, potentially up to 24 hours of new data. This is not a zero-data-loss guarantee. Storage, Cloud Run Jobs, Cloud Build, and Scheduler can incur usage charges. The small resource limits and retention bound the workload, not the cloud invoice.

Deleted account data is removed from the active database by the application. Existing encrypted backups can retain it until the 14-day lifecycle and subsequent asynchronous deletion complete. Restoring an old backup requires reapplying account deletions made after that snapshot before returning the application to service.

## Verification recorded on September 23, 2026

Both the direct execution `remainder-database-backup-8cvhk` and the scheduler-triggered execution `remainder-database-backup-fnd7l` completed successfully. The tested archive contained 18,808 bytes and 41 archive entries. An unauthenticated download returned HTTP 403.

The first archive was downloaded by the authorized operator, its SHA-256 matched the completed job log, and it was restored into a fresh Neon schema-only branch. Read-only checks confirmed migration versions 1, 2, and 3, eight public application tables, and the expected stored records: one user, session, supplier, and case, plus two activities. The isolated branch was deleted after the rehearsal and the local dump was removed. Production was never a restore target.

[Machine-readable verification](validation/scheduled-backup-restore.json) records the execution IDs, checksum, record counts, and cleanup. This is evidence of an actual backup and restore rehearsal, not a guarantee that every future scheduled run will succeed.

Implementation references: [Cloud Run Jobs with Cloud Scheduler](https://docs.cloud.google.com/run/docs/execute/jobs-on-schedule), [PostgreSQL TLS verification](https://www.postgresql.org/docs/17/libpq-ssl.html), and [Cloud Storage IAM roles](https://docs.cloud.google.com/storage/docs/access-control/iam-roles).
