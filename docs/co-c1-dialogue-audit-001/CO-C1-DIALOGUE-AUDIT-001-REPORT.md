# CO-C1-DIALOGUE-AUDIT-001 — Dialogue Center / Activity Timeline Architecture Audit

**Code:** CO-C1-DIALOGUE-AUDIT-001  
**Nature:** Investigation / architecture audit only — **no implementation · no schema change · no deploy**  
**Date:** 2026-08-11  
**Scope:** Catalyst One factual codebase review (Wealth Partner App not modified; Partner Gateway observed only)

---

## A. Executive Summary

Catalyst One **does** store operational work history, but it is **fragmented across several stores** and **not presented as one chronological “what happened on this transaction?” surface** on Opportunity or Deal desks.

| Finding | Fact |
|---------|------|
| Intended universal chronology SSOT | **Enterprise Activity Registry (EAR)** — Prisma `EnterpriseActivityEvent` |
| Dialogue Center (EDC) | A **projection / compose layer** (in-memory ports) that dual-writes EAR — **not** a durable Dialogue table |
| What Opportunity Workspace shows today | **Business Notes** tab (`EnterpriseBusinessNote`) — **not** the Dialogue timeline panel |
| What Deal / Loan Workspace shows | **Business Notes** + **LoanFile timeline** / sparse “Recent Timeline” (often EDC/in-memory) |
| Standalone `/dialogue` | Exists, but **not in primary nav**; defaults to **demo context** `opp-demo-001` |
| Why PO cannot easily answer “what work was done?” | History is **emitted** into EDC/EAR from many places, but the **unified reader is not mounted** on operational desks; Notes ≠ full activity/system timeline; Dialogue is hard to discover and demo-scoped |

**Bottom line:** Completeness of *storage* is better than completeness of *operational visibility*. The architecture already allows a unified timeline **if** EAR (plus Notes / ECIE / Deal Timeline) is projected into Opportunity and Deal workspaces. That projection is incomplete today.

---

## B. Dialogue Center architecture

### Naming trap (three senses of “Dialogue”)

| Sense | Meaning |
|-------|---------|
| **A. Enterprise Dialogue Center (EDC)** | Operational timeline module — this audit’s primary subject |
| **B. Lifecycle `dialogue`** | Opportunity `lifecycleStatus = "dialogue"` — stage identity, not the module |
| **C. Lender Program Dialogue** | Durable Prisma threads/messages for lender portal (`LenderProgramDialogueThread` / `Message`) — separate product |

### What EDC is

- **Route:** `ROUTES.DIALOGUE = "/dialogue"` → `src/app/(dashboard)/dialogue/page.tsx` → `DialogueCenterWorkspace`
- **Library:** `src/lib/enterprise-dialogue-center/` (timeline registry, in-memory ports, engine publishers)
- **Types:** `src/types/enterprise-dialogue-center.ts` — `EdcTimelineEntry`, `EdcContextType`, `EdcEventType`
- **HTTP API for Dialogue Center itself:** **None** (no `/api/**/dialogue**`)
- **Prisma model for EDC timeline:** **None**

**Verdict:** EDC is a **projection / compose surface**. Durable chronology SSOT is **EAR**. Code comment in `timeline-registry.ts`: *“EDC is a projection / compose surface. Durable SSOT is EAR.”*

### Runtime behaviour

```text
appendEdcTimelineEntry
  → in-memory EdcPorts.timeline.save
  → best-effort emitEnterpriseActivityBestEffort (EAR)
  → optional EDC-local audit reference (in-memory)

Readers:
  listEdcTimeline / listEdcTimelineByContext (session memory)
  hydrateEdcFromEar (refill memory from EAR)
```

Default adapter: `createInMemoryEdcPorts` only — refresh without EAR hydrate loses session-only entries.

### Access / discoverability

| Path | Present? |
|------|----------|
| Primary left nav (Column 1) | **No** |
| Command palette | **Yes** — “Dialogue” → `/dialogue` |
| Direct URL `/dialogue` | **Yes** |
| Opportunity Workspace primary tabs | **No** — focus keys `dialogue`/`timeline` map to **Notes** |
| Mounted OW panel | `WorkspaceNotesPanel` only |
| `WorkspaceDialoguePanel` | **Code exists · never mounted** (orphan) |

### Standalone page caveat

