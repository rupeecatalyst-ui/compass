# Catalyst One — Deployment guide (internal dry run)

Release target: **v0.9.0-internal**

This document prepares GitHub + Vercel deployment. It does not run deploy commands.

## What deploys where

| Surface | Host | Notes |
|---------|------|--------|
| Next.js app (`src/app`) | **Vercel** | Primary dry-run surface |
| Express API (`server/`) | Optional separate host | Not required if only App Router `/api/auth/*` is used |
| Nested `compass/` marketing app | Out of scope | Separate package; do not set as Vercel root |

## Prerequisites

1. Clean production build locally: `npm run build`
2. GitHub remote: `origin` → `https://github.com/rupeecatalyst-ui/compass.git`
3. Vercel project linked to this repository (root = repo root, Framework = Next.js)

## Required environment variables (Vercel)

Set in **Vercel → Project → Settings → Environment Variables** (Production + Preview):

| Variable | Required | Example / guidance |
|----------|----------|--------------------|
| `NEXT_PUBLIC_APP_NAME` | Recommended | `COMPASS` or `Catalyst One` |
| `NEXT_PUBLIC_APP_URL` | **Yes** | `https://<your-deployment>.vercel.app` |
| `NEXT_PUBLIC_API_URL` | Leave empty | Same-origin App Router; do **not** set to localhost |
| `JWT_SECRET` | **Yes** | Long random secret (never commit) |
| `JWT_REFRESH_SECRET` | **Yes** | Different long random secret |
| `JWT_EXPIRES_IN` | Optional | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Optional | `7d` |
| `DATABASE_URL` | Optional | Needed when Prisma-backed auth/data is enabled |
| `NODE_ENV` | Auto | Set by Vercel |

### Optional (only if Supabase integrations are exercised)

| Variable | Notes |
|----------|--------|
| `SUPABASE_URL` | Throws if missing when Supabase clients load |
| `SUPABASE_PUBLISHABLE_KEY` | Same |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; never expose to client |

See also `.env.example` (committed template). Never commit `.env` / `.env.local`.

## Local dual-server (optional)

```bash
# .env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
JWT_SECRET=...
JWT_REFRESH_SECRET=...
```

```bash
npm run dev          # Next + Express
npm run build        # Production Next build
npm run start        # Next only
```

## GitHub commit (manual)

Do **not** push secrets. Confirm `.env` is ignored (`git status` must not list `.env`).

Suggested flow:

```bash
git add -A
git status   # review; unstage .env if present
git commit -m "chore(release): prepare Catalyst One v0.9.0-internal for dry run"
git push -u origin HEAD
```

## Vercel deploy (manual)

1. Import or open the GitHub repo in Vercel
2. Root directory: repository root (not `compass/`)
3. Framework preset: Next.js
4. Add env vars from the table above
5. Deploy from the target branch after push
6. Smoke-test: `/login`, `/dashboard`, `/mission-control`, `/horizon`

## Production safety notes

- API rewrites to Express run **only** when `NEXT_PUBLIC_API_URL` is set (no localhost default).
- Mission Control / Horizon / SPR enterprise modules are placeholder-backed for this internal release.
- Rotate JWT secrets before any shared or customer-facing host.
- Express (`npm run start:api`) is a separate process; it is not started by Vercel’s Next build.

## Verification checklist

- [ ] `npm run build` succeeds
- [ ] `npx tsc --noEmit` succeeds
- [ ] `npx next lint` succeeds
- [ ] `.env` / `.env.local` not staged
- [ ] Vercel env vars set
- [ ] Post-deploy smoke routes OK
