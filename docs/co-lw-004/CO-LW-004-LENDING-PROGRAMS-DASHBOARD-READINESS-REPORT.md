# CO-LW-004 — Enterprise Lending Programs Workspace (Dashboard Experience)

**Status:** Implementation Complete · Ready for BAT  
**Date:** 2026-07-31  
**Scope:** UX redesign only — no new registries · no Product/Lender SSOT changes  

---

## 1. UI Implementation Summary

Lending Programs is now an **Executive Operations Dashboard** for both Lender and Product views:

- Permanent right CHANAKYA rail **removed**
- **CHANAKYA Insights** header button opens a collapsible / pinnable drawer (collapsed by default)
- KPI strip + visual chart pack above operational detail
- Product View navigates **Product Families** (presentation only)
- Progressive detail: charts first, then programmes / team / pipeline / activities

---

## 2. Components Modified / Created

| Path | Role |
|---|---|
| `lending-programs-workspace.tsx` | Dashboard dual-view host |
| `lp-dashboard-charts.tsx` | KPI strip + chart pack |
| `chanakya-insights-drawer.tsx` | Collapsible / pin drawer |
| `product-families.ts` | Family presentation helpers |
| `dashboard-analytics.ts` | Chart derive from live pipeline |
| `constants/lending-programs-workspace.ts` | Family defs + pin key |
| `lenders/page.tsx` | Sprint marker CO-LW-004 |

---

## 3. Charts Implemented

| Chart | Visualization | Source |
|---|---|---|
| Deal Stage Distribution | Doughnut | Live Deal stages |
| Pipeline Funnel | Funnel (EI) | Live Deal stages |
| Approval vs Rejection | Doughnut | Approved path / Lost / In flight |
| Product Mix | Horizontal bar | Published programmes |
| Programme Coverage | Horizontal bar | Programmes by lender |
| City Distribution | Doughnut | Lender coverage / HQ |
| Relationship Signals | Horizontal bar | Team · deals · activities · programmes (factual) |
| Monthly Disbursal Trend | Bar | Recent disbursed deals |
| Average Turnaround | KPI | Programme `averageTatDays` average |

Reuses User Home doughnut/bar + EI funnel. **No Relationship Score invented.**

---

## 4. Product Family Presentation

Families (UI only, mapped from Product Master `groupCode` / canonical codes):

- Home Loan · Loan Against Property · Working Capital · Business Finance · Construction Finance · Professional · Corporate · Other

Selecting a family expands member products; programmes remain under products. **Enterprise Product Registry unchanged.**

---

## 5. Space Optimisation

- Compact header (tabs + actions only)
- No duplicate page subtitle body
- No permanent right rail (~20% width recovered)
- Dense sections under charts
- Document scroll retained (CO-LW-003)

---

## 6. Responsive Behaviour

- KPI strip: 2 → 4 → 6 columns
- Charts: 1 → 2 → 3 columns
- Sticky left list on large screens
- Drawer overlays on the right; main content gains padding when open

---

## 7. Screenshots

Manual BAT on production `/lenders`:

1. Lender View — KPIs + charts + progressive detail  
2. Product View — family tree → product → charts / comparison  
3. CHANAKYA Insights — open, pin, unpin  

---

## 8. Business Acceptance Checklist

- [ ] Dashboard layout readable in 30–60 seconds  
- [ ] Charts render with live / empty states  
- [ ] Product Families navigate correctly  
- [ ] Lender View progressive sections intact  
- [ ] Product View: families first, matrix not at top  
- [ ] CHANAKYA drawer collapses by default; pin works  
- [ ] No duplicate Product / Lender registry  
- [ ] No fabricated Relationship Score  

**Manual steps:** None.
