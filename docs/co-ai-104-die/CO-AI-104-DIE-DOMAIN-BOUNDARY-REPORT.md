# CO-AI-104 DIE — Domain Boundary Report

**Sprint:** AI-4 DIE  
**Status:** Implementation Complete — awaiting PO approval  

---

## Knowledge Zones

### Zone 1 — Core Domain
Home Loan · Balance Transfer · Top-up · LAP · Business Loan · Working Capital · Construction Finance · Personal Loan · Eligibility · EMI · FOIR · DBR · CIBIL · Credit Score · Documentation · Loan Process · Loan Products · Lender Comparison · Rupee Catalyst Services/Products

### Zone 2 — Adjacent Domain
Banking · Property purchase · Registration · Stamp Duty · Mortgage process · RBI lending guidance  

Answer only when useful to a borrowing decision.

### Zone 3 — Outside Domain
Everything else (politics, sports, entertainment, programming, recipes, travel, medical, general legal, personal chat, general ChatGPT usage, unknown topics).

---

## Intent classes

`knowledge` · `advisory` · `discovery` · `workflow` · `unsupported`

---

## Enforcement

| Gate | Behaviour |
|---|---|
| Domain Boundary | Classifies every non-empty utterance |
| Policy Gate | Denies tools/scopes when outside |
| Context Builder | Skips all providers when `blocksKnowledge` |
| LLM Provider | Short-circuits with fixed refusal |
| Response Composer | Emits only the fixed outside sentence |

Identical refusal across `sarathi_customer`, `sarathi_wealth_partner`, `platform_none`, `chanakya_executive`.

---

## Mixed-domain

Core/adjacent + outside → `allow_mixed_constrained` (lending may proceed; outside must not be answered).
