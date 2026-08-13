# CO-MARKETING-MKT-12 — Campaign Routing + Internal Notification

**Sprint:** CO-MARKETING-MKT-12  
**Status:** Implementation complete · **STOP — awaiting Product Owner review**  
**Architecture:** CO-MARKETING-ARCH-001 §11 (routing & notifications)  
**Hard stop:** No deploy. Do not modify operational notification behaviour outside Marketing handoff. Do not start later sprints.

---

## Summary

When a marketing response becomes a **qualified** business Opportunity, Catalyst One now determines:

1. **Who owns it** — configurable assignment (specific user, specific team, round-robin, or a closed routing rule)  
2. **How the owner is notified** — campaign-configurable channels (Catalyst One in-app, Email, WhatsApp)  
3. **What campaign generated it** — campaign identity is stamped on the qualification, Opportunity handoff, notification body, and audit trail  

Routing is **initial assignment only**. Opportunity ownership remains the operational SSOT after handoff (MKT-11 unchanged).

Internal in-app delivery **reuses the Enterprise Notification Engine** (ENE / CHANAKYA notification host). This sprint does **not** create another notification database or parallel engine.

---

## Constitutional Health Check

**Result: GREEN**

| Principle | Assessment |
|-----------|------------|
| Opportunity Registry SSOT | Unchanged — Dialogue Opportunity still created only on qualified handoff |
| No Lead entity | Unchanged |
| ENE single notification engine | Additive event type + optional explicit recipients; default fan-out unchanged |
| CAD-2026-001 | Notification copy uses captured campaign / contact / assignee values; uncaptured fields show Not Specified |
| Chanakya non-blocking | Notification failure never blocks or rolls back the Opportunity |
| Operational notify (Opportunity/Deal create) | Not modified — `explicitRecipientUserIds` is omitted on those callers |

---

## 1. Assignment options

Campaign / Responses configuration supports:

| Mode | Behaviour |
|------|-----------|
| `SINGLE_USER` | Configured `assigneeUserId` (not hardcoded in source) |
| `TEAM` | Round-robin within members of a configured `teamId` |
| `ROUND_ROBIN` | Round-robin across the configured member pool |
| `RULE_BASED` | Closed criteria (below), first match wins, then geography→member territory, then fallback |

`USER_POOL` remains as a non-advancing pool (MKT-11 compatibility). Idempotent claim: one `qualificationId` → one `assigneeUserId`. Re-handoff does not advance the round-robin cursor.

---

## 2. Routing criteria (closed set)

Not a general-purpose rules engine. Allowed fields only:

- product  
- customer category  
- geography  
- campaign  
- source  
- partner  
- team  

First matching rule wins. Unknown fields are ignored at upsert.

Context is assembled from the qualification plus the campaign (product / channel) at assign time.

---

## 3. Notification channels

Administrators configure:

- **Catalyst One notification** (in-app) — delivered by ENE to the **assigned employee only**  
- **Email** — recorded as dry-run (live employee email from Marketing is not authorised)  
- **WhatsApp** — recorded as dry-run unless later approved/supported  

Campaign builder persists channel flags on `notificationPlaceholder`. Responses desk persists a `MarketingNotificationPolicy`. Handoff resolves policy first, then campaign flags, then in-app default.

---

## 4. Internal notification content

In-app body includes:

- Contact/customer  
- Campaign  
- Source  
- Qualification reason  
- Opportunity  
- Assigned employee  
- Required action  
- Timestamp  

`href` deep-links to `/opportunities?opportunityId=…` when an Opportunity exists, else Contact, else the Marketing responses queue. The existing ENE host navigates via `item.href`.

---

## 5. ENE / CHANAKYA reuse

Additive only:

- Event type `MARKETING_QUALIFIED_HANDOFF`  
- Source system `marketing`  
- Optional `FanOutEnterpriseNotificationInput.explicitRecipientUserIds`  

When that list is **omitted**, ENE still resolves reporting manager + admins and excludes the actor (operational path unchanged).  
When it is **provided**, only those users are notified — used solely by Marketing handoff so the **assignee** receives the alert.

No new notification Prisma model. Attempt ledger is Marketing observability for retry (channel status), not an inbox.