`DialogueCenterWorkspace` seeds demo entries (when demo seed enabled) and filters by `contextId`, historically oriented around **`opp-demo-001`**. It is **not** a reliable transaction history desk for live Opportunities.

---

## C. Activity / Notepad architecture

### Stores that exist (durable or domain)

| Store | Prisma / runtime | Role |
|-------|------------------|------|
| **EAR** `EnterpriseActivityEvent` | Prisma `enterprise_activity_events` | Universal operational chronology SSOT |
| **Enterprise Business Notes** | Prisma `enterprise_business_notes` | Official business notes; dual-writes EAR (`notes` / `business_notes`) |
| **ECIE** `EnterpriseConversationActivity` | Prisma + session | Voice/typed conversation activities; dual-writes EAR (`ecie`); projects summary into EDC |
| **Deal Timeline** `EnterpriseDealTimelineEvent` | Prisma | Deal domain append-only ledger; dual-writes EAR (`deal_timeline`) |
| **Deal Activity** `EnterpriseDealActivity` | Prisma | Deal CRM follow-up activities (title/status/due) — domain ledger |
| **Deal Note** `EnterpriseDealNote` | Prisma | **Schema exists; no production writer found** (dead / legacy) |
| **Org Activity** `OrganizationActivityEvent` | Prisma | Org MDM ledger; dual-writes EAR |
| **WP Activity** `EnterpriseWealthPartnerActivity` | Prisma | Partner entity ledger (not Opp/Deal chronology) |
| **Lender Program Dialogue** | Prisma threads/messages | Portal dialogue — separate |
| **EDC timeline** | In-memory ports | Projection only |
| **LoanFile `timeline[]`** | Local / Deal projection | Loan Workspace Timeline tab |
| **ETE tasks** | In-memory ports (+ Deal tasks Prisma) | Tasks; ETE appends EDC → EAR |

### “Notepad” naming

Partner Gateway may label category `general` Business Notes as “Notepad” in partner-facing copy. Canonical product meaning remains **Enterprise Business Notes**, not a personal scratchpad store.

---

## D. Opportunity activity flow

### What users can add today

| UI action | Write path | Persist |
|-----------|------------|---------|
| OW **Notes** tab / header Notes button | `POST /api/enterprise-business-notes` | `EnterpriseBusinessNote` (+ EAR) |
| Action Center **Add Activity** | `saveConversationActivity` → `POST /api/enterprise-conversation-activities` | `EnterpriseConversationActivity` (+ EAR + EDC line) |
| Stage / task / doc / workflow panels | `appendEdcTimelineEntry` | EDC memory (+ EAR best-effort) |

### Exact flow — Business Note (primary OW “history-like” surface)

```text
UI: WorkspaceNotesPanel / BusinessNotesActionButton
 → API: POST /api/enterprise-business-notes
 → Service: enterpriseBusinessNotesService.create
 → Repository: enterpriseBusinessNotesRepository
 → DB: enterprise_business_notes
 → Dual-write: EAR emit (eventKind notes, sourceSystem business_notes)
 → Projection/UI: EnterpriseBusinessNotesPanel (OW Notes tab)
```

### Exact flow — Conversation Activity (Action Center)

```text
UI: EnterpriseActivityComposer (Opportunity Action Center)
 → Client: saveConversationActivity (session ECIE)
 → API: POST /api/enterprise-conversation-activities
 → Service: enterprise conversation activity service
 → DB: enterprise_conversation_activities
 → Dual-write: EAR (ecie) + appendEdcTimelineEntry (conversation_activity)
 → Projection/UI: Composer confirmation; EDC/EAR consumers — **not** OW Notes list
```

### Exact flow — System-ish OW emits (stage/task/doc)

```text
UI panels (stage, tasks, documents, workflow, LIFE, …)
 → appendEdcTimelineEntry
 → EDC in-memory + EAR best-effort
 → Intended reader: Dialogue Center / EAR dashboards
 → OW primary UI: **does not list these as a timeline**
```

### Opportunity linkage fields

- Business Notes: `opportunityId`, `entityKind`/`entityId`, optional `dealId`/`contactId`/`lenderId`
- ECIE: `opportunityId`, `contextType`/`contextId`, optional `dealId`/`contactId`
- EAR: `opportunityId` (nullable)
- EDC: `contextRef: { type: "opportunity", id }`

---

