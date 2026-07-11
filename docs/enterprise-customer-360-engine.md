# Enterprise Customer 360 Engine (EC360) — Architecture

**Sprint:** Catalyst One Sprint 10 (CF-S10-001)  
**Version:** 10.0.0  
**Status:** Foundation (in-memory, business-agnostic)

---

## Purpose

EC360 is the canonical customer domain for Catalyst One. Every future business module must reference Customer 360 instead of maintaining independent customer records.

Customer is NOT an application. Customer is NOT a loan. Customer exists independently of products.

**Non-goals:** No loan logic, CRM, products, workflows, UI, APIs, or database integration.

---

## Core Domain Models

| Model | Type |
|-------|------|
| Customer | `Ec360Customer` |
| Customer Profile | `Ec360CustomerProfile` |
| Individual | `Ec360Individual` |
| Organization Customer | `Ec360OrganizationCustomer` |
| Household | `Ec360Household` |
| Family Relationship | `Ec360CustomerRelationship` |
| Business Relationship | `Ec360CustomerRelationship` |
| Customer Address | `Ec360CustomerAddress` |
| Customer Contact | `Ec360CustomerContact` |
| Customer Identity Reference | `Ec360CustomerIdentityReference` |
| Customer KYC Reference | `Ec360CustomerKycReference` |
| Customer Employment | `Ec360CustomerEmployment` |
| Customer Income Profile | `Ec360CustomerIncomeProfile` |
| Customer Financial Profile | `Ec360CustomerFinancialProfile` |
| Customer Risk Profile | `Ec360CustomerRiskProfile` |
| Customer Preference | `Ec360CustomerPreference` |
| Customer Consent | `Ec360CustomerConsent` |
| Customer Communication Preference | `Ec360CustomerCommunicationPreference` |
| Customer Segment | `Ec360CustomerSegment` |
| Customer Lifecycle | `Ec360CustomerLifecycleStatus` |
| Customer Timeline | `Ec360CustomerTimelineEntry` |
| Customer Tag | `Ec360CustomerTag` |
| Customer Audit Reference | `Ec360CustomerAuditReference` |

---

## Relationship Types (Configuration-Driven)

- Household
- Family
- Business
- Guarantor
- Co-applicant
- Nominee
- Authorized Signatory
- Partner Relationship

Relationships are first-class entities via `Ec360CustomerRelationship`.

---

## Capabilities

- Customer onboarding and lifecycle management
- Household management
- Relationship management
- Customer search and tagging
- Consent management
- Communication preferences
- Customer segmentation
- Timeline tracking
- Profile enrichment (employment, income, financial, risk)

---

## Customer Lifecycle

Prospect → Lead → Active → Dormant → Archived

---

## Validation

| Rule | Function |
|------|----------|
| Duplicate customer | `validateEc360CustomerCodeUniqueness` |
| Duplicate identity reference | `validateEc360IdentityReferenceUniqueness` |
| Relationship cycles | `validateEc360Relationship` |
| Invalid household | `validateEc360Household` |
| Consent consistency | `validateEc360Consent` |
| Communication preference validation | `validateEc360CommunicationPreference` |

---

## Architecture

**Ports:** `getEc360Ports()`, `configureEc360Ports()`, `resetEc360Composition()`

**Modules:**
- `customer-registry.ts` — onboarding, lifecycle, profile enrichment, segmentation
- `household-registry.ts` — household creation and membership
- `relationship-engine.ts` — configurable relationship types and relationships
- `consent-registry.ts` — consent and communication preferences
- `timeline-registry.ts` — customer timeline events
- `validation-engine.ts` — domain validation rules
- `audit-integration.ts` — EAF audit bridge
- `registry-snapshot.ts` — framework version and snapshot
- `foundation-validation.ts` — smoke test runner

---

## Engine Integration (Conceptual)

EC360 consumes platform engines without duplicating functionality:

| Engine | Integration |
|--------|-------------|
| IAAE | `identityRef` on customer; identity references |
| EOWE | Organization context (external) |
| EPNE | Partner relationships (external) |
| EAF | Audit trail via `appendEafAuditEntry` |

---

## Foundation Validation

Run `runEc360FoundationValidation()` to verify onboarding, household, relationships, consent, segmentation, timeline, enrichment, search, tagging, and rejection scenarios.

---

## File Layout

```
src/types/enterprise-customer-360-engine.ts
src/types/enterprise-customer-360-engine-ports.ts
src/constants/enterprise-customer-360-engine/
src/constants/enterprise-customer-360-engine-exports.ts
src/lib/enterprise-customer-360-engine/
docs/enterprise-customer-360-engine.md
```
