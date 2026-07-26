# CO-ARCH-004 — LoanFile Retirement & Enterprise Deal Runtime Consolidation

**Status:** Implemented · Verify PASS · Deployed  
**Date:** 2026-07-26  
**Priority:** P0 Enterprise Architecture  
**Production:** https://catalyst-one-two.vercel.app (`dpl_9vLYbGyKBwN1pYKNYgU3uT8CKc2g`)

---

## Part A — Migration Summary

Deal/Pipeline business writes no longer go Soft Go-Live LoanFile → dual-write → Registry.

**Target path (operational prisma):**

```
User action (Pipeline / Save)
  → Enterprise Deal Context (in-memory projection)
  → Enterprise Deal Registry PATCH (sole write)
  → Session Deal bind
  → Render
```

LoanFile-shaped objects remain **read-only UI projections** for `LoanWorkspaceModal` compatibility.  
Opportunity workflows unchanged (FS-01 Opportunity runtime).

---

## Part B — Files Modified / Added

**Added**
- `src/lib/enterprise-deal/persist-deal-mutation.ts`
- `src/lib/enterprise-deal/deal-projection-cache.ts`
- `scripts/co-arch-004-loanfile-retirement-verify.mjs`
- this report

**Modified**
- `deal-data-access.ts` — Registry-first `updateDeal` / `updateDealAsync`
- `dual-write.ts` — no-op when Registry operational
- `map-deal-to-loan-file.ts` — snapshot lenders beat local
- `resolve-deal-file.ts` — Registry load + projection
- `deal-workspace-host.tsx` — open from Registry
- `loan-workspace-modal.tsx` — Pipeline awaits Registry
- `use-loan-files-workspace.ts` — removed hydrate→localStorage persist
- `enterprise-deal/index.ts` — export `updateDealAsync`

---

## Part C — Legacy runtime dependencies retired (operational mode)

| Dependency | Status |
|------------|--------|
| LoanFile-first `updateDeal` → `updateLoanFileInStorage` | Retired when operational |
| Dual-write as Deal write path | No-op when operational |
| `queueDealDualWriteAfterLocalSave` | Skipped when operational |
| Deal Workspace open from localStorage | Replaced by Registry GET |
| Prefer local lenders over Registry snapshot | Reversed |
| Hydrate `saveDeals(files)` to localStorage | Removed |

Soft Go-Live rollback path remains only when Registry is **not** operational.

---

## Part D — Runtime Verification

### API sequence (Pipeline drag)
```
updateDealAsync({ lenders })
  → persistDealProjectionToRegistry (snapshot + caseStage)
  → PATCH /api/enterprise-deals/:id
  → putSessionDeal / bindSessionDeal
```

### Persistence sequence
```
Context patch → Registry success → projection cache → render
```
Exactly **one** business write path when operational: Enterprise Deal Registry.

### Context sequence
```
Open Deal → getDeal → mapEnterpriseDealToLoanFileStub → putDealProjection → Workspace
```

---

## Part E — Business Certification

✓ Enterprise Deal Registry is the only Deal write SSOT (operational)  
✓ Enterprise Deal Context / Session holds runtime Deal  
✓ LoanFile is projection-only when operational  
✓ No LoanFile business writes on Pipeline/Save path when operational  
✓ Dual-write no-op when operational  
✓ No hydrate localStorage re-persist  
✓ Pipeline awaits Registry  
✓ My Deals remains Registry-primary list  
✓ Opportunity FS-01 path unchanged  

## BAT — Persistence Certification Flow

```
Create Opportunity
→ Complete Opportunity Journey
→ Move to Deal (Registry create + putDealProjection; no Soft Go-Live SSOT)
→ Open Pipeline (loadDealWorkspaceProjection)
→ Drag Card (updateDealAsync → Registry snapshot + caseStage)
→ Stage Changes / Save
→ Refresh Browser → stage from Registry snapshot
→ Open Again → same
→ Second Deal → same path
→ Logout / Login → Registry reopen
→ PASS
```

Evidence: `scripts/co-arch-004-bat-verify.mjs` · `docs/certification-screenshots/co-arch-004-bat/bat-verify-report.json`
