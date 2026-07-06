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

## Demo credentials

When `DATABASE_URL` is unset:

- Email: `admin@compass.dev`
- Password: `Compass@123`

## Future migration

Non-auth endpoints will migrate incrementally in future sprints. Do not remove this server until all consumers are on Route Handlers or an external API gateway.
