# CO-AI-116 — Performance Report

**Sprint:** AI-16 · Enterprise AI Validation & Performance  
**Engine:** `1.0.0-ai16` · Framework `1.17.0-ai16`  
**Date:** 2026-08-06  
**Status:** ✅ PASS (local stub LLM harness)

Runtime snapshot: `docs/co-ai-116/CO-AI-116-PERFORMANCE-SNAPSHOT.json`

---

## 1. Executive summary

All **13** validation suites passed under stub LLM conditions.

| Area | Result |
|---|---|
| Domain Boundary / Policy Gate / Tool Bus | ✅ |
| Context / Behaviour | ✅ |
| Prompt Injection / Security | ✅ (0 security findings) |
| Failure Recovery | ✅ |
| Latency / Token / Context optimisation | ✅ |
| Load Testing | ✅ 4/4 success |
| Performance aggregate | ✅ |

---

## 2. Latency analysis (stub)

| Metric | Value | Budget |
|---|---|---|
| p50 | ~8 ms | ≤ 5000 ms |
| p95 | ~26 ms | ≤ 5000 ms |
| max | ~26 ms | ≤ 5000 ms |
| average | ~13 ms | — |

Samples: Balance Transfer · Home loan documents · Loan eligibility.

---

## 3. Token optimisation (heuristic)

| Metric | Value |
|---|---|
| Estimated input tokens | ~38 |
| Estimated output tokens | ~17 |
| Soft target met | ✅ |

Method: chars ÷ 4 (provider-independent).  
Recommendations: Tone Library + Micro Communication + Context budget truncation.

---

## 4. Context optimisation

| Metric | Value |
|---|---|
| Used chars | ~1399 |
| Budget | 12 000 |
| Truncated | No |
| Within budget | ✅ |

---

## 5. Load testing

| Metric | Value |
|---|---|
| Iterations | 4 |
| Concurrency | 2 |
| Success | 4/4 |
| Failures | 0 |
| Throughput | ~286 turns/s (stub) |
| Average latency | ~6 ms |

---

## 6. Security & constitutional

- Prompt-injection utterances → fixed outside-domain refusal ✅  
- No executed Action Proposals ✅  
- No secret / raw DB leakage markers in facing text ✅  

---

## 7. Caveats

- Latency budgets assume **stub LLM** providers.  
- Recalibrate SLOs when a production LLM provider is wired.  
- Harness does **not** modify enterprise rules or enable online learning.

---

## 8. Product Owner gate

Approve certification when this report + Architecture Report are accepted.  
Deploy / git milestone only when directed.
