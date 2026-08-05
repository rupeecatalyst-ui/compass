# CO-VOICE-002 — Wave 1 Implementation Prompt

**Use this prompt to start Wave 1 engineering.**  
**Do not expand into Wave 2–5 scope.**  
**Authority:** ADR-021 ACCEPTED · CO-VOICE-002 programme authorised · PO 2026-07-30  

---

## Prompt (copy for implementation session)

```text
CO-VOICE-002 — Enterprise Conversation Intelligence Engine (ECIE) — Wave 1

AUTHORITY
- ADR-021 ACCEPTED and FROZEN
- Programme: docs/co-voice-002/CO-VOICE-002-WAVE1-IMPLEMENTATION-PROGRAMME.md
- Rule: .cursor/rules/enterprise-conversation-intelligence.mdc

OBJECTIVE
Implement Wave 1 only:
1. Single Enterprise Activity Composer
2. Primary entry: Action Center → Add Activity
3. Voice recording (record / pause / resume / stop / duration / playback)
4. Audio upload to Document Registry (extend allowlist + uploadSource additively)
5. Speech-to-Text → editable transcript
6. Persist Enterprise Activity (transcript + metadata + audio document link)
7. Project to Enterprise Dialogue Center timeline

MUST NOT (Wave 1)
- Automatic CRM updates
- AI task creation / ETE writes
- AI entity linking
- AI summary / confidence-gated enterprise writes
- Enterprise Search
- Teams / Zoom / WhatsApp / Phone / Outlook
- localStorage / sessionStorage / mock JSON as activity SSOT
- Any second storage system or second Composer implementation

SSOT
- Audio → Document Registry
- Transcript / activity → Enterprise Activity Registry
- Timeline → EDC
- Tasks → ETE (do not write in Wave 1)

PRODUCTION DATA PROTECTION
Additive only. No delete/truncate/migrate of live business data.
No modification of Opportunities, Deals, Loan Files, or Tasks.

UX
- Follow Enterprise Action Center Context Workspace pattern
- Preserve open entity context
- Workspace First; Composer is capture chrome, not a dashboard
- Review transcript before save; Save Activity only (no Apply CRM)

DELIVER
- Implementation + verify script
- BAT against programme checklist
- Business & Functional Certification Report
- Deploy to Vercel per project policy
- Do not commit/push unless asked / milestone

After Wave 1: stop. Do not start Wave 2 without CO-VOICE-003 programme authorisation.
```

---

## Suggested engineering outline (non-binding)

1. Types + constants for Enterprise Activity Registry (conversation activity)  
2. Additive Prisma model(s) + Document Registry MIME / uploadSource  
3. Server APIs: create/get activity · upload audio · request STT · save transcript  
4. `EnterpriseActivityComposer` + Action Center catalog action `add_activity`  
5. Wire Opportunity / Deal / Loan Action Centers  
6. EDC `voice_activity` (or `conversation_activity`) event projection  
7. `scripts/co-voice-002-verify.mjs` + docs readiness report  

STT vendor: use existing platform AI/config patterns if present; otherwise feature-flag stub with clear “provider required” path — do not invent production demo transcripts as live truth.
