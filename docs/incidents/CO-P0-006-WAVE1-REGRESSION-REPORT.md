# CO-P0-006 Wave 1 — Regression Report

**Date:** 2026-07-23  
**Scope protection:** Create-only cutover; no update primary write; no migration tooling; no localStorage removal

---

## Intentional behaviour changes (not regressions)

| Area | Change |
|------|--------|
| Create latency | Network round-trip required before success |
| Offline / API down | Create **blocked** with error (by design) |
| Sync helpers | `createDeal` / `addFile` / sync `ensureLoanWorkspaceForOpportunity` throw when primary ON — callers must use async |

## Regression protection matrix

| Surface | Protection | Status |
|---------|------------|--------|
| Contact → Create Loan | `createDealAsync` + error toast; dialog stays open on fail | ✅ Wired |
| Create Loan Modal | `addFileAsync` + form loading | ✅ Wired |
| Loan Information Workspace | `addFileAsync` + navigate only after success | ✅ Wired |
| Customer 360 → Create Loan | `createDealAsync` + error toast | ✅ Wired |
| Strategic / LIFE ensure loan | `ensureLoanWorkspaceForOpportunityAsync` | ✅ Wired |
| LoanFile.id deep links / journey | Option B retains `lf-…` id | ✅ Preserved |
| Update Deal paths | `updateDeal` unchanged | ✅ Scope protected (verify script) |
| localStorage module | `saveLoanFiles` retained as cache | ✅ Scope protected (verify script) |
| Dual-write / consumers | Untouched flags; no Soft Go-Live idle reset | ✅ |
| Enterprise CRUD service | `verify:deal-registry:crud` still passes | ✅ |

## Known residual risks (accepted for Wave 1)

| Risk | Severity | Mitigation / next wave |
|------|----------|------------------------|
| Updates still local-first | Medium | Wave 1b — primary update |
| Historical local-only Deals invisible to Postgres readers | High (perception) | Migration tools — **explicitly out of Wave 1** |
| Dual identity (`file.id` vs `enterpriseDealId`) | Medium | Documented; Wave 2 URL `dealId=` |
| Missing `NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE` on future Preview/Prod | Critical | Fail closed; CO-GOV-001 checklist |

## Automated gate

```bash
npm run verify:deal-registry:primary-write
```

**Result:** PASSED (wiring + scope + local prisma preconditions)

## Verdict

**No unexpected regressions identified within Wave 1 scope.** Behaviour changes are limited to create success/failure semantics as approved.
