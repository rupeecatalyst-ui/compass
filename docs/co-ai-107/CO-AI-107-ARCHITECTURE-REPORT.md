# CO-AI-107 — Architecture Report

**Sprint:** AI-7 · Planner & Next Best Action Engine  
**Code:** CO-AI-107  
**Framework:** `1.8.0-ai7` · Planner `1.0.0-ai7`  
**Behaviour Constitution:** SARATHI Bible v1.0 · Enterprise AI Constitution · FDI · Knowledge/Advisory  
**Status:** Implementation Complete — awaiting Product Owner approval  
**Date:** 2026-08-06  

Extends frozen Enterprise AI Platform — **not redesigned**.

---

## 1. Objective

Implement **Planning**.

The Planner decides:

1. **What information is still required?**  
2. **What should happen next?**

It **does not** execute actions.

---

## 2. Architecture

```text
Utterance
    │
    ▼
 Domain Boundary
    │
    ├── outside → fixed refusal · no questions · no proposals
    │
    └── allowed
          │
          ▼
   Context Intelligence (+ Conversation Memory)
          │
          ▼
   FDI (optional package link)
          │
          ▼
┌─────────────────────────────────────────┐
│ Planner & Next Best Action Engine       │
│  · Missing Information Detection        │
│  · Question Selection (minimum only)    │
│  · Conversation Planner                 │
│  · Next Best Action                     │
│  · Recommendation Sequencing            │
│  · Follow-up Planning                   │
│  · Action Proposal Generator (drafts)   │
│  · Validation                           │
└─────────────────────────────────────────┘
          │
          ▼
 Plan package → draft Action Proposals only (SB-06)
```

---

## 3. Modules

| Module | Path |
|---|---|
| Types | `src/types/enterprise-ai-planner.ts` |
| Constants | `src/constants/enterprise-ai-platform/planner.ts` |
| Orchestrator | `planner/orchestrator.ts` |
| Sub-engines | missing-information · question-selection · conversation-planner · next-best-action · action-proposal-generator · recommendation-sequencing · follow-up-planning · validation · readiness |

**Entry:** `runEaiPlanner`

---

## 4. Hard rules enforced

| Rule | Enforcement |
|---|---|
| Never ask unnecessary / known questions | Skip when memory/context matches; max 2 questions |
| Use Conversation Memory | `normaliseEaiConversationMemory` + open-question dedupe |
| Action Proposals only | `createEaiActionProposal` drafts; execution blocked |
| Never Create Lead / Opportunity / Workflow / Email / CRM | Allowed proposal kinds exclude lead/opportunity; no send/execute APIs |
| Outside domain | Fixed SARATHI refusal; no plan leak |
| Engines decide | NBA may `defer_to_engine`; no FOIR/EMI math |

---

## 5. Out of scope (honoured)

No Voice · No UI · No Streaming · No CRM mutations · No Workflow execution

---

## 6. Version lineage

| Sprint | Framework |
|---|---|
| AI-6 Advisory | `1.7.0-ai6` |
| **AI-7 Planner** | **`1.8.0-ai7`** |

---

## 7. Next gate

**Do not** deploy, commit, or start the next sprint until Product Owner approval.
