# CO-SARATHI-VISION-001 — WAVE-1: Retire Questionnaire UX

**Status:** Implemented · Awaiting Product Owner conversation-quality review  
**Priority:** Conversation quality (Voice and Dialogue Architecture deferred)

## Decision

Transform SARATHI from a guided questionnaire into a **natural financial consultation**.

Voice is an interface, not the product. Dialogue Architecture follows after conversation approval.

## Retired (WAVE-1)

| Pattern | Status |
|---------|--------|
| Welcome product intent chips | Removed from desk |
| Mid-chat suggested question chips | API returns `[]`; UI unmounted |
| “Here's what I understand” confirm/edit form | Removed |
| Forced confirm utterance before recommendations | Removed |
| Composer lock during summary gate | Removed |
| Interview-style every-turn “Ack + question” | Softened — may reflect, educate, or weave a clarifier |

## Kept

- Free-form composer + welcome greeting  
- Natural thinking / progressive timing (UX-002)  
- Soft unlock of Action Proposal cards after consultation confidence (no form)  
- Domain Boundary / Policy Gate / engines (Bible)  

## Programme order (PO)

1. **WAVE-1** Retire Questionnaire UX ← this wave  
2. Dialogue Architecture (after conversation approved)  
3. Voice-First Experience  

## Review

https://catalyst-one-two.vercel.app/sarathi — type freely; no chips or confirm wizard.