## E. Deal activity flow

### What users can add today

| UI action | Write path | Persist |
|-----------|------------|---------|
| Loan / Deal Workspace **Notes** | EBN API (`workspaceKind`/`entityKind` deal) | `EnterpriseBusinessNote` (+ EAR) |
| Deal / Loan Action Center **Add Activity** | ECIE | Conversation activity (+ EAR + EDC) |
| Deal stage / task mutations | `enterpriseDealRepository.appendTimelineEvent` | `EnterpriseDealTimelineEvent` (+ EAR) |
| Deal CRM activities API | `POST /api/enterprise-deals/:dealId/activities` | `EnterpriseDealActivity` (+ timeline event path) |

### Deal linkage

| Store | Link |
|-------|------|
| Deal Timeline / Deal Activity / Deal Note | **Direct `dealId`** |
| Business Notes (deal workspace) | `dealId` + often `opportunityId` |
| ECIE | `dealId` and/or opportunity context |
| EAR | `dealId` and/or `opportunityId` |
| Deal Control “Recent Timeline” | Reads **EDC by opportunityId** (not Deal Timeline API exclusively) |

**Answer:** Deal activities are **primarily Deal-ID domain ledgers**, with Opportunity linkage via `EnterpriseDeal.opportunityId` and optional dual keys on Notes/ECIE/EAR. Partner Deal activity writes **EBN** with both `dealId` and `opportunityId`.

### Exact flow — Deal stage change (system event)

```text
Deal stage mutation (service/repository)
 → appendTimelineEvent (eventType e.g. stage_transition)
 → DB: enterprise_deal_timeline_events
 → Dual-write EAR (deal_timeline → stage_change/workflow kinds)
 → UI: LoanFile timeline projection / GET /api/enterprise-deals/:id/timeline
```

---

## F. System event architecture

Important operational events **are partially captured**, usually as dual-writes into EAR and/or Deal Timeline / EDC:

| Example event | Typically captured? | Where |
|---------------|---------------------|--------|
| Opportunity created / updated | Partial | Domain Opportunity + occasional EDC/EAR emits — not a single “Opp created” consumer UI |
| Lender identified / Deal created | Partial | Deal domain + Deal Timeline / EAR |
| Deal stage changed | **Yes** | Deal Timeline → EAR |
| Document uploaded / requested / verified | Partial | Document request timeline → EDC → EAR (not every Document Registry mutation) |
| Task created / completed | Partial | ETE → EDC → EAR; Deal tasks → Deal Timeline |
| Approval / disbursement | Via stage transitions | Deal Timeline / EAR when stage emits |

**There is no separate “System Events” product table beyond domain ledgers + EAR.**  
EAR `eventKind` / `sourceSystem` classify chronology (e.g. `stage_change`, `workflow`, `document_*`, `task`, `notes`).

---

## G. Audit event architecture

| Concept | Representation | Used as Opp/Deal work history? |
|---------|----------------|--------------------------------|
| **A. Business activity** (human note / call) | EBN, ECIE, Deal Activity | Yes (Notes / composer) |
| **B. System event** (stage moved) | Deal Timeline, EDC stage_change, EAR | Partially (Deal timeline / EAR dashboards) |
| **C. Audit event** (field X changed A→B) | EAF in-memory audit, `OrganizationAuditEntry`, `EnterpriseRegistryAuditEntry`, EDL (config governance) | **No** — governance/config, not operational desk timeline |

**Recommendation (observation only):** EAR already has the shape to present A+B chronologically if readers filter by `opportunityId` / `dealId`. C should remain separate (governance), optionally linked by reference — **do not merge EDL/EAF into operational timeline without a separate product decision**.

---

## H. Current UI locations

