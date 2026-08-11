# CO-AI-104 — Tool Bus Integration Report

**Sprint:** AI-4 · Tool Bus Read Integration  
**Status:** Implementation Complete — awaiting PO certification  

---

## Registered READ tools

| Tool | Category | Connector |
|---|---|---|
| `eai.read.customer` | registry.customer | customer_registry |
| `eai.read.loan` | registry.loan | loan_registry |
| `eai.read.partner` | registry.partner | partner_registry |
| `eai.read.product` | registry.product | product_registry |
| `eai.read.workflow` | workflow.stages | workflow_registry |
| `eai.read.document` | registry.document | document_registry |
| `eai.read.knowledge` | knowledge.faqs | knowledge_registry |
| `eai.read.policy` | knowledge.policies | policy_registry |
| `eai.read.financial` | financial.eligibility | financial_registry |
| `eai.read.conversation_summary` | knowledge.faqs | conversation memory |

All tools: `sideEffectClass: "read"`. **Zero** mutate tools.

---

## Integration path

```text
Policy Gate (+ Domain Boundary)
        ↓
Tool Bus handler
        ↓
Enterprise Read Connector
        ↓
Business-safe Projection + Audit (purpose=tool_bus_read:*)
```

Outside-domain `requestHint` → tool returns `domain_boundary_blocked` without SSOT fetch (SB-03 / SB-04).

---

## Discovery

`discoverEaiReadTools` — Behaviour Pack categories ∩ Policy Gate allow-list.

---

## Explicit non-goals

No CRM / Opportunity / Deal write tools · No workflow stage transition tools · No product recommendation engines
