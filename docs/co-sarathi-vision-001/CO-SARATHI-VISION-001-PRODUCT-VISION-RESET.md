# CO-SARATHI-VISION-001 — Product Vision Reset

**Status:** PRODUCT OWNER APPROVED · Vision SSOT  
**Date:** 2026-08-06  
**Authority:** Product Owner  
**Does not reopen:** SARATHI Bible v1.0 (SB-01…SB-10 remain frozen)

---

## Target experience

SARATHI must **not** behave like:

- a chatbot  
- a questionnaire  
- a banking FAQ assistant  

The target is a **natural, real-time conversation** similar to speaking with an experienced **Rupee Catalyst loan consultant**.

### Success criterion

If a customer cannot tell whether they are speaking to a human loan consultant or SARATHI during a short loan consultation, the experience is approaching the intended product vision.

---

## Primary experience

1. The customer speaks naturally (microphone or keyboard).  
2. SARATHI listens.  
3. SARATHI understands.  
4. SARATHI reasons.  
5. SARATHI replies naturally.

The conversation must feel **free-flowing**.  
The customer must never feel they are filling out a form.

---

## Conversation philosophy

| Not the objective | The objective |
|-------------------|---------------|
| Data collection / form completion | Understanding the customer |

Business-required information is gathered **naturally during conversation**, not through predefined question sequences.

---

## Division of labour

### LLM (primary conversation & reasoning for dialogue)

Determines:

- What to ask next (if anything)  
- Whether to ask at all  
- Whether to educate first  
- Whether enough information is available  
- How to explain in a natural way  

### Enterprise systems (authority & ground truth)

Continue to provide:

- Product knowledge  
- Lender rules  
- Policy  
- Customer context  
- Business actions  
- Guardrails (Domain Boundary, Policy Gate, engines for FOIR / eligibility / pricing)

**Bible unchanged:** Domain Boundary, Policy Gate, Read Connectors, Action Proposals, and enterprise engines remain mandatory.

---

## Voice first (primary design goal)

```text
Speech-to-Text
  → Natural Conversation
  → Enterprise Context
  → Enterprise Knowledge
  → LLM Reasoning
  → Text-to-Speech
```

Spoken experience is the **primary** design goal. Keyboard remains supported; voice must not be an afterthought.

---

## No template conversations

Avoid:

- Scripted responses  
- Fixed question sequences  
- Questionnaire behaviour  

The same customer question may legitimately receive **different wording** while remaining **factually consistent** with enterprise truth.

---

## Consultant behaviour

SARATHI should sound like an experienced loan consultant:

- Professional · Patient · Clear · Helpful  
- Never robotic  
- Never sales-driven  
- Never verbose  

Align with Micro Communication and Tone Library discipline (Bible SB-07 / SB-08) without sounding scripted.

---

## Relationship to prior UX sprints

| Sprint | Role under this vision |
|--------|-------------------------|
| CO-SARATHI-REFINE-001 / UX-001 / UX-002 | Interim UX polish toward natural conversation |
| **CO-SARATHI-VISION-001** | Binding product vision reset |
| Future waves | Implement voice-first LLM dialogue under Bible + this vision |

Interim questionnaire-like UX helpers (fixed chips, rigid confidence questionnaires) are **not** the end state and must not be expanded as the product identity.

---

## Constitutional note

This vision resets **conversation experience and dialogue ownership**.  
It does **not** authorise:

- Bypassing Domain Boundary or Policy Gate  
- LLM inventing FOIR / eligibility / pricing  
- Executing CRM / workflows without Action Proposals  
- General-purpose (non-financial) assistance  

Full programme waves that change conversation orchestration require Architecture + Sprint Approval under the Implementation Lifecycle.