| Surface | Activity Visible? | System Events? | Notes? | Timeline? |
|---------|-------------------|----------------|--------|-----------|
| Dashboard Activity strip | EAR-backed when durable | Via EAR kinds | Via EAR notes kind | Dashboard activity list |
| Opportunity Workspace | Composer (ECIE) write | Emitted to EDC/EAR, **not listed as timeline** | **Yes** — Notes tab (EBN) | **No dedicated timeline tab** (maps to Notes) |
| Deal / Loan Workspace | Composer write | Partial (LoanFile timeline / Deal timeline map) | **Yes** — Business Notes | **Yes** — Timeline tab (`FileTimeline`) |
| Deal Control Panel | Composer + recent list | Sparse EDC-by-opp slice | Via Notes & Activity section | “Recent Timeline” (limited) |
| Customer 360 | — | — | EBN panel | Not full EAR |
| Contact Registry | — | — | Not primary chronology | — |
| Dialogue Center `/dialogue` | EDC list (demo-scoped) | EDC event types | Internal message type | Standalone EDC UI |
| Tasks | Task UI | ETE→EDC emits | — | Not unified EAR desk |
| Documents | Upload flows emit EDC | Partial | — | Doc request timeline helpers |
| Lender Program Portal | Portal dialogue threads | Portal audit | — | Separate LPP dialogue |
| Accounting | Financial activity | Accounting events | EBN | Financial timeline (domain) |
| Mission Control | EAR consumers | EAR | EAR | Situation Room providers |
| Wealth Partner App | Partner “activities” = EBN projection | Milestone timeline DTO (not raw EAR) | Partner notepad = EBN | Partner progress timeline |

---

## I. SSOT map

| Concern | Authoritative SSOT | Dual-write / projection |
|---------|-------------------|-------------------------|
| Human official notes | **Enterprise Business Notes** | → EAR |
| Conversation/voice/typed activity | **ECIE** `EnterpriseConversationActivity` | → EAR + EDC line |
| Universal chronology | **EAR** `EnterpriseActivityEvent` | Consumed by dashboards / hydrate EDC |
| Deal stage & deal domain history | **Deal Timeline** | → EAR |
| Deal CRM activities | **EnterpriseDealActivity** | → Deal Timeline path |
| Dialogue Center UI shape | EDC in-memory | ← hydrate EAR; → dual-write EAR |
| Tasks (enterprise) | **ETE** (ports) | → EDC → EAR |
| Document authoring | Document Registry / Document Center | Some request flows → EDC → EAR |
| Config / commercial decisions | **EDL** | Not activity feed |
| Asset framework audit | **EAF** | Not activity feed |
| Org MDM activity | OrganizationActivityEvent | → EAR |
| Partner notepad/activities | EBN (via Partner Gateway) | → EAR |
| Lender portal dialogue | LenderProgramDialogue* | Separate |

---

## J. Activity / Event relationship map (actual)

```text
                    ┌──────────────────────────────┐
 Human note         │ Enterprise Business Notes    │──┐
 (OW / Deal Notes)  └──────────────────────────────┘  │
                                                      │
 Human call/typed   ┌──────────────────────────────┐  │ dual-write
 (Action Center)    │ ECIE Conversation Activity   │──┤
                    └──────────────┬───────────────┘  │
                                   │ projects line     │
                                   ▼                   │
 System / workflow  ┌──────────────────────────────┐  │
 emitters           │ EDC (in-memory projection)   │──┤
                    └──────────────────────────────┘  │
                                                      ▼
 Deal stage/task    ┌──────────────────────────────┐  ┌─────────────────────────┐
                    │ Deal Timeline (+ Deal Act.)  │─▶│ EAR EnterpriseActivity  │
                    └──────────────────────────────┘  │ Event (durable SSOT)    │
                                                      └───────────┬─────────────┘
                                                                  │
                    ┌─────────────────────────────────────────────┼──────────────┐
                    ▼                                             ▼              ▼
           Dashboard / MC EAR readers              hydrateEdcFromEar     (future desk
                                                                        timeline —
                                                                        not mounted
                                                                        on OW)
```

**Intended vs actual read path on Opportunity Workspace:**

```text
Intended (partially designed): emitters → EDC/EAR → Dialogue panel on OW
Actual: emitters → EDC/EAR, but OW shows Notes (EBN) only; Dialogue panel unmounted
```

---

## K. Permissions

- Dialogue `/dialogue` sits behind authenticated dashboard routes; **no dedicated Dialogue permission model** found beyond general auth.
- Business Notes / EAR / ECIE / Deal APIs use existing auth (`requireAccessToken`) and org scoping.
- Partner activities: Partner Gateway ownership (`sourceWealthPartnerId`) + entitlements (`activity_add`, `view`); partner-visible note categories filtered (internal categories hidden).
- **Observation:** A future unified timeline can reuse org-scoped EAR filters by `opportunityId`/`dealId` plus existing workspace access — **no new RBAC model is required for a first reader**, provided it only shows records the user can already open.

