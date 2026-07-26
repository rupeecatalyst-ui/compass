# CO-CERT-005 — Production Certification Toolkit

Permanent, modular certification framework for Catalyst One releases.

## Principles

- One responsibility per script
- Independently executable and auditable
- **PASS / FAIL** only
- Never print JWT secrets, database URLs, API keys, or env values

## Commands

| Gate | Command |
|------|---------|
| Infrastructure | `npm run cert:env` |
| Routes | `npm run cert:routes` |
| Data integrity | `npm run cert:integrity` |
| Migrations | `npm run cert:migrations` |
| Full production run | `npm run cert:production` |

Optional: `VERIFY_BASE_URL=https://…` for route smoke target (defaults to production alias).

## Scripts

- `scripts/co-cert-env-check.mjs`
- `scripts/co-cert-route-smoke.mjs`
- `scripts/co-cert-data-integrity.mjs`
- `scripts/co-cert-migrations.mjs`
- `scripts/co-cert-production.mjs`
- Shared helpers: `scripts/_lib/cert-toolkit.mjs`

## Recommendation scale (master runner)

- **GO** — all hard gates PASS
- **GO WITH OBSERVATIONS** — single non-infra failure
- **NO-GO** — infrastructure fail or multiple hard failures
