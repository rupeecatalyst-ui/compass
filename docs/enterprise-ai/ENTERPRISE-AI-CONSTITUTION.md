# Enterprise AI Constitution

**Status:** FROZEN · Governing standard for all remaining AI sprints  
**Authority:** Product Owner / Product Architecture  
**Companion:** SARATHI Bible v1.0 (`docs/sarathi/SARATHI-BIBLE-V1.md`)  
**Freeze notice:** `docs/enterprise-ai/ENTERPRISE-AI-GOVERNING-STANDARDS-FREEZE.md`  
**Platform rule:** `.cursor/rules/enterprise-ai-platform.mdc`

This document is the **Enterprise AI Constitution**.  
It may not be modified, overridden, weakened, or bypassed by any AI sprint unless the Product Owner explicitly instructs otherwise.

---

## 1. Identity

Catalyst One’s Enterprise AI Platform is a **persona-agnostic** intelligence foundation.

Behaviour Packs (SARATHI Customer, SARATHI Wealth Partner, future CHANAKYA conversational) plug into the platform.  
They do **not** become separate AI systems.

---

## 2. Constitutional principles (frozen)

1. **Persona-agnostic platform with Behaviour Packs.**  
2. **Enterprise engines decide; LLM / FDI / Advisory explain.**  
3. **Policy Gate + Domain Boundary** govern conversational requests.  
4. **SARATHI Bible** — financial domain only; outside → `I'm not trained for this subject.`  
5. **Enterprise Read Connectors** are the only approved AI entry into enterprise data — **READ ONLY**.  
6. **Financial Decision Intelligence** recommends and explains — never calculates FOIR / DBR / eligibility / pricing / approvals.  
7. **Advisory Reasoning** answers “What advice should SARATHI provide?” — never replaces enterprise calculations.  
8. **Planner** answers “What information is still required?” and “What should happen next?” — never executes.  
9. **Consultation Intelligence** transforms conversations into Consultation Objects — never CRM / workflow.  
10. **Lead Intelligence** converts consultations into ranked Action Proposal recommendations — never creates CRM records.  
11. **Explainability & Trust** makes every recommendation explainable — never fabricates reasons; never hides uncertainty.  
12. **Conversation Experience** operates only through the Enterprise AI Platform (text-only until PO expands scope).  
13. **Wealth Partner Behaviour Pack** reuses the platform — never a second AI; partner tone is professional / advisory; customer-facing tone is forbidden for partners.  
14. **Action Proposals** are the only path toward CRM / workflow side effects.  
15. **Tone Library + Partner Tone Library + Micro Communication** shape facing text via Response Composer only.

---

## 3. Hard prohibitions

- No parallel AI stack, parallel task engine, or parallel CRM/workflow executor.  
- No Prisma / raw registry access from AI modules.  
- No inventing business values (CAD-2026-001).  
- No voice / streaming / CRM execution unless Product Owner explicitly expands scope.  
- No weakening of Domain Boundary, Policy Gate, or Action Proposal gates for sprint convenience.

---

## 4. Compliance

Every remaining AI sprint must:

1. Reuse the Enterprise AI Platform.  
2. Remain compliant with this Constitution **and** SARATHI Bible v1.0.  
3. Cite both governing documents in Architecture and Business Certification reports.  
4. Treat conflicts as Constitutional Health Check **RED** until Product Owner resolution.

---

## 5. Related SSOT

| Concern | Path |
|---|---|
| Platform rule | `.cursor/rules/enterprise-ai-platform.mdc` |
| Governing freeze rule | `.cursor/rules/enterprise-ai-governing-standards.mdc` |
| SARATHI Bible (doc) | `docs/sarathi/SARATHI-BIBLE-V1.md` |
| SARATHI Bible (code) | `src/constants/enterprise-ai-platform/sarathi-bible.ts` |
| Platform lib | `src/lib/enterprise-ai-platform/` |
