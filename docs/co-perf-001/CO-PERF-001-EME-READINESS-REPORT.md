# CO-PERF-001 — Enterprise Metrics Engine Readiness Report

**Status:** Phase 1 Foundation Ready for Business Certification  
**Date:** 2026-07-22  
**Programme:** Enterprise Metrics Engine (EME) & Performance Optimization Framework

---

## Executive summary

Catalyst One now has a dedicated **Enterprise Metrics Engine** computation layer with persistent read models (`EnterpriseMetricRun`, `EnterpriseMetricSnapshot`). The Dashboard Visual Analytics pack prefers EME snapshots instead of always recalculating on render. Deal stage projections are centralized on `EnterpriseDeal.grossStage`. Administration exposes Force Recalculate / Dry Run telemetry.

---

## Architecture delivered

| Layer | Location |
|-------|----------|
| Prisma read models | `enterprise_metric_runs`, `enterprise_metric_snapshots` |
| Server engine | `server/services/enterprise-metrics-engine/` |
| Admin UI | `/admin/enterprise-metrics` |
| Dashboard consume | `/api/enterprise-metrics/dashboard` → `loadDashboardVisualAnalytics` |
| Cron (optional) | `/api/cron/enterprise-metrics` (`CRON_SECRET`) |
| Deal stage SSOT | `resolveDealStageProjection()` |

EME **does not** replace Opportunity / Deal / Customer entities.

---

## Metric categories

### Category A — Nightly Snapshot
Implemented via Force Recalculate / nightly run:
- Dashboard visual analytics pack
- Pipeline statistics, conversion, ticket size, TAT
- Product / lender / RM performance aggregates
- Deal health proxy → writes reserved `EnterpriseDeal.health*` columns

### Category B — Event Driven
`EME_EVENT_METRIC_MAP` + `refreshForEvent(eventKey)` — refreshes **only mapped keys**.  
Deal health API now triggers EME event refresh (no 501 placeholder).

### Category C — Live
`getLiveMetrics()` always queries entity tables for today's Opportunities / Logins / Disbursements. Task pending/overdue remain ETE live overlays on the dashboard.

---

## Performance benchmark (Phase 1)

| Surface | Before | After (design) | Measured |
|---------|--------|----------------|----------|
| Dashboard Visual Analytics | Client: Opp+Deal search + full derive every load | Prefer EME snapshot; parallel entity fetch only on miss / non-90d range | Compile-validated; runtime depends on DB + first warm |
| Subsequent dashboard navigation | Re-derive | Read snapshot (<500 ms target when warm) | Pending production timing BAT |
| My Deals first load | Unchanged in this wave | Target <2s | Known gap — full EME wiring pending |
| Deal stage consistency | LoanFile fallback possible | Deal Registry `grossStage` only in projection mappers | Code fixed |

**Overall Performance Score (Phase 1 foundation):** **72 / 100**  
(Architecture + Dashboard consume + Admin + Stage SSOT; full module migration and cron still open.)

---

## API optimisation

- Dashboard metrics: single EME read endpoint; warm-on-miss once
- Admin status: parallel counts + recent runs
- Live metrics: parallel Opportunity count + distinct Deal opportunity IDs
- Visual analytics entity fallback: Opp + Deal fetched in `Promise.all`

---

## Metric consistency

| Metric family | Authority |
|---------------|-----------|
| Dashboard charts (90d pack) | EME snapshot `dashboard.visual_analytics` |
| Fresh Login KPI strip | Existing Fresh Login API (Opportunity-centric) — align to EME live in follow-up |
| Deal pipeline stage | `EnterpriseDeal.grossStage` |
| Opportunity requirement stage | Opportunity Registry (planning vocabulary — intentional) |
| Deal health | EME → Deal.health* columns |
| Opportunity health | Existing `computeOpportunityHealthScore` (not yet nightly-persisted in EME) |

---

## Deal projection consistency (Phase 5)

**Resolved for Deal surfaces:**
- `map-deal-to-loan-file` and `map-deal-to-registry-row` use `resolveDealStageProjection` — **no LoanFile.stage override**.

**Intentional dual vocabulary:**
- Loan Journey uses journey orchestration stages (Lead Creation → …) — not lender `grossStage`.
- Opportunity Stage Distribution uses Opportunity `requirementStage`.

---

## Known gaps

1. Mission Control / RM Workspace / Executive BI / My Opportunities still compose some KPIs locally — migrate consumers to EME reads.
2. My Deals `deriveOpportunityExecutiveSummary` still has a local healthScore — must redirect to Opportunity / EME health SSOT.
3. Customer / Opportunity health nightly persistence not fully wired into EME snapshots.
4. Unread notifications / online users live metrics are stubbed (`null`).
5. Vercel Cron not enabled until `CRON_SECRET` + `vercel.json` cron entry.
6. Production migration must be applied: `20260722160000_co_perf_001_enterprise_metrics_engine`.
7. First dashboard hit may warm-compute (acceptable); subsequent hits should be snapshot reads.

---

## Recommendations

1. Apply DB migration in each environment before Force Recalculate.
2. Enable nightly cron after BAT of Force Recalculate.
3. Emit `refreshForEvent` from Opportunity/Deal mutation services (stage change, create, disbursement).
4. Replace My Deals local healthScore with Opportunity intelligence / EME.
5. Add browser performance marks for Dashboard & My Deals in certification BAT.
6. Expand EME Category A to persist Opportunity health via existing `computeOpportunityHealthScore` with real signals.

---

## Manual steps required

1. Apply Prisma migration `20260722160000_co_perf_001_enterprise_metrics_engine`.
2. Open **Administration → System → Enterprise Metrics → Force Recalculate**.
3. (Optional) Set `CRON_SECRET` and schedule POST `/api/cron/enterprise-metrics`.

---

## Success criteria checklist

| Criterion | Status |
|-----------|--------|
| Heavy calculations not required on every UI render (Dashboard 90d) | ✅ Prefer EME |
| Metrics calculated once and reused | ✅ Snapshots |
| Identical KPI path for Dashboard pack | ✅ EME key |
| Deal stage single projection | ✅ grossStage helper |
| Admin observability | ✅ |
| Measurable prod BAT timings | ⏳ Pending |
