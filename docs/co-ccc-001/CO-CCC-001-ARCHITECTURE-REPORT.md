# CO-CCC-001 — Corporate Compliance Center Architecture Report

**Sprint:** CO-CCC-001  
**Status:** Foundation implemented (local) · No deploy · Awaiting PO review  
**Date:** 2026-08-07

## Purpose

Corporate Compliance Center (CCC) is the enterprise compliance desk for Catalyst One Organization domain. It provides legal entity registry, filtered repository views, institution requirements, document package builder, enterprise document dispatch (EDDE), and derived compliance intelligence — without introducing a second binary document store.

## Architectural principle

```
Organization Domain
  └── /organization/compliance-center  (CCC hub)
        repositories = filtered views of OrganizationDocument SSOT
```

| Surface | Role |
|---------|------|
| **Organization Documents** | Authoring — upload, replace, version binary content |
| **Corporate Compliance Center** | Compliance desk — metadata, entities, packages, dispatch SSOT |
| **Corporate Repository** | Read projection (legacy page preserved; links to CCC) |

## Data model

### Extended `OrganizationDocument`

Additive nullable/compliance fields: `legalEntityId`, `repositoryKey`, `financialYear`, `isCurrentFinancialVersion`, `effectiveDate`, `expiryDate`, `approvalStatus`, `confidentiality`, `supersededByDocumentId`, `linkedPackageIdsJson`.

Indexes: org+repositoryKey, org+legalEntityId, org+financialYear, org+approvalStatus, org+expiryDate.

### New CCC models

- `CccLegalEntity` — multi-entity registry (bootstrap primary from org profile)
- `CccInstitutionProfile` — banks, NBFCs, regulators, etc.
- `CccInstitutionRequirement` — per-institution document expectations
- `CccDocumentPackageDefinition` — reusable package templates
- `CccDocumentPackageInstance` — built package with resolved document IDs
- `CccDispatch` / `CccDispatchItem` — EDDE dispatch registry

Compliance alerts are **derived in service** — no `CccComplianceAlert` table.

## Server layers

| Layer | Path |
|-------|------|
| Repository | `server/repositories/corporate-compliance-center/ccc.repository.ts` |
| Service | `server/services/corporate-compliance-center/ccc.service.ts` |
| APIs | `src/app/api/organization/compliance-center/**` |

Guards: `ENTERPRISE_PERSISTENCE_MODE=prisma` + `SUPER_ADMIN` (reuses org workspace route utils).

## Client

| Concern | Path |
|---------|------|
| API client | `src/lib/corporate-compliance-center/api-client.ts` |
| Intelligence helpers | `src/lib/corporate-compliance-center/derive-intelligence.ts` |
| UI hub | `src/components/catalyst-one/corporate-compliance-center/ccc-workspace.tsx` |
| Route | `/organization/compliance-center` |

## Key business rules

1. Upload path sets default `repositoryKey` from org document category (and financial types → `financial`).
2. Setting `isCurrentFinancialVersion=true` unsets prior current for same entity+type+FY.
3. Supersession sets old doc `approvalStatus=superseded` + `supersededByDocumentId`.
4. `buildPackageInstance` resolves latest **approved** docs matching item specs.
5. `sendDispatch` simulates sent status (real email deferred).

## Migration

`prisma/migrations/20260807150000_co_ccc_001_corporate_compliance_center/migration.sql`

**Manual ops:** Apply migration to Postgres before runtime CCC APIs function in prisma mode.

## Related

- CO-ORG-001 Organization Workspace (document binary SSOT)
- Organization Documents Registry rule (authoring surface unchanged)
