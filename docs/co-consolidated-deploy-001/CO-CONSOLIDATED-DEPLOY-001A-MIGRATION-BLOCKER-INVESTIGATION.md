# CO-CONSOLIDATED-DEPLOY-001A — Migration Blocker Investigation

**Classification:** INVESTIGATION ONLY  
**Date:** 2026-08-11  
**Authority:** Product Owner request  

**Executed in this investigation:** None  
- No deploy  
- No `prisma migrate deploy`  
- No code changes  
- No production data changes  

This report is derived from: migration SQL, Prisma schema, ENE service/repository/Gateway consumers, CO-NOTIFICATION-001 development report, and the production-linked `prisma migrate status` observation recorded during CO-CONSOLIDATED-DEPLOY-001.

---

## Blocking migration identity

### 1. Exact migration name / path

| Field | Value |
|-------|--------|
| **Migration name** | `20260811160000_co_notification_001_enterprise_notification` |
| **Path** | `prisma/migrations/20260811160000_co_notification_001_enterprise_notification/migration.sql` |
| **Sprint origin** | CO-NOTIFICATION-001 — Enterprise Notification Engine |

This is the **only** unapplied migration reported against the production-linked database when CO-CONSOLIDATED-DEPLOY-001 stopped.

---

### 2. Which application requires it

| Application | Requires migration? | Notes |
|-------------|---------------------|--------|
| **Catalyst One** | **Yes** (primary) | Owns Prisma schema, migration, ENE service/repo, `/api/enterprise-notifications*` |
| **Catalyst One Gateway** | **Yes** (same runtime) | Partner Gateway notification center merges ENE partner rows via `enterpriseNotificationService` inside the **same** Catalyst One Vercel/DB project |
| **Wealth Partner App** | **Indirect only** | No direct DB access; toast/center consume Gateway. Durable partner ENE rows need the table on Gateway/C1 DB |

---

### 3. Which database / table(s) it affects

| Field | Value |
|-------|--------|
| **Database** | Production Postgres used by Catalyst One when `ENTERPRISE_PERSISTENCE_MODE=prisma` (Supabase / `DATABASE_URL` production target — same SSOT as Gateway) |
| **New table** | `enterprise_notifications` |
| **Referenced existing table** | `organizations` (FK only; no ALTER of org columns) |
| **Not touched** | Opportunities, Deals, Partners, entitlements, EAR, documents, users, etc. |

---

### 4. Exact schema changes

From `migration.sql`:

1. **`CREATE TABLE IF NOT EXISTS "enterprise_notifications"`** with columns:
   - `id` TEXT PK  
   - `organization_id` TEXT NOT NULL  
   - `event_type`, `dedupe_key`, `source_event_id`, `source_system` TEXT NOT NULL  
   - `title` TEXT NOT NULL, `body` TEXT NOT NULL, `description` TEXT nullable  
   - `actor_user_id`, `actor_name` nullable  
   - `recipient_kind` TEXT NOT NULL  
   - `recipient_user_id`, `recipient_partner_id` nullable  
   - `opportunity_id`, `deal_id`, `contact_id`, `customer_name`, `product_label`, `amount_label`, `previous_value`, `new_value` nullable  
   - `href` TEXT NOT NULL  
   - `read_state` TEXT NOT NULL **DEFAULT `'UNREAD'`**  
   - `read_at` TIMESTAMP(3) nullable  
   - `occurred_at` TIMESTAMP(3) NOT NULL  
   - `created_at` TIMESTAMP(3) NOT NULL **DEFAULT `CURRENT_TIMESTAMP`**

2. **Indexes (IF NOT EXISTS):**
   - Unique: `ene_org_dedupe_uidx` on `(organization_id, dedupe_key)`  
   - `ene_org_user_occurred_idx` on `(organization_id, recipient_user_id, occurred_at DESC)`  
   - `ene_org_partner_occurred_idx` on `(organization_id, recipient_partner_id, occurred_at DESC)`  
   - `ene_org_read_occurred_idx` on `(organization_id, read_state, occurred_at DESC)`

