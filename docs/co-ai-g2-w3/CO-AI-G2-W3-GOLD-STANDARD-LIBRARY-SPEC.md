# CO-AI-G2-W3 — Gold Standard Consultation Library

**Status:** Delivered · **Benchmarking only** · Not a runtime dialogue source  
**Version:** `1.0.0-g2-w3`  
**Governing ADR:** [ADR-022](../adr/ADR-022-enterprise-ai-orchestrator-conversational-reasoning.md)

### Hard rule

This library is for **Product Owner benchmarking and evaluation**.  
It is **NOT** used for runtime SARATHI responses.  
No UI changes. No Hybrid Cutover.

---

## Products covered

| Product | ID |
|---------|-----|
| Home Loan | `home_loan` |
| Balance Transfer | `balance_transfer` |
| Loan Against Property | `lap` |
| Business Loan | `business_loan` |
| Working Capital | `working_capital` |
| Personal Loan | `personal_loan` |

For each product the library defines:

1. Typical customer goals  
2. Typical conversations (gold dialogues)  
3. Expected consultant behaviour  
4. Expected follow-up strategy  
5. Evaluation notes (aligned to eight G2-W2 dimensions)

---

## Artefacts

| Path | Role |
|------|------|
| `src/constants/enterprise-ai-orchestrator/gold-standard-library.ts` | SSOT library data |
| `src/types/enterprise-ai-orchestrator/gold-standard.ts` | Types |
| `src/lib/enterprise-ai-orchestrator/benchmark/gold-standard-project.ts` | Project → benchmark inputs |
| `format-gold-standard.ts` | Markdown renderer |
| [CO-AI-G2-W3-GOLD-STANDARD-LIBRARY.md](./CO-AI-G2-W3-GOLD-STANDARD-LIBRARY.md) | Generated PO library report |
| [CO-AI-G2-W3-GOLD-BENCHMARK-REPORT.md](./CO-AI-G2-W3-GOLD-BENCHMARK-REPORT.md) | Optional scores of gold dialogues |

---

## Runtime isolation

- Must **not** be imported by `turn-orchestrator` or facing composers  
- `runtimePolicy: benchmark_only_never_runtime_ssot` on every product entry  

Verify: `npm run verify:co-ai-g2-w3`
