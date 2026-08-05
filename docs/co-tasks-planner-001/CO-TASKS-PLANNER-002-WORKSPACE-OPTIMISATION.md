# CO-TASKS-PLANNER-002 — Workspace Optimisation

**Status:** Implementation Complete · Awaiting Product Owner BAT  
**Priority:** P0  
**Deploy:** ❌ Not deployed (PO hold)

## Objective

Calendar-first Planner density: maximise usable workspace on a standard laptop; relocate metrics; add CHANAKYA LIVE ticker.

## Changes

| Before | After |
|--------|--------|
| Tall PageHeader + description | Compact registry-density header; tabs in header actions |
| 5 large summary cards | Single-row metrics toolbar (Tasks · Meetings · Overdue · Upcoming · Completed) |
| Calendar starts low | CHANAKYA LIVE strip + toolbar + calendar fills remaining viewport |
| Sparse padding / helper copy | Tighter chrome; legend inline with DnD hint |
| Month cells fixed ~96px | Month grid `min-height: calc(100vh - 14rem)` with equal row fractions |

## CHANAKYA LIVE

- Single horizontal strip · continuous scroll · no flash  
- Derived from Planner/ETE open events (`buildPlannerChanakyaLiveItems`)  
- Attention: overdue, today’s meetings, document pendencies, sanction follow-ups, etc.

## Files

- `src/lib/enterprise-planner/chanakya-live-ticker.ts`
- `src/components/catalyst-one/tasks/planner-chanakya-live-ticker.tsx`
- `src/components/catalyst-one/tasks/tasks-workspace-summary-strip.tsx`
- `src/components/catalyst-one/tasks/enterprise-tasks-workspace.tsx`
- `src/components/catalyst-one/tasks/tasks-planner-desk.tsx`

## Validation

```bash
npm run verify:co-tasks-planner-002
```

BAT: Planner Month view on 14"/15.6" laptop — calendar nearly fully visible without excessive scroll.
