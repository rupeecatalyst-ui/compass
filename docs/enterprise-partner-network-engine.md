# Enterprise Partner Network Engine (EPNE) — Architecture

**Sprint:** Catalyst One Sprint 9 (CF-S09-001)  
**Version:** 9.0.0  
**Status:** Foundation (in-memory, business-agnostic)

---

## Purpose

EPNE is the canonical partner ecosystem platform for Catalyst One. It manages every type of external business relationship without assuming loan-specific workflows. All persistence is in-memory; no UI, APIs, or database integration in this foundation sprint.

**Non-goals:** No commission calculations, payout logic, loan workflows, UI, APIs, or database integration.

---

## Core Domain Models

| Model | Type |
|-------|------|
| Partner | `EpnePartner` |
| Partner Profile | `EpnePartnerProfile` |
| Partner Type | `EpnePartnerType` |
| Partner Category | `EpnePartnerCategory` |
| Partner Status | `EpnePartnerLifecycleStatus` |
| Partner Organization | `EpnePartnerOrganization` |
| Partner Legal Entity | `EpnePartnerLegalEntity` |
| Partner Contact | `EpnePartnerContact` |
| Partner Address | `EpnePartnerAddress` |
| Partner Agreement | `EpnePartnerAgreement` |
| Agreement Version | `EpneAgreementVersion` |
| Partner Hierarchy | `EpnePartnerHierarchyNode` |
| Relationship | `EpneRelationship` |
| Relationship Type | `EpneRelationshipType` |
| Referral Network | `EpneReferralNetwork` |
| Referral Mapping | `EpneReferralMapping` |
| Territory | `EpneTerritory` |
| Service Area | `EpneServiceArea` |
| Capability | `EpneCapability` |
| Performance Summary | `EpnePartnerPerformanceSummary` |
| Partner Tag | `EpnePartnerTag` |
| KYC Reference | `EpnePartnerKycReference` |
| Banking Reference | `EpnePartnerBankingReference` |
| Compliance Reference | `EpnePartnerComplianceReference` |
| Partner Audit Reference | `EpnePartnerAuditReference` |

---

## Configurable Relationship Types

Relationship types are configuration-driven via `EPNE_DEFAULT_RELATIONSHIP_TYPES`:

- Refers Business To
- Managed By
- Introduced By
- Strategic Alliance
- Franchise Of
- Services Territory
- Reports To
- Parent Partner
- Child Partner

Custom types may be registered via `registerEpneRelationshipType()`.

---

## Capabilities

- Partner onboarding, activation, suspension, archival
- Unlimited hierarchy depth (max 100 guard)
- Multiple configurable relationship types
- Multiple partner categories
- Territory and service area assignment
- Agreement versioning and lifecycle
- Referral network membership via referral mappings
- Capability catalog and assignment
- Partner tagging and search
- Performance summaries

---

## Partner Lifecycle

Draft → Pending Verification → Active → Suspended → Inactive → Archived

## Agreement Lifecycle

Draft → Approved → Effective → Expired → Archived

---

## Validation

| Rule | Function |
|------|----------|
| Duplicate partner codes | `validateEpnePartnerCodeUniqueness` |
| Circular hierarchy | `validateEpneParentRelationship` |
| Invalid relationship types | `validateEpneRelationship` |
| Invalid parent assignments | `validateEpneParentRelationship` |
| Duplicate agreements | `validateEpneAgreement` |
| Duplicate memberships | `validateEpneMembership` / `validateEpneReferralMapping` |
| Territory conflicts | `validateEpneServiceArea` |

---

## Architecture

**Ports:** `getEpnePorts()`, `configureEpnePorts()`, `resetEpneComposition()`

**Modules:**
- `partner-registry.ts` — onboarding, lifecycle, profile, org, contact, address
- `relationship-registry.ts` — relationship types, relationships, referral networks/mappings
- `hierarchy-engine.ts` — parent-child tree navigation
- `agreement-registry.ts` — agreements and versions
- `territory-registry.ts` — territories, service areas, legacy network membership
- `capability-registry.ts` — capability catalog and assignments
- `performance-registry.ts` — performance summaries and external references
- `validation-engine.ts` — domain validation rules
- `audit-integration.ts` — EAF audit bridge
- `registry-snapshot.ts` — framework version and snapshot
- `foundation-validation.ts` — smoke test runner

---

## Engine Integration (Conceptual)

EPNE does not duplicate responsibilities of peer engines:

| Engine | Integration |
|--------|-------------|
| IAAE | `identityRef` on partner |
| EOWE | `organizationRef` on partner and organization |
| EWE | Workflow orchestration (external) |
| EEIE | Event publishing (external) |
| ERDE | Decision evaluation (external) |
| EPDE | Policy evaluation (external) |

Audit entries are recorded via Sprint 1 EAF (`appendEafAuditEntry`).

---

## Foundation Validation

Run `runEpneFoundationValidation()` to verify onboarding, profiles, relationships, capabilities, territories, agreements, performance, search, tagging, and rejection scenarios.

---

## File Layout

```
src/types/enterprise-partner-network-engine.ts
src/types/enterprise-partner-network-engine-ports.ts
src/constants/enterprise-partner-network-engine/
src/constants/enterprise-partner-network-engine-exports.ts
src/lib/enterprise-partner-network-engine/
docs/enterprise-partner-network-engine.md
```
