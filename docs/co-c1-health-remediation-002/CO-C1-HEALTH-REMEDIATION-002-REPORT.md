# CO-C1-HEALTH-REMEDIATION-002 — APPLY CO-NOTIFICATION-001

**Date:** 2026-08-13  
**Branch:** `compass-hl03-conversation-first`  
**Git HEAD (unchanged):** `e41ab4ce87e8b06e57add4b3e63ba45ad1deee74`  
**Product Owner decision:** **APPLY** `20260811160000_co_notification_001_enterprise_notification`  
**Explicitly NOT done:** Git commit · GitHub push · Vercel deploy · Marketing live flags · deletion of LoanFile Deal mapper  

---

## Final status

# READY FOR CLEAN CHECKPOINT

Engineering and database gates for the authorized migration and certifiable working tree are complete.  
Await Product Owner approval before commit / push / Vercel deploy.

---

## 1. Migration — preflight

| Check | Result |
|-------|--------|
| Migration path | `prisma/migrations/20260811160000_co_notification_001_enterprise_notification/` |
| SQL inspected | Additive only: `CREATE TABLE IF NOT EXISTS enterprise_notifications` + indexes + conditional FK to `organizations` |
| Destructive ops | **None** (no DROP/TRUNCATE/DELETE/UPDATE of business rows) |
| Env target | Credentials via `.env.local` (same pattern as CO-CONSOLIDATED-DEPLOY-001). Prisma default `.env` lacks `DIRECT_URL`. |
| Production DB fingerprint | PostgreSQL `postgres` / schema `public` at `aws-0-ap-southeast-1.pooler.supabase.com:5432` (Supabase pooler session port — migration-capable) |
| `prisma migrate status` | **Database schema is up to date!** — 45 migrations found |

### Apply outcome

**Migration was already applied** on the production-linked database before this sprint executed `migrate deploy`.

Therefore:

- **Did NOT** re-run `prisma migrate deploy` (would be a no-op; avoids unnecessary DDL lock)
- **Did NOT** apply any unrelated migration (none pending)
- PO **APPLY** intent is **satisfied by verified present state**

Evidence: `docs/co-c1-health-remediation-002/preflight-migrate-status.txt`

---

## 2. Migration — post verification

Read-only probe: `docs/co-c1-health-remediation-002/verify-ene-migration.mjs`  
(run with `node --env-file=.env.local …`)

| Check | Result |
|-------|--------|
| `_prisma_migrations` row for `20260811160000_co_notification_001_enterprise_notification` | **Present** · finished · not rolled back |
| Table `enterprise_notifications` | **Exists** |
| Indexes | `enterprise_notifications_pkey`, `ene_org_dedupe_uidx`, `ene_org_user_occurred_idx`, `ene_org_partner_occurred_idx`, `ene_org_read_occurred_idx` |
| FK `enterprise_notifications_organization_id_fkey` | **Present** |
| Applied migration count | **45** (all repo migrations) |
| Existing business tables unaffected | `organizations` count **1** · `enterprise_deals` count **95** (read-only counts; no mutation) |
| ENE rows | **7** notifications already present (durable path in use) |

Prisma migration state: **consistent** with schema + filesystem migrations.

---

## 3. Engineering verification

| Gate | Result | Evidence |
|------|--------|----------|
| Full TSC (`NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`) | **PASS** (exit 0) | `tsc.log` |
| Production build (`npm run build`) | **PASS** (exit 0) | `next-build.log` · `BUILD_ID=abcJF-1HFxl9s4aC69jPw` |
| `verify:co-notification-001` | **PASS** | `verify-notification.log` |
| Consolidated C1 (`co-c1-consolidated-deploy-20260812-verify`) | **PASS** | Contact 360 · Lender 360 · Deal stage · Marketing flags OFF · ENE migration note |
| User Manual (`verify:co-c1-admin-user-manual-001`) | **PASS** | 15 articles · 6 marketing |
| Marketing activation (`verify:co-marketing-activation-002`) | **PASS** | live execution **false** · provider connect **false** |
| Marketing MKT-13 (`verify:co-marketing-mkt-13`) | **PASS** | safety / ledger / RBAC |
| Lender directory (`verify:co-arch-eld-001`) | **PASS** | Lender 360 surface |
| Deals journey (`co-c1-deals-journey-001-verify`) | **PASS** | Deal consistency signals |
| Dashboard (`co-c1-dash-001-verify`) | **PASS** | Command center |

Checks were **not** weakened.

---

## 4. Deal projection result

| Path | Status |
|------|--------|
| **Canonical** — Enterprise Deal API → `mapEnterpriseDealToDealRegistryRow` → My Deals / Deal Workspace | **Unchanged · active** |
| **Legacy** — LoanFile → `mapLoanFileToDealRegistryRow` | **Retained** (deprecated for new wiring; **not deleted** this task) |

Grep: no UI callers of `mapLoanFileToDealRegistryRow` / `listDealRegistryRows(` outside `deal-registry.ts` and re-export in `my-deals/index.ts`.  
No new Deal projection introduced. Canonical Enterprise Deal API not altered in this sprint.

