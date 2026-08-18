# CO-C1-DIALOGUE-ACTIVITY-AUDIT-001 — Dialogue & Activity Audit / Activation

**Status:** Completed — ready for Product Owner validation  
**Date:** 2026-08-14  
**Scope:** Audit existing Catalyst One Dialogue / Activity architecture and activate an existing, disconnected global Dialogue reader. No Dialogue redesign, schema change, Marketing change, or Accounting change.

## Executive finding

Catalyst One already has durable operational activity infrastructure:

- **EAR — Enterprise Activity Registry** is the universal, append-only operational chronology SSOT.
- **EDC — Enterprise Dialogue Center** is an in-memory projection/reader, not a separate durable Dialogue database.
- Business Notes, conversation activities, Deal timelines, document/workflow/task events, and Outbox communications can dual-write to EAR.

The Product Owner’s discoverability problem was real:

1. `/dialogue` was command-palette/direct-URL only, not in primary left navigation.
2. The standalone reader defaulted to and filtered on demo context `opp-demo-001`, hiding real enterprise activity from the global route.
3. Several entity-specific activity surfaces exist, but use different names: **Activity Timeline**, **Timeline**, **Business Notes**, or **Recent Timeline**.

## Activated

The existing standalone `DialogueCenterWorkspace` was repaired without creating a new activity system:

- Global `/dialogue` now hydrates and displays the durable EAR projection without a demo entity filter.
- Demo entries are never seeded for the global route.
- Scoped callers can still provide an Opportunity context.

No primary-navigation item was added. The frozen global navigation standard permits Dialogue as a supporting command-palette route; adding a new primary item would be a navigation-architecture change outside this activation scope.

## 1. Dialogue route

| Surface | Route / location | Status |
|---|---|---|
| Global Dialogue | `/dialogue` | Activated; now reads global EAR projection |
| Command palette | `Dialogue` → `/dialogue` | Existing |
| Direct URL | `/dialogue` | Existing |
| Opportunity Activity Timeline | Opportunity Workspace → **Activity Timeline** tab | Existing EAR reader |
| Deal Activity Timeline | Deal Workspace timeline surface | Existing EAR reader / Deal timeline projection |

There is no separate canonical global `/activity` route.

## 2. Core components and services

| Concern | Existing implementation |
|---|---|
| Dialogue route | `src/app/(dashboard)/dialogue/page.tsx` |
| Global Dialogue reader | `src/components/catalyst-one/dialogue/dialogue-center-workspace.tsx` |
| EDC projection | `src/lib/enterprise-dialogue-center/` |
| Universal Activity SSOT | `src/lib/enterprise-activity-registry/` |
| EAR API | `GET/POST /api/enterprise-activity` |
| Activity reader UI | `TransactionActivityTimeline` |
| Opportunity reader mount | `WorkspaceDialoguePanel` → Opportunity **Activity Timeline** tab |
| Conversation composer | `EnterpriseActivityComposer` |
| Durable conversation service | `enterpriseConversationActivityService` |
| Business notes service | `enterpriseBusinessNotesService` |
| Deal event ledger | `EnterpriseDealTimelineEvent` repository/service |
| Outbox integration | `EnterpriseOutboxProvider` |

## 3. Existing persistence structures

| Structure | Persistence / role |
|---|---|
| `enterprise_activity_events` / `EnterpriseActivityEvent` | Durable EAR chronology SSOT |
| `enterprise_business_notes` / `EnterpriseBusinessNote` | Durable official business notes; emits EAR |
| `enterprise_conversation_activities` / `EnterpriseConversationActivity` | Durable typed/voice activity when Prisma mode is active; emits EAR |
| `enterprise_deal_timeline_events` / `EnterpriseDealTimelineEvent` | Durable Deal domain ledger; emits EAR |
| `enterprise_deal_activities` / `EnterpriseDealActivity` | Durable Deal CRM/follow-up activity |
| Lender Program Dialogue thread/message models | Durable, portal-specific dialogue; not global EDC |
| EDC timeline ports | In-memory projection only; repopulated from EAR |
| LoanFile timeline projection | Compatibility/runtime projection; not a new universal activity SSOT |

Read-only DB validation observed:

- EAR events: **60** (`documents` 6, `notes` 6, `stage_change` 15, `workflow` 33)
- Conversation activities: **0**
- Business notes: **6**
- Deal timeline events: **679**

This proves durable activity data exists even though the formerly demo-filtered global route did not show it.

## 4. Activity types

