# CO-ARCH-002 — Legacy Loan File Retirement Report

**Programme:** CO-ARCH-002  
**Date:** 2026-07-27  
**Status:** Wave 1 Complete — Business entity retired · DTO projection quarantined  
**Canonical model:** Contact / Company → Opportunity → Deal  

---

## Constitutional Health Check

| Check | Result |
|-------|--------|
| Aligns with ADR-019 / Opportunity → Deal | ✅ GREEN |
| No Prisma `LoanFile` model (already absent) | ✅ |
| Does not reopen ADR-018 Draft / Lead Information | ✅ |
| FS-01 LoanFile-**shaped** projection retained as quarantine (not SSOT) | ✅ Explicit |
| User-facing Loan File terminology removed | ✅ Wave 1 |

**CHC:** GREEN for Wave 1 (terminology + constitutional freeze + redirect).  
Full TypeScript identifier rename (`LoanFile` → Deal/Opp DTOs across ~190 files) is **Wave 2** — tracked below as quarantine, not silent dual SSOT.

---

## Executive verdict

| Criterion | Status |
|-----------|--------|
| No user-facing Loan File terminology | ✅ |
| No Prisma Loan File business model | ✅ (never present / remains absent) |
| Opportunity + Deal are the only loan-processing business entities | ✅ |
| `/loan-files` is not a registry book | ✅ Redirect shell only |
| Zero LoanFile-shaped DTO references in codebase | ⏸️ Wave 2 quarantine |
| Dual-write as Deal write path | ✅ Already no-op when Registry operational (CO-ARCH-004) |

**Production Readiness (this wave):** **8.2 / 10** for business-entity retirement.  
Identifier quarantine remains until Wave 2 Replacement Certification.

---

## Canonical data model (frozen)

```
Contact / Company
        ↓
   Opportunity
        ↓
      Deal
```

No intermediate Loan File entity.

---

## Modules changed (Wave 1)

### Navigation & routes
| Module | Change |
|--------|--------|
| Primary nav (`navigation.ts`) | Already had no Loan Files item — verified |
| `ROUTES.LOAN_FILES` | Documented CO-ARCH-002 redirect-only deprecation |
| `/loan-files` page | Remains redirect → Deal Workspace / My Deals / Loan Journey |

### User-facing terminology (removed / replaced)
| Module / area | Legacy dependency removed |
|---------------|---------------------------|
| Soft Delete labels | `"Loan Files"` → `"Deals"` |
| Production Reset presets | `"Deals / Loan Files"` → `"Deals"` |
| Lender Workspace origin labels | `"Loan File"` → `"Loan Workspace"` |
| Invoice workspace Fact label | `"Loan File"` → `"Deal"` |
| Customer 360 toasts / dialogs | Loan file created → Deal created |
| Loan create / information workspaces | Create loan file → Create Deal |
| Lead Information guard copy | Loan Files or Deals → Deals |
| Contact workspace empty state | No active loan files → No active Deals |
| Analyze Deal / LIFE / Lenders workspace copy | Loan File → Deal / Loan Workspace |
| Opportunity workspace context messages | persisted Loan File → Deal |
| Chanakya Guide repository | loan file mentor/registry strings → Deal / Loan Workspace / Opportunity |
| Chanakya loan-journey constants | loan file objectives → Deal / Loan Workspace |
| Business Journey Navigator purposes | loan file → Deal |
| Action Center communication templates | loan file → deal |
| Chanakya Live Intelligence ticker | Loan files → Deals |
| Mission Control enterprise search | `entityType: "loan_file"` → `"deal"`; descriptions updated |
| Mission Control security / observability labels | Loan file → Deal / Loan Workspace |
| LIFE case-context city blocker | Loan File → Deal |
| Strategic lender pipeline sync errors | Loan file not found → Deal not found |
| Dashboard / mock seed display strings | loan files → Deals |
| New Arrivals commented title | New Loan Files → New Deals |
| Production Reset service filter label | Loan Files (Deal projections) → Deal projections |

### Schema / types / governance
| Module | Change |
|--------|--------|
| Prisma `EnterpriseOpportunity.legacyLoanFileId` | Documented as retired bridge (not entity FK) |
| Prisma `EnterpriseDeal.legacyLoanFileId` | Documented as retired bridge |
| `LoanFile` TypeScript interface family | `@deprecated` — projection only, not SSOT |
| Cursor rule | `.cursor/rules/loan-file-retirement-co-arch-002.mdc` |
| Verify script | `npm run arch:loanfile-retirement:verify` |

