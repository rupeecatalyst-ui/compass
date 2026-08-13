# CO-CONSOLIDATED-DEPLOY-001 — Deployment Report

**Classification:** PRODUCT OWNER INSPECTION DEPLOYMENT · **NOT CERTIFICATION**  
**Date:** 2026-08-11  
**Status:** ✅ **COMPLETED** (001B execute + 001C live verification)

This is an **inspection deployment only**. It is **not** certification, go-live approval, or production sign-off.

No functional code changes were introduced during this deployment step.  
No hot-fixes after deploy.  
No additional migrations beyond the authorized ENE migration.

### CO-CONSOLIDATED-DEPLOY-001C (this instruction)

| Action | Result |
|--------|--------|
| Re-check migration | ✅ Already applied · schema **up to date** · **no second migrate** |
| Re-deploy to Vercel | ❌ **Not repeated** — production aliases already serve the 001B current-tree deploy |
| Confirm not PERF-003 | ✅ Live ≠ `dpl_CdLLNf2z2rowQ6ewZMJzC7iixbdw` / `dpl_CCfydL2P7BHNTaFx5H9pXxv6pMyw` |
| Live feature verification | ✅ WP journey markers in production JS · C1 auth-gated UI requires PO login |

**Not PERF-003:**

| | CO-WP-PERF-003 (superseded) | CO-CONSOLIDATED-DEPLOY-001 (live) |
|--|-----------------------------|-------------------------------------|
| C1 / Gateway | `dpl_CdLLNf2z2rowQ6ewZMJzC7iixbdw` | **`dpl_2WQEdeWSxu58GnNCrVnGnqrE33SD`** |
| Wealth Partner | `dpl_CCfydL2P7BHNTaFx5H9pXxv6pMyw` | **`dpl_CozL6mWi89p8bQxeXP9ygNCBRD6G`** |
| Created | ~13:50–13:54 IST | **~22:32 IST** |

---

## Feature deployment matrix (001C)

| Feature | Local | Deployed (current-tree 001B) | Live Verified |
|---------|-------|------------------------------|---------------|
| Dashboard (CO-C1-DASH-001) | ✅ (`data-sprint` / New Arrivals / New Opportunities sections in tree; local `.next` contains `CO-C1-DASH-001`) | ✅ Included in deploy-from-local of checkpoint tree | ⚠️ Auth-gated (`/dashboard` → login). Unauthenticated chunk scan inconclusive. **PO must confirm after login** |
| My Deals / Journey (CO-C1-DEALS-JOURNEY-001) | ✅ Journey board components + verify script | ✅ Included in deploy-from-local | ⚠️ Auth-gated (`/my-deals` → login). **PO must confirm after login** |
| Activity Timeline (CO-C1-DIALOGUE-002 / 002A) | ✅ Timeline UI + EAR reader + verify PASS | ✅ Included; ENE/EAR/EBN APIs present on alias (**401** unauth) | ⚠️ Auth-gated Opportunity/Deal desks. **PO must confirm tab #2 / teal / day grouping** |
| Notifications (CO-NOTIFICATION-001) | ✅ Host + APIs + verify PASS · migration applied | ✅ Table live · APIs on alias (**401**) | ⚠️ Toast/sound/Silent need logged-in UI. Policy/dedupe verified in scripts. **PO visual for toast** |
| WP Journey (CO-WP-DEALS-JOURNEY-001) | ✅ | ✅ | ✅ Production JS contains `CO-WP-DEALS-JOURNEY`, `Loan journey view`, `pj-rm-name`, `pj-workspace-link` |
| WP refinements (current tree) | ✅ `v0.9.3` local tree | ✅ `dpl_CozL6mWi89p8bQxeXP9ygNCBRD6G` | ✅ SPA routes **200**; journey assets served from production |

