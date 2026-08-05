# CO-LW-003 — Enterprise Lending Programs Workspace UX Optimisation

**Status:** Implementation Complete · Ready for BAT  
**Date:** 2026-07-31  
**Scope:** UX optimisation only — no new business features, registries, or SSOT changes  

---

## 1. UX Improvements

- Removed duplicate **Lending Programs** heading + subtitle inside the workspace body
- Shell keeps **Breadcrumb + Page Title** only (no subtitle chrome)
- Compact tab bar + Refresh on one row
- KPI chips for fast scan (Lenders / Programmes / Deals / Opps)
- Product View redesigned as an **operational desk**, not a static registry

---

## 2. Layout Optimisations

- Extended `EnterpriseRegistryWorkspaceShell` with `layoutMode="document"`
- Document mode uses natural page scroll (no `100vh` lock / nested overflow trap)
- Sticky left list + CHANAKYA rail; centre work area flows with the page
- Reduced padding, section heights, and empty card chrome

---

## 3. Product View Redesign

Selecting a product dynamically surfaces:

| Panel | Behaviour |
|---|---|
| Eligible Lenders | Selectable focus list |
| Published Programmes | Concise programme rows |
| Comparison Matrix | Factual programme table (`Not Specified` when missing) |
| Pipeline (Live) | Deal Registry filter by product code/label |
| Active Opportunities | Opportunity hints from live Deals |
| Relationship Team | Loads when an eligible lender is focused |
| CHANAKYA Insights | Product-aware advisory + quick actions |

No fabricated values. Unavailable fields remain **Not Specified**.

---

## 4. Space Utilisation Improvements

- Smaller section padding (`compact`)
- Denser list rows and table cells
- KPI strip replaces large empty identity cards
- Side rails narrowed (≈200–220px)
- Removed forced `min-h-[560px]` grid height

---

## 5. Scrolling Fixes

| Before | After |
|---|---|
| Registry `h-[calc(100vh-3.5rem)] overflow-hidden` | Document layout — page scrolls |
| Centre `overflow-y-auto` nested trap | Centre flows; lists use local max-height only where needed |
| Locked child `overflow-hidden` | `overflow-visible` in document mode |

---

## 6. Before vs After Screenshots

Manual BAT on production:

1. `/lenders` — confirm single title (breadcrumb + h1), no body duplicate  
2. Product View — select product → all operational panels populate  
3. Scroll entire page with mouse wheel / trackpad  

---

## 7. Validation Results

- `npm run verify:co-lw-003` — PASS  
- `npm run verify:co-lw-001` — should still PASS (functional gates retained)  

---

## Business Acceptance Checklist

- [ ] No duplicate “Lending Programs” heading  
- [ ] Page scrolls naturally end-to-end  
- [ ] Product View feels interactive (select product → panels update)  
- [ ] Comparison shows factual values / Not Specified only  
- [ ] Eligible lender focus loads Relationship Team  
- [ ] CHANAKYA Insights visible on the right  
- [ ] No new registry / SSOT / business formula introduced  

**Manual steps:** None (no migration).
