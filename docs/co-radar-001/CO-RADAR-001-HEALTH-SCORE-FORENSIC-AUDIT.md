# CO-RADAR-001 — CHANAKYA Radar Health Score Forensic Audit

**Code:** CO-RADAR-001  
**Nature:** INVESTIGATION ONLY — no code changes · no redesign · no formula edits · no deploy · no commit  
**Date:** 2026-08-06  
**Observed anomaly:** Average Deal Health ≈ **57 → 6** in one day; **100% of active deals in AT RISK**

---

## Executive Summary

The drop to **~6** and the **100% At Risk** distribution are **not** unexplained random corruption. They are the **mathematically expected outcome** of the current implementation when active Deal projections have **no meaningful timeline activity**.

| Finding | Verdict |
|---|---|
| Is there a multi-factor “Activity + Stage + Docs + Timeline” Deal Health formula? | **No.** Deal Health is a **quadrant anchor ± Activity Momentum blend**. |
| Why Average Deal Health ≈ 6? | `at_risk` anchor **18** − max negative blend **12** = **6** (exact floor). |
| Why 100% At Risk? | Activity Intelligence treats empty / non-matching timelines as **999 days** since meaningful activity → state `at_risk` → Decision Engine forces **At Risk**. |
| When introduced? | **2026-08-05** commit `95973c5` — CO-MC-001 Activity Intelligence + new `classifyOperationalDeal` (same day as observed drop). |
| Expected vs defect? | Behaviour is **consistent with code**, but is a **logic / data-projection defect relative to Product Owner business intent** (not a healthy portfolio). |
| PO rule “meaningful activity today → On Track”? | **Partially Implemented** (works only when meaningful timeline/mark exists and overriding At Risk signals are absent). |

**Primary root cause:** CO-MC-001 Activity Intelligence + Decision Engine classify deals with **no pattern-matched meaningful timeline events** as Activity At Risk, then blend Deal Health to the **floor of 6**. This is amplified by Deal Registry → LoanFile stubs that ship with **`timeline: []`**.

---

## 1. Health Score Formula (exact, as implemented)

### 1.1 What Radar centre displays

`buildChanakyaRadarDashboard` sets:

```text
Average Deal Health = round( mean( dealHealthScore of each active Radar row ) )
```

It **overrides** the older weighted Operational Vector health with this unweighted mean  
(`src/lib/chanakya-radar/derive-dashboard.ts`).

### 1.2 Per-deal Deal Health (actual formula)

There is **no** additive scorecard of the form Activity/25 + Stage/20 + Documents/15 + Timeline/15 − Risk.

**Current formula:**

```text
1) Classify deal → operational quadrant
2) baseHealth = healthScoreByQuadrant[quadrant]
3) dealHealthScore = clamp(0..100, round(baseHealth + blendAdj))

where blendAdj =
  ((momentumScore - 55) / (100 - 55)) * 12
  and if Healthy Waiting: blendAdj = max(0, blendAdj)   // never negative
```

**Quadrant anchors** (`CHANAKYA_RADAR_CLASSIFICATION_THRESHOLDS.healthScoreByQuadrant`):

| Quadrant | Anchor |
|---|---|
| On Track | **92** |
| Follow-up Required | **62** |
| Needs Attention | **48** |
| At Risk | **18** |

**Blend config** (`ACTIVITY_HEALTH_BLEND`): `maxAdj = 12`, `neutralScore = 55`.

**Floor when At Risk + very low momentum:**

```text
18 + (−12) = 6
```

This matches the Product Owner observation of Average Deal Health ≈ **6**.

### 1.3 Activity Momentum Score (inputs to the blend only)

```text
momentum =
  0.35 * Recency
+ 0.25 * Frequency
+ 0.20 * Significance
+ 0.20 * Timeline Adherence
```

Then clamps / caps:

- `healthy_waiting` → momentum ≥ 72  
- `active_today` → momentum ≥ 82  
- `at_risk` → momentum ≤ 32  

**Important:** These components are **not** shown as separate Deal Health subtotals on the dial. They only adjust the quadrant anchor.

### 1.4 Requested “Activity / Stage / Documents / Timeline / Risk” mapping

| Requested factor | Role in current code |
|---|---|
| Activity Score | Activity Momentum (blend only) + Activity State (can force At Risk) |
| Stage Progress | Classification signal (`daysInStage`) — **not a scored subtotal** |
| Timeline | Dual clocks (see §4) — **not a scored subtotal** |
| Document Score | Classification signal (pending / completeness) — **not a scored subtotal** |
| Risk Penalties | Classification gates (hold, overdue, delayed, terminal lenders, status flag, activity state) |
| SLA | Healthy Waiting TAT windows in Activity Intelligence |
| Recency | Activity Momentum component (meaningful activity only) |
| Bonus | Healthy Waiting / Active Today momentum floors; Healthy Waiting blocks negative blend |

