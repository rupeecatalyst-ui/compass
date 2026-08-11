# CO-SARATHI-UX-002 — Before / After Video Guide

Product Owner asked for before-and-after videos of the conversational experience.

## After (current production)

URL: https://catalyst-one-two.vercel.app/sarathi

### Capture script (≈45–60s)

1. Open `/sarathi` → show welcome (no thinking).  
2. Send **Hi** → brief thinking → quick reply (greeting pace).  
3. Send **I need a Loan Against Property** → progressive labels (“Understanding…”, “Reviewing…”) → streamed reply.  
4. Send a longer analysis-style question → longer think + progressive steps.  
5. Continue to summary/confirm path if confidence allows — show recommendation think labels.

### Suggested filenames

- `docs/co-sarathi-ux-002/videos/after-natural-conversation.mp4`  
- `docs/co-sarathi-ux-002/videos/before-instant-template.mp4` (optional archival from prior build)

## Before (reference)

Prior behaviour: random fixed `typingDelayMs` then full reply dump; little sense of reading/thinking; identical pause feel.

## Storyboard fallback

If video upload is delayed, place sequential PNGs in `docs/co-sarathi-ux-002/screenshots/`:

1. `01-welcome.png`  
2. `02-thinking.png`  
3. `03-progressive-label.png`  
4. `04-streaming-reply.png`  
5. `05-complete.png`

A helper script `scripts/co-sarathi-ux-002-capture-storyboard.mjs` can capture production frames after deploy (auth may require a logged-in session).
