# Enterprise Asset Framework (EAF) — Architecture

**Sprint:** Catalyst One Sprint 1 + Sprint 1A Hardening  
**Version:** 1.1.0 (Hardening) / 1.0.0 (Foundation API)  
**Status:** ✅ **OFFICIALLY COMPLETE** (CF-S01A-003)  
**Closure Commit:** `52c21ec` — `feat(catalyst-one): Sprint 1 Enterprise Asset Framework closure (CF-S01A-003)`  
**Repository:** Synchronized — ready for downstream sprints (Sprint 2+ builds on EAF; do not modify Sprint 1 architecture)

---

## Purpose

The Enterprise Asset Framework (EAF) is the **common parent DNA** for every business object in Catalyst One.

All future domain entities (Customer, Loan, Product, Lender, Policy, Document, Workflow, Employee, Branch, etc.) **inherit** from `EafBaseAsset` — they must not duplicate core enterprise fields.

EAF is **completely generic**. It contains no references to loans, customers, lenders, or products.

> **Boundary:** EAL (Enterprise Asset Library) governs reusable library assets. EAF governs the enterprise asset lifecycle, relationships, versioning, audit, and extensibility hooks for **all** registrable entities.

---

## Engineering Principles Applied

| Principle | EAF Implementation |
|-----------|-------------------|
| Configuration over Code | Lifecycle, asset types, relationships defined in config registries |
| Metadata Driven | Dynamic fields, layouts, forms, validation via hook bundles |
| Enterprise Asset First | `EafBaseAsset` is the mandatory parent interface |
| Composition over Duplication | `EafExtendedAsset<TMetadata>` extends base with typed metadata bag |
| Security by Default | Permission / visibility / workspace profile hooks (architecture only) |
| Relationship Based Visibility | Relationship framework with configurable type definitions |
| Auditable | Append-only audit trail with standard actions |
| Versioned | Semantic versioning + version history records |
| AI Ready | AI summary, tags, index hooks (architecture only) |
| No Business Logic Hardcoding | No domain modules; generic type codes only |

---

## Folder Structure

```
src/
├── types/
│   ├── enterprise-asset-framework.ts             # Core interfaces
│   ├── enterprise-asset-framework-definition.ts  # Asset definition, manifest, health
│   ├── enterprise-asset-framework-capabilities.ts
│   ├── enterprise-asset-framework-engines.ts
│   ├── enterprise-asset-framework-feature-flags.ts
│   ├── enterprise-asset-framework-ports.ts       # Repository / provider contracts
│   ├── enterprise-asset-framework-events.ts      # Domain events + versioned envelopes
│   └── enterprise-asset-framework-extension.ts   # Domain extension registration
├── constants/
│   ├── enterprise-asset-framework/
│   │   ├── lifecycle.ts                          # Default lifecycle config
│   │   ├── lifecycle-states.ts                   # Lifecycle state constants
│   │   ├── relationship-types.ts                 # Generic relationship types
│   │   ├── capabilities.ts                       # Capability registry seed
│   │   ├── engines.ts                            # Engine registry seed
│   │   ├── events.ts                             # Event names and versions
│   │   ├── extension-points.ts                   # Manifest extension points
│   │   ├── asset-status.ts                       # Health status constants
│   │   ├── audit.ts                              # Audit action labels
│   │   ├── defaults.ts                           # Asset type seed + framework version
│   │   └── index.ts
│   └── enterprise-asset-framework-exports.ts
├── lib/
│   └── enterprise-asset-framework/
│       ├── composition.ts                        # Composition root (DI entry point)
│       ├── configuration-provider.ts             # Configuration abstraction
│       ├── asset-definition-resolver.ts          # Derived asset definitions
│       ├── manifest-builder.ts                   # Asset manifest builder
│       ├── capability-registry.ts                # Capability registry
│       ├── engine-registry.ts                    # Engine registry (foundation)
│       ├── feature-flag-hooks.ts                 # Feature flag extension points
│       ├── health-model.ts                       # Asset health model
│       ├── event-versioning.ts                   # Versioned event envelopes
│       ├── repositories/
│       │   └── in-memory.ts                      # Sprint 1 in-memory adapters
│       ├── events/
│       │   └── in-process-event-publisher.ts     # Sprint 1 event bus
│       ├── extension-registry.ts                 # Domain module registration
│       ├── base-asset.ts                         # Draft factory + patch helpers
│       ├── lifecycle-engine.ts                   # Config-driven transitions
│       ├── relationship-engine.ts                # Asset linking
│       ├── version-engine.ts                     # Semantic versioning
│       ├── audit-engine.ts                       # Audit trail
│       ├── hook-registry.ts                      # Metadata / permission / search / AI hooks
│       ├── registry.ts                           # Central asset + config registry
│       └── index.ts
└── docs/
    └── enterprise-asset-framework.md             # This document
```

