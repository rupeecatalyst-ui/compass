# CO-LR-008 — Enterprise Lender Registry Master Population & Canonicalisation

**Status:** Implementation complete (additive seed + presentation canonicalisation)  
**Date:** 2026-07-30  
**Verify:** `npm run verify:co-lr-008` → **PASS**  
**Production Data Protection:** No delete · No Lender ID changes · No Deal/Opportunity FK remaps · Fill-missing seed only

---

## Objective

Make the Enterprise Lender Registry the permanent SSOT for lenders across Catalyst One, complete the India lender master catalogue, and hide duplicate presentation without destroying live rows.

---

## Implementation summary

| Metric | Value |
|--------|------:|
| Total lenders processed (catalogue) | **275** |
| New lenders in CO-LR-008 gap-fill | **8** |
| Existing catalogue lenders retained | **267** (CO-LR-006 + baseline) |
| Existing lenders updated (profile fill-missing) | Runtime only — on Tier-2 seed |
| Duplicate seedKeys in catalogue | **0** |
| Product programmes assigned (catalogue product codes) | **1,573** |
| Lenders with ≥1 programme | **275** |
| Lenders missing products | **0** |
| Duplicate lenders identified (presentation families) | Runtime — when DB has alias/name collisions |
| Duplicate lenders physically merged | **0** (blocked — presentation map only) |
| Physical merge / soft-delete | **Blocked pending Product Owner** |

### CO-LR-008 gap-fill created (seedKeys)

1. `jp_morgan` — J.P. Morgan Chase Bank  
2. `societe_generale` — Société Générale  
3. `icbc` — Industrial & Commercial Bank of China (ICBC)  
4. `mashreq_bank` — Mashreq Bank  
5. `clix_capital` — Clix Capital (distinct from Clix Housing)  
6. `credit_saison` — Credit Saison India  
7. `ziploan` — ZipLoan  
8. `namdev_finvest` — Namdev Finvest  

### Display enrichment (no new row)

- `indiabulls_housing` → display **Sammaan Capital (Indiabulls Housing)** + aliases (preserves seedKey / future Registry id)

---

## Category-wise lender count (catalogue)

| Classification | Count |
|----------------|------:|
| Public sector bank | 12 |
| Private sector bank | 22 |
| Small finance bank | 12 |
| Foreign bank | 28 |
| Housing finance company | 32 |
| NBFC | 98 |
| Cooperative bank | 65 |
| Payments bank | 6 |
| **Total** | **275** |

PO-named lists (PSB / Private / SFB / HFC / foreign / MSME NBFC) are covered by catalogue + gap-fill. Additional nationally relevant lenders from CO-LR-006 remain (cooperatives, payments banks, extra NBFCs) — intentional for production breadth (target band 250–400).

---

## What was done

1. **Gap-fill catalogue** — `master-seed-catalog-co-lr-008.ts` (idempotent seedKey + normalised name/alias skip).
2. **Merged** into `LENDER_MASTER_SEED_CATALOG` (`CO_ARCH_004_MASTER_SEED_VERSION = 4`, `CO_LR_008_CATALOG_VERSION = 1`).
3. **Sammaan Capital** display/aliases on Indiabulls Housing seed row.
4. **Presentation canonicalisation** — `presentation-canonical.ts`: one survivor per identity family for selectors; Legacy/Historical retained in DB.
5. Wired into:
   - `listCanonicalEnterpriseLenderOptionsAsync` (Deal / Manual Recommendation / Competition)
   - Tier-2 `dual-read-ports.listLenders` when Registry runtime active (DB-only + presentation dedupe)
   - Chanakya recommend: presentation dedupe + `recommendPublishedLendersFromRegistryAsync`
6. Verify scripts: `verify:co-lr-008` (+ still passes `verify:co-lr-006`).

---

## What was NOT done (Production Data Protection)

- No lender rows deleted or soft-deleted  
- No Lender ID / code remints  
- No Opportunity / Deal / Loan FK remapping  
- No table truncate / reset  
- No physical merge programme (would break FKs without remapping)  
- No invented RBI / CIN / GSTIN values  

