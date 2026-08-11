# CO-AI-117 — Known Limitations

**Sprint:** AI-17 · Final Certification  
**Framework under certification:** `1.17.0-ai16`  
**Date:** 2026-08-06  

These limitations are **accepted for certification** and must be visible to Product Owner before Go-Live.

---

## 1. Performance

- AI-16 latency / load results are under **stub LLM**, not a production provider.  
- Production SLOs are **not** certified until canary re-measurement.

## 2. Voice

- STT / TTS / VAD production provider wiring may still be environment-specific stubs.  
- Voice is certified as **interface-only** architecture; provider quality is ops-dependent.

## 3. Multilingual

- Certified languages: **en · hi · mr**.  
- Additional languages are roadmap (not in this baseline).

## 4. Memory & learning

- No automatic online learning.  
- Learning proposals exist but **execution is forbidden** from the AI path.  
- Long-term memory requires persistence adapter configuration in production.

## 5. Action Proposals

- Draft / pending_review only from AI.  
- Human / Policy / Workflow engines must execute — AI will not.

## 6. Observability

- Platform traces exist in-process.  
- Production APM dashboards / alerting are Go-Live ops items, not delivered as AI-17 product features.

## 7. Scope boundary

- SARATHI is **not** a general assistant. Outside-domain queries are refused by design.

---

## Product Owner acknowledgement

I have reviewed these Known Limitations.

Signature: ______________________ Date: __________
