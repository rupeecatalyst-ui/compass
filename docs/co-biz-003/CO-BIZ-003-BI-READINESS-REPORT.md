# CO-BIZ-003 — Business Intelligence Readiness Report

**Date:** 2026-07-26  
**Layer:** Enterprise Business Intelligence (EBI)  
**Constraint compliance:** No workflow changes · No DB redesign · No duplicate metric formulas

---

## Executive summary

Catalyst One now has a **canonical read-only analytics compose layer** that answers management questions from existing platform services (Radar Deal DAL, Operational Vector, ETE, stage/product/RM rollups). Mission Control Executive Briefing consumes live EBI providers instead of mock commercial numbers.

**Overall BI Score: 8.1 / 10** · **GO WITH OBSERVATIONS**

---

## Coverage

| Domain | Coverage |
|--------|----------|
| Executive KPIs | Active Opportunities/Deals · by Stage/Product/Branch/RM · Avg size · Avg processing days · Pipeline value · Conversion · Expected revenue |
| Operational KPIs | Tasks due/overdue · Avg completion (ETE) · Inactive opps · Awaiting docs/lender · Doc progress |
| Team performance | Opportunities handled · Deals closed · Turnaround · Pending/overdue · Completion rate |
| Chanakya insights | Observation + reason (+ recommended action) |
| Business Health | 6 dimensions → overall score |
| Dashboard providers | Mission Control · Manager · RM · Branch |
| Reporting | 6 CSV export kinds via admin API |

---

## KPIs implemented

See `deriveExecutiveKpis` · `deriveOperationalKpis` · `deriveTeamPerformance`.

## Insights implemented

`deriveChanakyaExecutiveInsights` — inactive opportunities, document delays, RM efficiency, overdue tasks, pipeline value, health summary.

## Business Health coverage

Pipeline (Radar vector) · Execution · Task · Customer Activity · Document Progress · Conversion.

## Known gaps

1. Dedicated Manager/RM/Branch **pages** not added (providers ready; no UI redesign this sprint).
2. Opportunity Registry counts still approximated via Deal/opportunity refs on Radar files.
3. Week-over-week conversion deltas need durable time-series (not invented this sprint).
4. Technical Observability remains separate from Business Health (by design).
5. EDL/Governance signals not yet weighted into health dimensions.

## Recommendations

1. Wire Manager/RM/Branch provider shells to existing dashboard panels when UX sprint allows.
2. Add weekly snapshot ring for trend insights (“conversion increased this week”).
3. Optionally weight Governance audit anomalies into Business Health.
4. Keep `/reports` EI viz consuming EBI pulse metrics for single executive narrative.

## API

`GET /api/admin/business-intelligence`  
`?view=snapshot|dashboard|export`  
`&id=mission_control|manager|relationship_manager|branch`  
`&kind=daily_business_summary|pipeline_summary|employee_performance|stage_distribution|task_performance|business_health_summary`

## Architecture

```
Radar DAL + Operational Vector + ETE reporting
        → EBI compose (single analytics service)
        → Mission Control Briefing / Admin API / future dashboards
```

## Final verdict

✅ BI foundation ready for Catalyst One v1.x as the **canonical analytics service**.