---

## 2. Classification Logic

**SSOT:** `classifyOperationalDeal`  
**Thresholds:** `CHANAKYA_RADAR_CLASSIFICATION_THRESHOLDS`

### Priority order (first match wins)

1. **At Risk** if any of:
   - `file.status === "at_risk"`
   - Lender **on hold**
   - Terminal lenders ≥ **2**
   - Overdue tasks ≥ **2**
   - `daysInStage` ≥ **31**
   - Delayed **and** idleForClass ≥ **10**
   - Docs completeness &lt; **0.35** with pending docs **and** idleForClass ≥ **10**
   - **`activity.state === "at_risk"`** ← critical path for empty timelines
2. **On Track** if Healthy Waiting  
3. **Needs Attention** if delayed / idle ≥ 5 / stage age ≥ 8 / pending docs ≥ 2 / open tasks ≥ 2 / no active lenders / (activity needs_follow_up + idle ≥ 5)  
4. **Follow-up Required** if task due today / open tasks ≥ 1 / pending docs ≥ 1 / idle ≥ 3 / activity needs_follow_up  
5. Else **On Track** (including “Meaningful operational activity recorded today”)

`idleForClass` = 0 when Healthy Waiting; else idle days from **any** timeline head (or createdAt/loginDate).

---

## 3. Deal Diagnostics

### Live hydrate (this workstation)

`hydrateRadarDealFiles()` returned **0** active deals locally. Per-deal production rows could not be enumerated here.

Artefact: `docs/co-radar-001/CO-RADAR-001-DEAL-DIAGNOSTICS.json`

### Simulation proof (deterministic)

Artefact: `docs/co-radar-001/CO-RADAR-001-SIMULATION-PROOF.json`

| Case | Quadrant | Score | Activity State | Meaningful idle |
|---|---|---|---|---|
| Deal Registry-like stub (`timeline: []`) | **at_risk** | **6** | at_risk | 999 |
| Same stub + “Call completed…” today | **on_track** | **99** | active_today | 0 |

The empty-timeline case reproduces the production anomaly **exactly** (score **6**, 100% At Risk for that population).

To generate live per-deal breakdowns in an environment with Deal hydrate:

```bash
npx tsx --env-file=.env.local scripts/co-radar-001-health-audit.mts
```

---

## 4. Activity Investigation — which timestamp?

### Dual clocks (critical)

| Clock | Source | Used for |
|---|---|---|
| **A. Any last activity** | `timeline[0].timestamp` \|\| `createdAt` \|\| `loginDate` | `idleDays` in classification signals / UI last activity |
| **B. Last meaningful activity** | First timeline event matching `CHANAKYA_RADAR_MEANINGFUL_WORK_ACTIVITIES` patterns (excludes view/open) | Activity Intelligence state + momentum + `daysSinceMeaningfulActivity` |

**Not used as meaningful activity:** Last Updated Date alone, stage change unless timeline text matches patterns, task completion unless timeline text matches, conversation unless matching patterns, document upload unless matching patterns.

**Daily Work ✓** also accepts localStorage marks for today (`hasMeaningfulWorkToday`).

**Deal Registry projection risk:** `mapEnterpriseDealToLoanFileStub` initialises new stubs with **`timeline: []`**. With no meaningful events, clock B = **999 days**.

---

## 5–6. Recent code changes & regression

| Commit | Date | Relevance |
|---|---|---|
| **`95973c5`** | **2026-08-05 22:21 +0530** | **PRIMARY REGRESSION.** Introduces `enterprise-activity-intelligence`, **new** `classify-operational-deal.ts`, Average Deal Health = mean of blended scores, Activity state can force At Risk. Deployed per `docs/co-mc-001/` |
| `0eaa38f` | 2026-07-25 | Radar → Deal Registry SSOT; Deal→LoanFile stubs often lack timeline |
| Pre-`95973c5` | — | Used `classifyDealHealth` (idle from **any** timeline/createdAt). Idle ≥ 11 → **dormant → Follow-up**, not automatic At Risk. Centre health was **weighted vector** of quadrant anchors (typical mid-50s possible without all At Risk) |

**Sprint / module:** CO-MC-001 (Activity Intelligence) + CO-CHANAKYA-RADAR-003 Decision Engine packaging inside Enterprise Foundation v2.0 freeze commit.

**Was behaviour introduced recently?** **Yes — within ~1 day of the observed drop.**

---

## 7. Health distribution — why 100% At Risk?

**Mechanism:**

