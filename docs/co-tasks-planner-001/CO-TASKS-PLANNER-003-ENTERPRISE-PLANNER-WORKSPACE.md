# CO-TASKS-PLANNER-003 — Enterprise Planner Workspace

**Status:** Implementation Complete · Awaiting Product Owner BAT  
**Priority:** P0  
**Deployment:** Not deployed (PO instruction)

## Objective

Evolve Planner from a calendar widget into an **Enterprise Planning Workspace** where users manage work directly — create, reschedule, complete, reassign, and navigate — while remaining a **projection of the Enterprise Task Registry (ETE)**.

## Architecture (unchanged SSOT)

| Layer | Path |
|-------|------|
| Create intents | `src/constants/enterprise-planner/create-intents.ts` |
| Schedule intelligence | `src/lib/enterprise-planner/schedule-intelligence.ts` |
| Reschedule (ETE + audit) | `src/lib/enterprise-planner/reschedule.ts` |
| Desk | `src/components/catalyst-one/tasks/tasks-planner-desk.tsx` |
| Date create menu | `planner-date-create-menu.tsx` |
| Day overflow panel | `planner-day-activities-panel.tsx` |
| Event card + context menu | `planner-event-card.tsx` |
| Workspace wiring | `enterprise-tasks-workspace.tsx` |

**No separate planner database.** Tasks, meetings, reminders, and follow-ups remain ETE / existing event infrastructure.

## Capabilities delivered

1. **Date interaction** — Every day cell exposes Add Task / Schedule Meeting / Add Follow-up / Block Time / Add Reminder / Create Personal Task; due date prefilled.
2. **Drag & drop** — Drop updates ETE `dueOn` + audit + dialogue timeline (existing `reschedulePlannerActivity`).
3. **Compact cards** — Customer, opportunity ref, activity type, time, priority, status colour (`PLANNER_SCHEDULE_TONE_META`).
4. **Quick actions** — Right-click / long-press: Complete, Reschedule, Reassign, Edit, Open Deal/Opportunity, Open Customer, Delete (permission-gated).
5. **Day capacity** — `+N more` opens a right Sheet of all day activities.
6. **Toolbar** — Today / Prev / Next · Search · Filter · My Tasks · Team Tasks (role) · Agenda / Day / Week / Month.
7. **CHANAKYA** — Overdue / conflict / high-priority strip + LIVE ticker (002) + conflict rings on cards.
8. **Density** — Calendar remains primary (002 chrome preserved).

## Validation

```bash
npm run verify:co-tasks-planner-003
```

Benchmark UX against enterprise planners (Bitrix24 / Salesforce Calendar) for productivity, while keeping Catalyst One branding and navigation (`/tasks?tab=planner`).

## BAT checklist (Product Owner)

- [ ] Click date → create intents → due date prefilled → task appears on calendar
- [ ] Drag task/meeting/reminder to another day → registry + audit updated
- [ ] Right-click / long-press actions work; Delete/Reassign respect permissions
- [ ] `+N more` opens full day list
- [ ] Search / Filter / My vs Team scope behave as expected
- [ ] Conflicts and overdue highlighted; no parallel planner store introduced
