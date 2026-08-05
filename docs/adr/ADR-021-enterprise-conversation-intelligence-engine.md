# ADR-021: Enterprise Conversation Intelligence Engine (ECIE)

**Status:** 🟢 **ACCEPTED — ARCHITECTURE FROZEN** (Product Owner 2026-07-30)  
**Date:** 2026-07-30  
**Directive class:** Product Architecture Decision  
**Capability ID:** CO-VOICE-001 (architecture) · Implementation programmes: **CO-VOICE-002+** (waves)  
**PO Decision:** 🟢 **ADR-021 ACCEPTED** (2026-07-30)  
**Related:** CAD-2026-001 · ADR-017 · ETE constitution · EDC · Document Registry governance · Chanakya Operating Principles  
**Supersedes naming:** “Enterprise Voice Intelligence Engine (EVIE)” — **retired as capability name**  

---

## Context

Relationship Managers, Sales Executives, Credit Managers, and Wealth Partners need to capture conversations naturally (not only typed notes) and convert them into auditable enterprise activities with AI-assisted recommendations.

The Product Owner approved the architecture proposal with mandatory conditions and has now **formally accepted** this ADR. ECIE is an **approved Enterprise Capability** within Catalyst One.

**Architecture is frozen.** Material architectural changes require a new ADR or Product Owner approval.

**Implementation** proceeds only under separate controlled wave programmes beginning with **CO-VOICE-002 (Wave 1)**.

---

## Decision

Catalyst One shall introduce the **Enterprise Conversation Intelligence Engine (ECIE)** as the permanent platform capability for conversation capture, transcription, analysis, recommendation, and approved enterprise updates.

ECIE is a **conversation platform**, not a voice-recorder feature. Future sources (phone, WhatsApp, Teams, Zoom, email, chat) must fit the same architecture without a second engine.

---

## Locked Product Owner conditions

### 1. Rename the engine (frozen)

| Former name | Canonical name |
|-------------|----------------|
| Enterprise Voice Intelligence Engine (EVIE) | **Enterprise Conversation Intelligence Engine (ECIE)** |

Reason: the architecture must support all conversation sources, not only in-app microphone recordings.

### 2. Single Activity Composer (frozen)

Exactly **one** shared **Enterprise Activity Composer** across:

- Contact Workspace  
- Customer Strategy  
- Opportunity Workspace  
- Deal Workspace  
- Loan Workspace  
- Task Workspace  

**No duplicate implementations.** Single Implementation Rule applies.

### 3. Primary entry point (frozen)

| Role | Path |
|------|------|
| **Primary** | Action Center → **Add Activity** |
| **Also reusable from** | Dialogue compose · Timeline |

Composer mounts as an Action Center **Context Workspace** (canonical Enterprise UX), preserving the open entity context.

### 4. Storage architecture — single SSOT per domain (frozen)

**Do not introduce another storage system.**

| Asset | Owner (SSOT) |
|-------|----------------|
| Audio (and image/file attachments from Composer) | **Document Registry** |
| Transcript | **Enterprise Activity Registry** (ECIE domain) |
| AI Summary / extractions proposals | **Enterprise Activity Registry** |
| Tasks | **Enterprise Task Engine (ETE)** only |
| Timeline projection | **Enterprise Dialogue Center (EDC)** |

Document Registry shall be extended (additive) to allow conversation audio MIME types and `uploadSource: "voice"` / conversation channel values. No parallel blob store.

### 5. Enterprise Approval Principle (frozen constitutional rule)

```text
User Speaks
  → Speech-to-Text
  → CHANAKYA Analysis
  → Recommendations
  → User Approval
  → Enterprise Update
  → Audit
```

**No automatic updates to Enterprise data.**

- AI recommends.  
- User approves.  
- Only then may Catalyst One update Contacts, Opportunities, Deals, Loan Files, Tasks, or Activities.  
- Aligns with Chanakya Operating Principles (advise never block; never become Policy Engine) and CAD-2026-001 (no invented business facts until persisted via authoritative services).

Voice/conversation-proposed ETE tasks **must** require explicit user confirmation before `registerEteTask` (stricter than any existing Chanakya auto-mint paths).

### 6. Enterprise entity linking (frozen)

ECIE shall identify and propose links to:

- Customer · Opportunity · Deal · Loan File  
- Lender · Builder · Wealth Partner · Employee · Vendor  

Accepted links become part of the **Enterprise relationship graph**. Detection resolves against Enterprise Registries only — no local/hardcoded entity lists.

### 7. Enterprise Search (frozen)

All **approved** transcripts are searchable (org-scoped + ACL-filtered).

Future queries such as:

- Customers mentioning HDFC  
- Meetings mentioning Working Capital  
- Calls mentioning GST  
- Discussions involving Bajaj Housing Finance  

Draft / unapproved transcripts are not enterprise search truth until approval (or PO-defined draft indexing policy in a later wave).

### 8. Local storage ban (frozen)

**Forbidden** for ECIE activity data:

- `localStorage`  
- `sessionStorage`  
- mock JSON as production SSOT  
- temporary note stores (including Horizon QuickNotes and Contact Strategy local activity logs as enterprise Conversation Activity SSOT)