If live DB already has duplicate presentation rows: **hide** non-survivors in user-facing pickers; **keep** rows for historical FK continuity.

---

## Runtime apply (ops — non-destructive)

1. Tier-2 lender seed (**fill-missing only** — existing PDP path)  
2. `POST /api/lender-registry/seed-baseline-programs` for new lenders’ empty program stubs  
3. Optional: admin enrichment of RBI / CIN / GSTIN on Registry profile  

Do **not** run Soft Go-Live `mergeDuplicates` against Prisma.

---

## Validation / BAT

```bash
npm run verify:co-lr-008   # PASS
npm run verify:co-lr-006   # PASS (275 catalogue, 1573 programmes)
```

| Check | Result |
|-------|--------|
| Unique seedKeys | PASS |
| Every lender has product programme codes | PASS |
| PO gap lenders present | PASS |
| Presentation canonicalisation module present | PASS |
| Physical merge blocked | Confirmed |
| Live data delete / truncate | Not performed |

Manual BAT (post-deploy seed):

1. Deal creation lender picker — one row per institution family  
2. Product–Lender Matrix — Registry lenders only  
3. Opportunity / Deal / Loan links to existing lenders still resolve  
4. New gap lenders appear after fill-missing seed  

---

## SSOT consumers

| Surface | Path |
|---------|------|
| Deal / Manual Recommendation | `listCanonicalEnterpriseLenderOptionsAsync` |
| Competition (OW) | `listCanonicalEnterpriseLenderOptionsAsync` |
| Tier-2 ports | `dual-read-ports.listLenders` (DB + presentation dedupe) |
| Product–Lender Matrix | Registry APIs |
| Baseline programmes | `LENDER_MASTER_SEED_CATALOG` → seed-baseline-programs |
| Chanakya / LIFE recommend | Warm session + presentation dedupe; async API helper available |
| Soft Go-Live local merge | Unchanged; not used for Deal FK |

**Known residual:** ECM Contact Master (`src/constants/enterprise-contact-master/masters.ts`) still has a legacy constant lender picker for Contact forms — **not** Deal/OW/Matrix SSOT. Follow-up: wire Contact forms to Registry API.

---

## Files modified / added

| File | Change |
|------|--------|
| `src/constants/enterprise-lender-registry/master-seed-catalog-co-lr-008.ts` | **Added** — gap-fill catalogue |
| `src/constants/enterprise-lender-registry/master-seed-catalog.ts` | Merge CO-LR-008; seed version 4 |
| `src/constants/enterprise-lender-registry/master-seed-catalog-co-lr-006.ts` | Sammaan display/aliases |
| `src/constants/enterprise-lender-registry/index.ts` | Export CO-LR-008 symbols |
| `src/lib/enterprise-lender-registry/presentation-canonical.ts` | **Added** — presentation SSOT |
| `src/lib/enterprise-lender-registry/index.ts` | Export presentation helpers |
| `src/lib/enterprise-lender-registry/published-directory.ts` | Dedupe on canonical Deal list |
| `src/lib/enterprise-lender-registry/recommend-from-registry.ts` | Dedupe + async API recommend |
| `src/lib/enterprise-tier2-ports/ports/dual-read-ports.ts` | DB-only + dedupe when Tier-2 active |
| `src/components/catalyst-one/opportunity-workspace/workspace-competition-panel.tsx` | Canonical Registry picker |
| `scripts/co-lr-008-verify.mjs` | **Added** |
| `scripts/co-lr-008-verify-inner.mts` | **Added** |
| `package.json` | `verify:co-lr-008` |
| `docs/co-lr-008/CO-LR-008-LENDER-REGISTRY-MASTER-POPULATION-REPORT.md` | This report |

---

## Confirmations

1. **No live business data was deleted, truncated, or ID-rewritten** by this implementation.  
2. **Enterprise Lender Registry is the permanent SSOT** for Deal selection, Competition, Tier-2 lender ports (when active), Product–Lender Matrix, and baseline programme seeding.  
3. Catalogue is production-ready for current operations and future lender onboarding via Registry admin + fill-missing seed — **no architectural change required**.  
