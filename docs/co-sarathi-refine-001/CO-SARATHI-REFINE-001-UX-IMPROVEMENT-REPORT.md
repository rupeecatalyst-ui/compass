# CO-SARATHI-REFINE-001 — UX Improvement Report

**Sprint:** SARATHI Conversation Experience v2.0  
**Scope:** Product refinement only (no new engines / architecture)

## Objective

Transform SARATHI from an engineering demo into a calm, professional, consultant-grade customer conversation.

## Changes delivered

| Area | Before | After |
|------|--------|-------|
| Welcome | Engineering chrome (“Enterprise AI Platform”, proposals-only language) | Brand **SARATHI** + “Your Financial Intelligence Partner” + fixed warm welcome |
| Focus | Proposals / platform status competed with chat | Conversation is primary; suggestions ≤1 after start; proposals secondary |
| Proposals | Often visible early | Hidden until customer confirms summary |
| Summary | Missing | “Here's what I understand.” + confirm / correct |
| Questions | Broad starter / multi-chip questionnaire feel | Product-aware **one** clarifying question at a time |
| Copy | Technical Draft / CRM / Platform wording | Customer language; engineering terms stripped from cards |
| Layout | Dense demo chrome | More spacing, display typography, quieter action cards |

## UI surfaces touched

- `sarathi-conversation-workspace.tsx` — UX phase machine
- `conversation-message-list.tsx` — premium welcome
- `customer-summary-card.tsx` — confirmation gate
- `action-proposal-cards.tsx` — secondary, customer wording
- `suggested-questions-bar.tsx` — max visible chips
- `conversation-composer.tsx` — quieter composer

## Experience helpers (not engines)

- `ux-flow.ts` — product detect, adaptive primary question, summary readiness
- Continuity storage key bumped to `eai.sarathi.continuity.v2`

## Screenshot notes (Before vs After)

Capture for Product Owner review on `/sarathi`:

1. **Welcome** — brand + tagline + greeting only (no platform footer)
2. **Understanding** — one adaptive chip after “I need a Home Loan”
3. **Summary** — “Here's what I understand.” with confirm CTA
4. **After confirm** — recommendations / next-step cards appear

Store captures under `docs/co-sarathi-refine-001/screenshots/` when available from the live Vercel URL.
