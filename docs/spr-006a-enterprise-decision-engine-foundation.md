# Catalyst One — SPR-006A Enterprise Decision Engine (EDE) Foundation

**Sprint:** SPR-006A (refined)  
**Version:** 13.0.0  
**Status:** Implemented (advisory foundation)  
**Date:** July 2026

---

## 1. Enterprise Decision Engine architecture

```
Observe (collectEdeDecisionContext)
   ↓
Analyse (ECG-ready profiles — no product/lender/workflow rules in engine)
   ↓
Recommend + Explain (supporting factors + next steps + advisory level)
   ↓
Record (history with user action / override / outcome)
   ↓
Present (CHANAKYA) + Dialogue (Enterprise Decision Engine badge)
```

**Empowerment principle:** Levels 1–4 never block. Only Level 5 `compliance_block` may prevent progression (`mayBlockProgression`). SPR-006A heuristics never auto-raise Level 5 unless `extras.complianceBlock === true` (ECG future).

**Hard rule:** `executable: false` always. EDE is never a workflow engine.

| Layer | Role |
|-------|------|
| EDE | Thinks (advise) |
| CHANAKYA | Communicates (professional business language, never commands) |
| ECG | Future home of evaluation profiles |
| Users / EWOE / engines | Execute |

---

## 2. Decision Request model

| Field | Description |
|-------|-------------|
| `decisionId` | Stable ID across request → response → history |
| `opportunityId` | Opportunity reference |
| `decisionCategory` | Assessment category |
| `context` | Structured collected context |
| `triggerSource` | console / workspace / manual / system / chanakya / api |
| `requestedBy` | Actor |
| `timestamp` | ISO time |

**Categories:** opportunity_assessment, lender_recommendation, document_readiness, task_assessment, workflow_assessment, risk_observation, customer_readiness.

---

## 3. Decision Response model

| Field | Description |
|-------|-------------|
| `recommendation` | Advisory guidance |
| `recommendationCategory` | informational / operational / attention / escalation / compliance |
| `confidence` | 0–100% |
| `explanation` | Why + what was considered + what to do next |
| `supportingFactors[]` | Labelled context factors |
| `suggestedNextSteps[]` | User-owned next actions |
| `advisoryLevel` / `advisoryLevelNumber` | L1–L5 |
| `mayBlockProgression` | true only for Compliance Block |
| `executable` | always `false` |

---

## 4. Decision Console screenshots

```bash
npm run dev
```

Open http://localhost:3000/decisions (`admin@compass.dev` / `Compass@123`)

Capture: Recommendation, Confidence, Explanation, Supporting Factors, Suggested Next Steps, CHANAKYA panel, History with user action.

```bash
npx tsx scripts/spr006a-validate.ts
```

---

## 5. Architecture assumptions

1. Framework default profiles are **placeholders**, not product/lender/workflow business rules.
2. Context is supplied by callers; EDE only structures it.
3. Risk Observation / Customer Readiness are **observational advisories** — not scoring models (out of scope).
4. Compliance Block is architecture-ready; not auto-fired by heuristics in SPR-006A.
5. In-memory ports for pilot; Prisma remains auth-only.
6. Early aliases (`evaluate_opportunity`, etc.) still normalize to categories.

---

## 6. Recommendations before SPR-006B

1. Publish real EDE profiles via ECG; remove framework-default copy.
2. Wire Opportunity Workspace live context into `evaluateEdeDecision`.
3. UI gate for Compliance Block only (still user-confirmable).
4. Persist decisions + user actions.
5. Keep Predictive Models / Risk Scoring / Loan Approve-Reject in later sprints.

---

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| EDE operational | ✓ |
| Request / Context / Response | ✓ |
| Explainability (why / considered / next) | ✓ |
| Advisory levels L1–L5 | ✓ |
| History + user action / override / outcome | ✓ |
| Dialogue + CHANAKYA | ✓ |
| ECG-ready | ✓ |

---

**END OF SPRINT SPR-006A**