**Critical-stop assessment:** Production is **not** the PERF-003 build. WP Journey is **proven in live assets**. C1 Dashboard / My Deals / Activity Timeline / Notification **toast** cannot be screenshot-verified without a working authenticated session in this agent run (`admin@compass.com` login returned `INVALID_CREDENTIALS`). Deployment identity and source-tree inclusion support success; **PO browser login is required to close the Live Verified column for C1 UI**.

---

## A. Migration applied

| Field | Value |
|-------|--------|
| Authorization | CO-CONSOLIDATED-DEPLOY-001B — Product Owner APPROVED |
| Migration name | `20260811160000_co_notification_001_enterprise_notification` |
| Path | `prisma/migrations/20260811160000_co_notification_001_enterprise_notification/migration.sql` |
| Command | `prisma migrate deploy` (via `node --env-file=.env.local ./node_modules/prisma/build/index.js migrate deploy`) |
| Applied at (UTC) | `2026-08-11T16:45:14.254Z` |
| Other migrations applied | **None** — preflight showed only this one pending |

### Preflight (before apply)

| Check | Result |
|-------|--------|
| Exact investigated migration | ✅ Confirmed |
| Currently unapplied | ✅ Only this migration pending |
| Production DB target | ✅ PostgreSQL `postgres` @ `aws-0-ap-southeast-1.pooler.supabase.com` · `ENTERPRISE_PERSISTENCE_MODE=prisma` |
| Reset / truncate | ✅ Not used |
| Additional pending migrations | ✅ None — proceed authorized |

---

## B. Migration status

| Check | Result |
|-------|--------|
| After apply | **Database schema is up to date!** (45 migrations found; 0 pending) |
| `_prisma_migrations` row | Present · `applied_steps_count=1` · `rolled_back_at=null` |

---

## C. Migration verification

| Check | Result |
|-------|--------|
| Table `enterprise_notifications` exists | ✅ |
| Expected columns | ✅ (id, organization_id, event_type, dedupe_key, source_*, title, body, recipient_*, href, read_state, read_at, occurred_at, created_at, …) |
| Indexes | ✅ `ene_org_dedupe_uidx` (unique), `ene_org_user_occurred_idx`, `ene_org_partner_occurred_idx`, `ene_org_read_occurred_idx`, PK |
| FK `organization_id` → `organizations(id)` | ✅ `ON UPDATE CASCADE ON DELETE RESTRICT` |
| Default `read_state` | ✅ `'UNREAD'::text` |
| Default `created_at` | ✅ `CURRENT_TIMESTAMP` |
| ENE row count immediately after apply | **0** (empty new table) |

---

## D. Database safety confirmation

| Statement | Status |
|-----------|--------|
| No database reset | ✅ |
| No truncate | ✅ |
| No seed reset | ✅ |
| No destructive DDL on existing tables | ✅ |
| No modification of existing production rows by migration | ✅ |
| Opportunity count (spot-check) | **89** before verify · **89** after deploy |
| Deal count (spot-check) | **91** before verify · **91** after deploy |
| ENE rows after deploy smoke | **0** (no inspection fan-out writes performed) |

---

## E–G. Vercel deployment IDs

| App | Deployment ID | Deployment URL | Production alias | Status |
|-----|---------------|----------------|------------------|--------|
| **Catalyst One** | `dpl_2WQEdeWSxu58GnNCrVnGnqrE33SD` | https://catalyst-1gkbdcyrq-rupee-catalyst.vercel.app | https://catalyst-one-two.vercel.app | ● Ready |
| **Gateway** (same project) | `dpl_2WQEdeWSxu58GnNCrVnGnqrE33SD` | same as Catalyst One | same | ● Ready |
| **Wealth Partner App** | `dpl_CozL6mWi89p8bQxeXP9ygNCBRD6G` | https://wealth-partner-urfvcucq2-rupee-catalyst.vercel.app | https://wealth-partner-app.vercel.app | ● Ready |

Created: **2026-08-11 ~22:32 IST**

Inspect:

