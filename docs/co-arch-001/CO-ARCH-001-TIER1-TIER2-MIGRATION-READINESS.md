# CO-ARCH-001 — Tier 1 & Tier 2 Migration Readiness

**Program:** CO-ARCH-001 Wave 4 Track C  
**Date:** 2026-07-21  
**Status:** Ready for Dry Run (execution pending ARB Wave 5)

---

## Migration Architecture (ADR-015)

| Tier | Persistence | Runtime SSOT (default) | Runtime SSOT (flag ON) |
|------|-------------|------------------------|-------------------------|
| 0 | Shared audit/import/attachment | N/A | N/A |
| 1 | `enterprise_reference_masters` | Constants (`masters.ts`) | Dual-read DB-primary via `REFERENCE_MASTER_PORT_RUNTIME` |
| 2 Product | product registry tables | Product library + ECM product catalog | Dual-read DB-primary via `TIER2_REGISTRY_PORT_RUNTIME` |
| 2 Document | document registry tables | Org doc constants | Dual-read DB-primary via `TIER2_REGISTRY_PORT_RUNTIME` |
| 2 Lender | lender registry tables | ECM lender catalog | Dual-read DB-primary via `TIER2_REGISTRY_PORT_RUNTIME` |

Dual-read (`ENTERPRISE_MASTERS_DUAL_READ`) remains **enabled** in prisma mode.

---

## Seed Inventory (Wave 4 target)

| Registry | Expected (approx) | Source |
|----------|-------------------|--------|
| Reference Master | 189 | I3 seed |
| Product categories | 4 | Product library |
| Product groups | 6 | Product library |
| Products | ~13 | Product library + ECM continuity |
| Document types | 6 | Org doc categories |
| Document definitions | ~28 | Org doc system types |
| Lender categories | 5 | Seed catalog |
| Lenders | 6 | ECM lender catalog |
| Lender programs | 7 | ECM region catalog |

Validate with: `node scripts/co-arch-001-wave4-seed-verify.mjs`

---

## Feature Flag Matrix

| Flag | Default | Effect |
|------|---------|--------|
| `ENTERPRISE_MASTERS_DUAL_READ` | ON (prisma) | Merge DB into port cache |
| `REFERENCE_MASTER_PORT_RUNTIME` | **OFF** | Tier 1 pickers use port (DB-primary) |
| `TIER2_REGISTRY_PORT_RUNTIME` | **OFF** | Tier 2 pickers use ports (DB-primary) |

Public mirrors: `NEXT_PUBLIC_*` variants required for client bundles.

---

## Readiness Verdict

| Domain | Schema | Seed | Ports | Picker swap | Ready for Dry Run? |
|--------|--------|------|-------|-------------|--------------------|
| Tier 1 Reference Master | ✅ | ✅ | ✅ I5a | ✅ I6a (flagged) | ✅ |
| Tier 2 Product | ✅ | ✅ | ✅ I5b | ✅ I6b (flagged) | ✅ |
| Tier 2 Document | ✅ | ✅ | ✅ I5b | ✅ I6b (flagged) | ✅ |
| Tier 2 Lender | ✅ | ✅ | ✅ I5b | ✅ I6b (flagged) | ✅ |

**Overall:** Migration path is **ready for controlled Dry Run**. Do not enable runtime flags in production until Quality Office Dry Run exit criteria pass.

---

## Residual Risks

| Risk | Mitigation |
|------|------------|
| Client hydrate race before picker open | Hydrate on dashboard mount when flags ON |
| Code mismatch ECM vs product library | Seed includes ECM product codes for continuity |
| Accidental flag ON in production | Defaults OFF; documented rollout = Feature Flag |
