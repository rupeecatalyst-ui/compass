# CO-C1-HEALTH-REMEDIATION-001 — P1 Blocker Investigation & Resolution Plan

**Date:** 2026-08-13  
**Branch:** `compass-hl03-conversation-first`  
**Git HEAD (unchanged):** `e41ab4ce87e8b06e57add4b3e63ba45ad1deee74`  
**Classification:** Investigation + minimal engineering remediation  
**Explicitly NOT done:** Vercel deploy · GitHub push/commit · `prisma migrate deploy` · working-tree reset/discard · Marketing execution flag changes  

---

## Final status

### **BLOCKED — PRODUCT OWNER DECISION REQUIRED**

Engineering gates for TypeScript and production build are **green** on this machine after remediation.  
Two Product Owner decisions still gate a clean certifiable tree / next deploy checkpoint:

1. **CO-NOTIFICATION-001** — APPLY vs explicitly DEFER (durable ENE table)  
2. **Tree authority** — which dirty-tree subset becomes the single GitHub = Vercel = PO baseline  

Deal dual-path residual code is **classified and deprecated for new wiring**; active My Deals / Deal Workspace reads already use Enterprise Deal SSOT. Residual cleanup may proceed later under Architecture Cleanup (no delete performed here beyond documentation / deprecation comment).

---

## 1. TSC / Build blocker

### Root cause

| Hypothesis | Result |
|------------|--------|
| A. Actual TypeScript errors | **YES** (once heap was sufficient) |
| B. OOM-only failure | **Partial history** — prior audit OOM (exit 134) on default heap hid real checking |

**Exact failing command (prior):** `npx tsc --noEmit` without adequate `NODE_OPTIONS` → process abort (OOM), no complete error list.

