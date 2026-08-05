# CO-MC-002 — CHANAKYA Intelligence

**Status:** Implementation Complete · Awaiting Product Owner BAT  
**Priority:** Mission Control · Enterprise Intelligence Centre  
**Date:** 2026-08-05

---

## Purpose

| Tab | Answers |
|-----|---------|
| CHANAKYA Radar | Where is the business heading? |
| **CHANAKYA Intelligence** | **Why is the business heading there?** |
| Executive Dashboard | What are the numbers? |

Additive module — **does not modify** CHANAKYA Radar or Executive Briefing implementations.

---

## Route & navigation

- Route: `/mission-control/chanakya-intelligence`
- Rail order (primary three first): Radar · Intelligence · Executive Dashboard
- Feature id: `mc-chanakya-intelligence`

---

## 2 × 2 layout

| Galaxy View | River Flow |
|-------------|------------|
| Heat Map | Pulse Monitor |

Widget Framework (`size: large`) — future widgets register without redesign (`CHANAKYA_INTELLIGENCE_FUTURE_WIDGET_IDS`).

---

## Data SSOT

Compose: `src/lib/chanakya-intelligence/`  
Consumes:

- `buildChanakyaRadarDashboard` (Radar Decision Engine)
- Activity Momentum / states from CO-MC-001 (via Radar rows)
- Deal Registry via `hydrateRadarDealFiles`

Pulse Monitor explicitly surfaces Activity Intelligence heartbeat metrics.

---

## Validation

```bash
npm run verify:co-mc-002
```

---

## Deployment

| Field | Value |
|-------|-------|
| Status | ✅ Deployed |
| Deployment ID | `dpl_J5Y1k8aqAkh6QhLd3s2zT24cCkNx` |
| Production URL | https://catalyst-one-two.vercel.app |
| Intelligence route | https://catalyst-one-two.vercel.app/mission-control/chanakya-intelligence |
| Inspect | https://vercel.com/rupee-catalyst/catalyst-one/J5Y1k8aqAkh6QhLd3s2zT24cCkNx |

Awaiting Product Owner BAT.

