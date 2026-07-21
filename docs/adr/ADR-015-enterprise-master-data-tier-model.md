# ADR-015: Enterprise Master Data Tier Model (CO-ARCH-001)

**Status:** Accepted  
**Date:** 2026-07-21  
**Program:** CO-ARCH-001  
**Classification:** ARCH / INFRA

## Context

CO-CERTIFICATION-003 audit found **0/15 enterprise master registries** persisted in PostgreSQL. Master data exists in parallel TypeScript constants, in-memory stores, and hardcoded arrays across 50+ consumers. ECM contacts and companies use free-text fields for city, state, industry, employment type, etc.

Catalyst One requires a **hybrid persistence model** that:

1. Shares metadata conventions across all registry tiers
2. Uses one framework for simple lookup data (Tier 1)
3. Uses dedicated schemas for business registries with lifecycle (Tier 2)
4. Evolves operational entities (Tier 3) via nullable FKs without breaking existing strings during transition

## Decision

Adopt a **four-tier Enterprise Master Data architecture**:

| Tier | Name | Persistence | Examples |
|------|------|-------------|----------|
| **0** | Registry Metadata | Shared audit, attachment, import-batch tables + standard column block | CO-ARCH-001-I1 |
| **1** | Reference Master | Single `EnterpriseReferenceMaster` table, domain-keyed | city, state, industry, employment_type |
| **2** | Business Registries | Dedicated tables per domain | Product, Lender, Document registries |
| **3** | Operational Registries | Existing ECM + future loan/opportunity persistence | Contacts, Companies, Loan Files |

### Tier 0 standard column block (applied to Tier 1 & 2 entity tables in future phases)

`organizationId`, `code`, `label`, `description`, `status`, `enabled`, `versionNumber`, `effectiveFrom`, `effectiveUntil`, soft-delete columns, audit columns, optional approval workflow columns.

### Tier 1 vs Tier 2 classification rule

- Selectable label/code with optional hierarchy → **Tier 1**
- Lifecycle, programs, rules, commercials, composition → **Tier 2**
- Transaction/party/work item consuming masters → **Tier 3**

### Reclassified ECM domains

| Former ECM domain | New tier |
|-------------------|----------|
| lender, product, branch, region | Tier 2 |
| builder_company, relationship_manager | Tier 3 |
| city, state, industry, employment_type, etc. | Tier 1 |

## Implementation phases (Infrastructure Office)

| Phase | Deliverable |
|-------|-------------|
| I1 | Tier 0 metadata schema + migration + repositories |
| I2 | Tier 1 Reference Master schema + CRUD API |
| I3 | Seed / backfill scripts |
| I4 | Tier 2 Product / Lender / Document schemas |
| I5 | Client ports + dual-read adapters |
| I6 | Picker port swaps (data source only) |
| I7 | Thin admin maintenance console |

## Constraints (frozen)

- **Infrastructure program** — no workspace redesign, no business journey changes
- **Additive migrations** — nullable FKs before dropping legacy string columns
- **Org-scoped** — all masters keyed to `organizationId`
- **Soft-delete aligned** — CO-SPRINT-119 pattern on all registry tables
- **Dual-read transition** — constants remain until port swap phases complete

## Consequences

### Positive

- Single SSOT path for master data foundation
- Shared audit/import/attachment infrastructure (I1) reused by all tiers
- Clear classification gate for future entities

### Negative

- Large consumer migration surface (phased via I5–I6)
- Production requires `prisma migrate deploy` per phase

## Related

- CO-ARCH-001 Implementation Blueprint (conversation archive)
- PMO-006 Architecture Governance Policy
- `docs/co-arch-001/CO-ARCH-001-I1-MIGRATION_PLAN.md`
