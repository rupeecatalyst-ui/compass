# CO-INVESTIGATION-001 — Enterprise Activity Registry Architectural Audit

**Code:** CO-INVESTIGATION-001  
**Nature:** INVESTIGATION ONLY — no code changes · no features · no fixes proposed  
**Date:** 2026-08-06  

---

## Executive answer (Q1)

**Does Catalyst One currently have a centralized Enterprise Activity Registry for all business activities?**

### No — not as a universal activity SSOT.

There **is** a module **named** “Enterprise Activity Registry,” but it is **scoped to conversation activities only** (ECIE / CO-VOICE-002). It does **not** centralize stage changes, document uploads, task completions, customer updates, SARATHI turns, or LoanFile operational events.

| Scope | Exists? |
|---|---|
| Universal registry for every user activity | **No** |
| Conversation / voice / typed-note activity registry (ECIE) | **Yes (narrow)** |

---

## 1. What exists under the name “Enterprise Activity Registry”

### Location / module

| Concern | Path |
|---|---|
| Session / client registry | `src/lib/enterprise-conversation-intelligence/activity-registry.ts` |
| Save orchestration | `src/lib/enterprise-conversation-intelligence/save-activity.ts` |
| Types | `src/types/enterprise-conversation-activity.ts` |
| Server service | `server/services/enterprise-conversation-activity/enterprise-conversation-activity.service.ts` |
| API | `src/app/api/enterprise-conversation-activities/route.ts` |
| UI composer | `src/components/catalyst-one/action-center/workspaces/enterprise-activity-composer.tsx` |
| Rule | `.cursor/rules/enterprise-conversation-intelligence.mdc` |
| Architecture | `docs/adr/ADR-021-enterprise-conversation-intelligence-engine.md` |

### Database table

```text
Prisma model: EnterpriseConversationActivity
Table map:    enterprise_conversation_activities
Migration:    prisma/migrations/20260731120000_co_voice_002_conversation_activity/
```

Durable only when `ENTERPRISE_PERSISTENCE_MODE=prisma`. Otherwise session `Map` only (explicit in activity-registry header comments).

### Interfaces / services (evidence)

- `createConversationActivity` · `listConversationActivities` · `listConversationActivitiesByContext` · `getConversationActivity` · `subscribeConversationActivitiesUpdated` · `rememberServerConversationActivity`
- `saveConversationActivity` → Document Registry (audio) + Activity Registry + EDC timeline projection
- `enterpriseConversationActivityService` (server) · `GET/POST /api/enterprise-conversation-activities`

**Approved intended scope (ADR-021 §4):** transcript · AI summary/extractions — **not** all enterprise events.

---

## 2. Where activities are stored instead (fragmented)

| Domain | Store | Evidence |
|---|---|---|
| Conversation / voice notes | ECIE Activity Registry (+ optional Prisma) | `activity-registry.ts` · `EnterpriseConversationActivity` |
| Conversation audio | Document Registry | `save-activity.ts` → `uploadDocumentToRegistry` |
| Timeline projection (dialogue) | Enterprise Dialogue Center (EDC) — **in-memory ports** | `timeline-registry.ts` · `repositories/in-memory.ts` |
| Deal operational updates | LoanFile / Deal DAL embedded `timeline[]` (+ optional note) | `loan-files-utils.ts` `updateLoanFileInStorage` · `deal-data-access.ts` |
| Deal CRM-style activities | `EnterpriseDealActivity` table | `prisma/schema.prisma` `enterprise_deal_activities` |
| Deal append-only timeline (schema exists) | `EnterpriseDealTimelineEvent` | `enterprise_deal_timeline_events` — serialize exists; **not** the Radar/OW primary path |
| Deal notes | `EnterpriseDealNote` | `enterprise_deal_notes` |
| Tasks | Enterprise Task Engine (ETE) + EDC projection | `task-registry.ts` → `registerEteTask` + `appendEdcTimelineEntry` |
| Documents | Document Registry | `src/lib/document-registry/store.ts` |
| Document request uploads | Document Requests + some EDC append | `document-requests/upload-engine.ts` |
| Opportunity Workspace dialogue seed / compose | EDC in-memory | `workspace-dialogue-panel.tsx` |
| SARATHI turns / memory | Enterprise AI conversation memory `Map` (+ continuity storage) | `conversation-memory/store.ts` |
| Radar Daily Work ✓ marks | `localStorage` key `c1:chanakya-radar:daily-operational-work` | `daily-work.ts` |
| Wealth Partner activities | `EnterpriseWealthPartnerActivity` | `enterprise_wealth_partner_activities` |
| Dashboard “Activity Timeline” widget | **Static demo data** | `activity-timeline.tsx` ← `@/data/catalyst-one/dashboard` |

