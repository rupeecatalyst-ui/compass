# CO-AI-G2-W5 Context Quality — Optimization Suite

**Suite overall:** 58 · **Version:** 1.0.0-g2-w5 · **Generated:** 2026-08-06T19:05:34.717Z

Report ID: `eao_ctxq_suite_62b04c81-5e55-451f-9e53-2bac3163eb50`

> Optimization reports only. No runtime context packs were modified.

---

## Healthy home-loan context

| Field | Value |
|-------|-------|
| Pack ID | pack_healthy_hl |
| Overall | **78.3** (B) |
| Estimated prompt chars | 1425 |
| Facts | 6 (C2/O2/D0/P2/Pol0) |
| Runtime unmodified | true |
| Analyzed | 2026-08-06T19:05:34.717Z |

| Dimension | Score | Findings |
|-----------|------:|----------|
| Missing Context | 80 | Core expected keys present for product path |
| Irrelevant Context | 100 | No obvious irrelevant / untrusted noise detected |
| Prompt Size | 55 | Prompt/context payload may be too sparse |
| Retrieval Quality | 67 | 2/6 facts have sourceId; 2/6 from registry/engine |
| Knowledge Quality | 95 | Knowledge facts use trusted provenance classes |
| Context Freshness | 95 | Pack assembled within 15 minutes |
| Conversation Memory Quality | 56 | Memory correctly marked as non-CRM SSOT |

### Optimizations

- Surface CRE missing slots into Context Pack gaps explicitly
- Ensure minimum product + purpose + amount facts when known
- Require sourceId on registry/engine facts for retrieval traceability

---

## Noisy / bloated / stale context

| Field | Value |
|-------|-------|
| Pack ID | pack_noisy_bl |
| Overall | **37.6** (F) |
| Estimated prompt chars | 7014 |
| Facts | 43 (C2/O0/D0/P1/Pol40) |
| Runtime unmodified | true |
| Analyzed | 2026-08-06T19:05:34.717Z |

| Dimension | Score | Findings |
|-----------|------:|----------|
| Missing Context | 17 | Missing expected keys for business_loan: product, business_type, purpose, funding_amount |
| Irrelevant Context | 90 | 2 fact(s) flagged as irrelevant or untrusted inference |
| Prompt Size | 35 | Over budget: 7014 chars vs 2000 (ratio 3.51) |
| Retrieval Quality | 50 | 0/43 facts have sourceId; 0/43 from registry/engine |
| Knowledge Quality | 21 | 2 untrusted model-inferred facts in pack |
| Context Freshness | 25 | Stale context pack (>24h) |
| Conversation Memory Quality | 25 | Many pending memory write intents — validation backlog risk |

### Optimizations

- Enrich context pack with product, business_type, purpose, funding_amount from registries/CRE before model call
- Filter model_inference_untrusted and non-lending noise before packaging context
- Cap history, compress readiness, and keep only high-provenance facts
- Require sourceId on registry/engine facts for retrieval traceability
- Never promote model inferences into authoritative context fields
- Invalidate and rebuild stale packs before reasoning
- Stamp observedAt on registry/engine facts
- Flush/validate pending memory intents before next turn
- Persist validated consultation facts into memory across turns
- Attach CRE readiness snapshot into context for gap awareness

---
