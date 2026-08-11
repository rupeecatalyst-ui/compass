# CO-AI-107 — Planner Report

**Sprint:** AI-7 · Planner & Next Best Action Engine  
**Planner version:** `1.0.0-ai7`  
**Date:** 2026-08-06  
**Status:** Implementation Complete — awaiting Product Owner approval  

---

## 1. Purpose

This report documents **how SARATHI plans the next conversational and operational move** without executing CRM or workflows.

| Question | Owner |
|---|---|
| What advice should SARATHI provide? | Advisory Reasoning (AI-6) |
| How do we reason about a financial decision? | FDI (AI-5) |
| **What information is still required?** | **Planner (AI-7)** |
| **What should happen next?** | **Planner (AI-7)** |

---

## 2. Planning pipeline

1. **Domain Boundary** — refuse outside domain immediately.  
2. **Missing Information Detection** — curated lending slots only.  
3. **Question Selection** — minimum required; skip known; suppress duplicates.  
4. **Conversation Planner** — project updated memory (open questions, summary).  
5. **Next Best Action** — ask / propose / defer / continue.  
6. **Recommendation Sequencing** — deterministic order (not product ranking).  
7. **Follow-up Planning** — deferred clarifying moves.  
8. **Action Proposal Generator** — optional draft proposals.  
9. **Validation** — consistency, ordering, duplicates, quality, no execution claims.

---

## 3. Information slots (minimum)

| Slot | Typical question |
|---|---|
| `product_interest` | Which loan product interests you? |
| `required_amount` | What amount are you looking for? |
| `employment_or_income` | Are you salaried or self-employed? |
| `city_or_location` | Which city is this for? |
| `existing_emi` | What is your current EMI? |
| `outstanding_loan` | What is the outstanding loan amount? |
| `document_readiness` | Do you have KYC documents ready? |
| `callback_preference` | When should we call you back? |

Only **relevant** and **unknown** slots become questions (max **2** per turn).

---

## 4. Action proposal policy

Planner may draft only:

- `request_documents`  
- `schedule_callback`  
- `create_task`  
- `create_reminder`  
- `generic`  

**Never auto-emits** `create_lead` / `create_opportunity` on this path.  
**Never** sends email, executes workflow, or mutates CRM.  
`executed_reserved` remains blocked by Action Proposal Framework (AI-1).

---

## 5. Validation coverage

| Check | Code |
|---|---|
| Outside refusal integrity | `invalid_outside_refusal` / `outside_plan_leak` |
| Question budget | `too_many_questions` |
| Ordering 1..n | `question_ordering` |
| Duplicate questions | `duplicate_questions` |
| Re-ask known | `reasked_known` |
| Empty NBA | `empty_nba` |
| Execution claim language | `execution_claim` |
| Forbidden proposal kinds | `forbidden_proposal_kind` |

---

## 6. Explicit non-goals

- Voice · UI · Streaming  
- CRM / workflow execution  
- Product ranking scores  
- FOIR / DBR / EMI / pricing calculators  

---

## 7. Validation evidence

- Static: `npm run verify:co-ai-107`  
- Runtime: `npm run ai:planner:validate`  

See Business Certification Report for run results.
