# CO-LM-004 — Enterprise Lender Product Catalogue Extraction

**Status:** Implementation complete · Ready for BAT  
**Date:** 2026-07-29  
**Change control:** No migrations · No Vercel deploy · No live transactional mutation  

---

## Objective

Move `LENDERS_BY_PRODUCT` out of marketing `src/lib/site.ts` into Enterprise Master Data so CO-ARCH-006 legacy retirement is unblocked for this dependency.

---

## New SSOT location

| Layer | Path |
|-------|------|
| Types | `src/types/enterprise-lender-product-catalogue.ts` |
| Catalogue data | `src/constants/enterprise-lender-product-catalogue/catalogue.ts` |
| Constants facade | `src/constants/enterprise-lender-product-catalogue/index.ts` |
| Lib facade | `src/lib/enterprise-lender-product-catalogue/index.ts` |
| Discoverability | Re-exported from `src/constants/enterprise-lender-registry/index.ts` |
| Rule | `.cursor/rules/enterprise-lender-product-catalogue.mdc` |

Canonical symbol retained for continuity: `LENDERS_BY_PRODUCT` (same product keys and offer payloads).  
Preferred accessors: `lenderOffersForProductSlug`, `hasLenderProductCatalogue`.

Catalogue version: `CO_LM_004_LENDER_PRODUCT_CATALOGUE_VERSION = 1`.

---

## Files modified / created

### Created
- `src/types/enterprise-lender-product-catalogue.ts`
- `src/constants/enterprise-lender-product-catalogue/catalogue.ts`
- `src/constants/enterprise-lender-product-catalogue/index.ts`
- `src/lib/enterprise-lender-product-catalogue/index.ts`
- `.cursor/rules/enterprise-lender-product-catalogue.mdc`
- `scripts/co-lm-004-verify.mjs`
- `docs/co-lm-004/CO-LM-004-LENDER-PRODUCT-CATALOGUE-READINESS-REPORT.md`

### Modified
- `src/lib/site.ts` — removed `LenderOffer`, `LENDERS_BY_PRODUCT`, `ELIGIBILITY_GATE_SLUGS`
- `src/lib/enterprise-lender-directory/programs.ts` — ELW directory → enterprise catalogue
- `src/lib/insights/lender-intelligence.ts` — Insights / Mission Control ROI → enterprise catalogue
- `src/components/site/EligibilityGate.tsx` — marketing gate consumes enterprise SSOT
- `src/routes/loans.$slug.tsx` — eligibility slug set from enterprise SSOT
- `src/constants/enterprise-lender-directory/products.ts` — comment updated
- `src/constants/enterprise-lender-registry/index.ts` — re-exports catalogue
- `package.json` — `verify:co-lm-004`

---

## Modules updated

| Module | Status |
|--------|--------|
| Enterprise Lender Workspace (directory programs) | ✅ |
| Insights / lender intelligence (Mission Control ROI) | ✅ |
| Legacy Eligibility Gate (marketing) | ✅ (reads Enterprise SSOT) |
| Loan product TanStack page (eligibility slug) | ✅ |

**No direct consumers found** in Opportunity Workspace, Deal Workspace, Product Composition Engine, Credit & Risk Engine, or COMPASS for `LENDERS_BY_PRODUCT` / `@/lib/site` lender offers — no code changes required there.

---

## Remaining dependencies

| Item | Notes |
|------|-------|
| Marketing still imports **other** marketing fields from `site.ts` (`PRODUCTS`, `SITE`, …) | Expected; not lender-product catalogue |
| `LenderOffer` type alias | Temporary alias of `EnterpriseLenderProductOffer` — safe to rename later |
| Synthetic ELW offers for products without catalogue rows | Unchanged behaviour in `programs.ts` |
| Future: durable Prisma commercial program tables | Out of scope (no migration this sprint) |

**No remaining import of lender-product catalogue from `src/lib/site.ts`.**

---

## Validation

```bash
npm run verify:co-lm-004
```

Checks: SSOT files present · catalogue product slugs · `site.ts` does not own catalogue · ERP + Eligibility Gate import enterprise path only.

---

## Success criteria

- [x] Catalogue moved to Enterprise SSOT  
- [x] Known consumers updated  
- [x] Legacy `site.ts` ownership removed  
- [x] Foundation for CO-ARCH-006 Phase 2  
- [x] Ready for BAT  

**Final status:** ✅ Ready for Business Acceptance Testing
