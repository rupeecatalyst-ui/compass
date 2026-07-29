# CO-INC-001 — Kanban Drag & Drop Root Cause Investigation

**Status:** Investigation Complete · **No fix implemented** · Awaiting Product Owner approval  
**Date:** 2026-07-29  
**Constraint:** Read-only — no code changes, no migrate, no deploy, no live data mutation

---

## 1. Symptom

Kanban cards are dragged to a new column and **immediately return** to their original position.

---

## 2. Root Cause

**Primary:** Client/server **Deal stage vocabulary mismatch**.

| Layer | Vocabulary | Examples |
|-------|------------|----------|
| Kanban UI | `LenderCaseStage` | `identified`, `prelogin`, `logged_in_wip`, `disbursed` |
| Client persist map | → `PipelineStage` | `pre_login`, `logged_in`, `won` |
| Server transition rules | expects `LenderCaseStage` only | Rejects `pre_login` / `logged_in` / `won` |

Optimistic UI moves the card. `transitionDeal` fails with `DealValidationError` (“Unknown Deal stage… Use lender pipeline stages.”). Deal Workspace catches the error and calls `reloadRuntime()`, which rebuilds cards from Registry `grossStage` — **card snaps back**.

This is **not** a DnD library defect. It is **optimistic UI overwritten by SSOT reload after failed/lossy persist**.

---

## 3. Failure layer classification

| Layer | Involved? | Notes |
|-------|-----------|-------|
| Frontend state | Yes (symptom path) | Optimistic move correct; overwritten |
| API | Yes | Transitions endpoint rejects mapped stage |
| Business logic | **Primary** | Stage map vs stage rules disagreement |
| Database persistence | No (blocked) | Reject prevents commit |
| Query refresh | Yes (mechanism) | `reloadRuntime` / `grossStage` rebuild |
| Permissions | Secondary | Pre-drop dialogs only |
| Workflow validation | Yes | `assertLenderPipelineStageTransition` |

---

## 4. Sequence of events

1. **Drag** — HTML5 `onDragStart` stores `caseId` (`lender-pipeline-board.tsx`).
2. **Drop** — `handleDrop` receives target `LenderCaseStage`.
3. **Stage calculated** — column id = new `caseStage`.
4. **Optimistic UI** — `applyMove` → `onChange(next)` → card appears in new column.
5. **Save API** — `persistDealPipelineLenders` → `lenderCaseStageToGrossStage` → `POST /api/enterprise-deals/:dealId/transitions` with `toGrossStage` = PipelineStage.
6. **API response** — often **400 / validation error** for early-pipeline and terminal stages.
7. **DB** — transition **not** persisted on rejection.
8. **Invalidation / reload** — host `catch` → `reloadRuntime(dealId)`.
9. **Final render** — `dealToLenderExecution` uses `grossStageToLenderCaseStage(deal.grossStage)` → original column.

---

## 5. Why the card returns

```
Drop → optimistic column change
    → transitionDeal(PipelineStage)
    → server rejects (unknown stage)
    → toast + reloadRuntime
    → Registry grossStage rebuild
    → card back to original column
```

---

## 6. Files involved

| File | Role |
|------|------|
| `src/components/catalyst-one/execution/lender-pipeline-board.tsx` | HTML5 DnD, `applyMove` / `handleDrop` |
| `src/components/catalyst-one/deal-workspace/deal-workspace-host.tsx` | Optimistic persist; `reloadRuntime` on error |
| `src/lib/enterprise-deal/deal-pipeline-runtime.ts` | `persistDealPipelineLenders` |
| `src/lib/enterprise-deal/deal-lender-stage-map.ts` | Lossy UI ↔ Registry map |
| `server/services/enterprise-deal/deal-stage-rules.ts` | Accepts LenderCaseStage only |
| `src/app/api/enterprise-deals/[dealId]/transitions/` | Transition API |
| `src/lib/enterprise-deal/pipeline-drag-trace.ts` | Trace: `?pipelineTrace=1` |

**Related prior docs:**  
`docs/co-arch-001/CO-PIPELINE-001-LENDER-PIPELINE-DRAG-TRACE.md`  
`docs/co-arch-001/CO-DEAL-001-DEAL-PIPELINE-STATE-INTEGRITY-AUDIT.md`

---

## 7. Move outcomes (illustrative)

| UI drop target | Sent `toGrossStage` | Server | Effect |
|----------------|---------------------|--------|--------|
| `prelogin` / `identified` | `pre_login` | Reject | Snap back |
| `logged_in_wip` | `logged_in` | Reject | Snap back |
| `disbursed` | `won` | Reject | Snap back |
| `hold` / `lost` | `pre_login` | Reject + wrong map | Snap back |
| `soft_approved` / `final_approved` / `closure_wip` | Same id | Accept* | May stick |

\*Shared string across vocabularies — explains intermittent “sometimes works”.

---

## 8. Out of scope / not this bug

| Surface | Finding |
|---------|---------|
| CHANAKYA Radar Kanban | `draggable={false}` by design — not a persist failure |
| Tasks ETE board | Due-date columns; different domain |
| Mission Control / My Deals | No Deal-stage Kanban DnD |

---

## 9. Secondary contributors

1. **Lossy bidirectional map** — `identified` ∪ `prelogin` ↔ `pre_login` → rebuild always `prelogin`; `hold`/`lost` → `pre_login`.
2. **Legacy Loan Workspace path** — may PATCH snapshot without `transitionDeal`; Registry `grossStage` remains SSOT and can overwrite UI stage on rebuild.

---

## 10. Recommended permanent fix (NOT implemented)

1. **Unify transition vocabulary** end-to-end (choose one SSOT string set).
2. Fix map so **Identified ≠ Pre Login**; **Hold/Lost** have real Registry stages.
3. **One persist path** for Deal Workspace and Loan Workspace (`persistDealPipelineLenders`).
4. Contract tests: Identified → Pre Login → Logged In → … → Disbursed / Hold / Lost.
5. Keep fail-closed reload once API is correct; do **not** mask failures with sticky optimistic UI.

| Option | Regression risk |
|--------|-----------------|
| A. Server validates PipelineStage via map | Medium |
| B. Client sends LenderCaseStage; migrate DB | High |
| C. Expand map + product stage decision | Medium–High |
| D. Snapshot-only (skip transition) | Constitutional — reject |
| E. Optimistic-only on error | Integrity — reject |

**Preferred:** A or B with migration plan + verify script extension.

---

## 11. Impacted modules

- Deal Workspace / Lender Pipeline  
- Loan Workspace modal (legacy)  
- Enterprise Deal transitions API + stage rules  
- My Deals / stage projection / notify bus  
- Dual-write / Soft Go-Live paths (secondary)

---

## 12. BAT debug (no code change)

```
?pipelineTrace=1
# or
localStorage.setItem("compass:pipeline-drag-trace", "1")
```

Observe: `drag_start` → `drop` → `apply_move` → `persist_*` / `error`.

---

## 13. Disposition

| Item | Status |
|------|--------|
| Root cause identified | ✅ |
| Fix implemented | ❌ Awaiting approval |
| Migration executed | ❌ N/A (investigation) |
| Deploy | ❌ N/A |

**Next step:** Product Owner approve fix option (A/B/C) before any implementation.