---

## 5. Working-tree reconciliation

**HEAD:** `e41ab4ce…` (same as GitHub tip)  
**Local:** dirty working tree preserved (no reset/revert/discard)

Categories for this remediation:

| Code | Meaning |
|------|---------|
| A | Required Catalyst One refinements |
| B | Required Marketing work |
| C | Required User Manual work |
| D | Required migration changes |
| E | Generated/build artifacts |
| F | Unrelated legitimate work |
| G | Unknown |

### D — Migration

| Path | Keep in checkpoint? | Notes |
|------|---------------------|-------|
| `prisma/migrations/20260811160000_co_notification_001_enterprise_notification/` | **Yes** (already on HEAD) | No additional local migration file edits required; DB already applied |

### Modified tracked files

| Path | Cat | Checkpoint? | Reason |
|------|-----|-------------|--------|
| `.env.example` | A/B | Yes | Env documentation |
| `next.config.ts` | A/B | Yes | App config |
| `package.json` / `package-lock.json` | A/B | Yes | Scripts/deps |
| `docs/co-consolidated-deploy-001/CO-CONSOLIDATED-DEPLOY-001-DEPLOYMENT-REPORT.md` | A | Yes | Deploy history |
| `scripts/co-notification-001-verify.mjs` | A | Yes | ENE verify |
| `scripts/co-org-003-verify.mjs` | A | Yes | Org verify |
| `server/services/enterprise-notification/enterprise-notification.service.ts` | A | Yes | Durable ENE |
| `src/components/catalyst-one/action-center/**` | A | Yes | Follow-up / email / WhatsApp / outbox |
| `src/components/catalyst-one/administration-console/administration-console.tsx` | A/C | Yes | Admin + manual/marketing entry |
| `src/components/catalyst-one/contacts/contact-workspace-modal.tsx` | A | Yes | Contact 360 |
| `src/components/catalyst-one/enterprise-lender-directory/eld-slide-over.tsx` | A | Yes | Lender 360 |
| `src/components/catalyst-one/enterprise-notification-engine/enterprise-notification-host.tsx` | A | Yes | ENE host |
| `src/components/catalyst-one/my-deals/**` | A | Yes | Deal consistency |
| `src/components/catalyst-one/transaction-activity-timeline/**` | A | Yes | Timeline |
| `src/components/catalyst-one/user-home-dashboard/**` | A | Yes | Dashboard refinements |
| `src/config/navigation.ts` | A | Yes | Nav |
| `src/constants/**` (admin, ECC, ECM, ELD, ENE, routes, home) | A | Yes | Constants |
| `src/lib/enterprise-action-center/**` | A | Yes | Action Center |
| `src/lib/enterprise-activity-registry/transaction-timeline.ts` | A | Yes | EAR |
| `src/lib/enterprise-communication-center/index.ts` | A | Yes | ECC / operational email |
| `src/lib/enterprise-contact-master/workspace-tabs.ts` | A | Yes | Contact tabs |
| `src/lib/enterprise-deal/map-deal-to-registry-row.ts` | A | Yes | Canonical Deal projection |
| `src/lib/enterprise-notification-engine/**` | A | Yes | ENE |
| `src/lib/my-deals/**` | A | Yes | My Deals + deprecated LoanFile mapper retained |
| `src/lib/user-home-dashboard/command-center/load-new-opportunities.ts` | A | Yes | Dashboard |
| `src/types/dashboard-command-center.ts` | A | Yes | Types |
| `src/types/deal-registry.ts` | A | Yes | Deal registry types |
| `src/types/enterprise-notification-engine.ts` | A | Yes | ENE types |

### Untracked — include in certification checkpoint

