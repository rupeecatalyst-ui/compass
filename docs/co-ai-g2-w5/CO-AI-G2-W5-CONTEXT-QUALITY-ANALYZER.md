# CO-AI-G2-W5 — Context Quality Analyzer

**Status:** Delivered · **Optimization reports only** · No runtime modifications  
**Version:** `1.0.0-g2-w5`  
**Governing ADR:** [ADR-022](../adr/ADR-022-enterprise-ai-orchestrator-conversational-reasoning.md)  
**Contract:** G1 `eao.context.v1` (`EaoEnterpriseContextContract`)

### Hard rule

This analyzer **evaluates** Enterprise Context Packages and emits optimization reports.  
It does **not** mutate packs, dialogue, or live Orchestrator behaviour.

---

## Dimensions

| Dimension | Measures |
|-----------|----------|
| Missing Context | Expected product-path keys / CRE gaps |
| Irrelevant Context | Noise, untrusted inferences, non-lending clutter |
| Prompt Size | Estimated serialized size vs budget |
| Retrieval Quality | sourceId coverage · registry/engine provenance |
| Knowledge Quality | Trusted vs `model_inference_untrusted` |
| Context Freshness | `assembledAt` age · `observedAt` coverage |
| Conversation Memory Quality | known facts · goals · pending writes · CRE attachment |

Overall = mean of seven scores (0–100) + grade A–F.

---

## Components

| Path | Role |
|------|------|
| `src/lib/enterprise-ai-orchestrator/context-quality/analyze.ts` | Analyzer |
| `fixtures.ts` | Healthy vs noisy sample packs |
| `format-report.ts` | Markdown optimization reports |
| Types | `src/types/enterprise-ai-orchestrator/context-quality.ts` |

---

## Reports

| Artefact | Description |
|----------|-------------|
| [CO-AI-G2-W5-CONTEXT-QUALITY-REPORT.md](./CO-AI-G2-W5-CONTEXT-QUALITY-REPORT.md) | Generated suite |

Verify: `npm run verify:co-ai-g2-w5`

---

## Runtime impact

| Surface | Change |
|---------|--------|
| Context assembly | None |
| SARATHI dialogue | None |
| UI | None |
| Turn orchestrator | No analyzer import |
