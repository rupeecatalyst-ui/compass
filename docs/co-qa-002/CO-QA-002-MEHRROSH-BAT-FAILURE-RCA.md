# CO-QA-002 Re-open — Mehrrosh Dastoor BAT Failure

**Status:** OPEN — E2E FAILED  
**Case:** Mehernosh Dastoor · `OPP-2026-000041`  
**Date:** 2026-07-27

---

## 1. Root Cause Analysis (evidence-based)

### Production DB evidence (before any new delete)

| Deal | Lender | `is_deleted` | `deleted_at` |
|------|--------|--------------|--------------|
| `DEAL-2026-000063` (`cms1qhjsy0005l304sxcmqo0g`) | Axis Bank | **false** | null |
| `DEAL-2026-000064` (`cms1qhpel000bl304kiosj4cw`) | HDFC Bank | **false** | null |
| `DEAL-2026-000065` (`cms1qhwhd000hl304u2vbh6ga`) | ICICI Bank | **false** | null |

Additional:

- `enterprise_soft_delete_records` for these Deal ids → **[]**  
- Deal timeline events matching delete/archive/restore → **[]**

### Actual root cause

**The DELETE API never updated Postgres for this case.**

Observed “success” was **UI-only optimistic filter** of Kanban cards.  
On refresh, `loadDealPipelineRuntime` → `listDealsByOpportunity` (`isDeleted: false`) correctly returned the still-active Deals → cards reappeared.

This is **not**:

- listByOpportunity ignoring `isDeleted` (it filters correctly)  
- Soft-delete then restore (no soft-delete rows)  
- Snapshot multi-lender inventing cards (one card = one EnterpriseDeal for this Opportunity)

Likely contributing factors:

1. Prior CO-QA-002 soft-delete path may not have been on the production build used for BAT, **and/or**  
2. Remove flowed through `onChange` filter without a guaranteed, verified `DELETE` + `isDeleted=true` check before toasting success.

### Partial unique index note (secondary resurrection risk)

DB allows a **new** Deal for the same `(opportunityId, lenderId)` after soft-delete (`edeal_org_opp_lender_active_key` is partial on `is_deleted = false`).  
Strategy shortlist (`catalyst.strategic-lender-shortlist`) can drive Move to Deal / Identify to create a **new** Deal after a real soft-delete.  
For Mehrrosh, IDs were unchanged and never soft-deleted — so this secondary path did **not** cause the failed BAT. It is still hardened by pruning shortlist on successful Kanban delete.

---

## 2. Timeline (Mehrrosh failure)

```text
1. User opens Deal Workspace / Lender Pipeline (Mehernosh / OPP-2026-000041)
2. User clicks Remove on a Kanban card
3. UI filters card from React state → looks deleted
4. DELETE /api/enterprise-deals/:id  — NOT reflected in Postgres
   (no soft_delete_records, is_deleted still false)
5. Refresh / reload
6. GET listDealsByOpportunity → returns same Deal (is_deleted=false)
7. Card reappears  ← failure point
```

---

## 3. API endpoints that load pipeline cards

| Endpoint | Filters `isDeleted`? |
|----------|----------------------|
| `GET /api/enterprise-opportunities/:id/deals` → `listByOpportunity` | Yes (`isDeleted: false`) |
| `GET /api/enterprise-deals/:dealId` | Active only via `requireDeal` |
| `DELETE /api/enterprise-deals/:dealId` | Soft-delete SSOT |

No list endpoint should return deleted Deals for Pipeline — **and they do not**. The bug was delete never committed.

---

## 4. Fix shipped in this re-open

1. **`removeLenderPipelineDeal`** — explicit soft-delete; verify `isDeleted === true`; reload; fail if Deal reappears in list  
2. **Kanban `onRemoveDeal`** — Deal Workspace Remove no longer relies on UI filter alone  
3. **Prune Strategy shortlist** for that lender after successful delete  
4. **Always-on console traces** for delete lifecycle:  
   `delete_initiated` → `delete_api_called` → `delete_db_confirmed` → `delete_registry_refreshed`  
5. Persist-diff soft-delete retained as secondary safety net  

---

## 5. Re-test (same customer)

1. Deploy this build  
2. Open Mehernosh Dastoor Deal Pipeline  
3. Delete one Kanban card (e.g. Axis)  
4. Confirm toast **after** delete confirms  
5. DevTools Network: `DELETE /api/enterprise-deals/cms1qhjsy…` → 200 · `isDeleted: true`  
6. SQL: `is_deleted = true` for that id  
7. Refresh → card absent  
8. Logout/login → card absent  

Do **not** mark CO-QA-002 PASS until this BAT succeeds on production.
