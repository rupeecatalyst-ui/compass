# CO-TASKS-PLANNER-001A — Enterprise Planner Experience

**Status:** Implementation Complete · Awaiting Product Owner BAT  
**Priority:** CRITICAL  
**Deploy:** Not deployed (PO hold)

## Principle

The Planner is **not** a generic calendar.  
It is the operational planning workspace for Catalyst One.

**Non-negotiable:** Planner and Tasks are two views of the **same Enterprise Task Registry (ETE)**.  
Dragging never creates a duplicate task — it updates `dueOn` on the existing ETE record.

## Delivered

### Event cards (readable without opening)

- Customer Name  
- Activity Type (📞 Customer Call · 📄 Document Collection · 🏦 Bank Follow-up · 👥 Customer Meeting · 🏠 Site Visit · 💰 Disbursement · 📑 Sanction Follow-up · 📧 Email Follow-up · 📝 Internal Task)  
- Opportunity Reference (when present)  
- Time · Priority · Due Date · Assigned Executive  

### Colour system (shared with Tasks Workspace)

| Tone | Meaning |
|------|---------|
| 🟢 | Completed |
| 🔵 | Scheduled |
| 🟡 | Due Today |
| 🟠 | Due Tomorrow |
| 🔴 | Overdue |
| ⚫ | Cancelled |

SSOT: `PLANNER_SCHEDULE_TONE_META` — consumed by both Planner and Tasks desks.

### Drag & drop → ETE

| View | Drop target |
|------|-------------|
| Day | Time slots |
| Week | Days |
| Month | Dates |

On drop: `reschedulePlannerActivity` → `patchEteTask(dueOn)` → ETE audit → dialogue timeline.  
Blocked moves toast the business reason.

### Event preview

Customer · Opportunity · Activity · Notes · Due Date · Assigned To · Status  

Actions: Open Opportunity · Open Customer · Complete Activity · Reschedule  

### Agenda

**Today → Tomorrow → This Week → Overdue → Upcoming** (chronological operational work)

## Architecture

```
ETE Task Registry  ──compose──►  Planner DTOs  ──UI──►  Agenda / Day / Week / Month
        ▲                                                      │
        └──────────── reschedule / complete (same task id) ────┘
```

Meeting / Reminder parallel registries are **not** merged into Planner events (001A SSOT hardening).

## Verify

```bash
npm run verify:co-tasks-planner-001
```

## BAT checklist

- [ ] Cards show Customer · Activity · Opp Ref · Time · Priority · Due · Executive without opening  
- [ ] Colour chips match Tasks tab  
- [ ] Drag Day / Week / Month updates due date in ETE (no new task)  
- [ ] Blocked reschedule shows reason  
- [ ] Preview actions work  
- [ ] Agenda order: Today → Tomorrow → This Week → Overdue → Upcoming  
- [ ] No duplicate tasks after drag  
