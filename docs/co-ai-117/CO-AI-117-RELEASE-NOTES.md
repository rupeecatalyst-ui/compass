# CO-AI-117 — Release Notes

**Sprint:** AI-17 · Enterprise AI Production Readiness · Final Certification  
**Code:** CO-AI-117  
**Framework certified:** `1.17.0-ai16`  
**Date:** 2026-08-06  

---

## What this release is

AI-17 is a **certification release**, not a feature release.

- No new Enterprise AI features  
- No architecture changes  
- No redesign  

It packages evidence that the Enterprise AI Platform through AI-16 is ready for Product Owner Go-Live review.

---

## Platform included in certification baseline

| Sprint | Capability |
|---|---|
| AI-1 … AI-10 | Constitution · Policy · Capability · Context · Connectors · FDI · Knowledge · Planner · Consultation · Actions |
| AI-11 | Conversation Experience (Customer) |
| AI-12 | Wealth Partner Experience |
| AI-13 | Voice & Real-Time Conversation |
| AI-14 | Multilingual Intelligence |
| AI-15 | Conversation Memory & Learning (controlled) |
| AI-16 | Validation & Performance harness |

---

## User-visible behaviour (unchanged by AI-17)

- SARATHI remains financial-domain only  
- Outside domain → fixed refusal  
- Engines decide; AI explains  
- Action Proposals are never auto-executed  
- Voice / Multilingual / Memory do not alter decision engines  

---

## Engineering artefacts (AI-17)

- Certification documentation under `docs/co-ai-117/`  
- Static verify: `verify:co-ai-117`  
- Evidence aggregator: `ai:certify:validate` → `CO-AI-117-CERTIFICATION-EVIDENCE.json`  

---

## Upgrade / deploy notes

1. Do **not** deploy solely because this pack exists.  
2. Complete Go-Live Checklist after PO approval.  
3. Recalibrate performance SLOs when production LLM is enabled.