- C1/Gateway: https://vercel.com/rupee-catalyst/catalyst-one/2WQEdeWSxu58GnNCrVnGnqrE33SD  
- WP: https://vercel.com/rupee-catalyst/wealth-partner-app/CozL6mWi89p8bQxeXP9ygNCBRD6G  

---

## H. Git commit / build identity

| Surface | Identity |
|---------|----------|
| **Branch** | `compass-hl03-conversation-first` |
| **App checkpoint SHA** | `9d934e6435c371c37954313ecb581a7dd8a14eab` |
| **Branch tip at deploy** | `e41ab4ce87e8b06e57add4b3e63ba45ad1deee74` |
| **Working tree vs tip** | Clean for application code · **1 untracked doc**: `docs/co-consolidated-deploy-001/CO-CONSOLIDATED-DEPLOY-001A-MIGRATION-BLOCKER-INVESTIGATION.md` (investigation only; not a functional change) |
| **Deploy method** | Vercel **deploy-from-local** working tree (matches historical Catalyst One pattern; includes checkpoint tree) |
| **Wealth Partner** | No git commits · local verified tree `wealth-partner-app@0.9.3` |
| **Force-push / history rewrite** | ❌ Not performed |

---

## I. Build results

### Catalyst One (+ Gateway in-tree)

| Gate | Result |
|------|--------|
| `verify:co-c1-dialogue-002` | ✅ PASS |
| `verify:co-notification-001` | ✅ PASS |
| `verify:co-wp-access-001` | ✅ PASS |
| `tsc --noEmit` | ✅ exit 0 |
| `npm run lint` | ✅ exit 0 (existing unused-var warnings only) |
| `npm run build` | ✅ exit 0 |

### Wealth Partner App

| Gate | Result |
|------|--------|
| `npm run build` | ✅ exit 0 |
| `npm run lint` | ✅ exit 0 (1 non-blocking hooks warning) |
| `verify:co-wp-deals-journey-001` | ✅ PASS |
| `verify:co-wp-int-001` | ✅ PASS |

---

## J. Smoke results (safe / non-destructive)

### Catalyst One

| Probe | Result |
|-------|--------|
| `/` | HTTP **307** (auth redirect) |
| `/login` | HTTP **200** |
| `/dashboard` | HTTP **307** (auth redirect) |
| `/contacts` | HTTP **307** |
| `/my-deals` | HTTP **307** |
| `/my-opportunities` | HTTP **307** |
| Authenticated workspace BAT (OW / Deal / Activity Timeline / Journey UI) | ⚠️ **Skipped** — no browser session automation in this run; routes protected as expected |

### Wealth Partner

| Probe | Result |
|-------|--------|
| `/` | HTTP **200** |
| `/login` | HTTP **200** |
| `/app`, `/app/deals`, `/app/opportunities`, `/app/customers`, `/app/documents`, `/app/notifications` | HTTP **200** (SPA shell) |

### Gateway

| Probe | Result |
|-------|--------|
| `GET /api/partner/health` | HTTP **200** · `success=true` · `persistence=prisma` · `service=partner_gateway` |
| `GET /api/partner/auth/me` (unauth) | HTTP **401** |
| `POST /api/partner/auth/login` `{}` | HTTP **400** |
| `GET /api/enterprise-notifications` (unauth) | HTTP **401** |

---

## K. Notification smoke results

| # | Check | Result |
|---|-------|--------|
| 1 | Relevant event generates notification | ⚠️ **Not exercised live** — avoided creating production test Opportunities/Deals |
| 2 | Actor does not receive own-activity notification | ✅ Covered by `verify:co-notification-001` (recipient policy) · live event not fired |
| 3 | Manager/team receives notification | ✅ Policy verify · live not fired |
| 4 | Unauthorized user receives nothing | ✅ Unauth API **401**; list scoped to recipient in code |
| 5 | Admin receives authorized enterprise notification | ✅ Policy verify · live not fired |
| 6–9 | Toast UI / 10s dismiss / sound once / silent control | ⚠️ **Requires PO visual inspection** in browser after login |
| 10 | Notification click opens correct workspace | ⚠️ PO visual |
| 11 | Read state works | ⚠️ PO visual / authenticated API |
| 12 | Duplicate delivery deduped | ✅ Unique index `ene_org_dedupe_uidx` present · verify script covers dedupe path |
| 13 | Existing business flows continue | ✅ Opp/Deal counts unchanged · health prisma · auth redirects intact |

