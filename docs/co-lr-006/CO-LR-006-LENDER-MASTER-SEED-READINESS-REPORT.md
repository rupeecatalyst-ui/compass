# CO-LR-006 — Enterprise Lender Registry Foundation (Complete Master Seed)

**Status:** Implementation complete · Production Data Protection compliant  
**Date:** 2026-07-29  
**Priority:** Platform foundation  

---

## Objective

Make Enterprise Lender Registry the permanent SSOT for lender selection across Catalyst One, with a comprehensive India lender master (~250–400) and default Product Programme capabilities.

---

## Catalogue result (static seed)

| Metric | Value |
|--------|------:|
| Total unique lenders (`seedKey`) | **267** |
| Baseline commercial program stubs | **~1,512** |
| Duplicate seedKeys | **0** |
| Lenders missing product capabilities | **0** |

### By classification

| Classification | Count |
|----------------|------:|
| Public Sector Banks | 12 |
| Private Sector Banks | 22 |
| Small Finance Banks | 12 |
| Housing Finance Companies | 32 |
| NBFCs (incl. fintech / gold / auto / MSME / infra) | 94 |
| Co-operative / Rural / State Apex | 65 |
| Payments Banks | 6 |
| Foreign Banks | 24 |

---

## What was implemented

1. **Expanded Product Master** with programme codes used in eligibility (MSME, CC, OD, SCF, Invoice, Bill Discounting, Machinery, Equipment, Vehicle, CV, Trade, Export).  
2. **CO-LR-006 expansion catalogue** (`master-seed-catalog-co-lr-006.ts`) merged into `LENDER_MASTER_SEED_CATALOG` with name/alias/seedKey de-dupe against baseline.  
3. **Capability presets** per institution type (BANK, HFC, NBFC_*, FINTECH, SFB, COOP, FOREIGN, PAYMENTS).  
4. **Idempotent Tier-2 seed** — create missing lenders only; on match: **fill missing** website / HQ / shortName / legalName / displayName / classification / empty `productsSupported` only — **never delete**, never overwrite admin-filled capability.  
5. **Programmes** continue via CO-PROG-004 create-missing (`POST /api/lender-registry/seed-baseline-programs`) — Lender ↔ Product Master many-to-many stubs.

---

## Production Data Protection

| Rule | Compliance |
|------|------------|
| No delete / truncate | ✅ |
| No duplicate create | ✅ (code + name/alias match) |
| Preserve Enterprise Lender ID | ✅ |
| Update only missing profile fields | ✅ |
| Preserve relationships / history | ✅ |
| No fabricated RBI/CIN/GSTIN | ✅ (left for manual enrichment) |

---

## How to apply on BAT / production org

1. `POST /api/product-registry/seed` — creates missing Product Master rows + lenders (fill-missing).  
2. `POST /api/lender-registry/seed-baseline-programs` — creates missing baseline commercial programs only.  
3. Re-run is safe (idempotent).

---

## Validation

```bash
npm run verify:co-lr-006
```

---

## Manual review backlog

- Enrich RBI registration / CIN / GSTIN via controlled admin import (do not invent).  
- Tune per-lender product truth where public offerings differ from presets.  
- Optional Prisma enum add for `foreign_bank` classification column (additive migration — separate PO approval).  
- Commercials on programs remain blank for administrators (by design).

---

## Final status

🟡 Catalogue + seed logic ready · **Awaiting org seed run on BAT + Product Owner confirmation** that Lender Registry is the selection SSOT in Opportunity / Deal / Credit / Mission Control.
