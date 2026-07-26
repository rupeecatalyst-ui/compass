# CO-STAB-001 — Token Security Review

**Status:** Documented · Partial hardening applied · Full HttpOnly migration deferred  
**Date:** 26 Jul 2026

## Current implementation

| Concern | Current behaviour |
|---------|-------------------|
| Access / refresh tokens | Stored in `localStorage` via `src/lib/api-client.ts` |
| Middleware gate | `compass-access-token` / `compass-refresh-token` cookies set from the client (`src/lib/auth.ts`) — **presence only**, not signature validation at the edge |
| Cookie flags (this sprint) | `path=/`, `SameSite=Lax`, **`Secure` when page is HTTPS** |
| Expiration | Access: `JWT_EXPIRES_IN` (default 15m). Refresh: `JWT_REFRESH_EXPIRES_IN` (default 7d) |
| Refresh | `POST /api/auth/refresh` rotates refresh token when DB available |
| Logout | Clears localStorage + cookies; deletes refresh token row when DB available |
| Session invalidation | Refresh token deleted on logout / password reset |

## Hardening applied in CO-STAB-001

- Fail-closed `JWT_SECRET` / `JWT_REFRESH_SECRET` (no insecure defaults; min 32 chars; secrets must differ).
- Demo auth password no longer hardcoded; requires `DEMO_AUTH_*` env; blocked in production without `DATABASE_URL`.
- Password reset tokens no longer logged with secret material.
- Mission Control (+ Horizon) wrapped in `AuthGuard`.

## Future enhancement (out of sprint — architectural)

Prefer **HttpOnly + Secure + SameSite** cookies issued by auth Route Handlers (`Set-Cookie`), with middleware verifying JWT signature/expiry, and removing token copies from `localStorage` / `document.cookie`.

This requires coordinated client + middleware + CSRF strategy and is tracked for a dedicated auth session sprint. Business workflows must remain unchanged during that migration.

## Residual risk

XSS can still exfiltrate tokens from `localStorage` until HttpOnly migration completes. Mitigate with CSP / dependency hygiene in parallel.
