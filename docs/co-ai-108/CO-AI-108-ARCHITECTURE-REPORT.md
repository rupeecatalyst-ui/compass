# CO-AI-108 — Architecture Report

**Sprint:** AI-8 · Consultation Intelligence Engine  
**Code:** CO-AI-108  
**Framework:** `1.9.0-ai8` · Consultation `1.0.0-ai8`  
**Behaviour Constitution:** SARATHI Bible v1.0 · Enterprise AI Constitution · Micro Communication · Action Proposal architecture  
**Status:** Implementation Complete — awaiting Product Owner approval  
**Date:** 2026-08-06  

Extends frozen Enterprise AI Platform — **not redesigned**.

---

## 1. Objective

Transform conversations into **structured financial consultations**.

SARATHI must behave like an experienced financial consultant — by producing a **Consultation Object**, not by creating CRM records or executing workflows.

---

## 2. Architecture

```text
Utterance + Conversation Memory
            │
            ▼
     Domain Boundary
            │
            ├── outside → refusal · lifecycle = outside_refused
            │
            └── allowed
                  │
                  ▼
         Context Intelligence
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ Consultation Intelligence Engine            │
│  · Lifecycle + State Machine                │
│  · Key Facts Extraction                     │
│  · Customer Objectives                      │
│  · Financial Concerns                       │
│  · Missing Information (Planner SSOT)       │
│  · Consultation Summary (Micro Comm)        │
│  · Consultation Confidence                  │
│  · Consultation Completion Score            │
│  · Validation                               │
└─────────────────────────────────────────────┘
                  │
                  ▼
     Structured Consultation Object only
     (crmRecordsCreated=false · workflowsExecuted=false)
```

---

## 3. Modules

| Concern | Path |
|---|---|
| Types | `src/types/enterprise-ai-consultation.ts` |
| Constants | `src/constants/enterprise-ai-platform/consultation-intelligence.ts` |
| Engine | `src/lib/enterprise-ai-platform/consultation-intelligence/` |

**Entry:** `runEaiConsultationIntelligence`

---

## 4. Lifecycle states

`initiated` → `gathering` → `clarifying` → `advising` → `summarizing` → `completed`  
Also: `paused` · `outside_refused`

Transitions are deterministic (`EAI_CONSULTATION_TRANSITIONS`).

---

## 5. Hard rules

| Rule | Enforcement |
|---|---|
| Never create CRM records | `crmRecordsCreated: false` always; no proposal/create APIs |
| Never execute workflows | `workflowsExecuted: false`; no workflow APIs |
| Consultation Objects only | Sole output type `EaiConsultationObject` |
| Outside domain | Fixed SARATHI refusal |
| Micro Communication | Summary shaped via `applyEaiMicroCommunication` |
| Action Proposal architecture | Disclaimers + SB-06; side effects deferred to proposals elsewhere |
| Missing info SSOT | Reuses Planner `detectEaiMissingInformation` |

---

## 6. Out of scope (honoured)

No UI · Voice · CRM · Workflow execution · Deployments

---

## 7. Version lineage

| Sprint | Framework |
|---|---|
| AI-7 Planner | `1.8.0-ai7` |
| **AI-8 Consultation** | **`1.9.0-ai8`** |

---

## 8. Next gate

**Do not** deploy, commit, or start the next sprint until Product Owner approval.
