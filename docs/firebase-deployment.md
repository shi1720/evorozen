# Firebase release and operations

The canonical application address is **https://remainder-desk.web.app**. The narrated public demonstration is **https://remainder-desk.web.app/demo/**.

Firebase Hosting forwards the application and API to the dedicated `remainder` Cloud Run service in `europe-west1`. The app serves its own security headers, static files, and deep links. Neon PostgreSQL remains the durable database. Runtime secrets are stored in Google Secret Manager, accessible only through the dedicated `remainder-runtime` service account and existing authorized operators.

## Deployment layout

The shared Google Cloud project is `gen-lang-client-0444960702`. A new billing link for `remainder-apex-2026` was rejected by Google's billing-project quota. The release therefore uses the existing billed hosting project. Only the named Remainder service, site, image repository, identities, secrets, and backup resources are managed by these scripts. Unrelated applications are not redeployed.

The initially reserved `remainder-credit.web.app` site in the unbilled project is not the deployed application. Use the canonical address above.

| Component | Configuration |
| --- | --- |
| Hosting site | `remainder-desk` |
| Cloud Run service | `remainder`, `europe-west1` |
| Container | `europe-west1-docker.pkg.dev/gen-lang-client-0444960702/remainder/app` |
| Analysis | OpenAI `gpt-5.4-mini`, strict Responses schema, `store:false` |
| Session | HTTP-only, Secure, SameSite=Lax `__session` cookie |
| Origin | `https://remainder-desk.web.app` |
| Limits | 1 CPU, 512 MiB, concurrency 10, minimum 0, maximum 2 instances |
| AI allowance | 100 attempted calls daily globally, 10 per workspace, UTC reset |
| Database | Existing Neon PostgreSQL with verified TLS, 5 connections per instance |

The cookie name is required because Firebase Hosting strips ordinary cookies when forwarding to Cloud Run. API responses use `Cache-Control: no-store`; authenticated records must never enter a shared public cache. [Firebase cookie forwarding](https://firebase.google.com/docs/hosting/manage-cache)

## Repeat a release

Install Node.js 22.13 or newer, authenticate the official Google Cloud CLI and Firebase CLI, and check that `main` contains the intended release. The runtime identity and the four scoped Secret Manager secrets must already exist. Never put secret values in the script, build arguments, Firebase configuration, or browser variables.

```sh
git pull --ff-only origin main
npm ci
npm run test:e2e
bash scripts/deploy-firebase.sh
```

The script runs formatting, TypeScript, automated tests and the build before submitting source to Cloud Build. `.gcloudignore` excludes local settings, credentials, private artifacts, databases, and deliverables. The Docker runtime uses the non-root `node` user. The script copies the approved narrated MP4 and caption track into the static `/demo/` presentation before publishing Hosting. These generated copies are ignored by Git; the versioned originals remain in `deliverables`. The script updates only `remainder` and `remainder-desk`, then checks the database health through Firebase.

After deployment, run `node scripts/verify-hosted.mjs --live` to exercise the normal-account workflow. This consumes real AI requests and creates then deletes fictional test records. Review the script's documented environment options before changing its target.

## Rollback and operating limits

Use the Cloud Run console to route traffic back to the last verified Remainder revision. The Firebase rewrite keeps the public address stable. Keep the database schema compatible with both revisions; never restore the production database merely to roll back application code.

This configuration can scale to zero, so an initial request can take longer than a warm one. It uses a billed project and may incur usage charges despite free allowances. Instance and AI-request limits constrain usage but are not a monetary spending cap. Monitor Google Cloud, OpenAI and Neon usage before raising limits.

The [backup guide](backups.md) records the nightly private database backup configuration and restore checks. Backup expiry is 14 days plus lifecycle processing time. Successful account deletion removes live workspace records, but an earlier restricted backup can retain a copy until expiry.

The original Render deployment is historical and uses a different configuration. It is not the canonical submission URL. Older validation reports remain dated evidence of that release, not descriptions of current infrastructure.