---

## 10-Year Architecture: Ports and Adapters

EAF follows **hexagonal architecture** so Catalyst One can evolve storage, messaging, and domain modules independently.

### Layer Model

```
┌─────────────────────────────────────────────────────────────┐
│  Domain Modules (Sprint 2+) — Customer, Loan, Product, etc. │
│  Register via EafDomainExtensionRegistration                  │
└──────────────────────────┬──────────────────────────────────┘
                           │ uses public API only
┌──────────────────────────▼──────────────────────────────────┐
│  Engines — lifecycle, relationship, version, audit, registry│
│  Pure orchestration; no storage knowledge                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ delegates via EafPorts
┌──────────────────────────▼──────────────────────────────────┐
│  Ports — EafAssetRepository, EafAuditRepository, etc.       │
│  Interfaces only; swappable per environment                 │
└──────────────────────────┬──────────────────────────────────┘
                           │ implemented by
┌──────────────────────────▼──────────────────────────────────┐
│  Adapters — in-memory (Sprint 1), Prisma (Sprint 2+), etc.  │
└─────────────────────────────────────────────────────────────┘
```

### Composition Root

All adapters are wired through a single injection point:

```typescript
import {
  configureEafPorts,
  getEafPorts,
  getEafEventPublisher,
  resetEafComposition,
} from "@/lib/enterprise-asset-framework";

// Sprint 1: defaults are in-memory (no setup required)
const ports = getEafPorts();

// Sprint 2+: swap one port at a time
configureEafPorts({ assets: prismaAssetRepository });

// Tests: full reset
resetEafComposition();
```

### Domain Events

Engines publish typed domain events (`asset.created`, `asset.lifecycle_changed`, etc.) through `EafEventPublisher`. Sprint 1 uses an in-process publisher; production can replace it with Kafka, SNS, or an enterprise event bus without changing engine code.

### Domain Extensions

Future modules register **outside** EAF core:

```typescript
registerEafDomainExtension({
  extensionId: "catalyst.customer-module",
  extensionVersion: "1.0.0",
  assetTypeCodes: ["customer"],
  capabilities: ["lifecycle", "audit", "relationships"],
  enabled: true,
});
```

EAF never imports domain types. Extensions declare asset type codes; configuration owns the registry.

### Why This Supports 10-Year Maintainability

| Decision | Long-term benefit |
|----------|-------------------|
| Ports over direct storage | Prisma, read replicas, or federated stores swap without engine rewrites |
| Composition root | One place to configure test vs staging vs production adapters |
| Domain events | Audit, AI pipelines, and integrations subscribe without coupling |
| Extension registry | New business modules ship without modifying EAF source |
| Stable public API | `registerEafAsset`, `transitionEafLifecycle` remain unchanged across sprints |
| `Eaf` prefix | No collision with EAL (`EnterpriseAsset*`) or ATLAS naming |

---

## Base Enterprise Asset Model

Every asset inherits `EafBaseAsset`:

| Field | Description |
|-------|-------------|
| `id` | Internal UUID (immutable) |
| `publicIdentity` | Optional — assigned later by Identity Engine |
| `assetType` | Code from Asset Type Registry |
| `assetName` | Display name |
| `description` | Description |
| `lifecycleState` | Code from Lifecycle Definition |
| `category` | Taxonomy category code |
| `tags` | string[] |
| `owner` | Owner reference |
| `createdBy` / `createdOn` | Creation audit |
| `modifiedBy` / `modifiedOn` | Modification audit |
| `version` | Semantic version string |
| `effectiveFrom` / `effectiveTo` | Validity window |
| `activeFlag` | Operational active flag |
| `archiveFlag` | Archive flag |
| `remarks` | Free-text remarks |