**Related but not a registry:** `src/lib/enterprise-activity-intelligence/` is a **Radar scoring engine** (CO-MC-001), not an activity persistence registry.

---

## 3. Where each user action is persisted

| User action | Persistence target(s) | Notes |
|---|---|---|
| Call completed / voice / typed Activity Composer note | ECIE Activity Registry + EDC entry + audio→Document Registry | `saveConversationActivity` |
| Stage changed (Opportunity Workspace) | Opportunity/Deal stage fields + **best-effort** `appendEdcTimelineEntry` (`stage_change`) in OW context | `opportunity-workspace-context.tsx` |
| Lender pipeline / Deal stage | Deal / LoanFile lender snapshot via `updateDeal` / LoanFile storage; optional `timelineNote` → LoanFile `timeline[]` | `deal-data-access.ts` · `loan-files-utils.ts` |
| Document uploaded | Document Registry record; some paths also EDC `document_upload` | Document Center / request engine / OW context — **Document Registry store itself does not append EDC** |
| Task completed / created | ETE task registry; EDC `task` projection on register | `task-registry.ts` |
| Remark / internal note (Dialogue compose) | EDC timeline entry (in-memory) | `workspace-dialogue-panel.tsx` |
| Customer updated | ECM Contact / Company registries (entity fields) — **not** universal Activity Registry | ECM paths |
| SARATHI conversation | EAI conversation memory `Map` + turn continuity; **not** ECIE Activity Registry by default | `conversation-memory/store.ts` · turn orchestrator |
| Radar “meaningful work” mark | localStorage daily marks and/or LoanFile timeline pattern match | `daily-work.ts` |

**Conclusion:** There is **no single write path** that persists every activity type into one registry.

---

## 4. CHANAKYA Radar Health Score — data source

**Answer: D — Something else** (not Activity Registry; not simply `updated_at`; not primarily stage timestamps).

### Exact implementation

1. **Classification + Deal Health**  
   `classifyOperationalDeal` (`src/lib/chanakya-radar/classify-operational-deal.ts`)  
   - Quadrant → `healthScoreByQuadrant` anchor  
   - Blended with Activity Momentum via `blendDealHealthWithActivityMomentum`

2. **Activity Momentum / state**  
   `computeEnterpriseActivityIntelligence` (`src/lib/enterprise-activity-intelligence/index.ts`)  
   - Scans **`file.timeline`** for pattern-matched “meaningful work” events  
   - Uses `hasMeaningfulWorkToday` (timeline + localStorage marks)  
   - Also uses docs/tasks/status/hold signals on the LoanFile-shaped Deal projection

3. **Idle clock (classification signal)**  
   `timeline[0].timestamp || createdAt || loginDate` — **not** Prisma `updatedAt` alone, **not** ECIE Activity Registry

4. **Average Deal Health**  
   Mean of per-deal blended scores in `buildChanakyaRadarDashboard`

### Explicit non-sources

| Option | Used? | Evidence |
|---|---|---|
| A) Enterprise Activity Registry (ECIE) | **No** | No imports of `listConversationActivities` under `chanakya-radar/` |
| B) `updated_at` timestamps | **Not primary** | Recency from timeline / createdAt / loginDate / meaningful hits |
| C) Stage timestamps alone | **Partial signal only** | `daysInStage` / stage labels — classification inputs, not the Health formula SSOT |
| D) LoanFile/Deal embedded timeline + Activity Intelligence | **Yes** | Primary path |

---

## 5. Opportunity Workspace — Activity Timeline?

**Yes — as Dialogue / Timeline panels**, not as a dedicated “Activity Registry viewer.”

