# CO-NOTIFICATION-001 — Enterprise Notification Engine

**Status:** Implementation complete · Local verification only  
**Deployment:** None (explicitly forbidden)  
**Production migration:** SQL authored — **not applied** to production in this sprint

---

## A. Existing event architecture discovered

| System | Role | Reuse |
|--------|------|-------|
| **EAR** (`EnterpriseActivityEvent`) | Chronology SSOT | Remains chronology — not the inbox |
| **EEIE** | Foundation in-memory bus | Not domain-wired; not used as competing bus |
| **Deal Timeline** | Stage/history events | Fan-out hooked after EAR dual-write |
| **Opportunity / Deal services** | Domain creates | Fan-out on create |
| **Partner Gateway** | Partner auth boundary | ENE partner rows merged into existing Notification Center |
| **ENCE** | Outbound simulation | Untouched (delivery still off) |

## B. Existing notification architecture discovered

| Surface | Finding |
|---------|---------|
| ENCE | Simulation/policy only — not in-app toast engine |
| Partner Notification Center (CO-WP-NOTIFY-001) | On-read **projection** + profileJson read state |
| Header `NotificationsPanel` | Demo/empty stub |
| `sonner` | Ephemeral save/error toasts (kept separate) |
| Mission Control notifications port | Stub |

**Decision:** Introduce **Enterprise Notification Engine (ENE)** as the durable per-recipient delivery ledger. Extend Partner Center to **consume** ENE partner-scoped rows via Gateway. Do not invent a second partner SSOT.

## C. SSOT used

- **Delivery ledger:** `EnterpriseNotification` (Prisma) + process soft-store when not durable
- **Chronology:** EAR unchanged
- **Partner presentation:** Gateway `/api/partner/notifications` (binding + ownership + ENE merge)
- **Sound preference:** cookie `ene_sound_enabled` + client `localStorage`

## D. New notification components/services

### Catalyst One
- `server/services/enterprise-notification/*`
- `server/repositories/enterprise-notification/*`
- `src/lib/enterprise-notification-engine/*`
- `src/components/catalyst-one/enterprise-notification-engine/enterprise-notification-host.tsx`
- APIs: `/api/enterprise-notifications`, `/[id]`, `/preferences`
- Asset: `public/sounds/catalyst_one_notification_chime.wav`

### Wealth Partner App
- `PartnerNotificationToast.tsx` + CSS in AppShell
- Chime copied to `public/sounds/catalyst_one_notification_chime.wav`
- Still consumes Gateway only (no direct enterprise table access)

## E. Recipient resolution

1. Exclude **actor** (default policy — no self-notify)
2. Include actor’s `User.reportingManagerId` when active
3. Include active `SUPER_ADMIN` / `ADMIN` (enterprise observability within RBAC roles)
4. Include `sourceWealthPartnerId` as partner recipient **only when** `actorIsPartner !== true`

## F. Team hierarchy resolution

Uses existing Auth `User.reportingManagerId` (not hardcoded Employee→Manager map). No new TeamMembership model.

## G. Admin notification logic

Admins/Super Admins receive fan-out for configured event types via role query (`ROLES.SUPER_ADMIN | ADMIN`). Does not bypass auth on read APIs — list is always filtered to `recipientUserId = authenticated user`.

## H. Wealth Partner notification logic

- Partner create → `actorIsPartner: true` → partner **not** notified of own create; internals are
- Internal Deal stage / Deal create with `sourceWealthPartnerId` → partner may receive ENE row
- Gateway merges ENE partner rows; deep links rewritten to `/app/opportunities|deals/...`
- Forged partner id cannot list another partner’s ENE rows (binding from session)

## I. Security enforcement

- C1 list/mark-read: `requireAccessToken` + recipient user match
- Partner: `resolvePartnerBindingForUser` then `listForPartner(partnerId)`
- No browser-supplied partner/org authority on fan-out recipients
- Notifications never return other users’ rows

## J. Sound asset integration

- Approved two-note chime at `/sounds/catalyst_one_notification_chime.wav`
- Plays once on new toast (throttled); not while toast remains

## K. Silent preference

- Toast 🔕 toggles sound only (visual remains)
- Default sound **ON**
- Persists via localStorage + cookie preference API

## L. Read state

- `UNREAD` / `READ` on ENE rows
- Click Open → mark read
- Auto-dismiss does **not** mark read
- Silent ≠ Read

## M. Deduplication

- Unique `(organizationId, dedupeKey)` where  
  `dedupeKey = eventType:sourceEventId:recipientKind:recipientId`
- Upsert no-ops on retry / refresh / multi-tab poll

## N. Multi-tab behaviour

- `BroadcastChannel` + `localStorage` sound lock — one tab plays chime
- Dismiss events shared across tabs

## O. Performance

- Non-blocking `fanOutBestEffort` from domain writers
- Client poll ~25–30s; host mounted globally but does not block AppShell/dashboard render
- No N+1 ECM on fan-out; recipient resolve is bounded (manager + ≤50 admins)
- Deal toast panel lazy-friendly (poll only)

## P. APIs

| Method | Path | Audience |
|--------|------|----------|
| GET | `/api/enterprise-notifications` | C1 user |
| POST | `/api/enterprise-notifications/:id` | C1 mark read |
| GET/PUT | `/api/enterprise-notifications/preferences` | Sound pref |
| GET | `/api/partner/notifications` | Partner (ENE merged) |

## Q. Database changes

- Prisma model `EnterpriseNotification`
- Migration: `prisma/migrations/20260811160000_co_notification_001_enterprise_notification/migration.sql`
- **Not applied to production** in this sprint

## R. Files changed (high level)

Catalyst One: types, constants, lib, server service/repo, APIs, AppProviders host, Opportunity/Deal/Partner emit hooks, Partner Center merge, schema, migration, verify script, this report, chime asset.

Wealth Partner App: AppShell toast host + CSS + chime copy.

## S. Verification results

✅ `npm run verify:co-notification-001` — pass

## T. TypeScript

✅ `npx tsc --noEmit -p tsconfig.json` — pass

## U. Lint

✅ Targeted next lint on ENE paths — see completion run

## V. Build

✅ `npm run build` — pass

## W. Regression

- Partner Gateway binding / ownership path retained; ENE merged into existing Partner Notification Center
- Opportunity / Deal create paths fail-open on notification fan-out
- No Vercel deployment; production migration not applied

## X. Known limitations

1. Document/Task/Contact/Approval/Disbursement producers not fully wired where EAR emitters are missing — architecture ready; **no invented events**
2. Header bell panel still demo stub (history center deferred)
3. Soft-store is process-local when prisma mode off
4. Migration must be applied in consolidated deploy before durable multi-instance delivery
5. Chime file generated as PO-approved two-note WAV (source binary was not present in workspace)
6. Team membership beyond reporting manager not modeled (no TeamMembership SSOT)
7. Full interactive BAT with multi-user hierarchy recommended before consolidated deploy

---

## Hard stop

No Vercel deployment. No production migration applied. Waiting for Product Owner review before consolidated deployment.
