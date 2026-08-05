# CO-VOICE-002 — ECIE Wave 1 Implementation Programme

**Status:** 🟢 **AUTHORISED** (Product Owner 2026-07-30) · Ready for controlled Wave 1 delivery  
**Parent architecture:** ADR-021 (**ACCEPTED · FROZEN**) · CO-VOICE-001  
**Capability:** Enterprise Conversation Intelligence Engine (**ECIE**)  
**Wave:** **1 of 5**  

---

## 1. Purpose

Deliver the first production slice of ECIE: capture conversation audio in-context, transcribe it, store audio in Document Registry, persist activity + transcript in Enterprise Activity Registry, and project onto EDC Timeline — **without** any automatic CRM / task / entity writes.

---

## 2. Constitutional Health Check (Wave 1 start)

| Result | **GREEN** (within frozen ADR-021 bounds) |
|--------|------------------------------------------|

Wave 1 implements only capture → STT → store → timeline. No Opportunity/Deal/Loan field mutation, no ETE auto-create, no external channels. Does not reopen ADR-018/019 journey or Deal identity.

If scope creeps into Wave 2+ behaviours → **AMBER** — stop and raise Architecture Impact Report.

---

## 3. In scope (Wave 1)

| # | Deliverable |
|---|-------------|
| 1 | **Enterprise Activity Composer** (single shared component) |
| 2 | Primary entry: Action Center → **Add Activity** |
| 3 | Reuse Composer from Dialogue / Timeline where practical |
| 4 | **Voice recording** (record · pause/resume · stop · duration · playback) |
| 5 | **Audio upload** to **Document Registry** (additive MIME + uploadSource) |
| 6 | **Speech-to-Text** (EN / HI / Hinglish as available) → editable transcript |
| 7 | Persist **Enterprise Activity** (transcript + metadata + audio document link) |
| 8 | **Activity Timeline integration** via **EDC** event projection |
| 9 | Typed note mode in Composer (same component — no second note engine) |
| 10 | Audit: who · when · duration · audio doc id · transcript |

Wire first surfaces (minimum): Opportunity · Deal · Loan Action Centers. Contact / Strategy / Task may follow in same wave if capacity allows without duplicating Composer.

---

## 4. Explicitly out of scope (Wave 1)

| Forbidden in Wave 1 |
|---------------------|
| Automatic CRM updates (Contact / Opportunity / Deal / Loan File) |
| AI task creation / ETE writes from conversation |
| AI entity linking / relationship graph writes |
| AI Summary package (Wave 2) |
| Confidence Engine UI thresholds for enterprise writes (Wave 2) |
| Enterprise Search on transcripts (Wave 3) |
| External integrations: Teams / Zoom / WhatsApp / Phone / Outlook (Wave 5) |
| localStorage / sessionStorage / mock JSON as activity SSOT |
| New storage systems outside Document Registry + Activity Registry |

---

## 5. SSOT map (frozen — do not deviate)

| Asset | Owner |
|-------|--------|
| Audio | Document Registry |
| Transcript + activity metadata | Enterprise Activity Registry |
| Timeline | EDC |
| Tasks | ETE — **not written in Wave 1** |

---

## 6. Production Data Protection

- Fully **additive** schema / APIs / UI  
- No delete, truncate, or silent migration of live business data  
- No modification of existing Opportunities, Deals, Loan Files, or Tasks without separate PO approval  
- Soft-delete / draft discard of **new** Wave 1 activities only  

---

## 7. Enterprise Change Control

| Control | Requirement |
|---------|-------------|
| Architecture | Must comply with ADR-021; no material architecture change |
| Single Composer | One implementation shared across workspaces |
| Chanakya | No blocking; Wave 1 may show “transcript ready” only — no CRM recommend/apply |
| CAD-2026-001 | Transcript is Activity Registry data — not Opportunity business fact until later approved waves |
| Deploy | Vercel after BAT; Git commit only on milestone / PO request |

---

## 8. BAT checklist (Wave 1)

- [ ] Action Center → Add Activity opens Composer with correct entity context  
- [ ] Record / pause / resume / stop / playback works  
- [ ] Discard recording does not create enterprise rows (or creates only abandoned draft per design)  
- [ ] Audio appears in Document Registry linked to entity  
- [ ] Transcript editable before save  
- [ ] Save creates Activity Registry row + EDC timeline entry  
- [ ] Timeline shows conversation activity with audio + transcript access  
- [ ] Permissions: unauthorised users cannot listen/read others’ activities  
- [ ] No Opportunity / Deal / Loan / Task fields changed by Wave 1 save  
- [ ] No localStorage used as durable activity store  
- [ ] Typed note path uses same Composer (no duplicate note module)  

---

## 9. Certification gate (Wave 1 close)

1. Implementation complete per §3  
2. BAT pass  
3. Enterprise Health Check **GREEN**  
4. Business & Functional Certification Report  
5. No scope leakage into §4  

Then: Product Owner certifies Wave 1 → prepare CO-VOICE-003 (Wave 2) programme — do not silently start Wave 2.

---

## 10. Related artefacts

| Artefact | Path |
|----------|------|
| ADR (frozen) | `docs/adr/ADR-021-enterprise-conversation-intelligence-engine.md` |
| Architecture proposal | `docs/co-voice-001/CO-VOICE-001-ENTERPRISE-ARCHITECTURE-PROPOSAL.md` |
| Wave 1 implementation prompt | `docs/co-voice-002/CO-VOICE-002-WAVE1-IMPLEMENTATION-PROMPT.md` |
| Platform rule | `.cursor/rules/enterprise-conversation-intelligence.mdc` |
