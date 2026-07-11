# Enterprise Workflow Engine (EWE) — Architecture

**Sprint:** Catalyst One Sprint 5 (CF-S05-001)  
**Version:** 5.0.0  
**Status:** Foundation (in-memory, no runtime enforcement)

---

## Purpose

EWE is the canonical, business-agnostic workflow platform for Catalyst One. It provides configuration-driven state machine workflows with directed graph transitions, supporting every enterprise module without loan-specific assumptions.

---

## Core Domain Models

| Model | Type | Description |
|-------|------|-------------|
| Workflow Definition | `EweWorkflowDefinition` | Top-level workflow identity and metadata |
| Workflow Version | `EweWorkflowVersion` | Immutable graph snapshot (states, transitions, SLA, assignments) |
| Workflow Instance | `EweWorkflowInstance` | Runtime execution record |
| Workflow Stage | `EweWorkflowStage` | Logical grouping of states |
| Workflow State | `EweWorkflowState` | State machine node (start, intermediate, terminal, wait, parallel) |
| Workflow Transition | `EweWorkflowTransition` | Directed edge between states |
| Transition Rule | `EweTransitionRule` | Conditional routing metadata |
| Workflow Action | `EweWorkflowAction` | Manual, automated, approval, notification, script |
| Workflow Trigger | `EweWorkflowTrigger` | Event, timer, manual, signal |
| Workflow Event | `EweWorkflowEvent` | Event definition for event-driven transitions |
| Workflow Variable | `EweWorkflowVariable` | Instance context variables |
| Workflow Context | `EweWorkflowContext` | Runtime variable bag on instance |
| Workflow Assignment | `EweWorkflowAssignment` | Participant routing strategy |
| Workflow Queue | `EweWorkflowQueue` | Work queue for assignments |
| Workflow Participant | `EweWorkflowParticipant` | Identity, role, team, or queue participant |
| Workflow SLA | `EweWorkflowSla` | Duration and breach configuration |
| Workflow Escalation | `EweWorkflowEscalation` | Escalation path on SLA breach |
| Workflow Audit Reference | `EweWorkflowAuditReference` | Bridge to EAF audit trail |

---

## Capabilities

- Configuration-driven workflows
- State machine architecture with directed graph transitions
- Conditional, approval, sequential, parallel, manual, automated routing
- Event-driven and timer-based transition metadata
- Instance cancellation, suspension, resumption, completion, termination, failure
- Definition lifecycle: Draft → Validated → Approved → Published → Deprecated → Archived
- Instance lifecycle: Created → Running → Waiting → Suspended → Completed / Cancelled / Failed

---

## Validation

| Rule | Validator |
|------|-----------|
| Duplicate workflow codes | `validateEweWorkflowCodeUniqueness` |
| Invalid transitions | `validateEweWorkflowGraph` |
| Unreachable states | `validateEweWorkflowGraph` |
| Circular transitions | `validateEweWorkflowGraph` |
| Invalid start state | `validateEweWorkflowGraph` |
| Invalid terminal state | `validateEweWorkflowGraph` |
| SLA consistency | `validateEweWorkflowGraph` |
| Assignment consistency | `validateEweWorkflowGraph` |

---

## Architecture

```
src/types/enterprise-workflow-engine.ts
src/types/enterprise-workflow-engine-ports.ts
src/constants/enterprise-workflow-engine/
src/lib/enterprise-workflow-engine/
  composition.ts
  repositories/in-memory.ts
  workflow-definition-registry.ts
  workflow-instance-registry.ts
  lifecycle-manager.ts
  transition-engine.ts
  validation-engine.ts
  graph-validator.ts
  audit-integration.ts
  registry-snapshot.ts
  foundation-validation.ts
```

**Ports:** `getEwePorts()`, `configureEwePorts()`, `resetEweComposition()`

**Audit:** `recordEweWorkflowAudit()` → `appendEafAuditEntry()` (Sprint 1 EAF)

**EAF integration:** `EAF_ENGINE_CODES.WORKFLOW` reserved for EWE registration

---

## Integration Boundaries

| Engine | Relationship |
|--------|--------------|
| EAF (Sprint 1) | Audit trail via `appendEafAuditEntry` |
| EME (Sprint 2) | Future — metadata field refs on conditions/variables |
| IAAE (Sprint 3) | Future — participant identity refs |
| EOWE (Sprint 4) | Future — organizational scope on definitions/instances |
| Admin workflow-engine | Separate design-time UI layer; not modified |

Sprint 1–4 source files are **unmodified**.

---

## Non-Goals

- Database integration
- UI implementation
- API endpoints
- Loan-specific logic
- Runtime timer/event execution (metadata only)

---

## Public API

```typescript
import {
  registerEweWorkflowDefinition,
  createEweWorkflowVersion,
  createEweWorkflowInstance,
  executeEweTransition,
} from "@/constants/enterprise-workflow-engine-exports";
```