| UI | Data source |
|---|---|
| `WorkspaceDialoguePanel` | `listEdcTimeline()` filtered by `opportunityId` |
| Tab routing `dialogue` / `timeline` | `opportunity-workspace.tsx` / context |
| Demo empty seed | `seedDialogueIfEmpty` writes sample EDC entries when demo seed enabled |

**Does not read from:** ECIE Activity Registry as primary list, LoanFile timeline, Document Registry inventory, SARATHI memory, or Prisma `EnterpriseDealTimelineEvent`.

---

## 6. Where can an executive see complete chronological Opportunity history?

**Nowhere as a complete, durable, cross-source chronology.**

Closest surface:

- Opportunity Workspace → Dialogue / Timeline → **EDC in-memory entries for that opportunity id**

Limitations (evidence-based):

1. EDC ports are **in-memory** (`createInMemoryEdcPorts`) — not a durable enterprise history store.  
2. Many operational events live only on **Deal/LoanFile timeline**, Document Registry, ETE, or ECIE — and are **not guaranteed** to appear in the OW Dialogue list.  
3. Empty panels may show **demo-seeded** sample history when demo seed is on — not production truth.  
4. Dashboard `ActivityTimeline` component uses **static catalog data**, not live Opportunity history.

**Clear statement:** An executive **cannot** open one Opportunity view today and reliably see the complete chronological history of all calls, stage changes, documents, tasks, remarks, and SARATHI conversations for that Opportunity.

---

## 7. Comparison to approved Enterprise Architecture

Approved references:

- ADR-021 · CO-VOICE-001 Architecture Proposal  
- Storage split: Audio→Document Registry · Transcript→Activity Registry · Tasks→ETE · Timeline→EDC  
- Single Activity Composer · no parallel storage systems for conversation assets

### Completed (for conversation slice)

| Piece | Status |
|---|---|
| Named Enterprise Activity Registry (conversation) | Completed (session + optional Prisma) |
| Enterprise Activity Composer | Completed (shared Action Center workspace) |
| Conversation audio → Document Registry | Completed |
| Conversation → EDC projection on save | Completed |
| ADR-021 / CO-VOICE-002 Wave 1 programme artefacts | Completed |

### Partially implemented

| Piece | Status |
|---|---|
| Durable Activity Registry (Prisma mode) | Partial — requires persistence mode + org |
| EDC as enterprise Timeline SSOT | Partial — **in-memory only**, not durable Prisma |
| Cross-workspace timeline consistency (Wave 3) | Partial / aspirational |
| OW Dialogue as unified history | Partial — EDC subset only |
| Radar using “real operational activity” | Partial — LoanFile timeline patterns, not Activity Registry |

### Missing (relative to a universal activity architecture / executive history)

| Piece | Status |
|---|---|
| Centralized registry for **all** activity types | **Missing** |
| Single chronological Opportunity history spanning all SSOTs | **Missing** |
| Radar Health consuming Activity Registry | **Missing** (by design today — uses LoanFile timeline) |
| Automatic Document Registry uploads → EDC for all paths | **Missing / inconsistent** |
| SARATHI turns → Activity Registry / EDC | **Missing** |
| Durable EDC / unified timeline DB | **Missing** |
| `EnterpriseDealTimelineEvent` as operational Radar/OW SSOT | Schema present; **not** primary consumer path |

---

## Evidence index

| Claim | Evidence path |
|---|---|
| Conversation Activity Registry | `src/lib/enterprise-conversation-intelligence/activity-registry.ts` |
| Prisma table | `prisma/schema.prisma` `EnterpriseConversationActivity` |
| Save path | `src/lib/enterprise-conversation-intelligence/save-activity.ts` |
| EDC in-memory | `src/lib/enterprise-dialogue-center/repositories/in-memory.ts` |
| OW timeline reads EDC | `workspace-dialogue-panel.tsx` |
| Radar reads LoanFile timeline | `enterprise-activity-intelligence/index.ts` `listMeaningfulActivityHits` |
| LoanFile timeline append | `loan-files-utils.ts` |
| ETE → EDC | `enterprise-task-engine/task-registry.ts` |
| SARATHI memory Map | `enterprise-ai-platform/conversation-memory/store.ts` |
| Approved conversation SSOT split | `docs/adr/ADR-021-…` · `docs/co-voice-001/…` |

---

## Status

Investigation complete. **No production code modified. No fixes proposed.**
