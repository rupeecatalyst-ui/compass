# CO-MC-002 — Mission Control Enterprise Intelligence Architecture

Status: **Implementation Complete** · Ready for BAT

## Objective

Transform Mission Control into an Executive Intelligence Platform: full-width report layout, graph-first sections, and daily precomputed analytics (no live aggregation on open).

## Architecture

1. **Nightly / Admin Force** (`enterpriseMetricsEngineService`) loads Opportunities + Deals.
2. `composeMissionControlExecutiveSnapshot` builds EBI + Radar + **CO-MC-002 `intelligence` pack**.
3. Pack is persisted under `EME_MISSION_CONTROL_SNAPSHOT_KEY`.
4. Mission Control Executive Briefing reads `GET /api/enterprise-metrics/mission-control` only.

## Refresh schedule

| Environment | Cron (UTC) | Local meaning |
|-------------|------------|---------------|
| Vercel | `30 20 * * *` | Daily 02:00 AM Asia/Kolkata |

## Sections (12)

1. Executive Summary  
2. Business Source Intelligence  
3. Wealth Partner Intelligence  
4. Product Intelligence  
5. Lender Intelligence  
6. Opportunity Intelligence  
7. Revenue Intelligence  
8. Customer Intelligence  
9. Geographic Intelligence  
10. Marketing Intelligence  
11. Operational Intelligence  
12. AI Executive Intelligence  

## Metric SSOT

Intelligence derive **groups** EBI executive / operational / health / insights and Opportunity/Deal registry facts. It does **not** invent parallel KPI formulas.

## Manual step for existing environments

Administrators should run **Force Recalculate** once after deploy so the snapshot includes the new `intelligence` pack. Until then, the platform shows “Snapshot pending” for intelligence sections while legacy EBI greeting/brief still loads if present.

## Zero regression

- Existing MC routes, permissions, and snapshot read API unchanged in shape (additive `intelligence` field).
- Loan-scoped Mission Control workspace surfaces untouched.
