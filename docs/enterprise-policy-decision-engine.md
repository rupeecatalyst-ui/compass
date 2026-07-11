# Enterprise Policy & Decision Engine (EPDE) — Architecture

**Sprint:** Catalyst One Sprint 7 (CF-S07-001)  
**Version:** 7.0.0  
**Status:** Foundation (in-memory, configuration-driven)

---

## Purpose

EPDE is the canonical policy evaluation platform for Catalyst One. Every configurable business decision should be represented as policies rather than hardcoded logic.

---

## Core Domain Models

| Model | Type |
|-------|------|
| Policy | `EpdePolicy` |
| Policy Version | `EpdePolicyVersion` |
| Policy Category | `EpdePolicyCategory` |
| Policy Group | `EpdePolicyGroup` |
| Policy Scope | `EpdePolicyScope` |
| Policy Context | `EpdePolicyContext` |
| Policy Variable | `EpdePolicyVariable` |
| Policy Condition | `EpdePolicyCondition` |
| Policy Expression | `EpdePolicyExpression` |
| Policy Action | `EpdePolicyAction` |
| Policy Outcome | `EpdePolicyOutcome` |
| Policy Priority | `priority` field |
| Policy Conflict | `EpdePolicyConflict` |
| Policy Resolution | `EpdePolicyResolution` |
| Decision Table | `EpdeDecisionTable` |
| Decision Tree | `EpdeDecisionTree` |
| Decision Matrix | `EpdeDecisionMatrix` |
| Scoring Model | `EpdeScoringModel` |
| Rule / Rule Group / Rule Set | `EpdeRule`, `EpdeRuleGroup`, `EpdeRuleSet` |
| Evaluation Context | `EpdePolicyContext` |
| Evaluation Result | `EpdeEvaluationResult` |
| Simulation Result | `EpdeSimulationResult` |
| Policy Audit Reference | `EpdePolicyAuditReference` |

---

## Capabilities

- Policy and rule evaluation
- Decision tables, trees, and matrices
- Scoring models
- Rule chaining and policy inheritance
- Conflict detection and resolution
- Simulation and what-if analysis
- Context-based and priority-based evaluation
- Effective date management
- Policy activation/deactivation
- Publication lifecycle

---

## Policy Definition Lifecycle

Draft → Validated → Approved → Published → Deprecated → Archived

---

## Validation

| Rule | Function |
|------|----------|
| Duplicate policy codes | `validateEpdePolicyCodeUniqueness` |
| Circular references | `validateEpdePolicyDependencies` |
| Invalid expressions | `validateEpdePolicyVersion` |
| Invalid priorities | `validateEpdePriority` |
| Invalid scopes | `validateEpdePolicyScope` |
| Invalid decision tables | `validateEpdeDecisionTable` |
| Invalid scoring models | `validateEpdeScoringModel` |
| Dependency validation | `validateEpdePolicyDependencies` |

---

## Architecture

**Ports:** `getEpdePorts()`, `configureEpdePorts()`, `resetEpdeComposition()`

**Modules:**
- `policy-registry.ts`
- `policy-evaluator.ts`
- `decision-table-engine.ts`
- `decision-tree-engine.ts`
- `decision-matrix-engine.ts`
- `conflict-resolution-engine.ts`
- `simulation-engine.ts`
- `validation-engine.ts`
- `audit-integration.ts`

---

## Integration Boundaries

| Engine | Relationship |
|--------|--------------|
| EAF (Sprint 1) | Audit via `appendEafAuditEntry` |
| ERDE (Sprint 7 Rules) | Complementary — ERDE is rule-focused; EPDE is policy-focused |
| EEIE (Sprint 6) | Future — policy evaluation events |
| Credit Risk admin | Separate layer; not modified |

Sprint 1–6 and ERDE source files are **unmodified**.

---

## Non-Goals

- Database integration
- UI implementation
- API endpoints
- Loan-specific logic

---

## Public API

```typescript
import {
  registerEpdePolicy,
  createEpdePolicyVersion,
  evaluateEpdePolicy,
  runEpdeWhatIfAnalysis,
} from "@/constants/enterprise-policy-decision-engine-exports";
```
