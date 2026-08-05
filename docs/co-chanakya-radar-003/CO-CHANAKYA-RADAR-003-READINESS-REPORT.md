# CO-CHANAKYA-RADAR-003 — Enterprise Deal Radar Readiness Report

**Status:** Implementation Complete · Awaiting Product Owner BAT  
**Priority:** P0  
**Deployment:** Not deployed (PO instruction — await BAT)

## Summary

CHANAKYA Radar is refined as the **Executive Operational Deal Radar**. It analyses **Active Deals only**, classifies with a multi-parameter Decision Engine, and presents four outside premium glass status cards with continuous auto-scroll.

## Constitutional Health Check

**GREEN** — extends certified Radar / Deal SSOT; does not invent a parallel metric engine, customer radar, or opportunity radar. Classification thresholds live in `CHANAKYA_RADAR_CLASSIFICATION_THRESHOLDS`.

## Delivered

### Part 1 — Enterprise Deal Logic

| Rule | Implementation |
|------|----------------|
| Active Deals only | `isLiveActiveLoanFile` + `listActiveRadarDealFiles` |
| Exclude Lost / Disbursed / Cancelled / Withdrawn / Archived | Stage + lifecycle + terminal lender book filters |
| Average Deal Health = Active only | Mean of `dealHealthScore` on mapped Radar rows |
| Night compose uses Active filter | `composeMissionControlExecutiveSnapshot` → `listActiveRadarDealFiles` |

### Decision Engine

- SSOT: `src/lib/chanakya-radar/classify-operational-deal.ts`
- Thresholds: `CHANAKYA_RADAR_CLASSIFICATION_THRESHOLDS` in `src/constants/chanakya-radar.ts`
- Output: quadrant · dealHealthScore · classificationReason · recommendation · signals
- Categories: On Track · Needs Attention · Follow-up Required · At Risk

### Part 2 — Layout & Interaction

| Element | Detail |
|---------|--------|
| Hero dial | Unobstructed; breathing space; AVG DEAL HEALTH centre |
| Status cards | TL On Track · TR Follow-up · BL Needs Attention · BR At Risk |
| Auto-scroll | Bottom → top, continuous, no scrollbar |
| Row fields | Deal Ref · Customer · Product · Lender · Stage |
| Hover | Full operational insight panel |
| Click | Deal Workspace via `buildDealWorkspaceHref` |

## Key paths

- `src/lib/chanakya-radar/classify-operational-deal.ts`
- `src/lib/chanakya-radar/derive-dashboard.ts`
- `src/lib/chanakya-radar/operational-vector.ts`
- `src/lib/chanakya-live-intelligence/live-ssot.ts`
- `src/components/catalyst-one/chanakya-radar/radar-status-scroll-card.tsx`
- `src/components/catalyst-one/chanakya-radar/chanakya-radar-visual.tsx`
- `src/components/catalyst-one/chanakya-radar/chanakya-radar-workspace.tsx`
- `server/services/enterprise-metrics-engine/compose-mission-control-snapshot.ts`
- `.cursor/rules/chanakya-radar.mdc`

## Validation checklist (BAT)

- [ ] Desktop / Laptop / Ultra-wide / Tablet — no overlap
- [ ] Lost / Disbursed / Cancelled / Withdrawn / Archived absent from dial & cards
- [ ] Classifications match multi-parameter signals
- [ ] Smooth continuous status scroll
- [ ] Hover shows full insight fields
- [ ] Click opens Deal Workspace
- [ ] Centre score = Average Deal Health (active only)

## Manual steps

None for schema. No env changes required.

## Final status

🟡 Ready for Product Owner BAT (no Vercel deploy per PO instruction)
