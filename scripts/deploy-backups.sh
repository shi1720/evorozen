#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

gcloud_bin="${GCLOUD_BIN:-gcloud}"
project="${REMAINDER_GCP_PROJECT:-gen-lang-client-0444960702}"
region="europe-west1"
project_number="$("$gcloud_bin" projects describe "$project" --format='value(projectNumber)')"
bucket="remainder-backups-$project_number"
job="remainder-database-backup"
runtime="remainder-backup@$project.iam.gserviceaccount.com"
scheduler="remainder-backup-scheduler@$project.iam.gserviceaccount.com"
operator="$("$gcloud_bin" config get-value account 2>/dev/null)"
if [[ "$operator" != *@* ]]; then
  echo 'Authenticate an operator account before deploying backups.' >&2
  exit 1
fi
operator_member="user:$operator"
if [[ "$operator" == *.gserviceaccount.com ]]; then operator_member="serviceAccount:$operator"; fi
image="$region-docker.pkg.dev/$project/remainder/backup:$(date -u +%Y%m%d%H%M%S)"

python3 -m unittest discover -s ops/backup -p 'test_*.py'
"$gcloud_bin" secrets describe remainder-database-url --project="$project" --format='value(name)'
for account in remainder-backup remainder-backup-scheduler; do
  if ! "$gcloud_bin" iam service-accounts describe "$account@$project.iam.gserviceaccount.com" --project="$project" >/dev/null 2>&1; then
    "$gcloud_bin" iam service-accounts create "$account" --project="$project" --display-name="$account"
  fi
done
if ! "$gcloud_bin" storage buckets describe "gs://$bucket" >/dev/null 2>&1; then
  "$gcloud_bin" storage buckets create "gs://$bucket" --project="$project" --location="$region" \
    --uniform-bucket-level-access --public-access-prevention --soft-delete-duration=0 \
    --lifecycle-file=ops/backup/lifecycle.json
fi
actual_project="$("$gcloud_bin" storage buckets describe "gs://$bucket" --raw --format='value(projectNumber)')"
if [[ "$actual_project" != "$project_number" ]]; then
  echo 'Refusing to configure a bucket outside the selected Remainder project.' >&2
  exit 1
fi
"$gcloud_bin" storage buckets update "gs://$bucket" --uniform-bucket-level-access --public-access-prevention \
  --soft-delete-duration=0 --lifecycle-file=ops/backup/lifecycle.json
"$gcloud_bin" storage buckets add-iam-policy-binding "gs://$bucket" --member="serviceAccount:$runtime" --role=roles/storage.objectCreator >/dev/null
"$gcloud_bin" storage buckets add-iam-policy-binding "gs://$bucket" --member="$operator_member" --role=roles/storage.admin >/dev/null
# Remove auto-created legacy basic-role grants on this dedicated bucket. Project-level
# administrators retain their normal inherited access; no global IAM policy is edited.
python3 - "$gcloud_bin" "$bucket" <<'PY_POLICY'
import json, subprocess, sys, tempfile
cloud, bucket = sys.argv[1:]
policy = json.loads(subprocess.check_output([cloud, 'storage', 'buckets', 'get-iam-policy', f'gs://{bucket}', '--format=json']))
policy['bindings'] = [binding for binding in policy.get('bindings', []) if not binding['role'].startswith('roles/storage.legacy')]
with tempfile.NamedTemporaryFile(mode='w', suffix='.json') as output:
    json.dump(policy, output)
    output.flush()
    subprocess.run([cloud, 'storage', 'buckets', 'set-iam-policy', f'gs://{bucket}', output.name], check=True, stdout=subprocess.DEVNULL)
PY_POLICY
"$gcloud_bin" secrets add-iam-policy-binding remainder-database-url --project="$project" \
  --member="serviceAccount:$runtime" --role=roles/secretmanager.secretAccessor >/dev/null

# Submit only this small backup context, never the application, credentials or local dumps.
"$gcloud_bin" builds submit ops/backup --project="$project" --tag="$image" --timeout=900s
"$gcloud_bin" run jobs deploy "$job" --project="$project" --region="$region" --image="$image" \
  --service-account="$runtime" --cpu=1 --memory=512Mi --tasks=1 --parallelism=1 \
  --max-retries=1 --task-timeout=300s --labels=app=remainder,purpose=backup \
  --set-env-vars="BACKUP_BUCKET=$bucket" --set-secrets=DATABASE_URL=remainder-database-url:latest
"$gcloud_bin" run jobs add-iam-policy-binding "$job" --project="$project" --region="$region" \
  --member="serviceAccount:$scheduler" --role=roles/run.invoker >/dev/null

scheduler_action=create
if "$gcloud_bin" scheduler jobs describe remainder-nightly-backup --project="$project" --location="$region" >/dev/null 2>&1; then
  scheduler_action=update
fi
"$gcloud_bin" scheduler jobs "$scheduler_action" http remainder-nightly-backup --project="$project" --location="$region" \
  --schedule='0 3 * * *' --time-zone=UTC --attempt-deadline=30s --max-retry-attempts=1 \
  --max-retry-duration=300s --min-backoff=30s --max-backoff=120s \
  --uri="https://run.googleapis.com/v2/projects/$project/locations/$region/jobs/$job:run" \
  --http-method=POST --headers=Content-Type=application/json --message-body='{}' \
  --oauth-service-account-email="$scheduler" --oauth-token-scope=https://www.googleapis.com/auth/cloud-platform

# One bounded verification execution. The command reports an execution ID; inspect its result.
"$gcloud_bin" run jobs execute "$job" --project="$project" --region="$region" --wait
