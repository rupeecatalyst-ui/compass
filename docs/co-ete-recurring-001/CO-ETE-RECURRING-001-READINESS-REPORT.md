# CO-ETE-RECURRING-001 — Recurring Tasks Readiness Report

**Module:** Enterprise Task & Planner Engine  
**Feature:** Recurring Tasks  
**Priority:** HIGH  
**Date:** 2026-08-04  
**Status:** Implementation complete · Ready for Product Owner BAT

---

## Constitutional Health Check

| Check | Result |
|-------|--------|
| ETE remains sole task SSOT | **GREEN** |
| Planner remains ETE projection | **GREEN** |
| No parallel recurrence / reminder engine | **GREEN** |
| CAD / ADR conflict | None |
| Single Implementation Rule | **GREEN** — logic in `recurrence-engine.ts` only |

**CHC: GREEN** — proceed.

---

## Deliverables

| Deliverable | Path / note |
|-------------|-------------|
| Enterprise Recurrence Engine | `src/lib/enterprise-task-engine/recurrence-engine.ts` |
| Types / series audit fields | `src/types/enterprise-task-engine.ts` (`scheduleKind`, `seriesId`, `occurrenceNumber`, `seriesRootTaskId`, `seriesStatus`, expanded `EteTaskRecurrence`) |
| Constants | `src/constants/enterprise-task-engine/recurrence.ts` |
| Series management | `listEteSeriesOccurrences`, `cancelEteSeries`, spawn-on-complete in `completeEteTask` |
| Create UI | `task-recurrence-fields.tsx` + `quick-task-create-modal.tsx` |
| Planner integration | `compose-planner.ts` projects series fields; Agenda/Day/Week/Month unchanged (due dates) |
| Agenda integration | Same snapshot `agendaSections` — occurrences with `dueOn` appear automatically |
| Filters | Planner + Tasks desks: One-Time · Recurring · Completed · Upcoming · Overdue |
| Verify | `npm run verify:co-ete-recurring-001` |

---

## Behaviour

1. **Task Type:** One-Time (default) | Recurring  
2. **Frequencies:** Daily · Weekly (+ weekdays) · Monthly (Same Date | Same Weekday) · Quarterly · Half-Yearly · Yearly  
3. **Ends:** Forever · After N · End On Date  
4. **Reminders:** none · at due · 15 min · 1 hour · 1 day before (applied per occurrence)  
5. **Generation:** Next occurrence created only when current is completed (no duplicated history)  
6. **Completion:** One occurrence complete ≠ series complete  
7. **Audit per occurrence:** Task ID · Series ID · Occurrence Number · Created Date · Created By  

---

## Principle

Recurring Tasks are part of the **Enterprise Task Engine**.  
The Planner is only a visual representation.

---

## Validation

| Check | Status |
|-------|--------|
| TypeScript | ✅ Pass |
| Build | ✅ Pass |
| Verify script | ✅ `npm run verify:co-ete-recurring-001` |
| Production | ✅ https://catalyst-one-two.vercel.app (`dpl_9iWbs3FqCX58C7FTGRfj7AHipMnJ`) |

---

## BAT checklist

1. Create One-Time task — no series fields.  
2. Create Weekly Mon+Fri recurring — complete Mon → Friday occurrence appears in Planner.  
3. Monthly Same Weekday (First Monday) — next month lands on first Monday.  
4. Quarterly from 5 Jan → 5 Apr after complete.  
5. End After 2 — second complete does not spawn third.  
6. Filters: Recurring / One-Time / Overdue / Upcoming / Completed.  
7. Confirm completed occurrence retains its own notes; next has empty checklist.
