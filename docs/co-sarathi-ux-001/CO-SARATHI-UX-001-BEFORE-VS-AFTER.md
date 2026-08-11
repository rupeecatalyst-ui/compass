# CO-SARATHI-UX-001 — Before vs After

| Aspect | Before (robotic) | After (consultant) |
|--------|------------------|--------------------|
| Welcome | Engineering / demo framing | Hello · SARATHI · Financial Intelligence Partner |
| Questions | Fixed chips (amount / KYC / EMI) | One Planner next question inside the reply |
| Mid-chat chips | Questionnaire feel | Hidden (welcome soft intents only) |
| Facing copy | Tone slogans repeated | Blocklist + acknowledgement rotation |
| Summary | Could appear after 1–2 turns | Only when Consultation Confidence ≥ 85% and ≥4 turns |
| Action Proposals | Could appear early | Only after summary confirmation |
| Layout | Sparse demo | Messaging-style bubbles, conversation-first |

## Screenshot capture (PO)

On https://catalyst-one-two.vercel.app/sarathi after deploy:

1. Welcome empty state  
2. LAP → purpose question in message (no chip list)  
3. Multi-turn without summary  
4. Summary after sufficient confidence  
5. Next steps only after confirm  

Store under `docs/co-sarathi-ux-001/screenshots/` when captured.
