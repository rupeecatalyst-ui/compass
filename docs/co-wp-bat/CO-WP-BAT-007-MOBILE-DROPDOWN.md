# CO-WP-BAT-007 — Enterprise Mobile Dropdown Experience

**Status:** Implementation Complete · Awaiting Product Owner BAT  
**Priority:** P0  
**Module:** Wealth Partner App — Opportunity Creation Journey  
**Deploy:** ❌ Not deployed (PO hold)

## Issue

Searchable dropdowns (Property Type, City, Employment Type, Product, Lender, etc.) rendered as `position: absolute` lists inside `.biz-section-card` / `.biz-section-body`, which use `overflow: hidden`. Lists were clipped and overlapped adjacent sections on mobile.

## Fix

### One reusable component

`src/components/business/EnterpriseMobileSearchableDropdown.tsx`

- Portal to `document.body` (`position: fixed`, z-index 90)
- Collision-aware placement: open down when space allows, otherwise up
- Max height = available viewport space; internal scroll
- Type-to-search · instant filter (local) · remote query hook · keyboard · touch · outside dismiss · clear
- Touch targets ≥ 44–48px

### Applied across Wealth Partner searchable fields

| Surface | Wrapper | Data source |
|--------|---------|-------------|
| Journey `select` (Property Type, Employment, Product, …) | `EnterpriseMasterSelect` | Catalyst One journey `optionSets` (Enterprise Masters) |
| Journey `city_search` | `PartnerCitySelect` | Partner Gateway → Enterprise City Master |
| Journey `lender_search` | `PartnerLenderSelect` | Partner Gateway → Enterprise Lender Registry |

All journey searchable fields go through `JourneyConfigFields` → the wrappers above → the shared mobile dropdown. No hardcoded option lists in the UI.

## Validation

```bash
cd "C:\Wealth Partner App\web"
npm run verify:co-wp-bat-007
npm run build
```

Manual BAT: Opportunity Creation on Android / iPhone, small & large, portrait & landscape — open Property Type near section bottom, City search, Lender search; confirm list floats, flips, scrolls, dismisses, clears.

## Files

- `src/components/business/EnterpriseMobileSearchableDropdown.tsx` (+ `.css`)
- `src/components/business/EnterpriseMasterSelect.tsx`
- `src/components/business/PartnerCitySelect.tsx`
- `src/components/business/PartnerLenderSelect.tsx`
- `src/screens/business/business.css`
- `scripts/co-wp-bat-007-verify.mjs`
