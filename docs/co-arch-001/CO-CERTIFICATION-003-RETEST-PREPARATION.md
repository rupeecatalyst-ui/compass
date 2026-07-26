# CO-CERTIFICATION-003 — Re-Test Preparation Package

**Program:** CO-ARCH-001 Wave 4 Track C  
**Classification:** CERT / DOC  
**Date:** 2026-07-21  
**Status:** Artefacts prepared — certification execution deferred to Wave 5 / Quality Office

---

## Purpose

Prepare all artefacts required for CO-CERTIFICATION-003 re-test after Enterprise Master Data infrastructure (I1–I6b) and Tier 2 seed completion. **This package does not execute certification.**

---

## Scope of Re-Test (when authorized)

| Area | What to verify |
|------|----------------|
| Tier 0 | Audit / attachment / import-batch tables present |
| Tier 1 | `enterprise_reference_masters` populated (19 domains, ≥189 rows) |
| Tier 2 Product | Categories / groups / products tables + CRUD APIs |
| Tier 2 Document | Types / definitions tables + CRUD APIs |
| Tier 2 Lender | Categories / lenders / programs tables + CRUD APIs |
| Dual-read | `ENTERPRISE_MASTERS_DUAL_READ` enabled; merge semantics |
| I6a Tier 1 pickers | Flag-gated; constants when OFF; DB-primary when ON |
| I6b Tier 2 pickers | Flag-gated; product/lender/document ports |

---

## Prerequisites Checklist

| # | Prerequisite | Evidence | Status |
|---|--------------|----------|--------|
| 1 | Migrations I1–I4c applied | `npx prisma migrate deploy` | ✅ Wave 1–3 |
| 2 | I3 Reference Master seed | `node scripts/co-arch-001-i3-seed.mjs` | ✅ 189 rows |
| 3 | Wave 4 Tier 2 seed | `node scripts/co-arch-001-wave4-seed.mjs` | ✅ Seeded |
| 4 | I5a / I5b ports | verify scripts | ✅ |
| 5 | I6a / I6b flag wiring | verify scripts | ✅ |
| 6 | Build green | `npm run build` | Wave 4 gate |
| 7 | Production deploy | Vercel | Pending ops |

---

## Recommended Certification Environments

| Environment | Flags | Purpose |
|-------------|-------|---------|
| Production (default) | Both runtime flags **OFF** | Stable constants SSOT |
| Certification staging | `REFERENCE_MASTER_PORT_RUNTIME=true` + `TIER2_REGISTRY_PORT_RUNTIME=true` | Validate DB-backed pickers |
| Rollback drill | Flags → `false` + redeploy | Confirm reversible migration |

---

## Test Scripts (run order)

```bash
# Infrastructure
node scripts/co-arch-001-i1-verify.mjs
node scripts/co-arch-001-i2-verify.mjs
node scripts/co-arch-001-i3-verify.mjs
node scripts/co-arch-001-i4a-verify.mjs
node scripts/co-arch-001-i4b-verify.mjs
node scripts/co-arch-001-i4c-verify.mjs

# Ports
node scripts/co-arch-001-i5a-verify.mjs
node scripts/co-arch-001-i5b-verify.mjs

# Picker swaps (flag behaviour)
node scripts/co-arch-001-i6a-verify.mjs
node scripts/co-arch-001-i6b-verify.mjs

# Seeds
node scripts/co-arch-001-wave4-seed-verify.mjs
```

---

## Manual UAT Scenarios (Quality Office)

1. **Tier 1 pickers (flag OFF)** — Contact employment type / city / industry match constants.
2. **Tier 1 pickers (flag ON)** — Same fields load from Reference Master; admin-added code appears.
3. **Tier 2 product/lender (flag OFF)** — ECM product/lender lists match constants.
4. **Tier 2 product/lender (flag ON)** — Lists match seeded registry; new API-created row appears after hydrate.
5. **Document types (flag ON)** — Organization Documents non-template types reflect Document Registry.
6. **Admin Reference Masters** — `/admin/reference-masters` CRUD + activate/deactivate.
7. **API smoke** — Authenticated GET/POST on `/api/product-registry`, `/api/document-registry`, `/api/lender-registry`, `/api/reference-masters`.
8. **Rollback** — Disable both runtime flags; pickers revert to constants within one deploy cycle.

---

## Known Gaps (not blockers for prep)

| Gap | Owner | Wave |
|-----|-------|------|
| Full Product Library UI not wired to Tier 2 ports | Product | Future |
| Lender Directory UI still uses ELW mock programs | Product | Future |
| CO-CERTIFICATION-003 formal execution | Quality | Wave 5 |
| Dry Run execution | Ops + Quality | Wave 5 |

---

## Related Artefacts

- [Dry Run Readiness Package](./CO-ARCH-001-DRY-RUN-READINESS-PACKAGE.md)
- [Tier 1/2 Migration Readiness](./CO-ARCH-001-TIER1-TIER2-MIGRATION-READINESS.md)
- ADR-015 Enterprise Master Data Tier Model
