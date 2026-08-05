# CO-TASKS-PLANNER-001 — Enterprise Tasks Workspace Readiness

**Status:** Implementation Complete · Awaiting Product Owner BAT  
**Priority:** CRITICAL  
**Deploy:** Not deployed (PO hold)

## Delivered

- Single left-nav **Tasks** only (`ROUTES.TASKS` / `/tasks`) — no Planner nav item
- Enterprise Tasks Workspace with primary tabs **Tasks** (default) · **Planner**
- Summary strip: Today's Tasks · Today's Meetings · Overdue · Upcoming · Completed (Meetings → Planner)
- Tasks tab buckets: Today · Pending · Overdue · Completed · Assigned · Personal · Workflow
- Actions: Create · Edit · Complete · Reassign · Snooze · Priority · Due Date · Search · Filters · Bulk
- Planner views: Agenda (default) · Day · Week · Month
- Operational events from ETE + Meeting Registry + Reminder Registry
- Architecture reserved for future Google Calendar / Microsoft Outlook sync (`syncReadiness`)

## Architecture

| Layer | Ownership |
|-------|-----------|
| Task Registry | ETE (`enterprise-task-engine`) |
| Meeting Registry | `src/lib/enterprise-planner/meeting-registry.ts` |
| Reminder Registry | `src/lib/enterprise-planner/reminder-registry.ts` |
| Planner compose | `src/lib/enterprise-planner/compose-planner.ts` |
| Workspace compose | `src/lib/enterprise-tasks-workspace/` |
| UI | `enterprise-tasks-workspace.tsx` + desks |

UI renders DTOs only — no business logic in components.

## Deep links

- `/tasks` — Tasks tab
- `/tasks?tab=planner` — Planner Agenda
- `/tasks?tab=planner&view=week` — Planner Week

## Legacy

`TaskEngineWorkspace` retained for Board/Reports internals; page mount is `EnterpriseTasksWorkspace`.

## BAT checklist

- [ ] Nav shows only Tasks
- [ ] Tab switch Tasks ↔ Planner is instant
- [ ] Summary Meetings opens Planner
- [ ] Create / Complete / Reassign / Snooze / Priority / Due / Bulk work on Tasks tab
- [ ] Agenda / Day / Week / Month render operational events
- [ ] Dark premium density acceptable