3. **FK (conditional DO block):**  
   `enterprise_notifications.organization_id` → `organizations(id)`  
   `ON DELETE RESTRICT` · `ON UPDATE CASCADE`  
   Added only if constraint `enterprise_notifications_organization_id_fkey` does not already exist.

No `DROP`, `TRUNCATE`, `DELETE`, or `ALTER` of existing business tables.

---

### 5. Why the migration is required by the current working tree

The verified working tree includes **CO-NOTIFICATION-001**:

- Prisma model `EnterpriseNotification` → `@@map("enterprise_notifications")`  
- Repository uses `prisma.enterpriseNotification.*` (upsert / findMany / update)  
- Service durable path when `isEnterprisePersistencePrisma()` is true  
- Fan-out hooks on Opportunity create, Deal create, Deal timeline stage, Partner create  
- C1 toast host + APIs  
- Partner Gateway merges ENE into `/api/partner/notifications`

Production already runs **prisma mode**. Deploying this tree without the table means durable Prisma calls target a missing relation.

---

### 6. Additive / destructive / potentially destructive

**Additive only.**

- New empty table + indexes + FK to existing `organizations`  
- Idempotent guards (`IF NOT EXISTS` / constraint existence check)  
- No destructive DDL on existing business data

**Residual risk (non-destructive to rows, operational):** brief lock while creating indexes/FK on an empty new table — typically low for a brand-new empty table.

---

### 7. Whether it changes existing production rows

**No.**  
It does not UPDATE/DELETE/INSERT into Opportunities, Deals, Partners, users, EAR, or any existing table.  
New table starts empty; no seed/backfill SQL in the migration.

---

### 8. Defaults / backfill requirements

| Concern | Assessment |
|---------|------------|
| Column defaults | `read_state` default `'UNREAD'`; `created_at` default `CURRENT_TIMESTAMP` |
| Row backfill | **None** in migration |
| Historical notification reconstruction | **Not required** for apply; inbox starts empty until new fan-out events |
| App-level soft store | Process-local Map only — not a DB backfill |

---

### 9. Whether it can safely be applied to the current production database

**Structurally: yes — assessed production-safe as additive DDL**, contingent on:

- Standard `prisma migrate deploy` (not reset/truncate)  
- `organizations` table already present (required for FK; it is core production SSOT)  
- No conflicting manual object with the same names (unlikely; table was never applied)

**Not executed** in this investigation. Final apply still requires Product Owner authorization.

---

### 10. Catalyst One / Gateway / Wealth Partner dependency

| Surface | Dependency on this migration |
|---------|------------------------------|
| **Catalyst One** | Direct — durable ENE inbox/toasts/APIs |
| **Gateway** | Direct (same DB) — partner notification merge/mark-read for ENE ids |
| **Wealth Partner App** | Indirect — UI only; durable partner ENE content requires Gateway table |
| **All three for full ENE feature** | Yes for **durable cross-process** notifications |
| **Core Opp/Deal/Dashboard/Dialogue timeline** | **No** — EAR/Dialogue/Dashboard/My Deals do not require this table |

---

### 11. Whether the migration was already applied in any environment

| Environment | Status (evidence) |
|-------------|-------------------|
| **Production-linked DB** (observed during CO-CONSOLIDATED-DEPLOY-001) | **Not applied** — `prisma migrate status` reported this as the **1 unapplied** migration |
| **Local / other** | Not re-probed in 001A (no execution). Development report states production migration **not applied** in CO-NOTIFICATION-001 sprint |
| **`_prisma_migrations` for this name** | Expected **absent** on production per that status snapshot |

This investigation did **not** re-run `migrate status` (no execution). Treat production “unapplied” as last confirmed at CO-CONSOLIDATED-DEPLOY-001 stop unless PO authorizes a fresh read-only status check.

---

### 12. Whether any data transformation / backfill occurs

