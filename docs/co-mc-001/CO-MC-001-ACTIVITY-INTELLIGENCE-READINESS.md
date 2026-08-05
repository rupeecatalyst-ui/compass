# CO-MC-001 — CHANAKYA Radar v2.0 · Enterprise Activity Intelligence

**Status:** Implementation Complete · Awaiting Product Owner BAT  
**Priority:** Mission Control / Radar calculation enhancement  
**Date:** 2026-08-05

---

## Objective

Upgrade CHANAKYA Radar calculations so Mission Control reflects **real operational movement**, not merely workflow position — without redesigning the frozen Radar dial UI.

---

## What was introduced

### Enterprise Activity Intelligence Engine

| Path | Role |
|------|------|
| `src/lib/enterprise-activity-intelligence/` | Momentum + state SSOT |
| `src/constants/enterprise-activity-intelligence/` | TAT windows, weights |
| `src/types/enterprise-activity-intelligence.ts` | Types |

### Transaction Activity States

1. **Active Today** — meaningful activity today  
2. **Recently Active** — within freshness window  
3. **Healthy Waiting** — legitimate wait inside expected TAT (lender / legal / ops / customer)  
4. **Needs Follow-up** — neglect where activity should have occurred  
5. **At Risk** — SLA breach, overdue, blocked, critical delay  

### Activity Momentum Score (0–100)

Weighted from:

- Activity Recency  
- Activity Frequency  
- Activity Significance  
- Expected Workflow Timeline adherence  

Viewing / opening a record never counts (`CHANAKYA_RADAR_NON_OPERATIONAL_ACTIVITY_PATTERNS`).

---

## Radar integration (UI unchanged)

- `classifyOperationalDeal` — Healthy Waiting → **On Track**; idle alone cannot reduce score  
- Deal Health blends Momentum (Healthy Waiting never takes a negative blend)  
- Operational Vector attention / Trend consume Momentum  
- Intelligence strip adds **Activity Momentum** KPI (below-fold analytics; dial chrome unchanged)  
- EBI Customer Activity consumes mean Activity Momentum from Radar rows  

---

## Healthy Waiting vs Neglect (examples)

| Scenario | State | Radar effect |
|----------|-------|--------------|
| Bank TAT 7d, Day 4, awaiting lender | Healthy Waiting | On Track · score protected |
| Customer docs pending 12d, no follow-up | Needs Follow-up / At Risk | Score reduced · attention pull |

---

## Validation

```bash
npm run verify:co-mc-001
npm run verify:co-chanakya-radar-003
```

---

## Deployment

| Field | Value |
|-------|-------|
| Status | ✅ Deployed |
| Deployment ID | `dpl_6LCRSo4zQgf7pU4WycDfYQeZ9tdn` |
| Production URL | https://catalyst-one-two.vercel.app |
| Inspect | https://vercel.com/rupee-catalyst/catalyst-one/6LCRSo4zQgf7pU4WycDfYQeZ9tdn |
| Note | Radar dial UI unchanged; calculation engine enhanced with Activity Intelligence |

Awaiting Product Owner BAT.

