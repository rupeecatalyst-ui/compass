# CO-BIZ-001 — Enterprise Task & Work Management Engine

**Status:** Foundation delivered · Architecture **FROZEN**  
**Date:** 2026-07-26  
**Constitution:** `.cursor/rules/enterprise-task-engine.mdc`

## Summary

Extended `src/lib/enterprise-task-engine/` into a business-driven execution layer:

- Entity-bound tasks (Customer · Opportunity · Deal · Document · Lender · Workflow · Loan File)
- Work types (Follow-up, Customer Call, Lender Call, Document Collection, …)
- Automatic task generation from business events
- My Work desk (Overdue / Due Today / Upcoming / Completed / Assigned By·To Me) — **ETE projection**
- Entity Tasks panel on Deal Workspace
- Chanakya workload insights (consumes ETE)
- Lifecycle notifications (due, overdue, complete, reassign, system-generated)
- Operational reports (consumes ETE)

## Frozen principles (business approved)

1. ETE is the **only** task authoring and orchestration engine.
2. Every task belongs to a business entity — **no orphans**.
3. My Work / Reports / Notifications / CHANAKYA all consume **ETE SSOT**.
4. No parallel task, reminder, follow-up, or workflow-specific task engines.
5. Future modules integrate with ETE; they do not invent task systems.
6. Prisma durability = port/adapter enhancement — **not** a second ownership model.

## Remaining iterations (not redesign)

Lifecycle stage automation still to wire through ETE:

Login · Logged In – WIP · Soft Approved · Final Approved · Closure WIP · Disbursed · Lost · Hold

Persistence: durable adapter behind existing ETE ports.

## Verify

Open `/tasks` → My Work · Board · Reports. Create a Contact → Welcome Call task. Start Opportunity → Collect Documents task. Open a Deal → Tasks panel under Lender Pipeline.
