# CO-AI-106 — Architecture Report

**Sprint:** AI-6 · Knowledge & Advisory Reasoning Engine  
**Code:** CO-AI-106  
**Framework:** `1.7.0-ai6` · Advisory `1.0.0-ai6`  
**Behaviour Constitution:** SARATHI Bible v1.0 · Enterprise AI Constitution · FDI Foundation (AI-5)  
**Status:** Implementation Complete — awaiting Product Owner approval  
**Date:** 2026-08-06  

Extends frozen Enterprise AI Platform — **not redesigned**.

---

## 1. Objective

Build the **advisory reasoning layer**.

This engine answers:

> **What advice should SARATHI provide?**

It **never** replaces enterprise calculations (eligibility, FOIR, DBR, pricing, approvals).

---

## 2. Architecture

```text
Customer question
        │
        ▼
 Domain Boundary (AI-4A)
        │
        ├── outside / denied → "I'm not trained for this subject."
        │
        └── approved financial domain
              │
              ▼
     Context Intelligence (CIE)
              │
              ▼
 Financial Decision Intelligence (FDI)   ← optional package link
              │
              ▼
┌──────────────────────────────────────────┐
│ Knowledge & Advisory Reasoning Engine    │
│  · Knowledge Reasoning                   │
│  · Loan Advisory                         │
│  · Product Explanation                   │
│  · Comparison                            │
│  · Benefit / Trade-off                   │
│  · Educational Responses                 │
│  · Customer Guidance Framework           │
│  · Loan Journey Guidance                 │
└──────────────────────────────────────────┘
              │
              ▼
 Tone Library + Micro Communication
              │
              ▼
 Short facing advice (never long paragraphs)
```

---

## 3. Modules

| Module | Path |
|---|---|
| Types | `src/types/enterprise-ai-advisory-reasoning.ts` |
| Constants | `src/constants/enterprise-ai-platform/advisory-reasoning.ts` |
| Orchestrator | `advisory-reasoning/orchestrator.ts` |
| Sub-engines | knowledge · loan · product · comparison · benefit-tradeoff · educational · customer-guidance · journey-guidance |
| Compose / Validation / Readiness | same folder |

**Entry:** `runEaiAdvisoryReasoning`

---

## 4. Hard rules enforced

| Rule | Enforcement |
|---|---|
| Approved financial domains only | Domain Boundary first; outside → fixed refusal |
| Exact outside refusal | `I'm not trained for this subject.` — identical string |
| No calculations / approvals | No FOIR/EMI/pricing math; validation forbids claim language |
| Engines decide | `defersToEnterpriseEngine` + FDI package linkage |
| Short responses | Tone Library + Micro Communication; max fragments / lines |
| SARATHI Bible | Tone + micro communication only for facing text |

---

## 5. Out of scope (honoured)

No Voice · No UI · No Workflow · No CRM · No Planner

---

## 6. Version lineage

| Sprint | Framework |
|---|---|
| AI-5 FDI | `1.6.0-ai5` |
| **AI-6 Advisory** | **`1.7.0-ai6`** |

---

## 7. Next gate

**Do not** deploy, commit, or start the next sprint until Product Owner approval.