---

## L. Performance observations (read-only)

| Area | Observation |
|------|-------------|
| EAR list | Indexed by org + opportunity/deal/contact + `occurredAt`; `take` capped 1–200 — **not** an unbounded full-table scan by design |
| EAR emit | Upsert by `(organizationId, sourceSystem, sourceEventId)` — idempotent dual-write |
| EDC | In-memory list filtered in client; hydrate from EAR on boot — **session-scoped**, not N+1 by design |
| Dual-write | Best-effort; failures do not block workflow (can leave EAR gaps) |
| Risk if naive UI | Calling `getOpportunity` / `getDeal` per timeline row would reintroduce N+1 — **current EAR list API avoids that** if used correctly |
| Deal Control Recent Timeline | Reads EDC by opportunity (memory) — may miss durable EAR-only events until hydrate |

No optimizations performed in this audit.

---

## M. Current gaps (why history feels missing)

1. **No primary-nav Dialogue** — hard to discover.  
2. **OW Dialogue panel unmounted** — emissions exist; reader does not.  
3. **OW “timeline” focus remapped to Notes** — Notes ≠ stage/doc/task chronology.  
4. **Standalone Dialogue defaults to demo context** — not live transaction history.  
5. **Multiple write UIs** (Notes vs Activity composer vs silent EDC emits) without one chronological merge on the desk.  
6. **Deal Timeline vs EDC vs LoanFile timeline** — three presentations, incomplete overlap.  
7. **`EnterpriseDealNote` dead** — confusing schema vs EBN.  
8. **EAR durable only when `ENTERPRISE_PERSISTENCE_MODE=prisma`** — otherwise chronology may be ephemeral/session.  
9. **Best-effort EAR dual-write** — can silently drop events.  
10. **Partner timeline ≠ EAR dump** — milestone DTO; partner “activities” are EBN only.

---

## N. Duplicate / parallel stores

| Parallelism | Intended? | Notes |
|-------------|-----------|-------|
| EDC memory + EAR | **Yes** (projection + SSOT) | Correct pattern if hydrate always runs |
| EBN + EAR notes events | **Yes** | Notes domain + chronology |
| ECIE + EAR | **Yes** | Conversation domain + chronology |
| Deal Timeline + EAR | **Yes** | Deal domain ledger + universal chronology |
| Deal Activity vs ECIE vs EBN | **Overlapping product language** | “Activity” means different things on different desks |
| EnterpriseDealNote vs EBN | **Unintended / legacy** | Prefer EBN; DealNote unused |
| LoanFile timeline vs Deal Timeline | Transitional projection | Compatibility layer |
| Lender Program Dialogue vs EDC | **Separate products** | Do not conflate |

---

## O. Recommended future architecture (DO NOT IMPLEMENT)

1. Keep **EAR** as the only cross-desk chronology SSOT.  
2. Keep domain writers (EBN, ECIE, Deal Timeline, ETE, docs) as sources that **must** emit EAR.  
3. Treat **EDC** as optional UI shape / hydrate target — or retire standalone demo desk in favour of entity-scoped EAR readers.  
4. Mount **one Opportunity Timeline** and **one Deal Timeline** reader that list EAR by `opportunityId` / `dealId`, with Notes remaining the official-note authoring surface.  
5. Do **not** create a Lead entity, PartnerOpportunity history table, or second chronology SSOT.  
6. Keep EAF/EDL out of the operational feed unless explicitly linked as “governance” chips.

---

## P. Recommended future UI placement (DO NOT IMPLEMENT)

| Priority | Placement | Purpose |
|----------|-----------|---------|
| P0 | Opportunity Workspace — Timeline (entity-scoped EAR) | Answer “what work happened on this Opportunity?” |
| P0 | Deal Workspace — Timeline (EAR + Deal Timeline merge or EAR-only) | Answer “what happened with this lender Deal?” |
| P1 | Keep Notes tab for official Business Notes authoring | Do not overload Notes as full chronology |
| P2 | Dashboard / Mission Control continue EAR org feed | Enterprise pulse |
| P3 | Standalone `/dialogue` | Either wire to live context picker or demote until certified |

---

## Q. Exact files / components / APIs involved

