# CO-AI-112 — Architecture Report

**Sprint:** AI-12 · Wealth Partner Behaviour Pack  
**Code:** CO-AI-112  
**Framework:** `1.13.0-ai12` · Wealth Partner Behaviour `1.0.0-ai12` · Partner Tone `1.0.0-ai12`  
**Behaviour Constitution:** SARATHI Bible v1.0 · Enterprise AI Constitution  
**Status:** Implementation Complete — awaiting Product Owner approval  
**Date:** 2026-08-06  

Extends frozen Enterprise AI Platform — **does not build another AI**.

---

## 1. Objective

Implement a **Wealth Partner Behaviour Pack** that reuses the Enterprise AI Platform.

Capabilities (mapped to existing platform capability IDs):

- Customer Analysis  
- Product Guidance  
- Document Guidance  
- Conversation History  
- Opportunity Support  
- Partner Advisory  
- Business-focused communication  

**Hard tone rule:** Customer-facing tone must **never** be used. Partner tone remains professional and advisory.

---

## 2. Architecture

```text
Wealth Partner desk (/sarathi/wealth-partner)
        │
        ▼
 activateEaiWealthPartnerBehaviourPack
        │
        ▼
 Behaviour Pack: sarathi_wealth_partner (lifecycle=active)
        │
        ▼
 runEaiSarathiConversationTurn(personaPackId=sarathi_wealth_partner)
        │
        ├── Policy Gate + Domain Boundary (shared)
        ├── Advisory / Planner / Consultation / Lead Intelligence / Trust (shared)
        └── Response Composer
              ├── resolveEaiToneAudience → partner
              └── Partner Tone Library (never customer catalogue)
```

---

## 3. Modules

| Concern | Path |
|---|---|
| Types | `src/types/enterprise-ai-wealth-partner-behaviour.ts` |
| Constants / themes | `src/constants/enterprise-ai-platform/wealth-partner-behaviour.ts` |
| Partner Tone Library | `src/constants/enterprise-ai-platform/partner-tone-library.ts` |
| Activation / readiness | `src/lib/enterprise-ai-platform/wealth-partner-behaviour/` |
| Desk | `/sarathi/wealth-partner` |

**Entry:** `activateEaiWealthPartnerBehaviourPack` · conversation via existing `runEaiSarathiConversationTurn`

---

## 4. Capability theme mapping

| Business theme | Platform capabilities |
|---|---|
| Customer Analysis | `read_customer_context` · `generate_consultation` · `read_knowledge_base` |
| Product Guidance | `explain_products` · `compare_products` · `read_product_context` |
| Document Guidance | `request_documents` · `read_knowledge_base` |
| Conversation History | Platform session/continuity + `ask_questions` |
| Opportunity Support | `read_loan_context` · `generate_action_proposals` · `ask_questions` |
| Partner Advisory | `generate_consultation` · `generate_action_proposals` · `read_knowledge_base` |

Denied (unchanged constitution): `voice` · `workflow_execution` · `crm_mutation` · `create_opportunity`

---

## 5. Hard rules

| Rule | Enforcement |
|---|---|
| No second AI | Pack activation only — shared engines |
| No customer tone | Separate Partner Tone Library; composer audience gate; seed sanitisation |
| Partner tone | `formal` + `advisory_reserved` configuration |
| No CRM / workflow execution | Capability denials + proposal status gate |
| Continuity isolation | Separate localStorage key for partner desk |

---

## 6. Out of scope (honoured)

Voice · Streaming · CRM create/update · Workflow execution · Deployments (pending PO)

---

## 7. Version lineage

| Sprint | Framework |
|---|---|
| AI-11 Conversation Experience | `1.12.0-ai11` |
| **AI-12 Wealth Partner Behaviour Pack** | **`1.13.0-ai12`** |

---

## 8. Next gate

**Do not** deploy or commit until Product Owner approval.
