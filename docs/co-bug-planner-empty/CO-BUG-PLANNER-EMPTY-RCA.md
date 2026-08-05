# CO-BUG-PLANNER-EMPTY — Enterprise Planner empty calendar

**Module:** Enterprise Tasks & Planner  
**Priority:** CRITICAL  
**Date:** 2026-08-04  
**Data protection:** No enterprise data modified, recreated, or destroyed

---

## 1. Root cause analysis

| Rank | Cause | Effect |
|------|--------|--------|
| **P0** | Planner **Mine** filter used strict `assigneeRef !== userRef` | Tasks assigned as `employee:rm-001` (or mismatched prefix) were hidden while Tasks/My Work used normalized identity — empty calendar for logged-in users |
| **P0** | `taskToPlannerEvent()` returned `null` when `dueOn` missing | Tasks saved without a due date appeared in Task lists but **never** on Planner |
| **P1** | Recurring series only stored the **current** occurrence | Future Daily/Weekly/Monthly/Yearly dates did not appear until each occurrence was completed |
| **P2** | Managers defaulted to Mine scope | Team tasks (ops assignees) invisible until Team filter selected |
| **P2** | Demo seed hardcoded `employee:rm-001` | BAT as Super Admin (`user:<uuid>`) never matched Mine |

**Not a separate Planner datastore.** Planner already projected ETE via `listEteTasks()` → `buildPlannerSnapshot()`. The failure was **projection + filter** logic, not a second registry.

---

## 2. Data flow (canonical)

```text
Create Task (Quick Task / Planner / Opportunity Workspace)
        │
        ▼
registerEteTask()  →  ETE ports (in-memory Enterprise Task Registry)
        │
        ▼
listEteTasks()
        │
        ├── Tasks Execution / My Work / Team  (sameAssigneeRef)
        │
        └── buildPlannerSnapshot()
                 │
                 ├── project undated → fallback date (needsSchedule)
                 ├── expand recurring → virtual calendar occurrences
                 └── TasksPlannerDesk (Month / Week / Day / Agenda)
```

---

## 3. Registry used for saving

| Layer | Location |
|-------|----------|
| Domain SSOT | Enterprise Task Engine — `registerEteTask` / `listEteTasks` |
| Runtime store | `createInMemoryEtePorts()` (process-local array) — `src/lib/enterprise-task-engine/repositories/in-memory.ts` |
| Prisma `EnterpriseDealTask` | **Separate** Deal task API — **not** Planner SSOT (do not use for Planner) |

---

## 4. Registry used by Planner

| Layer | Location |
|-------|----------|
| Compose | `src/lib/enterprise-planner/compose-planner.ts` → `listEteTasks()` only |
| UI | `TasksPlannerDesk` filters presentation DTOs — never writes tasks |

**Confirmed:** Planner does **not** maintain a parallel task store.

---

## 5. Mismatches identified

| Mismatch | Before | After |
|----------|--------|-------|
| Assignee identity | Planner strict string; My Work normalized | Shared `sameAssigneeRef` |
| Undated tasks | Dropped from Planner | Projected with `needsSchedule` |
| Recurrence | Complete-to-spawn only | Calendar projection of future occurrences in range |
| Manager default scope | Mine | Team (when `canManageTeam`) |
| Create without due | Allowed → invisible on calendar | Default due today 17:00 local |

---

## 6. Fix implemented

- `sameAssigneeRef` exported from ETE; wired into Planner filter, workspace compose, reschedule permissions
- Undated ETE rows projected onto Planner (createdOn / today fallback)
- Recurring series expanded as **virtual** Planner events (`isProjectedOccurrence`) within view+horizon — still ETE SSOT
- Quick Task + Opportunity Workspace Task: default `dueOn` when blank
- Demo seed assignees → signed-in user when available
- Managers open Planner on **Team** scope by default

---

## 7–8. Build / TypeScript

See Certification Report after validation run.

---

## 9. Confirmation

**No enterprise data was modified.** No migrations. No destructive operations. In-memory ETE only; no Prisma task rows altered.
