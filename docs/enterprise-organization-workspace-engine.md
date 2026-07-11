# Enterprise Organization & Workspace Engine (EOWE) — Architecture

**Sprint:** Catalyst One Sprint 4 (CF-S04-001)  
**Version:** 4.0.0  
**Status:** Foundation (metadata-only, in-memory)

---

## Purpose

EOWE provides the foundational Organization & Workspace model for Catalyst One — modular, configuration-driven, and free of business-specific assumptions.

---

## Capabilities

| # | Capability | Implementation |
|---|------------|----------------|
| 1 | Enterprise Organization | `EoweOrganizationRecord` |
| 2 | Business Unit | `business_unit` node type |
| 3 | Region hierarchy | `region` node type |
| 4 | Zone hierarchy | `zone` node type |
| 5 | Branch hierarchy | `branch` node type |
| 6 | Department | `department` node type |
| 7 | Team | `team` node type |
| 8 | Position hierarchy | `EowePositionRecord` + reporting chain |
| 9 | Workspace | `EoweWorkspaceRecord` |
| 10 | Ownership | `EoweOwnershipRecord` |
| 11 | Reporting hierarchy | `getEoweReportingChain()`, cycle detection |
| 12 | Organization metadata | `EoweOrganizationMetadata` |
| 13 | Multi-tenant boundaries | `EoweTenantBoundary`, tenant validation |
| 14 | Organization lifecycle | Draft → Active → Suspended → Archived |
| 15 | Hierarchy validation | `hierarchy-validator.ts` |

---

## Hierarchy Configuration

```
Organization → Business Unit → Region → Zone → Branch → Department → Team → Position
```

Validation is driven by `EOWE_HIERARCHY_LEVEL_DEFINITIONS` — no hardcoded business logic.

---

## Integration

| Engine | Integration |
|--------|-------------|
| EAF (Sprint 1) | Audit via `appendEafAuditEntry()` |
| EIAE (Sprint 3) | Complementary — EIAE OSV is access scope; EOWE is org structure |

Sprint 1–3 source files are **unmodified**.

---

## Non-Goals

- Loan workflow integration
- UI beyond foundational validation
- Runtime workspace enforcement

---

## Public API

```typescript
import {
  registerEoweTenantBoundary,
  createEoweHierarchyNode,
  registerEoweWorkspace,
} from "@/constants/enterprise-organization-workspace-engine-exports";
```