**Remediation command:**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'
npx tsc --noEmit --pretty false
```

With **8192 MB** heap, `tsc` **completed** and reported a **real** error:

```text
src/lib/enterprise-user-manual/rbac.ts(18,7): error TS2367:
This comparison appears to be unintentional because the types
'UserManualAudience' and '"admin_only"' have no overlap.
```

`UserManualAudience` = `"admin" | "operator" | "all"`.  
`"admin_only"` is a **status** value (`UserManualArticleStatus`), not an audience tag.

### Exact resolution

Fixed `src/lib/enterprise-user-manual/rbac.ts` to compare:

- `article.audience === "admin"` **or**
- `article.status === "admin_only"`

**Did not:** weaken `tsconfig`, skip checks, or permanently raise heap in architecture as a substitute for fixing errors.

### Verification (compiler completed)

| Gate | Command | Exit | Evidence |
|------|---------|------|----------|
| Full TSC | `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` | **0** | `docs/co-c1-health-remediation-001/tsc-8192-after-fix.log` · `TSC_EXIT:0` |
| Production build | `npm run build` (script already uses `--max-old-space-size=8192` for Next) | **0** | `docs/co-c1-health-remediation-001/next-build.log` · `BUILD_EXIT:0` |
| BUILD_ID | Present after successful build | **Yes** | `.next/BUILD_ID` = `myPFPrzIljvwYpBqN79Qg` |

**FULL TSC = PASS** · **Production build = PASS** (compiler completed; not OOM-masked).

### Safest ongoing verification

Always run full `tsc` with at least **8192 MB** heap on this repo size. Prefer the existing `npm run build` path for production compile (already heap-sized). Do not claim PASS if the process exits 134 / abort without a completed diagnostic pass.

---

## 2. CO-NOTIFICATION-001 migration analysis

**Path:** `prisma/migrations/20260811160000_co_notification_001_enterprise_notification/`  
**Prior investigation SSOT:** `docs/co-consolidated-deploy-001/CO-CONSOLIDATED-DEPLOY-001A-MIGRATION-BLOCKER-INVESTIGATION.md`  
**This sprint:** **Did NOT apply** the migration.

### Answers required by PO brief

| Question | Answer |
|----------|--------|
| **Migration required?** | **YES** for durable Enterprise Notification Engine (ENE) when `ENTERPRISE_PERSISTENCE_MODE=prisma` |
| **Required for Contact 360 / Marketing Activation / User Manual core screens?** | **NO** — those capabilities do not own `enterprise_notifications` |
| **Why** | Prisma model + repository target table `enterprise_notifications`. Production historically runs prisma mode; without the table, durable list/mark-read Prisma calls have no relation |
| **Affected feature** | Enterprise Notification Engine (C1 toast/host, `/api/enterprise-notifications*`, Partner Gateway ENE merge) |
| **Affected production tables** | **Creates** `enterprise_notifications` only; FK reference to existing `organizations` |
| **Existing rows changed?** | **NO** — no UPDATE/DELETE/INSERT into Opportunities, Deals, Contacts, etc. |
| **Additive?** | **YES** — `CREATE TABLE IF NOT EXISTS` + indexes + conditional FK |
| **Deploy can proceed without it?** | **YES for non-ENE features**, with degraded notification durability |
| **Exact consequence of not applying** | Fan-out falls back to **process-local soft Map** on write failure; **list/mark-read in durable mode call Prisma directly** (no soft fallback) → inbox/API can error or empty when table missing; notifications **not durable across instances**; Partner durable ENE merge incomplete |

### STOP — Product Owner authorization required

Do **not** silently APPLY or permanently close this item.

**Request explicit PO choice:**

- **A. APPLY** `20260811160000_co_notification_001_enterprise_notification` via authorized `prisma migrate deploy` (additive, empty table), **or**  
- **B. DEFER** — next certifiable deploy **must not claim durable ENE**; document deferred migration in the deployment report  

---

## 3. Dual Deal projection path analysis

### A. What are the two projection paths?

| Path | Mapper / runtime | Stage source | Assignee source | Persistence / read |
|------|------------------|--------------|-----------------|--------------------|
| **1 — Canonical** | `mapEnterpriseDealToDealRegistryRow` + `deal-pipeline-runtime` / `resolveDealStageProjection` | `EnterpriseDeal.grossStage` (SSOT) | Deal assigned-users coalesce (`lendingExtension` / RM user ids / names) | Enterprise Deal Registry API (`enterpriseDealApiClient`) |
| **2 — Legacy LoanFile registry** | `mapLoanFileToDealRegistryRow` / `listDealRegistryRows` | `primaryLender?.caseStage \|\| file.stage` | `file.relationshipManager` | LoanFile / local projection (historical Soft Go-Live) |

**Related (not a competing registry list SSOT):** `mapEnterpriseDealToLoanFileStub` — structure translation **from** Enterprise Deal for LoanFile-shaped consumers (DAL / Mission Control). Stage still prefers Deal `grossStage`.

### B. Which is canonical?

**Enterprise Deal Registry** — `EnterpriseDeal.grossStage` + Deal API assigned-user fields.  
My Deals operational load: `loadMyDealsDealRegistryRows` → API → `mapEnterpriseDealToDealRegistryRow`.  
Deal Workspace: `loadDealPipelineRuntime` → `dealToLenderExecution` uses **grossStage**, never snapshot stage as authority.

### C. Why do both still exist?

Historical Soft Go-Live / CO-SPRINT-098 LoanFile→registry projection was not deleted. Port runtime (`DEAL_REGISTRY_PORT_RUNTIME`) moved My Deals to Enterprise Deal; LoanFile mapper remained exported from `@/lib/my-deals` as residual.

### D. Which path should be removed/deprecated?

**Deprecate / quarantine:** `mapLoanFileToDealRegistryRow` and `listDealRegistryRows` for **operational Deal list/card stage/assignee display**.  
**Keep:** Enterprise Deal path + LoanFile-shaped stub only as structural adapter until Architecture Cleanup authorizes deletion.

**Remediation action taken:** deprecation banner added on `src/lib/my-deals/deal-registry.ts` (do not wire new surfaces). **No store created. No terminology change. No deletion of helpers yet.**

### E. Does removing the duplicate path affect existing functionality?

**Operational UI callers:** Grep shows **no** production component calling `listDealRegistryRows(` / `mapLoanFileToDealRegistryRow` — My Deals / User Home use `loadMyDealsDealRegistryRows`.  
**Filter/sort utilities** in the same module remain useful.  
**Safe next cleanup:** stop exporting LoanFile mappers from `src/lib/my-deals/index.ts` in a dedicated cleanup sprint; full file deletion after five-question removal test (CO-ARCH-006).

### Historical LOST vs LOGGED IN inconsistency

Explained by competing stage authorities: Workspace used Registry `grossStage` (e.g. LOST) while a LoanFile/snapshot-derived surface could show lender case stage (e.g. LOGGED IN / PRE-LOGIN) and RM from LoanFile. **Canonical path avoids that when port/runtime stays on Enterprise Deal.**

---

## 4. Working-tree reconciliation

**HEAD:** `e41ab4ce…` (same as GitHub tip)  
**Local:** dirty — modified + untracked (no reset performed)  
**Categories:** A = C1 refinement · B = Marketing · C = docs · D = generated/artifact · E = unrelated legitimate · F = unknown  

**Keep?** = retain for eventual certifiable tree (not a commit instruction).

### Modified tracked files

| Path | Category | Keep? | Reason |
|------|----------|-------|--------|
| `.env.example` | A/B | Yes | Persistence / Deal port / Marketing env documentation examples |
| `next.config.ts` | A/B | Yes | App config supporting current modules |
| `package.json` / `package-lock.json` | A/B | Yes | Scripts/deps for verify + build |
| `docs/co-consolidated-deploy-001/CO-CONSOLIDATED-DEPLOY-001-DEPLOYMENT-REPORT.md` | C | Yes | Deploy history |
| `scripts/co-notification-001-verify.mjs` | A | Yes | ENE verify |
| `scripts/co-org-003-verify.mjs` | A | Yes | Org verify |
| `server/services/enterprise-notification/enterprise-notification.service.ts` | A | Yes | ENE service (durable vs soft) |
| `src/components/catalyst-one/action-center/*` (deal, outbox, email, whatsapp) | A | Yes | Action Center / comms refinements |
| `src/components/catalyst-one/administration-console/administration-console.tsx` | A | Yes | Admin console (User Manual / Marketing nav) |
| `src/components/catalyst-one/contacts/contact-workspace-modal.tsx` | A | Yes | Contact 360 wire-in |
| `src/components/catalyst-one/enterprise-lender-directory/eld-slide-over.tsx` | A | Yes | Lender directory UX |
| `src/components/catalyst-one/enterprise-notification-engine/enterprise-notification-host.tsx` | A | Yes | Notification host |
| `src/components/catalyst-one/my-deals/deal-lender-journey-board.tsx` | A | Yes | My Deals journey |
| `src/components/catalyst-one/my-deals/opportunity-lender-journey-card.tsx` | A | Yes | My Deals cards |
| `src/components/catalyst-one/transaction-activity-timeline/transaction-activity-timeline.tsx` | A | Yes | Timeline |
| `src/components/catalyst-one/user-home-dashboard/*` | A | Yes | User Home / new opportunities |
| `src/config/navigation.ts` | A | Yes | Nav entries |
| `src/constants/administration-console.ts` | A | Yes | Admin console constants |
| `src/constants/enterprise-action-center/communication-templates.ts` | A | Yes | Templates |
| `src/constants/enterprise-communication-center/*` | A | Yes | ECC |
| `src/constants/enterprise-contact-master/lifecycle.ts` | A | Yes | Contact lifecycle |
| `src/constants/enterprise-lender-directory/ops.ts` | A | Yes | ELD ops |
| `src/constants/enterprise-notification-engine/index.ts` | A | Yes | ENE constants |
| `src/constants/enterprise-user-management/index.ts` | A | Yes | User management |
| `src/constants/routes.ts` | A | Yes | Routes (manual / marketing) |
| `src/constants/user-home-dashboard/new-arrivals.ts` | A | Yes | Home arrivals |
| `src/lib/enterprise-action-center/*` | A | Yes | Action Center libs |
| `src/lib/enterprise-activity-registry/transaction-timeline.ts` | A | Yes | EAR timeline |
| `src/lib/enterprise-communication-center/index.ts` | A | Yes | ECC lib |
| `src/lib/enterprise-contact-master/workspace-tabs.ts` | A | Yes | Contact workspace tabs |
| `src/lib/enterprise-deal/map-deal-to-registry-row.ts` | A | Yes | Canonical Deal→registry projection |
| `src/lib/enterprise-notification-engine/*` | A | Yes | ENE client helpers |
| `src/lib/my-deals/deal-registry.ts` | A | Yes | Filters + deprecated LoanFile mapper |
| `src/lib/my-deals/derive-opportunity-executive-summary.ts` | A | Yes | My Deals summary |
| `src/lib/my-deals/group-opportunities.ts` | A | Yes | My Deals grouping |
| `src/lib/user-home-dashboard/command-center/load-new-opportunities.ts` | A | Yes | Command Center load |
| `src/types/dashboard-command-center.ts` | A | Yes | Types |
| `src/types/deal-registry.ts` | A | Yes | Deal registry types |
| `src/types/enterprise-notification-engine.ts` | A | Yes | ENE types |

### Untracked (keep for certifiable tree unless noted)

| Path | Category | Keep? | Reason |
|------|----------|-------|--------|
| `content/enterprise-user-manual/` | A/C | Yes | User Manual Markdown SSOT |
| `src/app/(dashboard)/admin/user-manual/` | A | Yes | User Manual routes |
| `src/components/catalyst-one/enterprise-user-manual/` | A | Yes | User Manual UI |
| `src/constants/enterprise-user-manual/` | A | Yes | Manual constants |
| `src/lib/enterprise-user-manual/` | A | Yes | Manual lib (**includes TSC fix in `rbac.ts`**) |
| `src/types/enterprise-user-manual.ts` | A | Yes | Manual types |
| `docs/co-c1-admin-user-manual-001/` | C | Yes | Manual sprint docs |
| `scripts/co-c1-admin-user-manual-001-verify.mjs` | A | Yes | Manual verify |
| `src/components/catalyst-one/contacts/contact-360-intelligence-panel.tsx` | A | Yes | Contact 360 UI |
| `src/components/catalyst-one/contacts/add-explicit-relationship-dialog.tsx` | A | Yes | Contact relationship UX |
| `src/lib/enterprise-contact-master/compose-contact-360.ts` | A | Yes | Contact 360 compose |
| `docs/co-c1-contact-360-ux-refinement-002/` | C | Yes | Contact 360 report |
| `docs/co-c1-refinements-20260812/` | C | Yes | Refinement report |
| `docs/co-c1-consolidated-deploy-20260812/` | C | Yes | Consolidated deploy report |
| `docs/co-c1-consolidated-deploy-20260812-build-log.txt` | D | Optional | Build log artifact — keep for evidence or omit from Git checkpoint |
| `docs/co-c1-health-audit-20260813/` | C | Yes | Health audit |
| `docs/co-c1-health-remediation-001/` | C | Yes | **This remediation** (+ tsc/build logs) |
| `docs/co-consolidated-deploy-001/CO-CONSOLIDATED-DEPLOY-001A-MIGRATION-BLOCKER-INVESTIGATION.md` | C | Yes | Migration investigation |
| `docs/co-notification-001/CO-NOTIFICATION-001B-VISUAL-REFINEMENT-REPORT.md` | C | Yes | Notification visual report |
| `server/services/enterprise-marketing-engine/` | B | Yes | Marketing engine services |
| `src/app/(dashboard)/admin/marketing/` | B | Yes | Marketing admin UI routes |
| `src/app/api/admin/marketing/` | B | Yes | Marketing APIs |
| `src/app/api/cron/marketing-execution/` | B | Yes | Marketing cron (flags remain OFF) |
| `src/components/catalyst-one/admin/marketing/` | B | Yes | Marketing UI |
| `src/constants/enterprise-marketing-engine/` | B | Yes | Marketing constants |
| `src/lib/enterprise-marketing-engine/` | B | Yes | Marketing lib |
| `src/types/enterprise-marketing-*.ts` | B | Yes | Marketing types |
| `docs/co-marketing-*` (arch, align, mkt-01…13, activation-002) | C | Yes | Marketing programme docs |
| `scripts/co-marketing-*-verify.mjs` | B | Yes | Marketing verify scripts |
| `src/app/(dashboard)/organization/communication/` | A | Yes | Org communication surface |
| `src/constants/enterprise-communication-center/corporate-branding.ts` | A | Yes | Corporate branding |
| `src/lib/enterprise-communication-center/corporate-identity.ts` | A | Yes | Corporate identity |

**None classified for deletion.** No F-unknown paths in the current porcelain snapshot; treat any later stray files as F until reviewed.

---

## 5. Tree authority — target certifiable tree

### Current identity problem

| Tree | State |
|------|--------|
| **GitHub** | Clean tip `e41ab4ce…` |
| **Local** | Same HEAD + dirty working tree (A+B+C refinements above) |
| **Vercel production alias** | Historically a **dirty-tree deploy** identity (not proven equal to GitHub tip) |

### Target (required before next checkpoint)

**ONE CLEAN, EXPLICITLY IDENTIFIED TREE** that will become:

```text
GitHub checkpoint  =  Vercel deployment  =  PO certification baseline
```

### Recommended candidate (pending PO)

**Local working tree at HEAD `e41ab4ce…` + all Keep=Yes A/B/C paths above**, after:

1. PO **APPLY or DEFER** CO-NOTIFICATION-001  
2. Explicit milestone **commit** (when PO asks) of that set  
3. **Then** Vercel deploy from that committed tree (not an ad-hoc dirty deploy)  
4. Record commit SHA + deployment id as certification baseline  

**Optional omit from Git:** `docs/co-c1-consolidated-deploy-20260812-build-log.txt` and large remediation `*.log` files (keep locally as evidence).

**Do not deploy** until PO confirms tree composition + migration decision.

---

## 6. Remaining P1 blockers

| # | Blocker | Status after remediation |
|---|---------|---------------------------|
| 1 | Local ≠ GitHub ≠ proven Vercel file set | **OPEN** — awaits PO tree authority + commit + deploy identity |
| 2 | CO-NOTIFICATION-001 migration decision | **OPEN** — PO APPLY vs DEFER required |
| 3 | Full TSC / BUILD_ID | **CLOSED** — TSC PASS · build PASS · BUILD_ID present locally |
| 4 | Dual Deal projection path | **MITIGATED** — canonical path confirmed active; LoanFile registry mapper deprecated for new wiring; deletion deferred to cleanup |

---

## 7. Recommended next step

1. **Product Owner:** choose **APPLY** or **DEFER** for `20260811160000_co_notification_001_enterprise_notification`.  
2. **Product Owner:** approve the **candidate certifiable tree** (A+B+C Keep=Yes set above).  
3. **When authorized:** single milestone **Git commit** (no push unless asked) → **then** Vercel deploy from that commit → share URL + Certification Report.  
4. **Later cleanup sprint:** remove exports of `mapLoanFileToDealRegistryRow` / `listDealRegistryRows` after CO-ARCH-006 five-question test.  

---

## Engineering changes in this remediation (no deploy / no commit)

| Change | Purpose |
|--------|---------|
| `src/lib/enterprise-user-manual/rbac.ts` | Fix real TS2367 so full `tsc` completes green |
| `src/lib/my-deals/deal-registry.ts` | Deprecation notice — protect canonical Deal SSOT |
| `docs/co-c1-health-remediation-001/*` | This report + verification logs |

---

## Final status (repeat)

# BLOCKED — PRODUCT OWNER DECISION REQUIRED

**Engineering:** TSC PASS · Production build PASS · Deal dual-path classified/deprecated for new use.  
**Blocked on PO:** Notification migration APPLY vs DEFER · certifiable tree identity before next GitHub checkpoint / Vercel deploy.
