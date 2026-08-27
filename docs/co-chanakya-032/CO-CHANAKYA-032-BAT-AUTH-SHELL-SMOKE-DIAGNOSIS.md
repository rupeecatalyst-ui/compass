# CO-CHANAKYA-032 — BAT Auth / Shell Smoke Failure Diagnosis

**Date:** 2026-08-27  
**Mode:** Read-only diagnosis · no code changes · no deploy · no commit  
**Related:** CO-CHANAKYA-020 / 029 fail via CO-PRODUCTION-REGRESSION-014 shell smoke

## A. Exact BAT failure

| Field | Value |
|-------|--------|
| Script | `scripts/co-production-regression-014-shell-smoke.mjs` |
| Endpoint | `POST {CATALYST_BAT_URL}/api/auth/login` |
| Configured host | `catalyst-one-two.vercel.app` |
| HTTP status | **500** |
| `success` | `false` |
| `accessToken` | absent |
| Error code | `INTERNAL_ERROR` |
| Error message (safe) | Prisma `user.findUnique()` — **Can't reach database server** at `aws-0-ap-southeast-1.pooler.supabase.com:6543` |
| Shell smoke `finalStatus` | `BLOCKED` |
| Shell smoke failure code | `auth_login_failed` |
| Shell smoke exit | `1` |

Credential presence (values not disclosed):

- `CATALYST_BAT_URL` — SET (Vercel host above)
- `CATALYST_BAT_EMAIL` — SET (length 23)
- `CATALYST_BAT_PASSWORD` — SET (length 12)

## B. Root cause classification

**Production / certification environment database connectivity failure on the configured BAT URL** — not missing credentials, not invalid password, not Chanakya application regression.

Evidence:

1. Empty login body against Vercel → `400 VALIDATION_ERROR` (auth route reachable; validation works).
2. Real BAT credentials against Vercel → `500 INTERNAL_ERROR` + Prisma cannot reach Supabase pooler.
3. **Same credentials** against Hostinger `https://catalyst-one.rupeecatalyst.com` → `200`, `success=true`, access token issued.
4. Hostinger + Vercel `/login` pages both HTTP 200 with Next static assets.

## C. Application code implicated?

**No.** Auth endpoint responds; failure is DB reachability from the Vercel project's runtime to Supabase. Chanakya / Accounting / Credit / Marketing / OAuth code was not modified and is not indicated.

## D. CO-CHANAKYA-031 remains clean?

**Yes** — TypeScript + production build + local Chanakya verifies (002–028 except live 020/029 nesting) stand. This failure is environmental for live BAT against `CATALYST_BAT_URL`.

## E. Production build remains PASS?

**Yes** (from CO-CHANAKYA-031: `npm run build` → `BUILD_EXIT=0`). Not re-run in 032 (out of scope).

## F. Exact remediation required

Ops / configuration only (choose one, Product Owner decision):

1. **Restore DB connectivity** for the Vercel project behind `CATALYST_BAT_URL` (`catalyst-one-two.vercel.app`) so Prisma can reach the configured Supabase pooler (`…pooler.supabase.com:6543`), **or**
2. **Retarget local BAT URL** (`CATALYST_BAT_URL`) to an environment where DB auth already works (Hostinger login succeeded with the same BAT credentials in this diagnostic).  
   - Do **not** invent credential values.  
   - Do **not** change Hostinger production env from this sprint.  
   - Any local `.env` change is an ops decision outside this diagnosis.

Required variables (names only):

- `CATALYST_BAT_URL`
- `CATALYST_BAT_EMAIL`
- `CATALYST_BAT_PASSWORD`

## G. Code change required?

**No.** Do not implement application fixes for this failure.

## H. Commit / push / deploy

**None.** No commit · no push · no Hostinger/Vercel deploy · no migrations · no production env mutation.

## Diagnostic artefacts

- `scripts/_tmp-co-chanakya-032-bat-auth-diag.mjs` (safe presence/status probe)
- Shell smoke re-run confirmed `auth_login_failed` / `BLOCKED`

**STOP.**