**No** in the migration SQL.  
No COPY, UPDATE, INSERT-SELECT, or transform of existing business data.

---

### 13. Whether rollback is possible

| Aspect | Assessment |
|--------|------------|
| Prisma migrate rollback | Prisma does **not** auto-rollback applied migrations; rollback is manual |
| Manual rollback | Possible by dropping `enterprise_notifications` (and indexes/FK) **if** empty or after accepting loss of ENE rows only |
| Impact of rollback on other domains | Should not affect Opp/Deal/Partner core tables if only this table is dropped |
| Risk if rows already written | Dropping table loses ENE delivery ledger only — not EAR chronology |

Rollback is **possible but operational** (manual DDL + migrate history discipline), not a one-click Prisma down migration in this repo.

---

### 14. What would happen if we deploy the code without applying it

Production = prisma mode → durable path is attempted:

| Path | Likely behaviour |
|------|------------------|
| **Fan-out (`fanOut`)** | Prisma upsert fails → catch → **process softStore** (in-memory). Notifications may appear briefly on that instance only; **not durable**, not shared across serverless instances |
| **List / mark-read APIs** | Prisma queries against missing table → errors unless code paths also soft-fallback (list paths use repository; durable mode will surface DB errors for list when table missing) |
| **Partner Gateway merge** | `listForPartner` / mark-read ENE can fail or return empty/error for ENE portion; legacy projected Partner Notification Center items may still work |
| **Opportunity / Deal / Dialogue / Dashboard** | Core flows **should continue** (ENE fan-out is fail-open / best-effort around domain writes) |
| **Operational risk** | Partial / flaky notification UX; possible API 5xx on ENE list endpoints; **not** a clean production state for the included feature |

Deploy-without-migration is therefore **technically possible for non-ENE surfaces** but **incorrect for CO-NOTIFICATION-001 durable behaviour** and was correctly treated as a blocker under CO-CONSOLIDATED-DEPLOY-001 §6.

---

### 15. Recommendation

**NEEDS PO DECISION** (with engineering preference stated):

| Option | Meaning |
|--------|---------|
| **Preferred if deploying the full verified tree including ENE** | **APPLY** this additive migration via authorized `prisma migrate deploy`, then proceed with consolidated Vercel deploy |
| **DO NOT APPLY** | Appropriate only if PO explicitly **excludes** CO-NOTIFICATION-001 from the inspection deploy or defers ENE entirely |
| **Deploy without migration** | **Not recommended** — leaves ENE durable path broken/flaky under prisma mode |

Engineering assessment: the migration itself is **additive and low risk to existing production rows**. The **decision** remains Product Owner’s because policy forbids auto-apply.

---

## Production database state relevant to this migration

| Fact | Value |
|------|--------|
| Persistence mode (production) | `ENTERPRISE_PERSISTENCE_MODE=prisma` (as used by live Gateway/C1) |
| Blocking migration | `20260811160000_co_notification_001_enterprise_notification` |
| Last recorded migrate status | **1 unapplied** (CO-CONSOLIDATED-DEPLOY-001) |
| Table `enterprise_notifications` on production | **Expected absent** (migration not applied) |
| Existing production business tables | **Unchanged by this investigation**; migration would not rewrite them |
| Current live Vercel code | Still **CO-WP-PERF-003** (`dpl_CdLLNf2z2rowQ6ewZMJzC7iixbdw` / `dpl_CCfydL2P7BHNTaFx5H9pXxv6pMyw`) — **does not** require this table until the consolidated tree (with ENE) is deployed |
| GitHub checkpoint | Migration SQL is in git at `9d934e6…` — source only; not applied |

---

## Confirmations

| Statement | Status |
|-----------|--------|
| No deploy | ✅ |
| No migration run | ✅ |
| No code modification | ✅ |
| No production data modification | ✅ |

**STOP.** Awaiting Product Owner decision: APPLY / DO NOT APPLY / defer consolidated deploy.
