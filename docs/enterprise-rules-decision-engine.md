# Enterprise Rules & Decision Engine (ERDE) — Architecture

**Sprint:** Catalyst One Sprint 7 (CF-S07-001)  
**Version:** 7.0.0  
**Status:** Foundation (in-memory, configuration-driven)

---

## Purpose

ERDE is the canonical rule evaluation platform for Catalyst One. Business logic is configuration-driven — rules, decision tables, and decision trees replace hardcoded conditionals.

---

## Core Domain Models

| Model | Type |
|-------|------|
| Rule | `ErdeRule` |
| Rule Group | `ErdeRuleGroup` |
| Rule Set | `ErdeRuleSet` |
| Rule Version | `ErdeRuleVersion` |
| Rule Condition | `ErdeRuleCondition` |
| Rule Expression | `ErdeRuleExpression` |
| Rule Action | `ErdeRuleAction` |
| Rule Parameter | `ErdeRuleParameter` |
| Rule Variable | `ErdeRuleVariable` |
| Rule Context | `ErdeRuleContext` |
| Rule Result | `ErdeRuleResult` |
| Decision Table | `ErdeDecisionTable` |
| Decision Tree | `ErdeDecisionTree` |
| Rule Priority | `priority` on rule/group/row |
| Rule Category | `ErdeRuleCategory` |
| Rule Tag | `ErdeRuleTag` |
| Rule Execution | `ErdeRuleExecution` |
| Rule Audit Reference | `ErdeRuleAuditReference` |

---

## Capabilities

- Rule evaluation with context-based expressions
- Rule chaining via `chain_rule` actions
- Rule grouping and priority-ordered sets
- Rule versioning and activation/deactivation
- Decision table and decision tree evaluation
- Rule simulation (dry-run)
- Execution history
- Rule tagging and inheritance via `parentRuleId`
- Configuration-driven execution

---

## Rule Definition Lifecycle

Draft → Validated → Approved → Published → Deprecated → Archived

---

## Validation

| Rule | Function |
|------|----------|
| Duplicate rule codes | `validateErdeRuleCodeUniqueness` |
| Invalid expressions | `validateErdeRuleVersion` |
| Circular rule references | `validateErdeRuleDependencies` |
| Invalid priorities | `validateErdePriority` |
| Invalid decision tables | `validateErdeDecisionTable` |
| Missing parameters | `validateErdeEvaluationContext` |
| Rule dependency validation | `validateErdeRuleDependencies` |

---

## Architecture

**Ports:** `getErdePorts()`, `configureErdePorts()`, `resetErdeComposition()`

**Modules:**
- `rule-registry.ts` — definitions, versions, sets, groups
- `rule-evaluator.ts` — evaluation and chaining
- `decision-table-engine.ts` — table matching
- `decision-tree-engine.ts` — tree traversal
- `simulation-engine.ts` — dry-run simulation
- `expression-evaluator.ts` — condition/expression evaluation
- `validation-engine.ts` — validation rules
- `audit-integration.ts` — EAF audit bridge

---

## Integration Boundaries

| Engine | Relationship |
|--------|--------------|
| EAF (Sprint 1) | Audit via `appendEafAuditEntry` |
| EEIE (Sprint 6) | Future — rule events via event bus |
| EWE (Sprint 5) | Future — workflow transition rules |
| Credit Risk Engine | Separate admin layer; not modified |

Sprint 1–6 source files are **unmodified**.

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
  registerErdeRule,
  createErdeRuleVersion,
  evaluateErdeRule,
  simulateErdeRule,
} from "@/constants/enterprise-rules-decision-engine-exports";
```