| Type | Current state |
|---|---|
| Internal / business note | Durable (`EnterpriseBusinessNote`) + EAR |
| Typed or voice conversation activity | Durable in Prisma mode (`EnterpriseConversationActivity`) + EAR; currently no persisted rows in validation DB |
| Email/WhatsApp from Enterprise Outbox | Simulated ENCE dispatch + EDC projection + best-effort EAR communication record |
| Deal CRM follow-up | Durable `EnterpriseDealActivity` |
| Deal status/stage / workflow | Durable Deal Timeline + EAR |
| Document events | Partial emitters; durable EAR events where emitted |
| Task events | Partial ETE / Deal Timeline emitters; EAR where emitted |
| Notifications | ENCE simulation / notification ledger; EDC event support, not a complete operational email delivery ledger |
| Email received | Not found as a durable inbound-email integration |
| Integrated phone call | Conversation activity supports typed/voice channels; no telephony-provider integration found |
| Attachment/audio | Conversation audio uses Document Registry when uploaded; linked by `audioDocumentId` |

## 5. Entity associations

| Entity | Current association |
|---|---|
| Customer / Contact | EAR `contactId`; Business Notes / ECIE context |
| Opportunity | EAR `opportunityId`; Activity Timeline mounted in Opportunity Workspace |
| Deal | EAR `dealId`; Deal Timeline / Deal Activity direct `dealId` |
| Loan File | ECIE `loanFileId` and EDC `loan` context; legacy/projection timeline remains separate |
| Lender | Deal/lender activity is represented through Deal associations; lender-program dialogue is portal-specific |
| Wealth Partner | `EnterpriseWealthPartnerActivity` and Partner projections; not a global raw-EAR entity scope |
| Internal Employee | Actor fields and employee-authenticated actions; no independent employee-activity chronology surface |

## 6. Dialogue timeline fields

EAR carries:

- Date/time (`occurredAt`, `createdAt`)
- Activity kind and source system
- Actor user/name
- Title and summary
- Context associations (`opportunityId`, `dealId`, `contactId`, `taskId`, `documentId`)
- Payload/audit metadata

The transaction reader renders chronological records, actor, category, source-derived details, search, filters, refresh, and stage transition values where applicable. Attachments are available only through source payload/document association; EDC itself is not an attachment store.

## 7. Operational email relationship

Existing Action Center Outbox dispatch:

```text
Outbox dispatch
 → ENCE simulation (external delivery remains OFF)
 → EDC entry (email/notification)
 → EAR `communications` event, source `outbox`
```

It records recipient, subject/body summary, sender actor, and Opportunity/Deal/Customer association when that Outbox context is provided.

Limitations:

- This is a simulation dispatch path, not live provider delivery.
- The controlled ECC configuration test-send is intentionally simulation-only and does **not** create a business-entity Dialogue record because it has no business entity context.
- No inbound-email provider ingestion was found.

## 8. Operational vs Marketing separation

Operational Dialogue uses EDC/EAR/Outbox/ECIE domain paths. Marketing Engine campaign history was not modified or merged. Marketing live execution remains OFF.

## 9. Permissions

- EAR API requires an authenticated access token for listing and emission.
- Conversation activity API requires authentication and derives actor identity from the access token.
- Entity workspaces rely on existing workspace/auth controls.
- Global Dialogue has no new permission bypass; it reads through the existing authenticated EAR API.

## 10. Validation

| Gate | Result |
|---|---|
| `CO-C1-DIALOGUE-002` timeline regression | PASS |
| Read-only Dialogue/Activity DB verification | PASS |
| Operational email regression gates | PASS |
| TypeScript (`tsc --noEmit`, 8GB heap) | PASS |
| Production build | PASS |
| Touched-file lints | PASS |

## Genuine gaps — not implemented in this activation

1. Dialogue remains a supporting command-palette/direct-URL route, not primary left navigation.
2. No full global reader filters for recipient, channel, lender, Wealth Partner, or employee exist on `/dialogue`.
3. Inbound email and real telephony integration are not implemented.
4. EDC is a projection; it is not a durable conversation/transcript store.
5. Wealth Partner and Lender activity are not yet unified as first-class global EAR filter scopes.
6. Email delivery is still simulation-only; live operational delivery has not been enabled.

## Final status

**Activated and validated.** Existing Activity persistence and entity-scoped timeline features remain intact. The global Dialogue route now exposes meaningful durable operational chronology instead of filtering to a demo Opportunity.
