# Enterprise Metadata Engine (EME) — Architecture

**Sprint:** Catalyst One Sprint 2 (CF-S02-001)  
**Version:** 2.0.0  
**Status:** Foundation (metadata-only, in-memory)

---

## Purpose

The Enterprise Metadata Engine (EME) is the backbone of Catalyst One's **"Everything is Configurable"** philosophy.

Every Enterprise Asset (Customer, Loan, Product, Lender, Partner, Business Unit, Policy, Document, etc.) can define and manage metadata dynamically **without changing application code**.

EME is a **standalone module** that integrates with Sprint 1 EAF via audit hooks and an optional EAF bridge. Sprint 1 architecture is unchanged.

---

## Capabilities Delivered

| Capability | Implementation |
|------------|----------------|
| **Metadata Registry** | `registerEmeMetadataDefinition()` — one schema per asset type |
| **Field Definitions** | 27 field types via `EME_FIELD_DATA_TYPES` — extensible union |
| **Field Properties** | `EmeFieldDefinition` — label, code, validation, display order, category, etc. |
| **Formula Foundation** | `EME_DEFAULT_FORMULA_OPERATORS` — arithmetic, comparison, logical, grouping |
| **Metadata Categories** | System + custom categories (`personal_information`, `compliance`, etc.) |
| **Validation Metadata** | `EmeValidationRuleMetadata` — required, min, max, regex, length, custom placeholder |
| **Metadata Versioning** | Semantic versioning per schema with `EmeMetadataVersionRecord` |
| **Audit Hooks** | `recordEmeMetadataAudit()` → Sprint 1 `appendEafAuditEntry()` |

---

## Folder Structure

```
src/
├── types/
│   ├── enterprise-metadata-engine.ts
│   └── enterprise-metadata-engine-ports.ts
├── constants/
│   ├── enterprise-metadata-engine/
│   │   ├── field-types.ts
│   │   ├── categories.ts
│   │   ├── formula-operators.ts
│   │   ├── validation-rules.ts
│   │   ├── defaults.ts
│   │   └── index.ts
│   └── enterprise-metadata-engine-exports.ts
├── lib/
│   └── enterprise-metadata-engine/
│       ├── composition.ts
│       ├── repositories/in-memory.ts
│       ├── metadata-registry.ts
│       ├── field-definition-engine.ts
│       ├── category-registry.ts
│       ├── validation-metadata.ts
│       ├── formula-metadata.ts
│       ├── version-engine.ts
│       ├── audit-integration.ts
│       ├── eaf-bridge.ts
│       ├── registry-snapshot.ts
│       └── index.ts
└── docs/
    └── enterprise-metadata-engine.md
```

---

## Integration with EAF (Sprint 1)

| Integration | Mechanism |
|-------------|-----------|
| Audit trail | `audit-integration.ts` calls `appendEafAuditEntry()` |
| Backward compat | `eaf-bridge.ts` syncs fields to `registerEafDynamicField()` |
| Asset type codes | Metadata schemas reference `EafAssetTypeCode` strings |
| No EAF changes | Sprint 1 files unmodified |

---

## Public API

```typescript
import {
  registerEmeMetadataDefinition,
  registerEmeFieldDefinition,
  getEmeMetadataRegistrySnapshot,
} from "@/constants/enterprise-metadata-engine-exports";
```

---

## What Was NOT Built (Sprint 2 Scope)

- Dynamic forms / form renderer
- Screen builder
- Workflow engine
- Business rules runtime
- Formula expression evaluation
- Validation runtime engine
- Customer / loan screens
- Prisma persistence
- Admin UI (beyond optional future dev interfaces)

---

## Sprint 3 Recommendations

1. Runtime validation engine evaluating `EmeValidationRuleMetadata`
2. Formula expression parser and evaluator
3. Prisma adapters for `EmePorts`
4. Register `metadata_engine` in EAF engine registry
5. ADR-015 — EAF vs EAL vs EME boundary
6. Admin metadata management UI

---

## Boundary

- **EAF** — enterprise asset lifecycle, audit, relationships, versioning
- **EME** — metadata schema, fields, categories, validation, formula operator definitions
- **EAL** — reusable library assets (separate module)

Domain modules register metadata via EME; they must not duplicate field definitions in code.
