# CO-UX-006 — Opportunity Source Capture & Executive Dashboard KPI Enhancement

**Status:** Ready for Business Certification  
**Date:** 2026-07-22

## Summary

Mandatory **Business Source** on Opportunity requirement capture (Lead Information), persisted on `EnterpriseOpportunity.sourceCode`. User Home Dashboard gains **Today's Fresh Logins** KPI strip plus **Visual Analytics** (Part 5) — Opportunity-centric BI charts with one-click drill-down.

## KPI freeze

- **Fresh Login** = Opportunity that reached Login stage **today**
- Login detected via Deal `grossStage` in `logged_in` | `logged_in_wip` | `login` with `stageEnteredAt` today
- Counts are **distinct Opportunities** — never lender/deal row aggregates
- Buckets: Direct · Channel Partner · Referral · Other · Total

## Part 5 — Visual Analytics

| Section | Visualization | Notes |
|---------|---------------|-------|
| A KPI strip | Interactive cards | Fresh Logins (retained) |
| B Source Mix | Doughnut | Drill → My Opportunities `sourceCode` |
| C Product Mix | **Treemap** (EI SSOT) | Product Mix → Treemap per visualization rules; chips drill by product |
| D Stage | Doughnut | Drill → `requirementStage` |
| E Monthly Trend | Line | 30d / 90d / FY |
| F Lender | Horizontal Bar | Distinct Opportunities per lender; drill → My Deals |
| G Ageing | Stacked Bar | 0–7 … 60+; drill → `ageBucket` |
| H Tasks | Doughnut | ETE My Work SSOT; drill → Tasks |
| I Disbursement | Dual Bar | Cases + Opportunity value by period |
| J Performance | Compact widgets | Conversion, TAT, Ticket, RM, Login penetration |

**Canonical value:** `Opportunity.requestedAmount` only — never sum of lender pipelines.

Derive SSOT: `src/lib/user-home-dashboard/visual-analytics/derive-dashboard-visual-analytics.ts`

## Manual steps

None (uses existing `sourceCode` column). No migration required.
