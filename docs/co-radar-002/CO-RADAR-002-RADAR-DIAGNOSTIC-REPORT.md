# CO-RADAR-002 — CHANAKYA Radar Diagnostic

**Code:** CO-RADAR-002  
**Nature:** **DIAGNOSIS ONLY** — no code changes · no formula edits · no redesign · no deploy  
**Date:** 2026-08-07  
**Observed symptoms (PO):** Avg Deal Health = **6** · **12** Active · **12** At Risk · **0** On Track · **0** Follow-up · **0** Needs Attention

---

## Verdict (one line)

The distribution is **mathematically correct for the current code**, and **business-unreasonable**. It is caused by Activity Intelligence treating **missing meaningful timeline on the Radar stub** as critical neglect — even when Deal Registry rows are `operationalStatus = on_track` and **do have** `EnterpriseDealTimelineEvent` rows in Postgres that are **never projected** into Radar.

---

## Bank reasonableness question

> If this data belonged to a real bank, would the current Radar classification be considered reasonable?

### **No.**

A bank would not accept:

- 100% of the active book in **At Risk**
- Average Deal Health **6 / 100**
- while Deal operational status is stored as **`on_track`**
- and timeline events exist in the Deal timeline table

This is a **measurement / projection defect** relative to operational truth — not evidence that every deal is commercially failing.

---

## Observed vs workstation enumeration

| Metric | PO observation | Diagnostic run (this workstation) |
|--------|----------------|-----------------------------------|
| Avg Deal Health | 6 | **6** (exact) |
| Active deals scored | 12 | **14** non-deleted / non-archived Deals in local Prisma |
| At Risk | 12 (100%) | **14 (100%)** |
| On Track / Follow-up / Needs Attention | 0 / 0 / 0 | **0 / 0 / 0** |
| Score histogram | (implied all ~6) | **`{ "6": 14 }`** |

Count delta (12 vs 14) is likely Radar “active book” filtering (e.g. excluding some terminal stages on the UI path). **Every scored deal still lands on health = 6 via the same path.**

Machine-readable dump: [`CO-RADAR-002-DEAL-DIAGNOSTICS.json`](./CO-RADAR-002-DEAL-DIAGNOSTICS.json)  
Re-run (read-only): `npx tsx --env-file=.env.local scripts/co-radar-002-diagnostic.mts`

---

## Formula currently used

### Scale

**0–100** (not 0–10). Average Deal Health is also **0–100**.

### Average calculation method

```text
Average Deal Health = round( mean( dealHealthScore of each active Radar row ) )
```

Source: `buildChanakyaRadarDashboard` in `src/lib/chanakya-radar/derive-dashboard.ts`.  
This **overrides** the older weighted Operational Vector centre health.

### Per-deal Deal Health (actual)

There is **no** additive scorecard of Activity + Stage + Docs + Timeline subtotals.

```text
1) classifyOperationalDeal(file) → operational quadrant
2) baseHealth = healthScoreByQuadrant[quadrant]
3) dealHealthScore = clamp(0..100, round(baseHealth + blendAdj))

blendAdj = ((momentumScore - 55) / (100 - 55)) * 12
if Healthy Waiting: blendAdj = max(0, blendAdj)   // never negative
```

### Quadrant anchors (weightage of Deal Health base)

| Quadrant | Anchor |
|----------|-------:|
| On Track | **92** |
| Follow-up Required | **62** |
| Needs Attention | **48** |
| At Risk | **18** |

SSOT: `CHANAKYA_RADAR_CLASSIFICATION_THRESHOLDS.healthScoreByQuadrant`

### Activity Momentum (blend input only)

```text
momentum =
  0.35 * Recency
+ 0.25 * Frequency
+ 0.20 * Significance
+ 0.20 * Timeline Adherence
```

Then state caps:

- `healthy_waiting` → momentum ≥ 72  
- `active_today` → momentum ≥ 82  
- `at_risk` → momentum ≤ 32  

Blend: `ACTIVITY_HEALTH_BLEND` → `maxAdj = 12`, `neutralScore = 55`.

### Mathematical floor (explains Avg = 6)

```text
At Risk anchor 18 + max negative blend (−12) = 6
```

When **all** active deals hit this floor: `round(mean(6,6,…,6)) = 6`.

---

## Classification thresholds

### At Risk (first match wins — OR gates)

| Gate | Threshold |
|------|-----------|
| `file.status === "at_risk"` | flag |
| Lender on hold | any active hold |
| Terminal lenders | ≥ **2** |
| Overdue tasks | ≥ **2** |
| Days in stage | ≥ **31** |
| Delayed + idle | idle ≥ **10** |
| Docs completeness + pending + idle | completeness &lt; **0.35**, pending &gt; 0, idle ≥ **10** |
| **`activity.state === "at_risk"`** | **Activity Intelligence** |

### Needs Attention

idle ≥ 5 · daysInStage ≥ 8 · pendingDocs ≥ 2 · openTasks ≥ 2 · no active lenders · (activity needs_follow_up + idle ≥ 5) · delayed

### Follow-up Required

task due today · openTasks ≥ 1 · pendingDocs ≥ 1 · idle ≥ 3 · activity needs_follow_up

### On Track

Healthy Waiting **or** no earlier gate (incl. meaningful activity today)

---

## Penalties & bonuses

| Question | Answer |
|----------|--------|
| Are penalties cumulative on Deal Health? | **No stacked sub-score penalties.** Classification uses **OR** gates (first At Risk wins). Deal Health then applies **one** blend adjustment (±12). |
| Do missing activities force score to zero? | **No.** Missing meaningful activity → `activity.state = at_risk` → quadrant At Risk → **floor 6**, not 0. |
| Bonuses | Healthy Waiting / Active Today momentum floors; Healthy Waiting blocks negative blend |

