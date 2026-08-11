# CO-AI-105 — Architecture Report

**Sprint:** AI-5 · Financial Decision Intelligence Foundation  
**Code:** CO-AI-105  
**Framework:** `1.6.0-ai5` · FDI `1.0.0-ai5`  
**Behaviour Constitution:** SARATHI Bible v1.0 (SB-10 Engines Decide)  
**Status:** Implementation Complete — awaiting Product Owner approval  
**Date:** 2026-08-06  

Extends frozen Enterprise AI Platform — **not redesigned**.

---

## 1. Objective

Build the **Financial Decision Intelligence (FDI) Foundation**.

FDI **reasons, explains, and recommends**.  
Enterprise engines **calculate**.  

FDI is **not** an eligibility engine, credit approval engine, pricing engine, or lender policy engine.

---

## 2. Architecture

```text
Question
   │
   ▼
Domain Boundary + Policy Gate
   │
   ├── blocked → fixed outside refusal
   │
   └── allowed
         │
         ▼
 Context Intelligence (Read Connectors)
         │
         ▼
┌─────────────────────────────────────┐
│ Financial Decision Intelligence     │
│  · Recommendation Framework         │
│  · Explainability Engine            │
│  · Confidence Model (evidence only) │
│  · Alternative Options (not ranking)│
│  · Scenario Framework (templates)   │
│  · Recommendation Validation        │
└─────────────────────────────────────┘
         │
         ▼
 FDI Decision Package → Composer / LLM explains
```

---

## 3. Modules

| Module | Path |
|---|---|
| Types | `src/types/enterprise-ai-financial-decision.ts` |
| Constants | `src/constants/enterprise-ai-platform/financial-decision-intelligence.ts` |
| Engine | `financial-decision-intelligence/decision-engine.ts` |
| Recommend / Explain / Confidence / Alternatives / Scenarios / Validation | same folder |

Entry: `runEaiFinancialDecisionIntelligence`

---

## 4. Hard rules enforced

| Rule | Enforcement |
|---|---|
| No FOIR/DBR/EMI/pricing calculation | No calculator imports; validation rejects claim language |
| No credit approval | Disclaimers + forbidden claim checks |
| Engines calculate | Engine facts must carry `provenance: "enterprise_engine"` |
| No product ranking | Alternatives validation rejects rank/score language |
| Outside domain | Fixed SARATHI refusal |

---

## 5. Out of scope (honoured)

No UI · Voice · CRM · Workflow · Product Ranking

---

## 6. Next gate

**Do not** deploy, commit, or start the next sprint until Product Owner approval.
