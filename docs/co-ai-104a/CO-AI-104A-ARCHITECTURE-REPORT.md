# CO-AI-104A — Architecture Report

**Sprint:** AI-4A · SARATHI Domain Boundary & Knowledge Governance Engine  
**Code:** CO-AI-104A  
**Framework:** `1.4.0-ai4a` · Domain Governance `1.0.0-ai4a` · Policy `1.2.0-domain-aware`  
**Status:** Implementation Complete — awaiting Product Owner approval  
**Date:** 2026-08-06  

Extends frozen AI-1 … AI-4 — **not redesigned**.

---

## 1. Objective

Transform SARATHI into a **Financial Domain Intelligence System**.

SARATHI must **never** behave as a general-purpose AI assistant. Domain membership is enforced by the **platform**, not by the LLM.

---

## 2. Architecture

```text
User utterance
      │
      ▼
┌────────────────────────────┐
│ Domain Boundary Engine     │  Zone 1 / 2 / 3 · Intent · Refusal
└─────────────┬──────────────┘
              │ mandatory
              ▼
┌────────────────────────────┐
│ Policy Gate                │  tools · scopes · capabilities · domain
└─────────────┬──────────────┘
              │
     ┌────────┴────────┐
     │ allow           │ deny (Zone 3 / unknown)
     ▼                 ▼
 Context / Tools    Safe Refusal → Response Composer
     │                 (no LLM call)
     ▼
 LLM Provider (explain only — prompts unchanged)
```

---

## 3. Knowledge Zones

| Zone | Role | Behaviour |
|---|---|---|
| **1 Core** | Home Loan, BT, Top-up, LAP, BL, WC, CF, PL, Credit, CIBIL, FOIR, DBR, EMI, docs, eligibility, lenders, RC products | Allow |
| **2 Adjacent** | Banking, property purchase, registration, stamp duty, HL insurance, mortgage process, RBI lending | Allow only if useful to borrowing |
| **3 Outside** | Politics, sports, entertainment, programming, recipes, travel, medical, general legal, personal chat, general ChatGPT | Polite refuse + redirect |

---

## 4. Intent classes

`knowledge` · `advisory` · `discovery` · `workflow` · `unsupported`

---

## 5. Modules

| Module | Path |
|---|---|
| Types | `src/types/enterprise-ai-domain-governance.ts` |
| Constants / topics | `src/constants/enterprise-ai-platform/domain-governance.ts` |
| Engine | `src/lib/enterprise-ai-platform/domain-governance/` |
| Policy Gate | `policy-gate.ts` (pre-LLM) |
| LLM short-circuit | `llm-provider.ts` (`finishReason: "blocked"`) |
| Composer refusal | `response-composer.ts` |

---

## 6. Explicit non-goals

No UI · No Voice · No Planner · No financial recommendations · No CRM / workflow execution · **No LLM prompt changes**

---

## 7. Next gate

**Do not** deploy, commit, push, or start AI-5 until Product Owner approval.
