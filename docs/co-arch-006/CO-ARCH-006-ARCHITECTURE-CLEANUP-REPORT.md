# CO-ARCH-006 — Enterprise Architecture Cleanup & Runtime Simplification

**Status:** Architecture Cleanup Sprint (post CO-ARCH-005 Deal-only runtime)  
**Date:** 2026-07-26  
**Scope:** Remove obsolete Soft Go-Live / LoanFile book / duplicate persist components that no longer participate in the target architecture.  
**Non-goals:** No business behaviour change, no new features, no Registry / Session / lifecycle redesign.

---

## Permanent engineering principle

Every major Catalyst One architecture milestone ends with an **Architecture Cleanup Sprint** before the next feature sprint:

```text
Architecture → Implementation → Stabilization → BAT → Architecture Cleanup → Next Sprint
```

**Removal rule (five questions):**

1. Belong to current enterprise architecture?  
2. Used by any active business workflow?  
3. Another component already performs the same responsibility?  
4. Can Catalyst One function correctly if this is removed?  
5. Does removing it simplify the runtime?

If answers are **No / No / Yes / Yes / Yes** → **delete** (do not deprecate, do not keep dormant).

---

## Category A — Safe to Remove Immediately

*(Zero active `src` consumers after verification; deleted in this sprint.)*

See also: `docs/co-arch-006/CO-ARCH-006-PRE-DELETION-VERIFICATION.md`

| Component | Status |
|-----------|--------|
| `resolve-deal-file.ts` | **Deleted** (after BAT script retarget) |
| `persist-pipeline-lenders.ts` | **Deleted** |
| Soft Go-Live Loan Files book cluster | **Deleted** |
| Orphan dashboard Soft Go-Live widgets | **Deleted** |
| Dead exports (`clearDealProjections`, `verifyLoanFileDealConsistency`, sync ensure) | **Removed** |
| Stale verify scripts (001 / 004 retirement) | **Deleted** |

**Deletion gate used:** zero imports · zero routes · zero runtime refs · typecheck green.

---

## Category B — Remove After Small Refactor

| Component | Blocker / redirect first |
|-----------|--------------------------|
| `LoanWorkspaceModal` as Deal UI | Redirect Customer 360 open-deal → `/deals/:dealId` |
| `loan-files-storage` Soft Go-Live writes | Opportunity Workspace, Credit Bench, LIFE case context still call `load/saveLoanFiles` |
| `use-loan-files-workspace` + `LoanFilesProvider` | Loan Information + Operations Intelligence still mount provider |
| `dual-write.ts` operational path | Formal Soft Go-Live decommission + cutover panel cleanup |
| `shadow-read.ts` / reconciliation Soft Go-Live half | Admin cutover panel still imports metrics |
| `scripts/co-arch-004-bat-verify.mjs` | Review assumptions vs CO-ARCH-005 before delete |
| Layout special-cases for `ROUTES.LOAN_FILES` | Keep redirect route; slim layout once bookmarks settle |

---

## Category C — Keep

| Component | Why keep |
|-----------|----------|
| `deal-pipeline-runtime.ts` + `DealWorkspaceHost` | Canonical Deal Workspace / Pipeline |
| `move-to-deal.ts` + `createDealFromOpportunity` | Canonical Move to Deal |
| `deal-api-client` + Enterprise Session Deal cache | Registry + session SSOT |
| `deal-data-access` / `map-*-loan-file` / `deal-projection-cache` / `persist-deal-mutation` | Still required while Customer 360 / LIFE / Radar speak LoanFile-shaped projections |
| `ensureLoanWorkspaceForOpportunityAsync` | LIFE pre-Move attachment |
| FS-01 Opportunity runtime adapter | Opportunity-before-Deal projection |
| `/loan-files` redirect page + `ROUTES.LOAN_FILES` | Bookmark / deep-link compatibility (redirect only) |
| Deal Registry flags / cutover-health / rollback recipes | Emergency ops until Soft Go-Live formally retired |
| `file-timeline`, `loan-create-form-dialog`, Loan Information, Operations Intelligence analytics | Active workflows |

---

## Cleanup actions this sprint

1. Deleted Category A modules and stale verify scripts.  
2. Removed dead exports (`clearDealProjections`, `verifyLoanFileDealConsistency`, sync `ensureLoanWorkspaceForOpportunity`).  
3. Documented Category B backlog for next cleanup after Customer 360 → Deal Workspace redirect and Soft Go-Live write retirement.

---

## Next Architecture Cleanup backlog (B)

1. Customer 360 → open Enterprise Deal Workspace (retire modal as Deal host).  
2. Stop Opportunity / Credit Soft Go-Live `saveLoanFiles` writes.  
3. Retire dual-write + shadow-read when flags permanently OFF.  
4. Collapse LoanFile-shaped DAL once no Deal consumer needs projection.

---

## Definition of Done (this sprint)

- [x] Five-question audit documented  
- [x] Category A removed (not deprecated)  
- [x] Category B/C classified honestly  
- [x] No intentional business behaviour change  
- [x] Typecheck / deploy after cleanup
