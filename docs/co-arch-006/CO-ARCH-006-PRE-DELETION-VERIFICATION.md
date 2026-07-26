# CO-ARCH-006 — Pre-Deletion Verification (final)

**Rule applied:** Zero imports · Zero routes · Zero runtime refs · Build · Then delete.

## Deleted after verification (filesystem confirmed)

| Path | Imports | Routes | Runtime | Notes |
|------|---------|--------|---------|-------|
| `persist-pipeline-lenders.ts` | 0 | 0 | 0 | Already gone prior to this pass |
| Soft Go-Live Loan Files book cluster (`loan-files-workspace`, kanban/list/timeline/toolbar/create-modal/detail-sheet/…) | 0 external | 0 (`/loan-files` redirect-only) | 0 | Deleted |
| `dashboard/pipeline-funnel.tsx` | 0 | 0 | 0 | Deleted |
| `dashboard/pipeline-product-treemap.tsx` | 0 | 0 | 0 | Deleted |
| `dashboard/new-loan-files-table.tsx` | 0 | 0 | 0 | Deleted |
| `deal-workspace/resolve-deal-file.ts` | 0 | 0 | 0 | Deleted after BAT script updated |
| Stale `co-pipeline-001-verify.mjs` / `co-arch-004-loanfile-retirement-verify.mjs` | n/a | n/a | n/a | Deleted |
| Dead exports: `clearDealProjections`, `verifyLoanFileDealConsistency`, sync `ensureLoanWorkspaceForOpportunity` | 0 callers | n/a | 0 | Stripped |

## Script gates cleared before delete

| Script | Change |
|--------|--------|
| `scripts/co-arch-004-bat-verify.mjs` | Retargeted to Deal Pipeline Runtime (no longer reads `resolve-deal-file`) |
| `scripts/co-p0-006-primary-write-verify.mjs` | Dropped `create-loan-modal` mustContain; asserts live create paths |

## Kept (still referenced — Category B/C)

| File / symbol | Remaining references | Why it exists | Current architecture? |
|---------------|---------------------|---------------|------------------------|
| `use-loan-files-workspace.ts` + `loan-files-context.tsx` | Loan Information, Operations Intelligence | Active Soft Go-Live-shaped workspace provider | **Partial** — Category B |
| `loan-workspace-modal.tsx` | Customer 360 | Still opens LoanFile-shaped Deal UI | **No for Deal host** — Category B |
| `loan-files-storage.ts` | OW, Credit Bench, LIFE, DAL rollback | Soft Go-Live I/O | **No for Deal** — Category B |
| `dual-write.ts` (module) | DAL rollback / cutover | Emergency Soft Go-Live path | **No when Registry operational** — Category B |
| `deal-projection-cache.ts` (put/peek) | DAL, strategic sync | LoanFile-shaped projection | **Transitional** — Category C until B done |
| `/loan-files` page | Nav / bookmarks | Redirect only | **Yes (compat redirect)** — Category C |
| `file-timeline.tsx`, `loan-create-form-dialog.tsx`, Loan Information, analytics | Live workflows | Active | **Yes** — Category C |

## Docs-only mentions (not blocking)

Historical docs under `docs/co-arch-001/` still name deleted files. Not runtime. May be cleaned in a docs pass.
