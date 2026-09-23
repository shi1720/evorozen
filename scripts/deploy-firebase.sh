#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Commit or stash local changes before deploying so the image tag identifies its source.' >&2
  exit 1
fi

# Only the named Remainder service/site is deployed in the shared billing project.
# Provision secrets and the scoped runtime identity before the first release.
project="${REMAINDER_GCP_PROJECT:-gen-lang-client-0444960702}"
region="europe-west1"
revision="$(git rev-parse --short=12 HEAD)"
image="$region-docker.pkg.dev/$project/remainder/app:$revision"
gcloud_bin="${GCLOUD_BIN:-gcloud}"

npm run format:check
npm run typecheck
npm test
npm run build
"$gcloud_bin" builds submit --project="$project" --tag="$image" --timeout=900s .
"$gcloud_bin" run deploy remainder --project="$project" --region="$region" \
  --image="$image" --port=3000 --allow-unauthenticated \
  --service-account="remainder-runtime@$project.iam.gserviceaccount.com" \
  --cpu=1 --memory=512Mi --concurrency=10 --min=0 --max=2 --timeout=60 \
  --set-env-vars="NODE_ENV=production,APP_ORIGIN=https://remainder-desk.web.app,TRUST_PROXY=1,AI_PROVIDER=openai,OPENAI_MODEL=gpt-5.4-mini,AI_TIMEOUT_MS=35000,AI_MAX_DAILY_CALLS=100,AI_MAX_DAILY_CALLS_PER_USER=10,OPENAI_FALLBACK_ENABLED=false,GEMINI_FALLBACK_ENABLED=false,EVOROZEN_MEMORY_ENABLED=true,DB_POOL_SIZE=5" \
  --set-secrets="DATABASE_URL=remainder-database-url:latest,OPENAI_API_KEY=remainder-openai-api-key:latest,EVOROZEN_API_KEY=remainder-evorozen-api-key:latest,EVOROZEN_MEMORY_SIGNING_KEY=remainder-memory-signing-key:latest"
mkdir -p firebase-public/demo
cp deliverables/remainder-demo-final.mp4 firebase-public/demo/remainder-demo.mp4
cp deliverables/remainder-demo.vtt firebase-public/demo/remainder-demo.vtt
npx --yes firebase-tools@15.30.2 deploy --only hosting --project="$project" --non-interactive
curl --fail --silent --show-error https://remainder-desk.web.app/api/health