---

## 6. Failure handling

Order of work:

1. Identity match / create  
2. Dialogue Opportunity  
3. Mark `HANDED_OFF` / `HANDOFF_COMPLETE`  
4. Then notify  

If notify fails:

- Opportunity and assignment are kept  
- Failure is recorded on the attempt ledger + qualification `notificationStatus`  
- **Retry notify** re-sends only `FAILED` channels  
- Successful `SENT` / `DRY_RUN` channels are skipped (duplicate protection)  
- ENE dedupe key is `MARKETING_QUALIFIED_HANDOFF:{qualificationId}:user:{assigneeUserId}`  

---

## Components created / modified

### Created

- `src/constants/enterprise-marketing-engine/routing.ts`  
- `src/constants/enterprise-marketing-engine/notification.ts`  
- `src/lib/enterprise-marketing-engine/routing/pick-assignee.ts`  
- `src/lib/enterprise-marketing-engine/qualification/handoff-notification.ts`  
- `server/services/enterprise-marketing-engine/notification-policy-store.ts`  
- `server/services/enterprise-marketing-engine/notification-attempt-store.ts`  
- `server/services/enterprise-marketing-engine/notification.service.ts`  
- `scripts/co-marketing-mkt-12-verify.mjs`  
- `docs/co-marketing-mkt-12/CO-MARKETING-MKT-12-IMPLEMENTATION-REPORT.md`  

### Modified

- Routing policy / service / qualification handoff (notify after complete)  
- Qualifications API (`retry_notification`, routing rules, notification policy)  
- Responses + Campaigns admin UI  
- ENE types / titles / `fanOut` explicit recipients (additive)  
- Safety sprint marker `CO-MARKETING-MKT-12`  

---

## DB / API / routes

- No Prisma schema change  
- No new notification tables  
- `POST /api/admin/marketing/qualifications` actions: `upsert_routing_policy` (extended), `upsert_notification_policy`, `retry_notification`  
- Campaign save already persisted `routingPlaceholder` / `notificationPlaceholder` — now editable in the builder  

---

## Permissions

- Queue view: `admin.marketing.command_center`  
- Routing, handoff, retry: `admin.marketing.routing.manage`  
- Admin layout still requires SUPER_ADMIN / ADMIN  
- In-app alert is addressed to the assignee only (not a broadcast to all admins)

---

## Verification

`npm run verify:co-marketing-mkt-12` — **PASS** (engineering gate only).

Also re-ran `npm run verify:co-marketing-mkt-11` — **PASS**. `npx tsc --noEmit` — **PASS**.

Covered:

- Single-user assignment  
- Round-robin  
- Team assignment  
- Notification payload + Opportunity deep link  
- Duplicate protection  
- Notify failure (Opportunity preserved)  
- Retry  
- Permission boundaries  

Engineering gate only — not Business Certification.

---

## Manual steps required

None for this sprint. **Do not deploy.** Live ECM/Opportunity writes remain `ENTERPRISE_MARKETING_HANDOFF_MODE=fixture` unless Product Owner sets `live`. Live employee email/WhatsApp from Marketing remains disabled.

---

## Architectural decisions

1. Closed routing rules instead of a new rules engine.  
2. ENE explicit-recipient fan-out rather than changing default manager/admin resolution.  
3. Attempt ledger for retry/idempotency — not a second inbox.  
4. Notify after `HANDOFF_COMPLETE` so delivery failure cannot lose the Opportunity.  
5. Email/WhatsApp internal alerts are configurable but dry-run until Product Owner authorises live employee send.

---

## Completed

- Configurable post-qualification routing  
- Configurable notification channels  
- ENE assignee alert with required content + deep link  
- Failure record + retry + duplicate skip  
- Verify script + this report  

## Partially Completed

None.

## Pending

- Product Owner review  
- Live ENE durable store (prisma mode) BAT on certification app  
- Authorisation of live employee email/WhatsApp, if required later  

---

## Final Status

🟡 **Partially Ready** — implementation complete locally. **No Vercel deploy** (hard stop). E2E Scenario Pack not run on a live URL.

**STOP.**
