# Catalyst One — SPR-004 Enterprise Workflow Orchestration Engine (EWOE)

**Sprint:** SPR-004  
**Version:** 12.0.0  
**Status:** Implemented (foundation)  
**Date:** July 2026

---

## 1. Workflow architecture

EWOE is an **orchestration layer above EOLE**. It does not replace Opportunity lifecycle ownership or redesign stage codes.

```
Workflow Definition (scope: product, customer type, employment, constitution, lender, opportunity type)
        │
        ▼
Stages (EOLE stageCode) → Sub-stages → Activities → Completion conditions → Next stage
        │
        ├─► Engine triggers → EDIE / ETE / ENCE (simulation) / LIFE
        ├─► Transitions (versioned, actor, reason, timestamp) → EAF audit
        ├─► Dialogue Center (eventType: workflow)
        └─► Intelligence progress → stageProgressRatio (no duplicate health math)
```

| Concern | Owner |
|---------|--------|
| Opportunity stage truth | EOLE |
| Orchestration, triggers, events | **EWOE** |
| Tasks | ETE |
| Documents | EDIE |
| Lender selection | LIFE |
| Communication (sim) | ENCE |
| Health / Pulse / Compass | Opportunity Intelligence (consumes EWOE progress) |

**Distinct from EWE** (`enterprise-workflow-engine`): EWE is a generic state-machine platform. EWOE is opportunity-journey orchestration aligned to EOLE stages.

### Key APIs

- `initializeEwoeDefaultDefinitions()` / `registerEwoeWorkflowDefinition()`
- `resolveEwoeWorkflowDefinition(scope)`
- `startEwoeWorkflowInstance()` / `advanceEwoeWorkflowStage()` / `advanceEwoeWorkflowSubStage()`
- `recordEwoeWorkflowEvent()` / `listEwoeEvents()`
- `executeEwoeEngineTriggers()`
- `getEwoeWorkflowVisualization()`
- `getEwoeIntelligenceProgress()`
- `configureEwoeOrchestrationConfig()` / `configureEwoePorts()`

### Paths

```
src/types/enterprise-workflow-orchestration-engine.ts
src/types/enterprise-workflow-orchestration-engine-ports.ts
src/constants/enterprise-workflow-orchestration-engine/
src/lib/enterprise-workflow-orchestration-engine/
src/components/catalyst-one/opportunity-workspace/workspace-workflow-panel.tsx
src/components/catalyst-one/workflow/ewoe-foundation-workspace.tsx
src/app/(dashboard)/workflow/page.tsx
```

---

## 2. Database changes

**None.**

Same pattern as SPR-001/002/003:

- Domain state is **in-memory** via ports/adapters.
- Prisma remains **auth-only**.
- Future Prisma adapters can plug in through `configureEwoePorts()` without changing domain APIs.

---

## 3. UI screenshots

Screenshots are not embedded in-repo. Capture locally:

```bash
npm run dev
```

| Surface | URL |
|---------|-----|
| Opportunity Workspace (workflow panel) | http://localhost:3000/opportunities |
| EWOE foundation workspace | http://localhost:3000/workflow |

Login: `admin@compass.dev` / `Compass@123`

Verify:

1. Workflow timeline shows Completed / Current / Pending / Upcoming  
2. Advance stage → Dialogue receives workflow entry (previous → current → reason → timestamp)  
3. Document / Processing / Lender stages fire EDIE / ETE / ENCE / LIFE triggers  
4. Health / Pulse / Compass update via shared `stageProgressRatio` (EWOE progress)

Validate:

```bash
npx tsx scripts/spr004-validate.ts
```

---

## 4. Future recommendations

1. ECG admin UI for stages, completion rules, triggers, escalation (section `ECG-EWOE-CONFIG` reserved).  
2. Persist definitions/instances via Prisma adapters.  
3. Stronger completion-condition evaluators (docs verified %, open tasks = 0).  
4. Sub-stage auto-advance when activities complete.  
5. Keep Decision Engine / external notifications / Mission Control out of EWOE until explicitly scoped.  
6. Do not merge EWOE into EWE — keep opportunity orchestration separate from generic workflow graphs.

---

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| Workflow Engine operational | ✓ |
| Workflow events operational | ✓ |
| Dialogue integration complete | ✓ |
| Compass / Pulse / Health contribution | ✓ (via intelligence progress signal) |
| Configurable architecture ready | ✓ |

---

**END OF SPRINT SPR-004**
