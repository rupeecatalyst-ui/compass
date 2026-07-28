# CO-QA-002 Round 3 — Implementation & Business Certification Pack

**Status:** OPEN — Implementation complete for wiring; **Business Certification NOT awarded**  
**Customer case:** Mehernosh Dastoor · `OPP-2026-000041` · Axis `DEAL-2026-000063` (`cms1qhjsy0005l304sxcmqo0g`)

---

## 1. Files modified

| File | Change |
|------|--------|
| `src/components/catalyst-one/shared/loan-workspace-modal.tsx` | Wired `onRemoveDeal` → `DELETE` via `enterpriseDealApiClient.softDeleteDeal`; UI update only after `isDeleted=true` + list verification |
| `src/components/catalyst-one/execution/lender-pipeline-board.tsx` | Removed UI-only delete; disable Remove when callback missing; full delete click instrumentation |
| `src/components/catalyst-one/deal-workspace/deal-workspace-host.tsx` | Confirmed `onRemoveDeal` → `removeLenderPipelineDeal`; render-complete trace |
| `src/lib/enterprise-deal/deal-pipeline-runtime.ts` | `delete_pipeline_refreshed` after Registry reload |
| `src/lib/enterprise-deal/pipeline-drag-trace.ts` | Extended always-on delete timeline steps |
| `server/services/enterprise-deal/enterprise-deal.service.ts` | Server logs around `softDeleteDeal` |
| `scripts/co-qa-002-round3-verify.mjs` | Static wiring + repository/audit persistence proof (not BAT) |
| `docs/co-qa-002/CO-QA-002-ROUND3-IMPLEMENTATION-REPORT.md` | This report |

---

## 2. Callback chain (UI → Repository)

### Path A — Loan Workspace (root-cause surface)

```text
LenderCaseKanbanCard Remove click
  → LenderPipelineBoard.removeCase
    → onRemoveDeal(dealId, card)   // REQUIRED — else blocked
      → loan-workspace-modal onRemoveDeal
        → enterpriseDealApiClient.softDeleteDeal(dealId)
          → DELETE /api/enterprise-deals/:dealId
            → enterpriseDealService.softDeleteDeal
              → enterpriseDealRepository.softDeleteDeal
                → Postgres: is_deleted=true, deleted_at=now
                → enterprise_soft_delete_records upsert
                → enterprise_soft_delete_audits insert
        → listDealsByOpportunity(opportunityId)  // must exclude dealId
        → patch({ lenders })  // UI only after Registry confirms
```

### Path B — Deal Workspace

```text
LenderCaseKanbanCard Remove click
  → LenderPipelineBoard.removeCase
    → onRemoveDeal(dealId)
      → deal-workspace-host
        → removeLenderPipelineDeal(runtime, dealId)
          → enterpriseDealApiClient.softDeleteDeal
            → DELETE /api/enterprise-deals/:dealId
              → … same Repository path …
          → loadDealPipelineRuntime(reloadId)  // must not resurrect
          → setRuntime(updated)
```

### Alternate rendering paths audited

| Surface | `LenderPipelineBoard` | `onRemoveDeal` wired? |
|---------|----------------------|------------------------|
| `loan-workspace-modal.tsx` | Yes | **Yes (Round 3)** |
| `deal-workspace-host.tsx` | Yes | Yes |
| Other | None | — |

If `onRemoveDeal` is undefined: Remove is **disabled** / shows “Deal deletion is currently unavailable.” — **no React filter**.

---

## 3. Instrumented timeline (console `[CO-QA-002]`)

```text
delete_user_click
  ↓
delete_callback_invoked
  ↓
delete_initiated
  ↓
delete_api_called          (DELETE /api/enterprise-deals/:id)
  ↓
repository_softDeleteDeal_start     (server)
  ↓
repository_softDeleteDeal_committed (server · isDeleted · deletedAt)
  ↓
delete_db_confirmed        (client · isDeleted=true)
  ↓
delete_pipeline_refreshed  (listDealsByOpportunity / loadDealPipelineRuntime)
  ↓
delete_registry_refreshed
  ↓
delete_render_complete
```

On failure: `delete_failed` / `delete_blocked` — card remains visible; error toast.

---

## 4. Before vs After

### Before (BAT failure)

```text
Remove → React filter card → (no DELETE) → Postgres unchanged → Refresh → card returns
```

### After (Round 3)

```text
Remove → onRemoveDeal required → DELETE → softDeleteDeal → is_deleted=true + audit
      → list confirms absent → then UI removes card
Failure → card stays · error toast · never fake success
```

---

## 5. Engineering verification (NOT Business Certification)

Script: `node scripts/co-qa-002-round3-verify.mjs`

| Check | Result |
|-------|--------|
| Static wiring (modal + board + host) | PASS |
| Soft-delete persists `is_deleted=true` | PASS (control; restored after) |
| Soft-delete audit/record written | PASS (control; restored after) |
| Active list excludes deleted Deal | PASS |
| Live UI BAT (Delete→Refresh→Logout→Login→Return) | **PENDING** |

Control DB evidence (Axis, then restored for BAT inventory):

| Field | After soft-delete control |
|-------|---------------------------|
| Deal ID | `cms1qhjsy0005l304sxcmqo0g` |
| `is_deleted` | true |
| `deleted_at` | populated |
| soft_delete_records | status=deleted |
| soft_delete_audits | action=soft_deleted |
| In active list | false |

Axis restored to `is_deleted=false` after the control so Mehrrosh BAT inventory remains intact.

---

## 6. Production BAT checklist (required for PASS)

Using Mehernosh Dastoor / Pipeline:

1. Open Loan Workspace **or** Deal Workspace Pipeline for OPP-2026-000041  
2. Remove one lender card (e.g. Axis)  
3. DevTools Network: `DELETE /api/enterprise-deals/cms1qhjsy…` → 200 · `isDeleted: true`  
4. Console: full `[CO-QA-002]` timeline without `delete_failed`  
5. SQL: `is_deleted=true`, `deleted_at` set, soft-delete record + audit present  
6. Refresh → card absent  
7. Logout → Login → navigate away → return to Pipeline → card absent  

---

## 7. Evidence still required from live BAT session

| Deliverable | Status |
|-------------|--------|
| Files modified | ✅ |
| Callback chain | ✅ |
| DELETE API evidence (browser Network) | ⏳ live BAT |
| Database evidence after UI Delete | ⏳ live BAT |
| Audit table evidence after UI Delete | ⏳ live BAT |
| Network evidence | ⏳ live BAT |
| Before vs After flow | ✅ |
| Production BAT Pass | ⏳ OPEN |

---

## 8. Deployment (for live BAT)

| Item | Value |
|------|--------|
| Production alias | https://catalyst-one-two.vercel.app |
| Deployment URL | https://catalyst-6eghcd0g3-rupee-catalyst.vercel.app |
| Deployment id | `dpl_8KeMVTkorCkLzk8oSLQQbFtKHWq3` |
| Ready | YES |

Deploy enables live BAT. It does **not** certify CO-QA-002.

---

## Certification Rule

**CO-QA-002 remains OPEN.**

```text
Build / TypeScript / Lint / verify scripts ≠ Business Certification
```

Only a successful live production BAT (Delete → DELETE confirmed → DB `is_deleted=true` → audit → Refresh → Logout → Login → navigate away → return → Deal never reappears) qualifies PASS.
