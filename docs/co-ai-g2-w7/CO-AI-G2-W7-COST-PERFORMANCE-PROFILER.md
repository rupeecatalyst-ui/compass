# CO-AI-G2-W7 — Cost and Performance Profiler

**Status:** Delivered · **Metrics + optimization report only** · No runtime optimisation  
**Version:** `1.0.0-g2-w7`  
**Governing ADR:** [ADR-022](../adr/ADR-022-enterprise-ai-orchestrator-conversational-reasoning.md)

### Hard rule

W7 **measures** and **recommends**.  
It does **not** apply caching, model routing, or other runtime optimisations yet.

---

## Metrics

| Metric | Description |
|--------|-------------|
| Average Response Time | Mean end-to-end sample latency (ms) |
| Average Tokens | Mean estimated input+output tokens |
| Estimated Cost | Heuristic USD from configurable per-1k rates |
| Tool Calls | Mean tool invocations per sample |
| Context Size | Mean context payload chars |
| Memory Size | Mean memory/readiness payload chars |
| Latency | Avg + p95 |
| Provider Usage | Per-provider invocations, tokens, cost, latency |

---

## Components

| Path | Role |
|------|------|
| `src/lib/enterprise-ai-orchestrator/perf-profiler/profile.ts` | Estimate · aggregate · recommendations |
| `store.ts` | Sample store |
| `format-report.ts` | Optimization report markdown |
| `fixtures.ts` | Offline BAT samples |
| Shadow pipeline hook | Records sample after shadow complete (flag ON only) |

---

## Reports

| Artefact | Description |
|----------|-------------|
| [CO-AI-G2-W7-COST-PERFORMANCE-REPORT.md](./CO-AI-G2-W7-COST-PERFORMANCE-REPORT.md) | Generated optimization report |

Verify: `npm run verify:co-ai-g2-w7`

---

## Runtime impact

| Surface | Change |
|---------|--------|
| Customer UX / facing text | None |
| Runtime optimisation | **None** (`runtimeUnoptimized: true`) |
| Shadow flag default | Still OFF |
