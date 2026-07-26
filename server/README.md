# Legacy Express API

> **Status:** Legacy (ADR-014)  
> **Auth gateway:** Migrated to Next.js Route Handlers (`src/app/api/auth/*`)

The Express server in this directory remains operational for local development and for API endpoints not yet migrated to Next.js.

## Running locally

```bash
npm run dev:api    # Express only (port 4000)
npm run dev        # Next.js + Express (concurrently)
```

## Authentication

Production and Vercel Preview authenticate through native Next.js Route Handlers:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh`

These handlers delegate to the shared `server/services/auth.service.ts` — the same business logic used by Express auth routes.

## Credentials (CO-STAB-001)

- **PostgreSQL auth (production):** users in the database (seed via `BOOTSTRAP_SUPER_ADMIN_PASSWORD`).
- **Demo auth (local only):** requires `DEMO_AUTH_ENABLED=true` and `DEMO_AUTH_PASSWORD` when `DATABASE_URL` is unset. Demo auth is **forbidden in production** without a database.
- JWT secrets are **fail-closed** — no insecure defaults. Set `JWT_SECRET` and `JWT_REFRESH_SECRET` (≥32 chars, distinct).
- Never commit passwords or temporary env dumps.

## Future migration

Non-auth endpoints will migrate incrementally in future sprints. Do not remove this server until all consumers are on Route Handlers or an external API gateway.
