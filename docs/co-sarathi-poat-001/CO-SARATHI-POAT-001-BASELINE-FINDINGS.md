# CO-SARATHI-POAT-001 — Baseline Findings (pre-Dialogue Architecture)

**Nature:** Observation only — **no implementation change** in this sprint.  
**Source:** Local conversation-turn samples captured while preparing the Test Pack (`_live-samples.json`).  
**Purpose:** Help Product Owner know what may already Fail / Partial before manual desk testing.

---

## Domain Boundary — aligned

| Utterance | Result |
|-----------|--------|
| Who will win the cricket match tomorrow? | `I'm not trained for this subject.` ✅ |
| What do you think about the election? | `I'm not trained for this subject.` ✅ |

Expect the same for movies / cooking on the live desk.

---

## Lending paths — sample observations

### LAP (business expansion path) — generally on-track

| Turn | Customer | Facing (sample) | Conf / milestones |
|------|----------|-----------------|-------------------|
| 1 | I need a Loan Against Property | Soft clarifier on product interest | 20 · product |
| 2 | Business expansion | Asks amount | 40 · product, purpose |
| 3 | Residential property | Reflective (“Take your time…”) | 55 · + property_or_context |
| 4 | About 50 lakh | Continues conversation | 90 · ready **true** · proposals 0 on that turn |

**POAT note:** Confidence can reach ready without dumping a form summary — good for WAVE-1. Proposals may appear on a **later** turn after soft unlock (emit).

### Balance Transfer — with emit on last turn

| Turn | Notes |
|------|-------|
| Progression | product → lender/context → funding → borrower |
| Last turn (emit) | Facing recommends next steps; proposals included document / opportunity / lead **drafts** |

**POAT note:** Proposal titles may still sound internal (“Propose create lead”) — mark **Partial** if wording feels non-consultant; facts/domain still OK.

### First-home natural language — **critical gap for A1 / E7**

Sample utterance: `I want to buy my first home` (no explicit “home loan” words)

| Result | `I'm not trained for this subject.` · blocked |

**POAT implication:** Scenarios **A1** and **E7** may **Fail** on current build if Domain Boundary is too strict on natural phrasing. Record Fail and hold Dialogue Architecture until conversation quality addresses this (Dialogue Architecture wave is the intended fix path per programme order — do not patch during POAT).

---

## How to use during POAT

1. Run the official scripts in the Test Pack on production.  
2. If a Fail matches a baseline finding above, mark Fail and reference this doc.  
3. Do not treat baseline samples as a substitute for full manual scoring.

---

## Artefacts

- Live JSON samples: `_live-samples.json`  
- Sampler script (read-only tooling): `scripts/co-sarathi-poat-001-sample.mts`
