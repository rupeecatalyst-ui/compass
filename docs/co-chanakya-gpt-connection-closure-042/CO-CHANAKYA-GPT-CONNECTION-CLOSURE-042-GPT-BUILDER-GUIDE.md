# CO-CHANAKYA-GPT-CONNECTION-CLOSURE-042 — Custom GPT Builder Import Guide

**Purpose:** Close the Custom GPT ↔ Catalyst One connection so ChatGPT consistently calls **`gptActionEnterpriseRead`** for Deal/Opportunity depth.

**Import file (canonical):** `docs/co-chatgpt-integration/CO-CHATGPT-GPT-ACTION.openapi.yaml`  
**Version:** `1.1.0`  
**No Hostinger deploy required** for this sprint — import schema after next cutover or test against current production OAuth.

---

## Product Owner steps (GPT Builder)

1. Open **ChatGPT** → your **Custom GPT** → **Configure**.
2. Go to **Actions** → **Create new action** (or edit existing Catalyst One action).
3. **Delete** the previous OpenAPI schema import (or replace in place).
4. **Import from file** or paste contents of:
   - `docs/co-chatgpt-integration/CO-CHATGPT-GPT-ACTION.openapi.yaml`
5. Confirm **Available actions** includes:
   - **`gptActionEnterpriseRead`** ← PRIMARY for Deal/Opportunity/transaction depth
   - **`gptActionChanakya`** ← org Radar snapshot only
6. **Authentication:** OAuth · Authorization URL + Token URL from schema `securitySchemes.ChatGptIntegrationOAuth`.
7. **Re-authenticate** OAuth (disconnect + connect) after schema change.
8. In **Instructions**, add (optional reinforcement):

   > For any Deal (`DEAL-…`), Opportunity (`OPP-…`), or follow-up about "this deal/opportunity", always call **gptActionEnterpriseRead** with `dealRef` or `opportunityRef`. Use **gptActionChanakya** only for org-wide Radar without naming a case. Reuse `requestedEntityRefs` from the last enterprise-read response for follow-ups.

9. **Test in GPT Builder preview:**
   - "Tell me about DEAL-2026-000082." → must call `gptActionEnterpriseRead` with `dealRef`
   - "Why is this deal stuck?" (follow-up) → same `dealRef`
   - "Give me a complete 360 analysis of OPP-2026-000060." → `opportunityRef`
   - "How is the org Radar looking?" → `gptActionChanakya` only

---

## Action routing summary

| Question | Action | Parameters |
|----------|--------|------------|
| Deal / transaction depth | `gptActionEnterpriseRead` | `dealRef=DEAL-…` |
| Opportunity 360 | `gptActionEnterpriseRead` | `opportunityRef=OPP-…` |
| Follow-up (same case) | `gptActionEnterpriseRead` | reuse prior `dealRef`/`opportunityRef` |
| Org Radar only | `gptActionChanakya` | none |

**No separate per-deal actions.** One enterprise-read action covers all Deal/Opportunity depth.

---

## Security (unchanged)

- OAuth 2.0 + PKCE · org isolation · read-only GET
- No mobile/email · no document binaries · no raw OCR dumps
- FOIR / DSCR / LTV / DBR = **Phase 2** (not computed)