---

## Critical projection defect (root cause)

### Evidence from this workstation DB

| Fact | Value |
|------|------:|
| Enterprise Deals enumerated | **14** |
| Deals with `EnterpriseDealTimelineEvent` rows | **14 / 14** |
| Total timeline events in DB | **44** |
| Timeline length on Radar stub after `mapEnterpriseDealToLoanFileStub` | **0 for every deal** |
| DB `operationalStatus` | **`on_track` for every deal** |
| Radar final classification | **`at_risk` for every deal** |

### Code path

`mapEnterpriseDealToLoanFileStub` hardcodes:

```text
timeline: []
```

(`src/lib/enterprise-deal/map-deal-to-loan-file.ts`)

Therefore Activity Intelligence sees **no meaningful hits** → `daysSinceMeaningful = 999` → state **`at_risk`** → Decision Engine **At Risk** → health **6**.

**The Deal table says On Track. The Radar projection says no activity. Radar trusts the empty projection.**

---

## Distribution histogram

```text
Score | Count
------+------
    6 | 14   ← 100% of enumerated deals
```

Quadrant histogram:

```text
On Track            0
Follow-up Required  0
Needs Attention     0
At Risk            14
```

---

## Per-deal diagnostics (all active / enumerated deals)

Identical calculation path for every row below (stub timeline empty).

### Shared raw calculation (each deal)

| Step | Value |
|------|-------|
| 1. Quadrant | `at_risk` |
| 2. Quadrant anchor | **18** |
| 3. Momentum components | Recency **8** · Frequency **0** · Significance **18** · Adherence **15** |
| 4. Momentum (weighted ≈9.4, after at_risk cap) | **9** |
| 5. Blend adj | **≈ −12.27** → rounds with anchor to **6** |
| 6. Final health | **6** |
| Bonuses | *(none)* |
| Penalties | Activity at_risk momentum cap ≤32 · blend penalty ≈−12 |
| Why At Risk | `activity.state === at_risk` because meaningful idle = **999** on empty stub timeline |

### Deal-by-deal

| Deal | Borrower | DB stage | DB status | Timeline events in DB | Stub timeline | Health | Classification |
|------|----------|----------|-----------|----------------------:|--------------:|-------:|----------------|
| DEAL-2026-000078 | Amol Thorat | closure_wip | on_track | 8 | **0** | **6** | At Risk |
| DEAL-2026-000075 | Pioneer Insurance & Reinsurance Brokers Pvt Ltd | closure_wip | on_track | 4 | **0** | **6** | At Risk |
| DEAL-2026-000071 | Priyesh Jain | lost | on_track | 3 | **0** | **6** | At Risk |
| DEAL-2026-000080 | Priyesh Jain | soft_approved | on_track | 2 | **0** | **6** | At Risk |
| DEAL-2026-000079 | Saral Saraf | lost | on_track | 2 | **0** | **6** | At Risk |
| DEAL-2026-000076 | Saral Saraf | closure_wip | on_track | 5 | **0** | **6** | At Risk |
| DEAL-2026-000073 | Nine Rivers Capital Holdings Pvt. Ltd | disbursed | on_track | 5 | **0** | **6** | At Risk |
| DEAL-2026-000072 | Pratik Bhati | login | on_track | 2 | **0** | **6** | At Risk |
| DEAL-2026-000074 | Suebel Seals International Pvt Ltd | login | on_track | 1 | **0** | **6** | At Risk |
| DEAL-2026-000077 | Pioneer Insurance & Reinsurance Brokers Pvt Ltd | logged_in_wip | on_track | 1 | **0** | **6** | At Risk |
| DEAL-2026-000081 | Pioneer Investcorp Ltd | logged_in_wip | on_track | 1 | **0** | **6** | At Risk |
| DEAL-2026-000082 | Vinit Didwania | closure_wip | on_track | 4 | **0** | **6** | At Risk |
| DEAL-2026-000083 | Harpreetsingh Dua | logged_in_wip | on_track | 1 | **0** | **6** | At Risk |
| DEAL-2026-000084 | Shaurya Malwa | disbursed | on_track | 5 | **0** | **6** | At Risk |

Full component dumps: JSON artefact.

---

## Scoring components (what exists vs what does not)

| Requested factor | Role today |
|------------------|------------|
| Activity | Momentum blend + **can force At Risk** |
| Stage progress | Classification signal only (`daysInStage`) — **not a health subtotal** |
| Documents | Classification signal only — **not a health subtotal** |
| Timeline | Dual clocks; meaningful clock drives Activity state — **not a health subtotal** |
| Risk penalties | OR classification gates |
| Bonus | Healthy Waiting / Active Today floors; HW blocks negative blend |

---

## Why the PO symptoms are “not believable” but still appear

1. **Believable business portfolio?** No — 100% At Risk with avg 6 is not a credible healthy book.  
2. **Believable given code + stub projection?** Yes — exact floor maths.  
3. **Primary mechanism:** empty Radar `timeline` → Activity At Risk → quadrant At Risk → health 6.  
4. **Amplifiers:** DB timeline events ignored by stub · Activity “unknown history” treated as critical risk · Average = unweighted mean of floors.

---

## Related prior audit

CO-RADAR-001 (2026-08-06) identified the same floor maths and Activity Intelligence regression.  
**CO-RADAR-002 adds live Deal enumeration proof:** timeline events **exist in DB** and operational status is **`on_track`**, yet Radar still scores **6 / At Risk** because the stub timeline is always empty.

---

## Explicit non-actions (this ticket)

- No code fixes  
- No formula changes  
- No threshold retuning  
- No deployment  

Await Product Owner direction before any remediation sprint.