```text
timeline empty or no pattern match
  → daysSinceMeaningful = 999
  → Activity state = at_risk
  → classifyOperationalDeal → quadrant at_risk
  → base 18 + blend ≈ −12 → score 6
  → Average Deal Health ≈ 6
```

**Is this expected?**  
- **Expected by code:** Yes.  
- **Expected by business / healthy portfolio:** **No** — this is a **logic defect relative to PO intent**, driven by Activity Intelligence treating missing meaningful history as critical risk, compounded by Deal projections without timelines.

---

## 8. Radar diagnostics / score breakdown

For the reproduced empty-timeline deal:

| Layer | Value |
|---|---|
| Activity Momentum | **9 / 100** (recency 8 · frequency ~0 · significance 18 · adherence 15; capped by at_risk) |
| Stage Progress | signal only (`daysInStage` often **0** on Deal stubs) |
| Documents | signal only (empty docs → completeness treated as 1.0) |
| Timeline | meaningful idle **999**; any-timeline idle from createdAt |
| Risk | Activity state **at_risk** (primary gate) |
| Quadrant base | **18** |
| Blend | **−12** |
| **TOTAL Deal Health** | **6** |

---

## 9. Business rule validation

> “If meaningful activity is performed today, the deal should normally move back to ON TRACK unless an overriding business risk exists.”

| Aspect | Status |
|---|---|
| Active Today → On Track path exists | **Implemented** (simulation: call today → On Track / 99) |
| Overriding risks still force At Risk | **Implemented** (status at_risk, hold, ≥2 overdue, etc. evaluated before Active Today in Activity state) |
| Deal Registry empty timeline / non-matching notes | **Gap** — activity never becomes Active Today → rule **does not fire** |
| Idle from createdAt can still push Needs Attention even with other clocks | Partial interaction risk |

**Overall:** **Partially Implemented.**

---

## 10. Root Cause Analysis

### Primary cause

**CO-MC-001 Activity Intelligence** classifies deals with **no meaningful timeline hits** as Activity **`at_risk`**, and **`classifyOperationalDeal`** promotes that state to Radar **At Risk**, then blends health to **6**.

### Secondary cause

**Deal Registry → LoanFile stubs** frequently carry **`timeline: []`**, so meaningful-activity clock never advances even when Deals are commercially active.

### Contributing factors

1. Average Deal Health switched from weighted vector to **mean of blended per-deal scores**.  
2. Dual idle clocks (any timeline vs meaningful-only) diverge.  
3. Old classifier mapped long idle to **dormant / Follow-up**, not universal At Risk.  
4. Deployed **2026-08-05** (`95973c5` / CO-MC-001 readiness notes deployment).

### Business impact

- Mission Control / Radar falsely signals **portfolio collapse**.  
- Operators cannot triage (everything is At Risk).  
- Average Deal Health **~6** undermines executive trust in CHANAKYA metrics.

### Recommended fixes (DO NOT IMPLEMENT in this sprint)

1. **Do not treat missing meaningful history as At Risk** — distinguish “unknown / not yet instrumented” vs “critically neglected”.  
2. Ensure Deal projections carry **meaningful activity / stage-change events** into timeline (or a dedicated activity SSOT).  
3. Align idle clocks used for classification with the PO “meaningful activity” definition.  
4. Revisit whether Average Deal Health should remain unweighted mean of blended anchors.  
5. Re-BAT CO-MC-001 against Deal Registry reality before re-certifying.

---

## Evidence index

| Artefact | Path |
|---|---|
| This audit | `docs/co-radar-001/CO-RADAR-001-HEALTH-SCORE-FORENSIC-AUDIT.md` |
| Live hydrate attempt | `docs/co-radar-001/CO-RADAR-001-DEAL-DIAGNOSTICS.json` |
| Simulation proof (score = 6) | `docs/co-radar-001/CO-RADAR-001-SIMULATION-PROOF.json` |
| Formula SSOT | `src/constants/chanakya-radar.ts` · `src/constants/enterprise-activity-intelligence/` |
| Classification | `src/lib/chanakya-radar/classify-operational-deal.ts` |
| Activity engine | `src/lib/enterprise-activity-intelligence/index.ts` |
| Deal stub timeline empty | `src/lib/enterprise-deal/map-deal-to-loan-file.ts` |
| Regression commit | `95973c5` (2026-08-05) |

---

## Risk Assessment

| Risk | Severity |
|---|---|
| Continued false At Risk portfolio | **Critical** |
| Executive decisions on bad health number | **Critical** |
| Premature “fix” without PO-approved redesign | High (architecture risk) |
| Ignoring Deal timeline projection gap | High |

---

## Status

🟡 **Investigation complete — awaiting Product Owner review.**  
No production code modified for remediation. No deploy. No commit.
