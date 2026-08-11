# CO-RADAR-004 — Radar Activity Timeline Live Path Diagnostic

**Status:** DIAGNOSTIC ONLY — no fix · no deploy · scoring frozen  
**Generated:** 2026-08-08  
**Repo HEAD:** `95973c5`

---

## Diagnostic table

| Layer | Expected | Actual | Status |
|------|----------|--------|--------|
| Postgres Timeline | Real events | **630** org-wide · **25** on 10 active Radar deals · **10/10** deals have ≥1 event | ✅ Real |
| DAL (CO-RADAR-003) | Real events hydrated | **25** events projected when stub receives 3rd arg | ✅ Wired on DAL path only |
| Radar Projection (LIVE) | Populated timeline | **0** events — `mapEnterpriseDealToLoanFileStub(d)` one-arg | ❌ Broken |
| Activity Engine (LIVE) | Real activity | Empty timeline → `at_risk` · momentum ≈ 9 | ❌ Broken input |
| Health Engine | Existing formula (frozen) | At Risk anchor **18** + max negative blend **−12** → floor **6** | ✅ Formula OK · input wrong |
| Classification (LIVE) | Data-driven | **At Risk 10/10 (100%)** · Vector **South** · Trend **Declining** · Avg Health **6** | ❌ Symptom of empty timeline |
| Deployment | CO-RADAR-003 in LIVE Radar chain | CO-RADAR-003 **not** in EME compose; Radar UI is Tier-4 snapshot consumer | ❌ Not in live path |

### Layer count proof (active Radar book)

| Step | Count |
|------|------:|
| A. Postgres timeline (active deals) | **25** |
| B. DAL would receive | **25** |
| C. Radar projection (EME / LIVE) | **0** |
| D. Scoring input (EME / LIVE) | **0** |
| E. Activity engine (EME / LIVE) | **0** |
| C′. Radar projection (DAL hydrate) | **25** |
| D′. Scoring input (DAL hydrate) | **25** |

**Break:** Between B and C — EME compose never loads or passes timeline events.

---

## A. Root cause

LIVE CHANAKYA Radar (`/chanakya-radar`) does **not** run CO-RADAR-003 hydration.

It reads a **Tier-4 EME certified snapshot** built by:

`composeMissionControlExecutiveSnapshot`
→ `mapEnterpriseDealToLoanFileStub(d)` **(no timeline argument)**
→ `buildChanakyaRadarDashboard`

So Activity Intelligence always sees `timeline: []`, classifies dormant/`at_risk`, and Deal Health floors at **6**.

CO-RADAR-003 correctly hydrates only the **client DAL** path (`loadEnterpriseAsLoanFiles` → batch timelines → stub 3rd arg). That path is **not** what the Radar page uses.

---

## B. Exact broken path

```
Postgres EnterpriseDealTimelineEvent          ✅ events exist
        ↓
DAL loadEnterpriseAsLoanFiles + listTimelines ✅ CO-RADAR-003 (unused by Radar UI)
        ↓
EME runSnapshot → serializeDeal only          ❌ no timeline fetch
        ↓
composeMissionControlExecutiveSnapshot
  mapEnterpriseDealToLoanFileStub(d)          ❌ timeline never passed
        ↓
Certified snapshot → GET /api/enterprise-metrics/radar
        ↓
ChanakyaRadarWorkspace (Tier-4 consumer)      ❌ displays empty-timeline KPIs
```

**Evidence (source):**

```102:107:server/services/enterprise-metrics-engine/compose-mission-control-snapshot.ts
  const files: LoanFile[] = listActiveRadarDealFiles(
    input.deals.map((d) => mapEnterpriseDealToLoanFileStub(d)),
  );

  const radar = buildChanakyaRadarDashboard(files);
```

```206:208:src/components/catalyst-one/chanakya-radar/chanakya-radar-workspace.tsx
 * CO-ARCH-007 — CHANAKYA Radar is a Tier 4 Snapshot Consumer.
 * Page load reads certified Night Mode intelligence — never live enterprise aggregation.
```

DAL hydrate (correct, but not LIVE Radar):

```116:135:src/lib/enterprise-deal/deal-data-access.ts
  // CO-RADAR-003 — hydrate Enterprise Deal Timeline Registry (never leave timeline: []).
  ...
    timelinesByDeal = await enterpriseDealApiClient.listTimelinesForDeals(...)
  ...
    return mapEnterpriseDealToLoanFileStub(d, localFile, timelinesByDeal[d.id] ?? []);
```

---

## C. Evidence (side-by-side live compute)

Same 10 active Radar deals, same frozen formula:

| Metric | EME / LIVE path (no timeline) | DAL / CO-RADAR-003 path (hydrated) |
|--------|-------------------------------|-----------------------------------|
| Timeline events in projection | **0** | **25** |
| Empty timelines | **10 / 10** | **0 / 10** |
| Avg Deal Health | **6** | **56** |
| At Risk | **10 (100%)** | **2 (20%)** |
| On Track | **0** | **4** |
| Needs Attention | **0** | **4** |
| Operational Vector | **South** | South-West |
| Trend | **Declining** | Declining |

Sample deal (DEAL-2026-000082):

| Field | EME | DAL |
|-------|-----|-----|
| DB timeline count | 4 | 4 |
| Projection length | **0** | **4** |
| Latest event | null | Workflow stage changed… |
| Activity state | `at_risk` (momentum 9) | `healthy_waiting` (momentum 82) |
| Quadrant | `at_risk` | `on_track` |

Health floor mechanism (unchanged, as designed):

- At Risk quadrant anchor = **18** (`healthScoreByQuadrant.at_risk`)
- Max negative activity blend = **−12** (`ACTIVITY_HEALTH_BLEND.maxAdj`)
- Floor = **18 − 12 = 6** ← matches LIVE Avg Deal Health

---

## D. Is activity timeline actually active in LIVE Radar?

**NO.** LIVE Radar projections receive `timeline: []` for every active deal, despite Postgres having real events (10/10 active deals have ≥1 event; 630 timeline rows org-wide).

---

## E. Is CO-RADAR-003 actually deployed?

| Question | Answer |
|----------|--------|
| Repository has CO-RADAR-003 DAL hydrate? | **YES** (local working tree — `deal-data-access.ts` modified; `enterprise-deal-activity-timeline.ts` untracked) |
| Repository wires CO-RADAR-003 into EME compose? | **NO** |
| LIVE Radar chain uses CO-RADAR-003? | **NO** |
| Latest Ready Vercel (≈3h): `catalyst-mn1pnrfzj-rupee-catalyst.vercel.app` | Built from deployed tree; **does not** put CO-RADAR-003 into EME Radar compose |
| Named git commit `CO-RADAR-003`? | **Not found** as a dedicated commit on HEAD `95973c5` |

**Repository version:** `95973c5` + local uncommitted CO-RADAR-003 DAL files  
**Deployed version:** latest Ready production deployment (~3h) — **CO-RADAR-003 not in LIVE Radar path**  
**CO-RADAR-003 included in LIVE Radar:** **NO**

---

## F. Is the scoring formula implicated?

**NO.** Formula and thresholds are behaving as designed on empty activity input.

The universal Health = 6 is the expected floor when every deal is classified At Risk with maximum negative activity blend — caused by **missing timeline data**, not a formula defect.

---

## G. Recommended smallest corrective change

**Do not change scoring.**

Wire CO-RADAR-003 hydration into the **EME compose path** only:

1. In `server/services/enterprise-metrics-engine` (snapshot `runSnapshot` / compose input), batch-load `EnterpriseDealTimelineEvent` for the deal IDs being snapshotted (reuse `listTimelinesForDeals` / repository).
2. Change `compose-mission-control-snapshot.ts` from:

   `mapEnterpriseDealToLoanFileStub(d)`

   to:

   `mapEnterpriseDealToLoanFileStub(d, null, timelinesByDeal[d.id] ?? [])`

3. Force Recalculate / Night Mode regenerate the Radar certified snapshot.
4. Re-verify LIVE Radar KPIs (expect empty timelines → 0; Avg Health leave floor-6).

Optional: keep DAL path as-is (already correct for Live Intelligence consumers).

---

## Active Radar deals (DB)

| Deal | Customer / Counterparty | Op Status | Timeline events | Latest |
|------|-------------------------|-----------|----------------:|--------|
| DEAL-2026-000083 | Saraswat Cooperative Bank | on_track | 1 | deal_created |
| DEAL-2026-000082 | HSBC Bank | on_track | 4 | stage_transition |
| DEAL-2026-000081 | Yes Bank | on_track | 1 | deal_created |
| DEAL-2026-000077 | Credit Saison India | on_track | 1 | deal_created |
| DEAL-2026-000074 | HDFC Bank | on_track | 1 | deal_created |
| DEAL-2026-000072 | Bank of Baroda | on_track | 2 | deal_updated |
| (+ 4 more active) | … | … | … | … |

**Totals:** Active Radar deals **10** · Deals with ≥1 timeline event **10** · Deals with 0 **0** · Timeline events on active book **25** · Org-wide timeline rows **630**

---

## Artifacts

- `docs/co-radar-004/CO-RADAR-004-DIAGNOSTIC.json`
- `scripts/co-radar-004-diagnostic.mts`

---

**STOP.** No fix implemented. No deploy. Awaiting Product Owner approval.