All activity data must reside in **Enterprise Registries** (Activity Registry · Document Registry · ETE · EDC projections).

Client-side ephemeral buffers for in-progress recording blobs before upload are allowed only as transient capture state and must not become durable SSOT.

### 9. Implementation waves (frozen programme shape)

| Wave | Scope |
|------|--------|
| **Wave 1** | Voice recording · Speech-to-Text · Activity Timeline · Audio attachment (Document Registry) |
| **Wave 2** | AI Summary · Entity detection · Task extraction (proposals + approval) |
| **Wave 3** | Enterprise Search · Relationship linking · Cross-workspace Timeline |
| **Wave 4** | CHANAKYA Conversation Intelligence · Executive Analytics |
| **Wave 5** | External integrations: Teams · Zoom · WhatsApp · Phone systems · Outlook |

Waves require Architecture + Sprint Approval + CHC **GREEN** before production code (Implementation Lifecycle pre–Go-Live).

### 10. Confidence Engine (frozen)

Every AI extraction **must** include a **confidence score** (0–100%).

Examples:

- Loan Amount — Confidence: 99%  
- Preferred Lender — Confidence: 97%  
- Follow-up Date — Confidence: 72%  

**Configurable thresholds** (Administration) determine when user confirmation is **mandatory** before creating or updating Enterprise records.

Low-confidence proposals must never auto-apply; high-confidence proposals still require the Approval Principle unless a future Policy Engine rule explicitly allows otherwise (out of scope until separately approved).

---

## Business Capability Ownership

| Pillar | Canonical |
|--------|-----------|
| Identity | **Enterprise Conversation Intelligence Engine (ECIE)** |
| Route | No new primary-nav module |
| Primary workspace | Action Center → Add Activity (Context Workspace) + reusable Dialogue/Timeline Composer |
| Authoritative data owners | Activity Registry (transcript/AI) · Document Registry (audio) · ETE (tasks) · EDC (timeline) |
| Active implementation | **One** Activity Composer · **one** ECIE pipeline |

---

## Consequences

### Positive

- Conversation capture becomes a platform capability reusable across workspaces and future channels.  
- Clear SSOTs prevent parallel notes/task/timeline/storage engines.  
- Approval + confidence gates protect live Opportunity / Deal / Loan data.

### Negative / costs

- Wave 1 requires Document Registry audio MIME + uploadSource extension.  
- STT / AI vendor selection and DPA remain ops prerequisites.  
- Cross-workspace timeline and search deferred to Wave 3.

### Compliance

- Production Data Protection: additive only; no destructive migrations; no silent FK/ID rewrites.  
- Pre-Launch Single Implementation Rule: one Composer, one engine.  
- Replacement Certification required if Dialogue note UX is formally replaced.

---

## Legacy Retirement Impact

| Item | Disposition |
|------|-------------|
| Name “EVIE” | Retired in favour of **ECIE** |
| Plain Dialogue note-only compose | Superseded by Enterprise Activity Composer (same component); historical EDC entries retained |
| Contact Strategy localStorage activity log | **Not** ECIE SSOT; do not extend; future Strategy activities use Enterprise Activity Registry |
| Horizon QuickNotes | Out of ERP Conversation scope |

---

## Out of scope until Wave 5+ (or separate ADR)

- Live telephony recording platforms  
- Automatic CRM updates without user approval  
- Multi-speaker diarization as a hard dependency of Wave 1–2  
- Customer portal voice authoring (ECE remains projection unless separately approved)

---

## Implementation gate

| Gate | Status |
|------|--------|
| Architecture proposal | 🟢 Approved with conditions |
| This ADR | 🟢 **ACCEPTED — ARCHITECTURE FROZEN** |
| Implementation programmes | Separate controlled waves (**CO-VOICE-002+**) |
| Wave 1 programme | **CO-VOICE-002** — authorised for preparation / controlled delivery |
| Material architecture change | **Forbidden** without new ADR or PO approval |

Each Wave shall have: independent implementation prompt · Enterprise Change Control · Production Data Protection · BAT · Business Certification.

---

## Product Owner / Architecture sign-off

| Role | Decision | Date |
|------|----------|------|
| Product Owner | 🟢 Approved with conditions | 2026-07-30 |
| Product Architecture | ADR drafted with conditions locked | 2026-07-30 |
| Product Owner | 🟢 **ADR-021 ACCEPTED** — architecture frozen | 2026-07-30 |
| First implementation programme | **CO-VOICE-002 Wave 1** authorised | 2026-07-30 |

**Next step:** Deliver CO-VOICE-002 (Wave 1) under its own implementation prompt — see `docs/co-voice-002/`.

---

## References

- Architecture proposal: `docs/co-voice-001/CO-VOICE-001-ENTERPRISE-ARCHITECTURE-PROPOSAL.md`  
- Wave 1 programme: `docs/co-voice-002/CO-VOICE-002-WAVE1-IMPLEMENTATION-PROGRAMME.md`  
- ETE: `.cursor/rules/enterprise-task-engine.mdc`  
- Chanakya: `.cursor/rules/chanakya-operating-principles.mdc`  
- Document Center governance: `.cursor/rules/opportunity-document-center-governance.mdc`  
- CAD-2026-001 / ADR-017  
