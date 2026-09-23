# Historical deployment: Render and Neon

The current public release is [Remainder on Firebase](https://remainder-desk.web.app). Use the [Firebase deployment guide](firebase-deployment.md) for current configuration. This document preserves the earlier Gemini/Render preview setup; its provider and free-host notes do not describe the current Firebase release.

The repository includes a Render Blueprint for an application preview. The persistent PostgreSQL connection is supplied separately through `DATABASE_URL`; no database password or AI key is committed.

## Build and runtime

- Use a Node runtime compatible with Node 22.13 or newer. The Blueprint pins a supported 22.x release.
- Build command: `npm ci --include=dev && npm run build`. The explicit dev dependencies are necessary because TypeScript and Vite build the app even when `NODE_ENV=production` is set.
- Start command: `npm start` with `NODE_ENV=production`.
- Health path: `/api/health`, which checks a real database query.
- The server binds `0.0.0.0` and the host-supplied `PORT`.
- Keep the repository-root layout: `dist/client`, `dist/server.js`, and `assets/fonts`. The Dockerfile copies the PDF fonts and runs as the non-root `node` user.

## Secrets and configuration

Set these in the host's environment/secret settings:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Persistent PostgreSQL connection string, with the database provider's required TLS options. |
| `APP_ORIGIN` | Exact HTTPS origin shown by the deployed service. Update after its hostname is assigned. |
| `TRUST_PROXY=1` | Correct only for the intended single trusted Render reverse-proxy hop. |
| `AI_PROVIDER=gemini` | Selects Gemini directly even if an Evorozen key is also present. |
| `GEMINI_API_KEY` | Server-side live model key for the configured Gemini model. |
| `GEMINI_MODEL=gemini-3.5-flash-lite` | Model verified with synthetic inputs during development. Provider access remains account-dependent. |
| `EVOROZEN_API_KEY` | Optional Neural Pulse integration key. No browser exposure. |
| `GEMINI_FALLBACK_ENABLED=true` | Explicitly allows Gemini after a failed earlier configured provider. |
| `AI_MAX_DAILY_CALLS=30` | Shared outbound analysis request budget, resetting at midnight UTC. |
| `AI_MAX_DAILY_CALLS_PER_USER=10` | Per-workspace daily request budget. |

Optional Evorozen Virtual DB memory is disabled by default. To enable it, set `EVOROZEN_MEMORY_ENABLED=true` plus a stable private `EVOROZEN_MEMORY_SIGNING_KEY` of at least 32 characters and `EVOROZEN_API_KEY`. Keep the conservative metadata caps (six reserved calls daily, twelve lifetime) while using a finite starter key. Save the signing key securely: remote cleanup depends on the same scope derivation even after the feature is disabled. Account deletion cleanup is exempt from these application caps but still depends on upstream availability.

Use the actual database connection string from the database console. Never disable TLS verification to work around a connection problem. PostgreSQL schema initialization happens on application startup under a transaction and advisory lock.

## Free hosting boundaries

Render free web services are appropriate for a public preview, and Render explicitly advises against using the free tier for production applications. Services idle after 15 minutes without traffic and can take around a minute to wake. Their writable filesystem is ephemeral and cannot have a persistent disk on the free tier. Remainder therefore needs the external PostgreSQL database; do not opt into PGlite on Render free. [Render free-service documentation](https://render.com/docs/free)

The account's Neon/database allowance, connection limits, backup availability, and retention must be checked in its console. Persistent external storage prevents web-service restarts from erasing work, but it does not constitute a backup. Before real customer onboarding, verify export and restoration and choose a hosting plan that meets the required availability.

## Release checks

1. Run `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e`.
2. Deploy with persistent `DATABASE_URL`, exact `APP_ORIGIN`, and secrets in the host.
3. Open the HTTPS URL, confirm `/api/health`, and check the Settings provider configuration label.
4. Create a fresh account, save its recovery code, and add synthetic evidence.
5. Run real analysis, approve selected findings, add a matching partial credit, and confirm the exact remaining balance.
6. Download the PDF and email draft. The follow-up must deduct already verified credits.
7. Verify data remains after a service redeploy and that password-confirmed account deletion removes the test workspace.
8. Record the working URL, date, provider, and redacted trace evidence. Do not publish credentials or raw private records.

A successful local run, a Blueprint file, or a configured provider label does not by itself establish a successful public deployment. Record the actual deployed checks before claiming the site is live.

## Customer-data launch gate

The deployed preview uses Gemini's unpaid service, which may use submissions and responses to improve Google products. Keep preview inputs fictional or non-confidential and redact personal and payment information. Before accepting confidential supplier records, configure a provider account with appropriate data-processing terms, review the applicable retention policy, and verify backup restoration. Google distinguishes paid and unpaid service data handling in its [Gemini API terms](https://ai.google.dev/gemini-api/terms). No billing account was activated for this preview.
