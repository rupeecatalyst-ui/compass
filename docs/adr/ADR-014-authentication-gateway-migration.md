# ADR-014: Authentication Gateway Migration

**Status:** Accepted  
**Date:** 2026-07-07  
**Sprint:** 17

## Context

COMPASS Catalyst One originally routed authentication through a standalone Express API (`server/index.ts` on port 4000). The Next.js frontend proxied `/api/*` requests to Express via `next.config.ts` rewrites.

This architecture worked locally (`npm run dev` runs both processes) but **failed on Vercel**:

- Vercel deploys only the Next.js application (`next build` / `next start`).
- The Express server is not started in production.
- Login requests to `POST /api/auth/login` were rewritten to `http://localhost:4000`, which does not exist in Vercel's environment, producing 404 errors.

Demo credentials (`admin@compass.dev` / `Compass@123`) were correct; the API backend was simply unreachable.

## Decision

Migrate the **authentication gateway only** to native **Next.js App Router Route Handlers** under `src/app/api/auth/*`.

Route Handlers delegate to the existing shared authentication service (`server/services/auth.service.ts`) and validators (`server/validators/auth.validators.ts`). No duplicate business logic.

### Endpoints migrated

| Method | Path | Handler |
|--------|------|---------|
| POST | `/api/auth/login` | `src/app/api/auth/login/route.ts` |
| POST | `/api/auth/logout` | `src/app/api/auth/logout/route.ts` |
| GET | `/api/auth/me` | `src/app/api/auth/me/route.ts` |
| POST | `/api/auth/refresh` | `src/app/api/auth/refresh/route.ts` |

`refresh` is included to preserve session persistence (15-minute access tokens with client-side refresh).

### Endpoints not migrated (this sprint)

Forgot-password and reset-password remain on the legacy Express server for local use. They are not required for demo authentication on Vercel.

## Architecture

### Before (local only)

```
Browser → Next.js → rewrite → Express API → auth.service → Demo Auth / DB
```

### After (Vercel + local)

```
Browser → Next.js Route Handler → auth.service → Demo Auth / DB
```

### Local development with legacy APIs

```
Browser → Next.js
              ├─ /api/auth/*     → Route Handlers (native)
              └─ /api/other/*    → rewrite → Express (legacy)
```

App Router Route Handlers take precedence over rewrites for matching paths.

## Why Route Handlers

1. **Vercel-native** — No separate process required; auth runs in the Next.js serverless/Node runtime.
2. **Zero frontend changes** — The client continues calling `POST /api/auth/login` via `src/services/auth.service.ts`.
3. **Shared business logic** — `auth.service.ts` remains the single source of truth; Express and Route Handlers both import it.
4. **Future Supabase compatibility** — Auth service can be extended or swapped without changing the client contract.

## Why Express remains temporarily

- Other API endpoints may still depend on Express during local development.
- Removing Express risks breaking workflows not in scope for Sprint 17.
- Incremental migration reduces blast radius and preserves Lovable/git history stability.

Express is marked **Legacy API** in `server/README.md` and `server/index.ts`.

## Session and cookies

No session redesign. The frontend continues to:

- Store access/refresh tokens in `localStorage`
- Set `compass-access-token` and `compass-refresh-token` cookies for middleware route protection
- Call `/api/auth/me` on session validation
- Refresh tokens via `/api/auth/refresh` on 401 responses

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | When unset, demo auth is used |
| `JWT_SECRET` | Access token signing |
| `JWT_REFRESH_SECRET` | Refresh token signing |
| `JWT_EXPIRES_IN` | Access token TTL (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL (default `7d`) |

`NEXT_PUBLIC_API_URL` is not required for auth on Vercel when using same-origin Route Handlers.

## Future migration strategy

1. **Sprint 17 (this ADR):** Auth gateway → Route Handlers ✓
2. **Future sprints:** Migrate remaining Express routes one domain at a time (e.g. loan files, customers).
3. **End state:** Express server retired or replaced by Supabase / external API gateway.
4. **Supabase:** Auth service abstraction allows swapping JWT/demo auth for Supabase Auth without UI changes.

## Consequences

### Positive

- Vercel Preview and production login work without Express.
- Demo credentials preserved.
- No UI, workflow, or business-rule regressions in Catalyst One modules.

### Negative / trade-offs

- Auth-related server code (`server/services/`) is imported by both Express and Next.js; `tsconfig.json` includes shared server modules for type-checking.
- Forgot/reset password unavailable on Vercel until migrated (acceptable for demo deployments).

## Validation

- [x] `npm run build` passes
- [x] Local login with demo credentials
- [x] Logout clears session
- [x] `/api/auth/me` returns user profile with valid token
- [x] Express server retained and documented as legacy
