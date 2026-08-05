# CO-VOICE-001 — Enterprise Conversation Intelligence Engine (ECIE)  
## Enterprise Architecture Proposal (Product Owner Conditions Locked)

**Status:** 🟢 **ADR-021 ACCEPTED — ARCHITECTURE FROZEN** · Wave programmes: **CO-VOICE-002+**  
**Date:** 2026-07-30 (updated after ADR acceptance)  
**Capability ID:** CO-VOICE-001 (architecture)  
**Canonical name:** **Enterprise Conversation Intelligence Engine (ECIE)**  
**Former name (retired):** Enterprise Voice Intelligence Engine (EVIE)  
**ADR:** [`docs/adr/ADR-021-enterprise-conversation-intelligence-engine.md`](../adr/ADR-021-enterprise-conversation-intelligence-engine.md)  
**Wave 1 programme:** [`docs/co-voice-002/CO-VOICE-002-WAVE1-IMPLEMENTATION-PROGRAMME.md`](../co-voice-002/CO-VOICE-002-WAVE1-IMPLEMENTATION-PROGRAMME.md)  

---

### Constitutional Health Check

| Architecture | 🟢 **FROZEN** under ADR-021 |
| Wave 1 start | **GREEN** when scoped to CO-VOICE-002 only |

**Production Data Protection (frozen):** additive only · AI recommend → user approve → update → audit · no localStorage SSOTs  

---

## Implementation status

| Gate | Status |
|------|--------|
| ADR-021 | 🟢 ACCEPTED |
| CO-VOICE-002 Wave 1 programme | 🟢 Authorised |
| Wave 1 production code | Starts only when an implementation session runs the Wave 1 prompt |

---

## PO decision summary (locked into ADR-021)

1. **Rename** EVIE → **ECIE** (conversation platform, not voice-only)  
2. **One** Enterprise Activity Composer across all listed workspaces  
3. **Primary entry:** Action Center → **Add Activity** (also Dialogue / Timeline)  
4. **Storage SSOTs:** Audio → Document Registry · Transcript/AI → Enterprise Activity Registry · Tasks → ETE · Timeline → EDC — **no new storage system**  
5. **Approval Principle** frozen (Speak → STT → Chanakya → Recommend → Approve → Update → Audit)  
6. **Entity linking** to Customer, Opportunity, Deal, Loan File, Lender, Builder, Wealth Partner, Employee, Vendor  
7. **Approved transcripts searchable**  
8. **No** localStorage / sessionStorage / mock JSON / temporary note stores as SSOT  
9. **Waves 1–5** as specified by PO  
10. **Confidence Engine** on every extraction + configurable confirmation thresholds  

---

## 1. Enterprise Architecture

### 1.1 Business capability ownership (canonical)

| Pillar | Canonical |
|--------|-----------|
| **Identity** | Enterprise Conversation Intelligence Engine (**ECIE**) |
| **Route** | No new primary-nav module |
| **Primary workspace** | Action Center → **Add Activity** (Context Workspace) |
| **Also mounts** | Dialogue compose · Timeline |
| **Authoritative data owners** | Activity Registry (transcript/AI) · Document Registry (audio) · ETE (tasks) · EDC (timeline) |
| **Active implementation** | One Composer · one ECIE pipeline |

### 1.2 Architectural principle

> ECIE is an **intelligence + capture layer**, not a second CRM.  
> It **composes** existing enterprise services. It does **not** own Opportunities, Deals, Loans, or Tasks.

```text
┌─────────────────────────────────────────────────────────────────┐
│              Enterprise Activity Composer (single)                │
│  Type Note · Record Voice · Attach · Capture · Follow-up · Task │
│  Primary: Action Center → Add Activity                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│     Enterprise Conversation Intelligence Engine (ECIE)            │
│  Capture · Transcribe · Analyse · Propose · Await Approval       │
└───┬──────────┬──────────┬──────────┬──────────┬─────────────────┘
    │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼
 Document   Activity    EDC        ETE      Chanakya
 Registry   Registry    Timeline   Tasks    Advisory
 (audio)    (transcript (event)   (only)   (never blocks)
             + AI)
```

### 1.3 Reuse (mandatory — do not duplicate)

| Concern | Existing SSOT | ECIE role |
|---------|---------------|-----------|
| Composer chrome | Action Center + `ContextWorkspaceShell` | **Add Activity** Context Workspace |
| Timeline | Enterprise Dialogue Center | Project `voice_activity` / conversation events |
| Tasks | Enterprise Task Engine (`registerEteTask`) | Propose → user confirms → ETE |
| Audio / attachments | Document Registry | Extend MIME + uploadSource (additive) |
| Transcript / AI package | Enterprise Activity Registry (new domain under ECIE) | Durable SSOT |
| Registries | Contact / Lender / Product / Partner / … | Entity detection only |
| AI behaviour | Chanakya Operating Principles + Guide repository | Advise + confirm |

### 1.4 Forbidden

