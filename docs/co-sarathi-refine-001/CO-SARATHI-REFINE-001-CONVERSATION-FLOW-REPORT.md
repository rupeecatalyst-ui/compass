# CO-SARATHI-REFINE-001 — Conversation Flow Report

## Canonical flow

```text
Greeting
  ↓
Understand customer objective
  ↓
Adaptive questions (one at a time)
  ↓
Summary — “Here's what I understand.”
  ↓
Customer confirmation
  ↓
Recommendation + Action Proposals + Next steps
```

## Phase model (UI)

| Phase | Behaviour |
|-------|-----------|
| `welcome` | Empty history; soft product starters (≤5) |
| `understanding` | Turns with `emitActionProposals: false`; ≤1 adaptive chip |
| `summary_pending` | Summary card; composer paused until confirm/edit |
| `confirmed` | Confirm sends unlock turn |
| `advising` | Proposals / next steps visible |

## Adaptive questioning examples

| Customer | Next question |
|----------|---------------|
| Home Loan | What is the property's approximate value? |
| Balance Transfer | Which bank is your current loan with? |
| LAP | What will you use the funds for? |
| Working Capital / Business | What type of business do you operate? |
| Personal Loan | What amount are you considering? |

## Product tone (UX hint)

Home Loan — calm · Balance Transfer — savings · LAP — business · Working Capital / Business — growth · Personal — supportive

Tone continues to run through existing Micro Communication + Tone engines; this sprint does not replace them.

## Domain Boundary

Outside-domain utterances still receive only:

> I'm not trained for this subject.

No proposals, no CRM side effects.

## Test scenarios covered (verify script)

- Home Loan · Balance Transfer · LAP · Business Loan · Working Capital · Personal Loan  
- Outside-domain refusal  
- Mixed multi-turn without early proposals
