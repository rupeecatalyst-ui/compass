# Toast at-most-once — Catalyst One notification correction

Status: **Local implementation complete** · Awaiting Product Owner approval before production  
Separate from COMPASS Advantage. Not pushed. Not deployed. `prisma db push` was not run.

## Root cause

The bottom-right toast host rebuilt its queue from `GET /api/enterprise-notifications?unreadOnly=1` (the full unread Notification Centre list).

Toast “already shown” was remembered only in **browser `sessionStorage`**. Refresh, logout/login, another browser, or a new tab started a new session, so historical unread notifications (including days-old items) were queued again. Closing with X did not persist presentation server-side. Unread remained the toast source of truth.

## Existing data flow

| Surface | Source | After this fix |
|---|---|---|
| Bottom-right toast | Unread list + sessionStorage | `POST /api/enterprise-notifications/toast-claim` atomic claim |
| Top Notification Centre (bell) | `GET /api/enterprise-notifications` | Unchanged — still lists history by recipient |
| Read | `POST .../:id` `{ action: mark_read }` | Unchanged — independent of toast presentation |

Each `EnterpriseNotification` row is already one recipient (`recipientUserId` / `recipientPartnerId`). Toast state is stored on that row, not a parallel engine.

## Server-side delivery-state design

Added `toastPresentedAt` on `enterprise_notifications`.

- `readAt` / `readState` remain the read/unread SSOT.
- Claiming a toast sets only `toastPresentedAt`.
- Mark-read sets only `readState` + `readAt`.
- Archive is not in the current schema; not invented.
- Silent remains the existing global sound preference; X / Open / Silent all dismiss the current toast, which was already claimed.

Claim:

```
SELECT … FOR UPDATE SKIP LOCKED
UPDATE … WHERE toast_presented_at IS NULL AND recipient_user_id = :actor
```

Organization + recipient scoped. Two tabs cannot both receive the same row.

If the column is missing (app before migrate), claim returns `[]` — **no historical replay**.

## Migration / backfill

Path: `prisma/migrations/20260831190000_co_notification_toast_presented_once/migration.sql`

- Additive column + index
- Backfill: `toast_presented_at = COALESCE(read_at, occurred_at, created_at)` for existing rows
- Does **not** change `read_state`, archive, delete, or notification content
- Historical items stay in the top Notification Centre
- **Not applied to production**

## Controlled Hostinger procedure (do not execute until PO approves)

1. Deploy application first (toast host no longer uses the unread list). Missing column ⇒ empty toast queue, no replay.
2. Apply this migration only (backfill historical as already presented).
3. Confirm: reload does not show the ~25 historical toasts; bell still lists them unread if unread.
4. Create one new test notification; confirm it toasts once, then never again after refresh / navigation / logout-login / second tab.
5. Do not `prisma db push`. Do not push the Hostinger-watched branch from this task.

## TypeScript / build

See implementation report in chat after verification commands.
