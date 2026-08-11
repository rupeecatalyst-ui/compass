# CO-AI-110 — Architecture Report

**Sprint:** AI-10 · Explainability & Trust Engine  
**Code:** CO-AI-110  
**Framework:** `1.11.0-ai10` · Explainability `1.0.0-ai10`  
**Behaviour Constitution:** SARATHI Bible v1.0 · Enterprise AI Constitution  
**Status:** Implementation Complete — awaiting Product Owner approval  
**Date:** 2026-08-06  

Extends frozen Enterprise AI Platform — **not redesigned**.

---

## 1. Objective

Every recommendation must be **explainable**.

Never fabricate reasons.  
Never hide uncertainty.  
Clearly distinguish **Facts · Assumptions · Recommendations**.

---

## 2. Architecture

```text
Lead Intelligence (+ Consultation / FDI / Planner / Advisory inputs)
                    │
                    ▼
            Domain Boundary
                    │
                    ├── outside → fixed refusal + RC_OUTSIDE_DOMAIN
                    │
                    └── allowed
                          │
                          ▼
┌─────────────────────────────────────────────┐
│ Explainability & Trust Engine               │
│  · Reason Codes (curated catalogue only)    │
│  · Supporting Facts                         │
│  · Assumptions (explicit)                   │
│  · Missing Information                      │
│  · Confidence Explanation (+ uncertainty)   │
│  · Alternative Recommendation Explanation   │
│  · Decision Trace                           │
│  · Recommendation Explanation               │
└─────────────────────────────────────────────┘
                          │
                          ▼
                   Trust Package
```

---

## 3. Modules

| Concern | Path |
|---|---|
| Types | `src/types/enterprise-ai-explainability.ts` |
| Constants | `src/constants/enterprise-ai-platform/explainability.ts` |
| Engine | `src/lib/enterprise-ai-platform/explainability-trust/` |

**Entry:** `runEaiExplainabilityTrust`

---

## 4. Hard rules

| Rule | Enforcement |
|---|---|
| Never fabricate reasons | Only `EAI_TRUST_REASON_CATALOGUE` codes; grounded rationales |
| Never hide uncertainty | `uncertaintyLines` required in confidence explanation |
| Facts ≠ Assumptions ≠ Recommendations | `statementClass` on every epistemic item + validation |
| SARATHI Bible | Outside domain fixed refusal; engines decide (RC_ENGINE_DECISION_REQUIRED) |

---

## 5. Out of scope (honoured)

No UI · Voice · CRM execution · Workflow execution · Deployments (pending PO)

---

## 6. Version lineage

| Sprint | Framework |
|---|---|
| AI-9 Lead Intelligence | `1.10.0-ai9` |
| **AI-10 Explainability** | **`1.11.0-ai10`** |

---

## 7. Next gate

**Do not** deploy or commit until Product Owner approval.
