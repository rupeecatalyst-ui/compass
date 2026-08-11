# CO-AI-G2-W8 — Shadow Mode Dashboard

**Status:** Delivered · **Product Owner review only** · No customer access · No deployment  
**Version:** `1.0.0-g2-w8`  
**Governing ADR:** [ADR-022](../adr/ADR-022-enterprise-ai-orchestrator-conversational-reasoning.md)

### Hard rules

1. **Audience:** Product Owner / administrators only.  
2. **No customer access** — never mounted on SARATHI customer conversation UI.  
3. **No Hybrid Cutover** — live facing text is read for comparison only.  
4. **No deployment** for this wave unless Product Owner later authorises.

---

## Display fields

| Field | Source |
|-------|--------|
| Current SARATHI Response | Live facing text (W4 live arm) |
| Reasoning Model Response | Shadow / model facing text |
| Gold Standard Response | Gold library match (W3/W4) |
| Benchmark Score | Triple comparison aggregate (W2/W4) |
| Policy Score | Policy Validation Harness (W6) |
| Consultation Score | CRE / consultation confidence SSOT |
| Latency | Perf profiler sample (W7) |
| Estimated Cost | Perf profiler heuristic (W7) |

---

## Surfaces

| Path | Role |
|------|------|
| `src/lib/enterprise-ai-orchestrator/shadow-dashboard/` | Compose + fixtures + report |
| `/admin/shadow-mode-dashboard` | Internal PO UI |
| `GET /api/admin/shadow-mode-dashboard` | Admin-only API |
| Administration Console → System → Shadow Mode Dashboard | Nav entry |

---

## Verify

```bash
npm run verify:co-ai-g2-w8
```

Report: [CO-AI-G2-W8-SHADOW-DASHBOARD-REPORT.md](./CO-AI-G2-W8-SHADOW-DASHBOARD-REPORT.md)
