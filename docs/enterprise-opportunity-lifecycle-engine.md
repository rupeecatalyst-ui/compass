# Enterprise Opportunity Lifecycle Engine (EOLE) — Architecture

**Sprint:** Catalyst One Sprint 13 (CF-S13-001 / CF-S13-002)
**Version:** 13.0.0
**Status:** ✅ **OFFICIALLY COMPLETE** (CF-S13-002)
**Closure Commit:** `5a48b9a` — `feat(catalyst-one): Sprint 13 Opportunity Lifecycle Engine closure (CF-S13-002)`
**Repository:** Synchronized — ready for downstream sprints (Sprint 14+ builds on EOLE; do not modify Sprint 13 architecture)

---

## Purpose

EOLE is the canonical business orchestration engine for Catalyst One. It represents one customer's one financial requirement for one financial product under one business case.

EOLE orchestrates the complete business journey from lead conversion through lender pipelines, disbursement sync, and closure.

**Non-goals:** No loan logic, no customer/partner/workflow/document duplication, no financial calculations, no UI, no APIs, no database.

---

## Frozen Architecture Principles

1. Opportunity represents business intent — not lender execution.
2. Pipeline is a flow — never permanent storage.
3. Customer is permanent; Opportunity is a business journey.
4. Every completed Opportunity becomes historical — never operational.
5. Business behaviour remains configuration-driven.

---

## Core Philosophy

```
One Customer + One Product + One Financial Requirement = One Opportunity
```

Each Opportunity owns exactly one Enterprise Opportunity ID (`eole:opportunity:{uuid}`). Multiple Opportunities may exist for the same customer (e.g. Home Loan, Personal Loan, second Home Loan for different property).

Opportunity is created only after minimum required documents are submitted (Lead → Opportunity).

---

## Core Domain Models

| Model | Type |
|-------|------|
| Opportunity | `EoleOpportunity` |
| Opportunity Profile | `EoleOpportunityProfile` |
| Opportunity Requirement | `EoleOpportunityRequirement` |
| Opportunity Owner | `EoleOpportunityOwner` |
| Opportunity Executor | `EoleOpportunityExecutor` |
| Opportunity Assignment | `EoleOpportunityAssignment` |
| Opportunity Product Reference | `EoleOpportunityProductReference` |
| Opportunity Customer Reference | `EoleOpportunityCustomerReference` |
| Opportunity Partner Reference | `EoleOpportunityPartnerReference` |
| Opportunity Organization Reference | `EoleOpportunityOrganizationReference` |
| Opportunity Financial Requirement | `EoleOpportunityFinancialRequirement` |
| Opportunity Lifecycle | `EoleOpportunityLifecycle` |
| Opportunity Stage | `EoleOpportunityStage` |
| Opportunity Sub-stage | `EoleOpportunitySubStage` |
| Opportunity Pipeline | `EoleOpportunityPipeline` |
| Opportunity Pipeline Snapshot | `EoleOpportunityPipelineSnapshot` |
| Opportunity Lender Reference | `EoleOpportunityLenderReference` |
| Opportunity Strategy | `EoleOpportunityStrategy` |
| Opportunity Timeline | `EoleOpportunityTimelineEntry` |
| Opportunity Aging | `EoleOpportunityAging` |
| Opportunity SLA | `EoleOpportunitySla` |
| Opportunity Audit Reference | `EoleOpportunityAuditReference` |

---

## Lifecycle

### Active States
`new` → `documents_pending` → `processing` → `lender_review` → `approved` → `partially_disbursed` (+ `on_hold`)

### Terminal States (immutable, never reopen)
`fully_disbursed`, `rejected`, `cancelled`, `expired`, `archived`

If a customer returns later: New Lead → New Opportunity → New Enterprise Opportunity ID. Customer history preserved via EC360.

---

## Engine References (No Duplication)

| Engine | Reference |
|--------|-----------|
| EC360 | `customerRef` |
| EPNE | `partnerRef`, `ownerRef` |
| EOWE | `organizationRef` |
| EWE | `workflowRef` on lender pipelines |
| EFOE | `transactionRef`, disbursement status sync |
| EDIE | `documentRefs` on lender pipelines |
| IAAE | `identityRef` |
| EPDE | `policyRef` |
| ERDE | `ruleRef` |

---

## Ownership

- **One Source Owner** — immutable once assigned
- **Unlimited Executors** — may change; history preserved via `unassignedOn`

---

## Lender Strategy

One Opportunity may orchestrate multiple independent Lender Pipelines. Each lender has own workflow, documents, timeline, stages, and outcome. EOLE references — never duplicates.

### Business Models
- **Secured Lending:** Many pipelines → one successful disbursement
- **Unsecured Lending:** Many pipelines → multiple disbursements → requirement fulfilled

---

## Hold

Temporary hold with configurable maximum period. Expired hold recommends closure (warning) — never auto-deletes.

---

## Pipeline Aging

Configurable policies per stage: max days, reminder, escalation, manager notification, mission control notification.

---

## Validation

| Code | Check |
|------|-------|
| `EOLE_DUPLICATE_OPPORTUNITY` | Same customer + product + financial requirement |
| `EOLE_MISSING_CUSTOMER` | Customer reference required |
| `EOLE_MISSING_PRODUCT` | Product reference required |
| `EOLE_INVALID_OWNER` | Invalid or duplicate source owner |
| `EOLE_CIRCULAR_ASSIGNMENT` | Assignment chain cycle |
| `EOLE_DUPLICATE_EXECUTOR` | Active executor duplicate |
| `EOLE_INVALID_LIFECYCLE` | Invalid transition |
| `EOLE_INVALID_STAGE` | Unknown or disabled stage |
| `EOLE_INVALID_HOLD` | Hold reason or duration violation |
| `EOLE_AGING_EXCEEDED` | Stage aging policy breach |

---

## Architecture

**Ports:** `getEolePorts()`, `configureEolePorts()`, `resetEoleComposition()`

**Modules:**
- `opportunity-registry.ts` — opportunity creation and references
- `ownership-registry.ts` — source owner and assignments
- `executor-registry.ts` — executor assignment with history
- `lifecycle-registry.ts` — transitions, holds, closure
- `pipeline-registry.ts` — lender pipelines and snapshots
- `aging-registry.ts` — aging policies and SLA
- `timeline-registry.ts` — opportunity timeline
- `validation-engine.ts` — domain validation
- `audit-integration.ts` — EAF audit bridge

---

## Foundation Validation

Run `runEoleFoundationValidation()` to verify end-to-end orchestration, rejection checks, and audit bridge.

---

## File Layout

```
src/types/enterprise-opportunity-lifecycle-engine.ts
src/types/enterprise-opportunity-lifecycle-engine-ports.ts
src/constants/enterprise-opportunity-lifecycle-engine/
src/constants/enterprise-opportunity-lifecycle-engine-exports.ts
src/lib/enterprise-opportunity-lifecycle-engine/
docs/enterprise-opportunity-lifecycle-engine.md
```
