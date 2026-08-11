# CO-AI-G2-W7 Cost & Performance — Optimization Report

**Version:** 1.0.0-g2-w7 · **Generated:** 2026-08-06T19:14:08.015Z

Report ID: `eao_perf_report_2e5f0fbe-96be-4b29-98c5-6692e16bfd9a`

> Metrics & optimization recommendations only. **No runtime optimisation applied** (W7).

## Enterprise metrics

| Metric | Value |
|--------|------:|
| Samples | 3 |
| Average Response Time (ms) | 1673.3 |
| Average Latency (ms) | 1673.3 |
| p95 Latency (ms) | 3100 |
| Average Tokens | 134 |
| Avg Input Tokens | 73 |
| Avg Output Tokens | 61 |
| Estimated Cost (total USD) | 0.000385 |
| Estimated Cost (avg USD) | 0 |
| Average Tool Calls | 2 |
| Average Context Size (chars) | 7866.7 |
| Average Memory Size (chars) | 3833.3 |

## Provider usage

| Provider | Invocations | Total latency ms | Tokens | Est. cost USD |
|----------|------------:|-----------------:|-------:|--------------:|
| eao.shadow.stub | 2 | 3520 | 379 | 0.000357 |
| eao.model.future | 1 | 1500 | 23 | 0.000028 |

## Optimization recommendations

### Latency (warn)

- **Observation:** Avg response time 1673.3ms
- **Recommendation:** Monitor provider latency; consider lighter prompts for simple turns later

### Tokens (info)

- **Observation:** Average tokens 134
- **Recommendation:** Maintain token budgets in Orchestrator request assembly

### Cost (info)

- **Observation:** Avg estimated cost $0 / turn (heuristic pricing)
- **Recommendation:** Replace heuristic rates with provider invoices when available

### Tool Calls (info)

- **Observation:** Average tool calls 2
- **Recommendation:** Keep propose-only side effects; prefer compute_only engines

### Context Size (info)

- **Observation:** Avg context 7866.7 chars
- **Recommendation:** Continue freshness + relevance checks (W5)

### Memory Size (info)

- **Observation:** Avg memory payload 3833.3 chars
- **Recommendation:** Keep consultation memory distinct from CRM SSOT

### Provider Usage (info)

- **Observation:** 2 providers observed
- **Recommendation:** Compare cost/latency by provider before selecting production default

## Flags

| Flag | Value |
|------|-------|
| runtimeUnoptimized | true |
| customerIsolated | true |
