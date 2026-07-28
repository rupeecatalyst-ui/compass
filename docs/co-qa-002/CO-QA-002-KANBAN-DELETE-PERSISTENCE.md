# CO-QA-002 — Enterprise Kanban Delete Persistence

**Status:** OPEN until E2E BAT Pass (CO-QA-001)  
**Standard:** CO-QA-001 · CO-ARCH-007 (one lender negotiation = one EnterpriseDeal)

---

## 1. Root Cause Analysis

### Symptom

1. User deletes a Lender Pipeline Kanban card.  
2. Card disappears from the UI.  
3. After refresh / navigation / reload, the card reappears.

### Root cause (confirmed)

Kanban **Remove** only filtered React state:

```ts
onChange(cases.filter((c) => c.id !== id));
```

`persistDealPipelineLenders` then updated **remaining** cards only and called `loadDealPipelineRuntime`, which reloads **all** Opportunity sibling Deals with `isDeleted: false`.

The removed EnterpriseDeal was **never** soft-deleted via `DELETE /api/enterprise-deals/:dealId`.

SSOT still held the Deal → ghost card after any reload.

This is **not** a cache-only bug, not a TanStack Query bug, and not demo-seed recreation. Persistence was missing.

---

## 2. Architecture (after fix)

```text
Kanban Remove
  → onChange(next without card)
  → persistDealPipelineLenders(runtime, next)
       1. softDeleteRemovedPipelineDeals → DELETE /api/enterprise-deals/:dealId
          (Prisma isDeleted=true, deletedAt, Recovery Center record)
       2. stage/field updates for remaining Deals
       3. loadDealPipelineRuntime(remainingAnchor)
          → listDealsByOpportunity (isDeleted: false)
  → UI shows Registry truth
```

**One SSOT:** Enterprise Deal Registry (PostgreSQL via Prisma).  
localStorage / snapshot.lenders are **not** delete authority.

---

## 3. Files modified

| File | Change |
|------|--------|
| `src/lib/enterprise-deal/deal-pipeline-runtime.ts` | Soft-delete removed Deals; reload via remaining anchor |
| `src/components/catalyst-one/deal-workspace/deal-workspace-host.tsx` | Success toast; redirect when anchor deleted / pipeline empty |
| `src/lib/enterprise-deal/deal-data-access.ts` | Legacy Loan Workspace path soft-deletes `enterpriseDealId` removals |
| `src/components/catalyst-one/execution/lender-pipeline-board.tsx` | Timeline copy clarifies delete is host-persisted |
| `src/lib/enterprise-deal/index.ts` | Export helpers |

---

## 4. Database verification

Soft-delete sets:

- `enterprise_deals.is_deleted = true`  
- `deleted_at`, `deleted_by`, `deletion_reason`  
- Enterprise Soft Delete Recovery record  

`listByOpportunity` / registry lists use `isDeleted: false` → deleted cards excluded.

---

## 5. API verification

| Step | Expected |
|------|----------|
| Remove card | `DELETE /api/enterprise-deals/{dealId}` with reason `kanban_pipeline_remove` |
| Response | 200 soft-deleted Deal payload |
| Reload | `GET .../opportunities/{id}/deals` omits deleted Deal |

---

## 6. Cache verification

- `softDeleteDeal` calls `invalidateSessionDeal(dealId)`  
- Persist ends with `loadDealPipelineRuntime` (forceRefresh get + list)  
- Failed persist reloads prior Registry state (card may return until delete succeeds — correct)

---

## 7. Before vs After

| | Before | After |
|--|--------|-------|
| Remove | UI filter only | Soft-delete EnterpriseDeal |
| Refresh | Card returns | Card stays gone |
| Re-login | Card returns | Card stays gone |
| SSOT | Unchanged row | `isDeleted=true` |

---

## 8. BAT

See `CO-QA-002-E2E-SCENARIO.md`. Module remains **OPEN** until live Pass.