Domain modules extend via:

```typescript
interface MyDomainAsset extends EafExtendedAsset<MyMetadata> {}
```

---

## Lifecycle Framework

Default configurable lifecycle:

```
Draft → Review → Approved → Published → Active → Inactive → Archived
```

- States and transitions are defined in `EafLifecycleDefinition`
- Transitions validated via `canTransitionEafLifecycle()`
- Applied via `transitionEafLifecycle()` with audit recording
- **Not hardcoded** — additional lifecycle definitions can be registered

---

## Relationship Framework

Generic relationship types (configurable):

- `parent_child`
- `depends_on`
- `associated_with`
- `governed_by`
- `version_of`

Relationships are stored as `EafAssetRelationship` records. No business traversal logic — framework only.

---

## Extension Hooks (Architecture Only)

| Hook | Purpose |
|------|---------|
| **Metadata** | Dynamic fields, layouts, forms, validation rules |
| **Permissions** | Role permissions, visibility rules, workspace profiles |
| **Search** | Search metadata + index field definitions |
| **AI** | AI summary, tags, index references |

---

## Public API

Import from `@/constants/enterprise-asset-framework-exports` or `@/lib/enterprise-asset-framework`:

```typescript
import {
  registerEafAsset,
  transitionEafLifecycle,
  createEafRelationship,
  getEafFrameworkSnapshot,
} from "@/constants/enterprise-asset-framework-exports";
```

---

## Sprint 1A Hardening (Enterprise Design Review)

| Capability | Implementation |
|------------|----------------|
| **Asset Definition** | `getEafAssetDefinition()` — derived metadata per asset type |
| **Capability Registry** | `EAF_CAPABILITY_CODES`, `registerEafCapabilityDefinition()` |
| **Asset Manifest** | `buildEafAssetManifest()` — version, dependencies, engines, compatibility |
| **Engine Registry** | `registerEafEngine()` — foundation only, seeded defaults |
| **Enterprise Constants** | Lifecycle states, health status, event names/versions, engine codes |
| **Event Versioning** | `EafVersionedEventEnvelope`, `wrapEafDomainEvent()`, `subscribeVersioned()` |
| **Configuration Provider** | `getEafConfigurationProvider()` — replaces direct port access |
| **Feature Flag Hooks** | `registerEafFeatureFlagHook()` — extension points only |
| **Asset Health Model** | `assessEafAssetHealth()`, `getEafAssetHealth()` — Mission Control ready |

All Sprint 1A additions are **additive**. Existing Sprint 1 public APIs remain unchanged.

### Asset Type Governance (Sprint 1A Final Patch)

| Rule | Enforcement |
|------|-------------|
| **Global uniqueness** | `assetTypeCode` must be unique across all registered types |
| **Code immutability** | `assetTypeCode` cannot change after first publication (registry entry exists) |

Validation runs at configuration time via `getEafConfigurationProvider().saveAssetType()` — no public API changes. Display name (`label`), description, and other metadata remain editable.

---

## What Was NOT Built (Sprint 1 + 1A Scope)

- UI pages / dashboards
- Loan, Customer, Product, Lender, Partner modules
- Prisma persistence (in-memory design-time only)
- Identity Engine integration
- Search engine implementation
- AI processing implementation
- Permission enforcement runtime
- Feature flag runtime evaluation
- Mission Control UI integration

---

## Sprint 2 Recommendations (Awaiting Enterprise Design Review)

1. Add Prisma adapters implementing `EafPorts` interfaces (not engine changes)
2. Wire Identity Engine to populate `publicIdentity`
3. Register domain asset types (Customer, Loan, etc.) via `registerEafDomainExtension` — not inside EAF
4. Integrate EAF compliance checks with CARB registry
5. Add ADR-015 documenting EAF vs EAL boundary
6. Persistence-backed audit trail with immutable storage
7. Replace `createInProcessEafEventPublisher` with enterprise message bus adapter