### Dialogue Center
- `src/app/(dashboard)/dialogue/page.tsx`
- `src/components/catalyst-one/dialogue/dialogue-center-workspace.tsx`
- `src/components/catalyst-one/opportunity-workspace/workspace-dialogue-panel.tsx` (**orphan**)
- `src/lib/enterprise-dialogue-center/**`
- `src/types/enterprise-dialogue-center.ts`
- `src/constants/enterprise-dialogue-center/**`
- `src/constants/routes.ts` (`DIALOGUE`)
- `src/config/navigation.ts` (command palette only)

### EAR
- Prisma `EnterpriseActivityEvent`
- `src/app/api/enterprise-activity/route.ts`
- `server/services/enterprise-activity/**`
- `server/repositories/enterprise-activity/**`
- `src/lib/enterprise-activity-registry/**`
- `.cursor/rules/enterprise-activity-registry.mdc`
- `docs/co-org-003/**`

### Business Notes
- Prisma `EnterpriseBusinessNote`
- `src/app/api/enterprise-business-notes/route.ts`
- `server/services/enterprise-business-notes/**`
- `src/components/catalyst-one/enterprise-business-notes/**`
- `src/components/catalyst-one/opportunity-workspace/workspace-notes-panel.tsx`

### ECIE / Action Center
- Prisma `EnterpriseConversationActivity`
- `src/app/api/enterprise-conversation-activities/route.ts`
- `src/components/catalyst-one/action-center/workspaces/enterprise-activity-composer.tsx`
- `src/lib/enterprise-conversation-intelligence/save-activity.ts`

### Deal domain
- Prisma `EnterpriseDealTimelineEvent`, `EnterpriseDealActivity`, `EnterpriseDealNote`
- `src/app/api/enterprise-deals/[dealId]/activities/**`
- `src/app/api/enterprise-deals/[dealId]/timeline/route.ts`
- `server/repositories/enterprise-deal/enterprise-deal.repository.ts` (`appendTimelineEvent`)
- `src/components/catalyst-one/execution/deal-control-panel.tsx`
- `src/components/catalyst-one/shared/loan-workspace-modal.tsx` (Timeline + Notes tabs)

### Partner Gateway (observation)
- `src/app/api/partner/opportunities/[opportunityId]/activities/route.ts`
- `src/app/api/partner/deals/[dealId]/activities/route.ts`
- `src/app/api/partner/opportunities/[opportunityId]/timeline/route.ts`
- `server/services/partner-gateway/partner-business.service.ts` / `partner-deal.service.ts`
- `server/services/partner-gateway/partner-ssot-projections.ts`

### Prior related review
- `docs/co-arch-review-002/CO-ARCH-REVIEW-002-DIALOGUE-MODULE-STATUS.md`
- `docs/co-investigation-001/` (historical; EAR now exists)

---

## R. What should NOT be changed (until a separate implementation prompt)

- Do **not** create a Lead entity or Partner-only history tables.  
- Do **not** invent a second chronology SSOT beside EAR.  
- Do **not** delete Business Notes or ECIE.  
- Do **not** silently merge EDL/EAF into operational timeline.  
- Do **not** bypass Partner Gateway ownership for activity visibility.  
- Do **not** treat lifecycle status `dialogue` as Dialogue Center.  
- Do **not** deploy, migrate, or modify production data based on this audit alone.

---

## Architecture diagram (discovered)

```text
Human Activity (notes / calls)
       │
       ├──────────▶ Enterprise Business Notes ──┐
       │                                         │
       └──────────▶ ECIE Conversation Activity ──┤
                                                 │
System / workflow / stage / task / document      │
       │                                         │
       ├──────────▶ EDC (in-memory projection) ──┤ dual-write
       │                                         │
       └──────────▶ Deal Timeline (deal domain) ─┤
                                                 ▼
                                    EAR (Enterprise Activity Event)
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    ▼                            ▼                            ▼
           Dashboard / Mission Control   Dialogue Center UI          Opportunity / Deal
           (EAR readers)                 (/dialogue — demo/orphan     desks TODAY:
                                          panel; hydrate path)        Notes (EBN) ✔
                                                                      Unified timeline ✘
```

---

## Verification performed

- Static codebase investigation only (read/grep/file review).  
- No data mutation, no migrations, no APIs created, no UI changes, **no Vercel deploy**.

---

## STOP

This sprint establishes the **factual architecture** and the **visibility gap**.

**Await Product Owner review and a separate implementation prompt before any change.**
