# CO-RADAR-005 — EME Timeline Hydration Fix

**Status:** Implementation complete · **No Vercel deploy** (PO gate)  
**Scoring:** Untouched (frozen)

---

## A. Root cause fixed

LIVE Radar consumed EME certified snapshots composed with:

`mapEnterpriseDealToLoanFileStub(d)` → empty `timeline: []`

EME now batch-loads `EnterpriseDealTimelineEvent` via existing `listTimelinesForDeals` and passes:

`mapEnterpriseDealToLoanFileStub(d, null, timelinesByDealId[d.id] ?? [])`

---

## B. Files changed

| File | Change |
|------|--------|
| `server/services/enterprise-metrics-engine/compose-mission-control-snapshot.ts` | Accept `timelinesByDealId`; pass 3rd arg to stub |
| `server/services/enterprise-metrics-engine/index.ts` | Batch-load timelines before compose |
| `scripts/co-radar-005-verify.mts` | Verification |
| `scripts/co-radar-005-force-recalc.mts` | Force snapshot refresh |
| `scripts/co-radar-005-read-snapshot.mts` | Read certified Radar snapshot |
| `package.json` | `verify:co-radar-005`, `force:co-radar-005` |
| `compose-home-loan-eligible.ts` / `compose-product-family-eligible.ts` | Minor TS narrow fix (enabled already filtered) |

**Unchanged:** Health formula · activity blend · quadrant anchors · thresholds · classification · Operational Vector · Deal Timeline ownership

---

## C. Timeline counts (active Radar book)

| Layer | Count |
|------|------:|
| DB timeline events | **25** |
| EME loaded timeline events | **25** |
| Radar projection timeline events | **25** |
| Activity engine timeline events | **25** |
| Deals with populated timelines | **10/10** |

BEFORE projection timeline events: **0**

---

## D. Before / After Radar metrics

| Metric | BEFORE | AFTER |
|--------|-------:|------:|
| Timeline in Radar | 0 | **25** |
| Avg Deal Health | 6 | **56** |
| At Risk | 10 | **2** |
| Needs Attention | 0 | **4** |
| On Track | 0 | **4** |
| Direction | South | South-West |

Certified snapshot after force recalc (`mission_control.radar_dashboard`):

- `numericValue` / `healthScore` = **56**
- `sourceModules` includes `EnterpriseDealTimelineEvent`, `CO-RADAR-005`
- Quadrants: on_track 4 · at_risk 2 · needs_attention 4

---

## E. Verification

| Check | Result |
|-------|--------|
| `npm run verify:co-radar-005` | ✅ PASSED |
| Force recalculate (`force:co-radar-005`) | ✅ succeeded · 0 failures · radar + MC snapshots written |
| Stored Radar snapshot health | ✅ 56 (not floor 6) |
| Scoring constants (`at_risk: 18`, `maxAdj: 12`) | ✅ unchanged |
| `tsc -p tsconfig.server.json --noEmit` | ✅ |
| `tsc -p tsconfig.json --noEmit` | ✅ |
| `npm run build` | ✅ |

---

## F. Scoring untouched

✅ Confirmed — no formula / threshold / blend / quadrant / vector changes.

---

## G. EnterpriseDealTimelineEvent remains SSOT

✅ EME projects existing events only. No new activity table. No synthesized events.

---

## H. No duplicate timeline store

✅ Confirmed.

---

## Force recalculation

Run id `cmskf8byr0001weacohat4823` · status `succeeded` · snapshotsWritten 16 · metricKeys:

- `mission_control.executive_snapshot`
- `mission_control.radar_dashboard`

CHANAKYA Radar Tier-4 consumer will read this refreshed snapshot (no scoring change required).

---

**STOP — awaiting Product Owner review. No deploy performed.**
