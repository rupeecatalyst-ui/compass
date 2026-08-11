# CO-AI-106 — Knowledge Engine Report

**Sprint:** AI-6 · Knowledge & Advisory Reasoning Engine  
**Advisory version:** `1.0.0-ai6`  
**Date:** 2026-08-06  
**Status:** Implementation Complete — awaiting Product Owner approval  

---

## 1. Purpose

This report documents **how SARATHI forms advice** without inventing calculations.

Knowledge & Advisory Reasoning is the layer that selects **what to say**.  
Enterprise engines remain the layer that **decides numbers and approvals**.

---

## 2. Advice modes

| Mode | Business question | Defers to engines? |
|---|---|---|
| `knowledge` | What does this lending concept mean? | When FOIR/DBR/EMI definitions |
| `loan_advisory` | What loan advice fits this situation? | Yes for eligibility/EMI/BT |
| `product_explanation` | What is this product family? | No pricing invention |
| `comparison` | How do options differ? | Yes for commercial terms |
| `benefit_tradeoff` | What are qualitative trade-offs? | Yes for quantified impact |
| `educational` | Help me learn lending basics | Literacy only |
| `customer_guidance` | What should I do next? | Guidance only — no CRM |
| `journey_guidance` | Where am I in the loan journey? | Orientation only — no workflow |
| `outside_refused` | Outside approved domain | Fixed refusal |

---

## 3. Knowledge reasoning behaviour

- Triggers on explain / define / “what is” patterns and knowledge-domain context.
- Balance Transfer, FOIR, DBR, EMI, Home Loan have curated short lines.
- FOIR / DBR / EMI knowledge **always** states that engines own the calculation.
- Never invents product rates, eligibility outcomes, or sanction language.

---

## 4. Communication contract

1. **Domain Boundary** — outside domain → only `I'm not trained for this subject.`  
2. **Tone Library** — curated emotional framing; no invented tone.  
3. **Micro Communication** — short lines; truncate long sentence stacks.  
4. **Fragment budget** — max 3 fragments × 2 lines before shaping.  
5. **Validation** — rejects long paragraphs and forbidden approval/calculation claims.

---

## 5. Relationship to FDI (AI-5)

| Layer | Answers |
|---|---|
| FDI | How do we reason about a financial decision package? |
| Advisory | What short advice should SARATHI speak? |

Advisory **links** an FDI package (`fdiPackageId`) when in-domain.  
It does **not** recompute FDI recommendations or engine facts.

---

## 6. Explicit non-goals

- No Voice stack  
- No SARATHI UI  
- No CRM / workflow execution  
- No Planner / task authoring  
- No product ranking scores  
- No FOIR / DBR / EMI / pricing calculators  

---

## 7. Validation evidence

- Static: `npm run verify:co-ai-106`  
- Runtime: `npm run ai:advisory:validate`  

See Business Certification Report for run results after local validation.
