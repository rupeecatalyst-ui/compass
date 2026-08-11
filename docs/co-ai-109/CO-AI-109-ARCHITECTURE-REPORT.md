# CO-AI-109 — Architecture Report

**Sprint:** AI-9 · Lead Intelligence & Action Proposal Engine  
**Code:** CO-AI-109  
**Framework:** `1.10.0-ai9` · Lead Intelligence `1.0.0-ai9`  
**Behaviour Constitution:** SARATHI Bible v1.0 · Enterprise AI Constitution · Action Proposal architecture  
**Status:** Implementation Complete — awaiting Product Owner approval  
**Date:** 2026-08-06  

Extends frozen Enterprise AI Platform — **not redesigned**.

---

## 1. Objective

Convert **completed consultations** into **enterprise recommendations**.

Generate **Action Proposals only**.  
Never create leads, create opportunities, modify CRM, or trigger workflows.

---

## 2. Architecture

```text
Consultation Object (AI-8)
        │
        ▼
 Domain Boundary
        │
        ├── outside → fixed refusal · no proposals
        │
        └── allowed
              │
              ▼
┌──────────────────────────────────────────┐
│ Lead Intelligence & Action Proposal      │
│  · Lead Readiness                        │
│  · Opportunity Readiness                 │
│  · Document Readiness                    │
│  · Customer Readiness                    │
│  · Partner Recommendation                │
│  · Next Best Action                      │
│  · Priority Scoring                      │
│  · Confidence Scoring                    │
│  · Action Proposal Ranking               │
│  · Draft Proposal Emitter (optional)     │
└──────────────────────────────────────────┘
              │
              ▼
 Ranked recommendations + draft Action Proposals
 (status=draft · requiresHumanApproval · execution forbidden)
```

---

## 3. Modules

| Concern | Path |
|---|---|
| Types | `src/types/enterprise-ai-lead-intelligence.ts` |
| Constants | `src/constants/enterprise-ai-platform/lead-intelligence.ts` |
| Engine | `src/lib/enterprise-ai-platform/lead-intelligence/` |

**Entry:** `runEaiLeadIntelligence`

---

## 4. Hard rules

| Rule | Enforcement |
|---|---|
| Proposals only | `createEaiActionProposal` drafts; payload `execution: "forbidden"` |
| Never Create Lead / Opportunity | `leadsCreated` / `opportunitiesCreated` always `false` |
| Never Modify CRM / Trigger Workflow | Explicit flags + no mutate APIs |
| Ranking ≠ product ranking | Priority of **proposals**, not lender/product scores |
| Readiness ≠ credit approval | Completeness of consultation evidence only |
| Outside domain | Fixed SARATHI refusal; no proposals |

---

## 5. Proposal kinds (draft recommendations)

`create_lead` · `create_opportunity` · `request_documents` · `assign_wealth_partner` · `schedule_callback` · `create_task` · `create_reminder` · `generic`

All require human approval. `executed_reserved` remains blocked by AI-1 Action Proposal Framework.

---

## 6. Out of scope (honoured)

No UI · Voice · CRM execution · Workflow execution · Deployments

---

## 7. Version lineage

| Sprint | Framework |
|---|---|
| AI-8 Consultation | `1.9.0-ai8` |
| **AI-9 Lead Intelligence** | **`1.10.0-ai9`** |

---

## 8. Next gate

**Do not** deploy, commit, or start the next sprint until Product Owner approval.