---

## Legacy dependencies inventory — disposition

### A. Fully retired (business entity)
| Dependency | Disposition |
|------------|-------------|
| Prisma `model LoanFile` / `loan_files` table | **Absent** — must not be introduced |
| Primary nav “Loan Files” | **Removed** (already) |
| `/loan-files` as live registry book | **Retired** — redirect only |
| Soft-delete display “Loan Files” | **Relabeled** Deals |
| Mission Control `entityType: loan_file` | **Remapped** to `deal` |
| User-facing “Loan File(s)” product strings in UI constants/components | **Swept** (Wave 1 verify) |

### B. Quarantined — Wave 2 rename (do not expand; not business SSOT)
| Dependency | Role | Why retained |
|------------|------|--------------|
| `LoanFile` type (`src/types/catalyst-one.ts`) | UI/runtime DTO | ~190 `src` consumers; FS-01 + Deal Workspace still project through it |
| `opportunity-runtime-adapter.ts` | FS-01 Opp → LoanFile-shaped view | Opportunity stages consume projection |
| `map-deal-to-loan-file.ts` / `map-loan-file-to-deal.ts` | Deal ↔ projection bridge | Deal Workspace UI |
| `deal-data-access.ts` dual-write / primary-write / projection cache | Operational cutover helpers | Writes already Registry-primary (CO-ARCH-004) |
| `loan-files-storage.ts` / `loan-files-utils.ts` | Local projection cache | Gated when Registry operational |
| `ensure-loan-workspace.ts` | LIFE → Deal attachment | Name historical; creates Deal path |
| `active-context.fileId` | Optional Deal attachment id | Journey continuity |
| `legacyLoanFileId` columns + repo finders | Historical Soft Go-Live bridge | Lookups / continuity; not entity identity |
| `components/catalyst-one/loan-files/*` | Shared widgets (timeline, create dialog, analytics host) | Still imported by Deal/Journey/Customer surfaces — rename folder in Wave 2 |
| Soft-delete module id `loan_files` | Stub key | Label is Deals; key rename in Wave 2 |

### C. Already retired by prior programmes (confirmed)
| Programme | Outcome |
|-----------|---------|
| CO-ARCH-004 | Deal Registry primary writes; dual-write no-op when operational |
| ADR-019 | Deal Workspace `/deals/:dealId` canonical |
| ADR-018 / Wave 3 | Loan Journey hub — not Loan Files book |
| FS-01 | Opportunity Registry runtime authority (projection may remain LoanFile-shaped) |

---

## What was explicitly **not** done in Wave 1 (and why)

1. **Mass rename `LoanFile` → `DealProjection` across ~190 files** — high blast radius; requires typed Replacement Certification (Wave 2).
2. **Drop `legacyLoanFileId` columns** — still used for Soft Go-Live continuity lookups; drop after Wave 2 + BAT.
3. **Delete `loan-files` component folder** — still mounted by Customer 360, Loan Journey navigator, Deal workspace timeline, Operations Intelligence analytics.
4. **Remove FS-01 adapter** — Opportunity stages still depend on LoanFile-shaped case until retyped.

These are **quarantined**, not active Loan File business entities.

---

## Success criteria checklist

| Criterion | Wave 1 |
|-----------|--------|
| No user-facing Loan File terminology remains | ✅ |
| No runtime dependency on legacy Loan File **model** | ✅ (no model) |
| Opportunity and Deal are the only business entities for loan processing | ✅ |
| All modules function without legacy compatibility **as SSOT** | ✅ (compatibility is projection-only) |
| Codebase simplified / aligned with frozen architecture | ✅ governance + terminology; Wave 2 for identifier cleanup |

---

## Verification

```bash
npm run arch:loanfile-retirement:verify
```

---

## Wave 2 backlog (Replacement Certification required)

1. Introduce `ExecutionWorkspaceProjection` (or Deal-native UI types) and migrate consumers off `LoanFile`.
2. Rename `components/catalyst-one/loan-files` → deal/workspace shared widgets.
3. Retire `loan-files-storage` when zero operational readers remain.
4. Drop `legacyLoanFileId` after backfill/BAT confirmation.
5. Soft-delete module id rename `loan_files` → `deals`.
6. Issue Replacement Certification per pre-launch policy.

---

## Final status

✅ **Ready for Business Certification of Wave 1 (Loan File business-entity retirement)**  

Wave 2 (DTO identifier eradication) remains scheduled — constitutionally frozen as quarantine, not dual SSOT.