- Parallel conversation/voice/task/note engines  
- Auto-writing Opportunity / Deal / Loan fields without approval  
- Hardcoded entity lists  
- Duplicate Activity Composers per module  
- **localStorage / sessionStorage / mock JSON / temporary note stores** as activity SSOT  
- Horizon QuickNotes or Contact Strategy local logs as ECIE SSOT  
- A second blob/storage system outside Document Registry for audio  

### 1.5 Context binding

| Module | Context |
|--------|---------|
| Contact Workspace | ECM Contact |
| Customer Strategy | Contact / Opportunity (active) |
| Opportunity Workspace | Opportunity Registry id |
| Deal Workspace | Enterprise Deal id (+ opportunity projection) |
| Loan Workspace | Per ADR-019 boundaries |
| Task Workspace | ETE task + parent entity |

---

## 2. UI Design

### 2.1 Single Enterprise Activity Composer

One shared component for all workspaces listed in §1.5.

**Primary launch:** Action Center → **Add Activity**  
**Also:** Dialogue compose · Timeline “add activity”

```text
┌─ Enterprise Activity Composer ──────────────────────────────────┐
│  [📝 Type] [🎤 Voice] [📎 File] [📷 Image] [📅 Follow-up] [✅ Task] │
│  Context: entity identity strip                                  │
│  { mode body }                                                   │
│  [Cancel] · [Continue → Review]                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Review & Approve (mandatory)

Nothing enterprise-mutating before:

1. Editable transcript  
2. AI summary + extractions fields **with confidence scores**  
3. Entity link chips (accept/reject)  
4. Proposed ETE tasks / document requests (checkboxes)  
5. Chanakya: recommendations only — “Would you like to apply the selected items?”  
6. **Save Activity only** · **Apply selected** · **Cancel**

### 2.3 Confidence display

Every extraction shows confidence (e.g. Loan Amount 99%, Follow-up Date 72%).  
Configurable thresholds force mandatory confirmation before enterprise writes.

---

## 3. Data Model

### Enterprise Activity Registry (ECIE domain)

Durable conversation activity records: transcript, AI summary/extractions, confidence, approval state, channel (`in_app_mic` | `phone` | `whatsapp` | `teams` | `zoom` | `email` | `chat` | …), context FKs, search index fields.

### Document Registry

Original audio (+ Composer attachments). Additive MIME / `uploadSource` for conversation audio.

### Proposals

Child proposals with type, payload, **confidence**, user decision, applied refs (ETE task id, etc.).

### Audit

Append-only: who recorded, when, duration, audio doc id, transcript hash, AI version, confidence snapshot, approval history, apply results.

**Additive migrations only.**

---

## 4. AI Workflow (Approval Principle)

```text
User Speaks → STT → CHANAKYA Analysis → Recommendations
  → User Approval → Enterprise Update → Audit
```

No automatic enterprise updates. Confidence scores on every extraction. Thresholds configurable in Administration (Wave 2+).

---

## 5. Activity Timeline Design

- EDC event for conversation activities  
- Compact card + drawer (player, transcript, summary, tasks, docs, audit)  
- Wave 3: cross-workspace timeline consistency  

---

## 6. Storage Strategy

| Asset | SSOT |
|-------|------|
| Audio | Document Registry |
| Transcript | Enterprise Activity Registry |
| AI Summary / extractions | Enterprise Activity Registry |
| Tasks | ETE |
| Timeline | EDC |

**No new storage system.**

---

## 7. Security Model

- Entity ACL for record / listen / apply  
- Org-scoped search with permission filter  
- Encryption at rest/transit; vendor DPA for STT/AI  
- Full audit trail  

---

## 8. Future Roadmap (PO waves)

| Wave | Scope |
|------|--------|
| 1 | Voice recording · STT · Activity Timeline · Audio attachment |
| 2 | AI Summary · Entity detection · Task extraction |
| 3 | Enterprise Search · Relationship linking · Cross-workspace Timeline |
| 4 | CHANAKYA Conversation Intelligence · Executive Analytics |
| 5 | Teams · Zoom · WhatsApp · Phone · Outlook |

---

## Implementation gate

| Gate | Status |
|------|--------|
| PO architecture approval | 🟢 Approved with conditions |
| ADR-021 | 🟢 **ACCEPTED — FROZEN** |
| CO-VOICE-002 Wave 1 | 🟢 Programme authorised |
| Wave 1 code | Starts under Wave 1 implementation prompt only |

**Material architecture changes require a new ADR or Product Owner approval.**

---

## Product Owner decision record

| Item | Decision |
|------|----------|
| Overall architecture | 🟢 Approved with conditions |
| ADR-021 | 🟢 **ACCEPTED** (2026-07-30) |
| Engine name | **ECIE** |
| Storage | Document Registry · Activity Registry · ETE · EDC |
| Approval principle | Frozen |
| Waves | 1–5 as specified |
| First programme | **CO-VOICE-002 Wave 1** authorised |

---

*End of CO-VOICE-001 proposal (ADR-021 accepted).*