| Path | Cat | Checkpoint? | Reason |
|------|-----|-------------|--------|
| `content/enterprise-user-manual/` | C | **Yes** | Manual Markdown SSOT |
| `src/app/(dashboard)/admin/user-manual/` | C | **Yes** | Manual routes |
| `src/components/catalyst-one/enterprise-user-manual/` | C | **Yes** | Manual UI |
| `src/constants/enterprise-user-manual/` | C | **Yes** | Manual constants |
| `src/lib/enterprise-user-manual/` | C | **Yes** | Manual lib (incl. rbac TSC fix) |
| `src/types/enterprise-user-manual.ts` | C | **Yes** | Manual types |
| `docs/co-c1-admin-user-manual-001/` | C | **Yes** | Manual docs |
| `scripts/co-c1-admin-user-manual-001-verify.mjs` | C | **Yes** | Manual verify |
| `src/components/catalyst-one/contacts/contact-360-intelligence-panel.tsx` | A | **Yes** | Contact 360 |
| `src/components/catalyst-one/contacts/add-explicit-relationship-dialog.tsx` | A | **Yes** | Contact relationships |
| `src/lib/enterprise-contact-master/compose-contact-360.ts` | A | **Yes** | Contact 360 compose |
| `docs/co-c1-contact-360-ux-refinement-002/` | A | **Yes** | Contact 360 report |
| `docs/co-c1-refinements-20260812/` | A | **Yes** | Refinements report |
| `docs/co-c1-consolidated-deploy-20260812/` | A | **Yes** | Consolidated deploy report |
| `docs/co-c1-health-audit-20260813/` | A | **Yes** | Health audit |
| `docs/co-c1-health-remediation-001/CO-C1-HEALTH-REMEDIATION-001-REPORT.md` | A | **Yes** | Prior remediation report |
| `docs/co-c1-health-remediation-002/CO-C1-HEALTH-REMEDIATION-002-REPORT.md` | A | **Yes** | **This report** |
| `docs/co-consolidated-deploy-001/CO-CONSOLIDATED-DEPLOY-001A-MIGRATION-BLOCKER-INVESTIGATION.md` | D/A | **Yes** | Migration investigation |
| `docs/co-notification-001/CO-NOTIFICATION-001B-VISUAL-REFINEMENT-REPORT.md` | A | **Yes** | ENE visual report |
| `server/services/enterprise-marketing-engine/` | B | **Yes** | Marketing engine |
| `src/app/(dashboard)/admin/marketing/` | B | **Yes** | Marketing UI routes |
| `src/app/api/admin/marketing/` | B | **Yes** | Marketing APIs |
| `src/app/api/cron/marketing-execution/` | B | **Yes** | Cron (flags remain OFF) |
| `src/components/catalyst-one/admin/marketing/` | B | **Yes** | Marketing panels |
| `src/constants/enterprise-marketing-engine/` | B | **Yes** | Marketing constants |
| `src/lib/enterprise-marketing-engine/` | B | **Yes** | Marketing lib |
| `src/types/enterprise-marketing-*.ts` | B | **Yes** | Marketing types |
| `docs/co-marketing-*` | B | **Yes** | Marketing programme docs |
| `scripts/co-marketing-*-verify.mjs` | B | **Yes** | Marketing verifies |
| `scripts/co-c1-consolidated-deploy-20260812-verify.mjs` | A | **Yes** | Consolidated verify |
| `src/app/(dashboard)/organization/communication/` | A | **Yes** | Operational email / communication |
| `src/constants/enterprise-communication-center/corporate-branding.ts` | A | **Yes** | Corporate branding |
| `src/lib/enterprise-communication-center/corporate-identity.ts` | A | **Yes** | Corporate identity |

### Exclude from certification checkpoint (keep locally; do not discard)

| Path | Cat | Checkpoint? | Reason |
|------|-----|-------------|--------|
| `docs/co-c1-consolidated-deploy-20260812-build-log.txt` | E | **No** | Build log artifact |
| `docs/co-c1-health-remediation-001/*.log` | E | **No** | Verification logs |
| `docs/co-c1-health-remediation-002/*.log` | E | **No** | Verification logs |
| `docs/co-c1-health-remediation-002/preflight-migrate-status.txt` | E | Optional | Status capture (secrets-free; optional evidence) |
| `docs/co-c1-health-remediation-002/post-verify-db.json.txt` | E | Optional | DB verify JSON (counts only) |
| `docs/co-c1-health-remediation-002/verify-ene-migration.mjs` | E/A | Optional | Ad-hoc probe script — may omit from checkpoint |
| `.next/` | E | **No** | Build output (local) |

**No G (unknown) paths** in current porcelain. **No F** unrelated experimental work identified in this snapshot. All legitimate work preserved.

---

## 6. Exact certifiable tree (checkpoint contents)

**Identity target:**

```text
ONE clean certification checkpoint
= HEAD e41ab4ce… + all Checkpoint=Yes paths above
= subsequent GitHub milestone commit (when PO authorizes)
= subsequent Vercel deploy from that commit (when PO authorizes)
= PO certification baseline
```

**Must include workstreams:**

- Contact 360° UX-002  
- Lender 360°  
- Dashboard refinements  
- Deal consistency (canonical Enterprise Deal projection)  
- Follow-up / Send Email / Action Center  
- Operational Email Configuration / Org Communication  
- Enterprise Notification Engine (code + **DB migration already applied**)  
- Approved Marketing implementation in repo (live flags remain **OFF**)  
- Enterprise / Marketing User Manual  

**Must not include:** generated build logs, `.next`, experimental unknowns, Marketing live enablement.

---

## 7. Remaining blockers

| Item | Status |
|------|--------|
| CO-NOTIFICATION-001 on production DB | **Closed** — applied + verified |
| TSC / Build | **Closed** — PASS |
| Dual Deal projection deletion | **Out of scope** — legacy retained as required |
| Clean Git checkpoint | **Awaiting PO** — do not commit until approved |
| Vercel deploy matching checkpoint | **Awaiting PO** |
| Marketing live execution / providers | **Remain OFF** (verified) |

---

## 8. STOP

Completed: migration confirmation · DB verification · TSC · build · domain verifies · Deal projection confirmation · working-tree reconciliation · this report.

**Did not:** commit · push · deploy · enable Marketing live execution · enable live providers · delete LoanFile Deal mapper.

**Wait for Product Owner approval** for the clean certification checkpoint.