**Note:** Interactive authenticated notification BAT was intentionally limited to avoid inventing credentials or creating unnecessary production fixtures. Product Owner should confirm toast UX on a controlled BAT identity during inspection.

---

## L. Security results

| Check | Result |
|-------|--------|
| Unauthenticated ENE API protected | ✅ 401 |
| Unauthenticated Partner `/auth/me` protected | ✅ 401 |
| Partner login rejects empty body | ✅ 400 |
| Partner Access regression (`verify:co-wp-access-001`) | ✅ PASS (pre-deploy) |
| No security weakening for smoke | ✅ |

---

## M. Data integrity results

| Check | Result |
|-------|--------|
| Genuine Opportunities count | **89** (unchanged across migrate + deploy spot-checks) |
| Genuine Deals count | **91** (unchanged) |
| ENE table | Created empty · remains **0** rows (no deploy-time writes) |
| Partner / entitlement / certification fixtures | No cleanup / archive / suspend operations performed |
| Audit records | Not truncated or reset |

---

## N. Warnings

1. Wealth Partner has **no GitHub remote/commits** — deploy was local tree only.  
2. Full interactive notification toast/sound BAT deferred to Product Owner inspection (no new production fixtures).  
3. Authenticated deep-link UI smoke (Activity Timeline tab, My Deals Journey boards) deferred to PO browser inspection; HTTP auth gates confirmed.  
4. Pre-existing lint warnings only (not introduced during deploy).

---

## O. Skipped checks

| Check | Why |
|-------|-----|
| Interactive authenticated C1 workspace smoke | No automated browser session; avoid unsafe credential handling |
| Live notification fan-out on production entities | Avoid unnecessary production test data |
| Toast timing / sound / silent control | Requires logged-in UI observation |
| Partner A vs Partner B ownership live probe | Not run without authorized dual partner credentials in this session |

---

## P. Production URLs

| App | URL |
|-----|-----|
| Catalyst One | https://catalyst-one-two.vercel.app |
| Gateway (same) | https://catalyst-one-two.vercel.app |
| Wealth Partner | https://wealth-partner-app.vercel.app |

---

## Deployed change areas (inspection tree)

Included from current verified working tree:

**Catalyst One / Gateway**

- Dashboard redesign (CO-C1-DASH-001)  
- My Deals / Journey redesign (CO-C1-DEALS-JOURNEY-001)  
- CO-C1-DIALOGUE-002 / 002A — Unified Transaction Activity Timeline  
- CO-NOTIFICATION-001 — Enterprise Notification Engine (+ applied migration)  
- Partner Gateway / ACCESS entitlements and related verified partner surfaces  
- Other accumulated verified C1 work present at checkpoint `9d934e6` / tip `e41ab4c`

**Wealth Partner**

- Current verified My Deals / Journey and related UI / perf / document / resolution work in local `v0.9.3` tree

---

## Final status

✅ **Ready for Product Owner inspection** (001B deployed · 001C verified aliases + WP live markers + migration up to date)  
❌ **Not certified**  
❌ **Not go-live approval**  
❌ **No second migrate / no second Vercel deploy under 001C** (avoid churn on already-live current tree)

**HARD STOP.** Waiting for Product Owner inspection (especially authenticated C1 Dashboard / Timeline / Notification toast confirmation). No further deploy / migrate / cleanup / certification in this task.
