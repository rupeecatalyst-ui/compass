# CO-AI-G2-W4 — Triple Comparison Engine

**Status:** Delivered · **Internal evaluation only**  
**Version:** `1.0.0-g2-w4`  
**Governing ADR:** [ADR-022](../adr/ADR-022-enterprise-ai-orchestrator-conversational-reasoning.md)

### Hard rule

Customers must **never** see triple comparison output.  
No UI mounting. Reports are internal evaluation artefacts only.

---

## 1. Objective

For every evaluated customer message, compare three arms:

| Arm | Source |
|-----|--------|
| Current SARATHI | Live facing text |
| Conversational Reasoning Model | Shadow / model facing text |
| Gold Standard Consultation | Matched PO gold-standard consultant reply |

Generate per comparison:

- **Strengths**
- **Weaknesses**
- **Score**
- **Deviation** (from gold)
- **Recommendation**

---

## 2. Flow

```text
Customer utterance
   ├─ Live SARATHI facing
   ├─ Reasoning model facing (shadow)
   └─ Match Gold Standard turn
            │
            ▼
   Triple Comparison Engine
            │
            ▼
   Internal store + Markdown/JSON reports
   (customerIsolated: true)
```

When Shadow Mode flag is ON, completed shadow invocations also persist a triple comparison record automatically.  
When flag is OFF, live path unchanged (no triple work).

---

## 3. Components

| Path | Role |
|------|------|
| `src/lib/enterprise-ai-orchestrator/triple-comparison/engine.ts` | Core compare |
| `match-gold.ts` | Nearest gold turn match |
| `format-report.ts` | Internal markdown |
| `store.ts` | In-memory internal store |
| Shadow pipeline hook | Saves triple after shadow complete |

---

## 4. Reports

| Artefact | Description |
|----------|-------------|
| [CO-AI-G2-W4-TRIPLE-COMPARISON-REPORT.md](./CO-AI-G2-W4-TRIPLE-COMPARISON-REPORT.md) | Generated suite report |

Verify: `npm run verify:co-ai-g2-w4`

---

## 5. Runtime impact

| Surface | Change |
|---------|--------|
| Customer UI | None |
| Live facing text | Unchanged |
| Shadow flag default | Still OFF |
| Triple output | Internal only |
