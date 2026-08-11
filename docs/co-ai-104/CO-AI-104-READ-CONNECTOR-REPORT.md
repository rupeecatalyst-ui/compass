# CO-AI-104 — Read Connector Report

**Sprint:** AI-4  
**Read Connectors version:** `1.1.0-ai4`  
**SARATHI Bible:** v1.0 (SB-04 / SB-05)

---

## Registered connectors (9)

| Connector | Domain | SSOT surface |
|---|---|---|
| `customer_registry` | customer | ECM contact (masked mobile) |
| `loan_registry` | loan | Opportunity API projection |
| `partner_registry` | partner | Wealth Partner API |
| `product_registry` | product | Product Library store |
| `workflow_registry` | workflow | Chanakya Loan Journey |
| `document_registry` | document | Document Requests readiness |
| `knowledge_registry` | knowledge | Chanakya Guide |
| `financial_registry` | financial | Financial profile visibility (not FOIR calc) |
| `policy_registry` | policy | EPDE policy list / by code |

All: `readOnly: true`. No Prisma. No raw entities.

---

## Projection models

Customer · Loan · Partner · Product · Workflow · Document · Financial · Policy · Knowledge  

Hard-strip pan / aadhaar / password / secret / token keys. CAD-2026-001: uncaptured → empty / Not Specified.

---

## Context Provider integration

`wireEaiContextProvidersToReadConnectors()` binds every non-conversation domain to its connector.

Domain Boundary blocks knowledge retrieval for outside/unknown utterances before connector.read.

---

## Dynamic context resolution

| Hint | Domains |
|---|---|
| What is Balance Transfer? | knowledge (+ conversation) |
| Can I reduce my EMI? | knowledge · loan · financial · conversation · customer |
| I need ₹20 lakh. | knowledge · financial · product · conversation · customer |

---

## Audit

Every read records: Behaviour Pack · Provider/Tool · Projection · Timestamp · **Purpose** (internal only).
