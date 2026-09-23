# Operating Remainder

The [deployment guide](deployment.md) describes environment settings, free-tier limitations, and the customer-data launch gate. [Deployment validation](validation-deployment.md) records the successful hosted workflow and actual restore rehearsal.

## Release

Run formatting, typechecking, tests, production build, and browser tests. Keep the approved commit identifier with the deployment record. Deploy the application with persistent PostgreSQL and exact `APP_ORIGIN`, then check `/api/health`, sign-in, and a non-confidential synthetic case. Keep API credentials server-side and out of build-time browser variables. Review provider allowances before raising request budgets.

## Back up and rehearse restoration

Use PostgreSQL client tools at least as new as the server's major version. For PostgreSQL 17, `pg_dump` 17 or newer is appropriate. Use the database provider's unpooled connection, verified TLS, and a protected output directory. Populate `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE` through your secret manager; do not paste credentials into shell history.

```sh
umask 077
export PGSSLMODE=verify-full
export PGSSLROOTCERT=system
pg_dump --format=custom --no-owner --no-acl --file remainder-backup.dump
```

`PGSSLROOTCERT=system` requires a recent libpq client with a usable system trust store. If your client does not support it, use an explicit trusted CA file provided by your platform. Do not turn off certificate verification.

Restore only into a **separate, disposable target database**, with its own connection environment:

```sh
pg_restore --no-owner --no-privileges --exit-on-error --dbname TARGET_DATABASE remainder-backup.dump
```

Verify record counts, sessions as appropriate, approved claims, credits, and exact remaining amounts before treating a backup as recoverable. Do not start a restored test copy with production outbound-provider credentials: it could duplicate remote operations. Clean up disposable restores and sensitive archives under a documented retention policy. Never overwrite the live database merely to test a backup.

The release rehearsal used an isolated schema-only Neon branch and a complete dump/restore, then compared the synthetic case's 6355/1875/4480 integer pence. Its temporary branch and archive were deleted. An ongoing backup schedule remains an operator responsibility; deployment persistence alone is not a backup.

## Incident behavior

- An inference outage leaves saved documents intact and returns a visible error. An alternate provider runs only if explicitly configured; replay never substitutes for real analysis.
- Unsupported evidence stays unclaimable. Inspect quotations and correct a draft's reviewed source text before reanalysis.
- A remote alias-memory outage must not discard an approved claim. Its warning is recorded, and PostgreSQL remains authoritative.
- Account deletion requires the password and removes workspace records. When remote memory needs cleanup, an upstream failure stops local deletion so the owner can retry.
- Keep the remote-memory signing key stable until all records written under it are removed. Archive necessary operational secrets securely; never put them in the public repository.
- Export a workspace before deletion if its owner wants to retain records. Keep original invoices and receiving notes in the business's existing record system; Remainder stores reviewed text, not original binaries.

## Useful checks

- `/api/health`: database reachability; no customer data.
- `/api/activity`: signed-in workspace audit trail, including actual provider provenance and memory outcomes.
- `/api/export`: owner-controlled workspace export.
- `/api/metrics`: signed-in workspace metrics with a demo flag. These are not platform-wide verified customer traction.

Track provider failures, analysis latency, blocked findings, review time, remaining-credit age, and support effort in a consented pilot. Report real customers separately from demo workspaces and release fixtures.
