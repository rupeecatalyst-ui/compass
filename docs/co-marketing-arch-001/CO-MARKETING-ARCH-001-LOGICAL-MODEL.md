# CO-MARKETING-ARCH-001 — Logical Domain Model

**Status:** PROPOSED (architecture only)  
**Companion:** ADR · Data Flow · Integration Matrix  
**Rule:** Logical entities only — **no Prisma schema · no migrations**

---

## 1. Ownership legend

| Owner | Meaning |
|-------|---------|
| **EME** | Enterprise Marketing Engine (new bounded module) |
| **EXTERNAL** | Google Drive/Sheets (or future Data Source) |
| **ECM** | Enterprise Contact Master |
| **OPP** | Opportunity Registry |
| **DEAL** | Enterprise Deal Registry |
| **ENE** | Enterprise Notification Engine |

---

## 2. Entity catalogue

### 2.1 MarketingDataSourceBinding (EME)

**Responsibility:** Reference to an external audience system; not the rows themselves.

| Concept | Notes |
|---------|-------|
| `id`, `organizationId` | Org-scoped |
| `providerType` | `GOOGLE_SHEETS` \| `CSV` \| `EXCEL` \| `EXTERNAL_API` \| `EXTERNAL_DB` \| … |
| `displayName` | e.g. “Marketing Master Database” |
| `externalLocator` | Drive file id / spreadsheet id / URI — provider-specific opaque config |
| `authRef` | Secret/credential reference — never inline secrets in campaign JSON |
| `discoveryCache` | Optional cached tab list + header schema + refreshedAt |
| `status` | ACTIVE \| DISABLED \| ERROR |

**Relationships:** 1 → N `AudienceDefinition`; discovered children = logical datasets (tabs).

---

### 2.2 MarketingDatasetRef (EME)

**Responsibility:** One discoverable audience dataset inside a source (e.g. one Sheet tab).

| Concept | Notes |
|---------|-------|
| `dataSourceBindingId` | Parent |
| `externalDatasetId` | Sheet gid / tab id — **not** hard-coded name as identity |
| `displayName` | Discovered title (Self Employed, Salaried, …) — display only |
| `schemaFingerprint` | Header hash for change detection |

**Do not** store row payloads here.

---

### 2.3 AudienceDefinition (EME)

**Responsibility:** Reusable “who to target” configuration.

| Concept | Notes |
|---------|-------|
| `dataSourceBindingId` + `datasetRefId` | Source + tab |
| `filterDefinition` | Declarative filters on columns (JSON) |
| `identityStrategy` | How to fingerprint: email/phone normalize+hash; optional required external key column |
| `dedupeScope` | Within campaign / across org marketing |
| `eligibilityRulesRef` | Optional |

**Relationships:** N campaigns may reuse one AudienceDefinition (or clone snapshot into Campaign Version).

---

### 2.4 Campaign (EME)

**Responsibility:** Reusable business campaign object (mutable shell).

| Concept | Notes |
|---------|-------|
| Identity | name, objective, product/service refs, org, owner |
| `status` | Lifecycle state (see §4) |
| `channel` | EMAIL \| WHATSAPP \| DIGITAL (extensible) |
| Pointers | currentDraftVersionId, activePublishedVersionId |
| Policies | routingPolicyId, notificationPolicyId, batchPolicy (or embedded) |
| Deliverability | lastGuardState HEALTHY\|WARNING\|CRITICAL |

**Ownership:** EME. Never an Opportunity.

---

### 2.5 CampaignVersion (EME)

**Responsibility:** Immutable snapshot of “exactly what was approved/sent.”

Frozen at APPROVED (or on first SCHEDULE/RUN — PO refine): content document, asset refs, audience binding snapshot, sender identity, subject/preview, tracking flags, channel template refs, personalization map, disclaimer/unsubscribe blocks, filter snapshot, batch/schedule snapshot.

**Rule:** Running campaigns send from `activePublishedVersionId` only. Edits create a new draft version; require re-approve to publish.

---

### 2.6 ChannelConfig / SenderIdentity (EME)

**Responsibility:** Marketing sending identity separate from business mailbox.

| Concept | Notes |
|---------|-------|
| `channel` | EMAIL / WHATSAPP / DIGITAL |
| `fromName`, `fromAddress` / WhatsApp number / ads account | |
| `subdomain` / domain alignment metadata | SPF/DKIM/DMARC **status flags** (not secrets) |
| `providerAdapterKey` | Which adapter implementation |
| `replyTo`, `unsubscribePolicy` | |

---

### 2.7 ContentTemplate & ContentDocument (EME)

**Responsibility:** Reusable templates + versioned rich campaign body.

**Editor architecture (recommended):**

1. **Canonical model:** structured **block document** (JSON) — subject, preview text, sections (hero, text, image, product card, CTA, divider, disclaimer, unsubscribe).  
2. **Render pipeline:** block document → **email-safe HTML** (inline CSS, table layout where needed, responsive breakpoints) + plaintext alternative.  
3. **Why not raw HTML-only editing as SSOT:** XSS/safety, reuse, personalization tokens, mobile/desktop parity, asset binding.  
4. **Why not “plain text + subject”:** fails PO rich-campaign requirement.  
5. **Personalization:** token map `{{firstName}}` etc. resolved at send from streamed row fields (never invent operational Contact data).  
6. **WhatsApp:** template-id based content (provider-approved), separate from email block doc but same CampaignVersion linkage.  

Reusable **ContentBlock** library entities (disclaimer, CTA, product card) referenced by templates.

---

### 2.8 MarketingAsset (EME)

**Responsibility:** Marketing DAM — images, banners, logos, creatives, block thumbnails.

| Concept | Notes |
|---------|-------|
| metadata | title, mime, dimensions, checksum, CDN/storage URL |
| tags, categories | |
| permissions | org RBAC |
| versioning / archive | |
| **Not** Document Registry | Separate bucket + EME metadata |

---

### 2.9 SchedulePolicy & BatchPolicy (EME)

| Field concepts | Notes |
|----------------|-------|
| `batchSize` | Configurable — example 100 is **not** a hard limit |
| `intervalMs` / interval | e.g. 2.5 hours |
| `dailyMax` | |
| `sendWindowStart/End` | e.g. 09:00–19:00 |
| `timezone` | |
| `startAt`, `endAt` | |
| `nextRunAt` | Worker scheduling |

---

### 2.10 RecipientExecutionLedger (EME) — critical

**Responsibility:** Answer “Has this campaign already processed this recipient?” without copying the sheet.

**Minimal reference strategy:**

| Field | Purpose |
|-------|---------|
| `campaignId` + `campaignVersionId` | Scope |
| `channel` | Multi-channel safety |
| `recipientFingerprint` | Stable hash of normalized email and/or phone (+ optional external key) |
| `identityHints` (optional, minimized) | Encrypted/redacted sendable address **only if required for delivery/retry** — PO decides retention; prefer provider message id after first successful accept |
| `sourceDatasetRefId` | Which tab |
| `sourceRowStableKey` | Optional external key column value if present |
| `sourceContentHash` | Optional hash of identity fields at claim time (detect sheet change) |
| `status` | PENDING_CLAIM \| CLAIMED \| SENT \| ACCEPTED_BY_PROVIDER \| DELIVERED \| BOUNCED_HARD \| BOUNCED_SOFT \| COMPLAINED \| UNSUBSCRIBED \| SKIPPED_SUPPRESSION \| SKIPPED_INELIGIBLE \| SKIPPED_DEDUPE \| FAILED_RETRYABLE \| FAILED_TERMINAL |
| `idempotencyKey` | Unique; also sent to provider |
| `providerMessageId` | |
| `attemptCount`, `lastError` | |
| `claimedAt`, `sentAt`, … | |
| **Unique constraint** | `(campaignId, channel, recipientFingerprint)` |

**What is NOT stored:** full sheet row dump, unrelated columns, entire 100k audience as “prospects.”

Ledger grows with **touched** recipients (sent/skipped/failed), not with unread sheet rows. Unprocessed rows remain only in the external source until claimed.

---

### 2.11 EngagementEvent (EME)

Append-only: OPEN, CLICK, VIEW, VISIT, DELIVERED, BOUNCE, COMPLAINT, UNSUBSCRIBE, REPLY_SIGNAL, FORM_SUBMIT, …  
Dedupe by `(providerEventId)` or hash(provider + event + messageId + type + timestamp bucket).

---

### 2.12 SuppressionRecord (EME)

| Concept | Notes |
|---------|-------|
| fingerprint / channel address | |
| reason | UNSUBSCRIBE \| HARD_BOUNCE \| COMPLAINT \| INVALID \| CHANNEL_OPT_OUT \| DO_NOT_CONTACT \| MANUAL \| EC360_EXCLUDE |
| scope | ORG \| CHANNEL \| CAMPAIGN |
| provenance | source system + evidence event id |
| effectiveFrom / until | |

---

### 2.13 QualificationRecord (EME)

**Responsibility:** First-class “business response” — **not** an Opportunity.

Triggers: enquiry, explicit interest, loan requirement, WhatsApp enquiry, WP application, configured event.  
Links: campaign, version, recipient fingerprint, engagement evidence, channel.  
Status: NEW → ROUTING → HANDOFF_IN_PROGRESS → HANDOFF_COMPLETE → FAILED.  
Stores `assigneeUserId` from routing claim; `contactId`, `opportunityId` after handoff.

---

### 2.14 RoutingPolicy (EME)

Modes: `SINGLE_USER` · `ROUND_ROBIN` · `USER_POOL` · `RULE_BASED` (future).  
Members ordered list; durable `rrCursor` + version.  
Idempotent assignment table: `(qualificationId) → assigneeUserId` unique.

**Boundary:** Initial assignee for handoff only. Post-Opportunity: OPP ownership authoritative.

---

### 2.15 NotificationPolicy (EME)

Channels: IN_APP (ENE required) · EMAIL · WHATSAPP · future.  
Timing: IMMEDIATE · DIGEST (future).  
Maps to ENE event type for internal users. WP path: partner-safe channels only — **no CHANAKYA auto**.

---

### 2.16 AttributionLink (EME)

Preserves chain without raw DB:

`campaignId → audienceDefinitionId → dataSourceBindingId → datasetRefId → channel → recipientFingerprint → engagementIds → qualificationId → contactId → opportunityId → dealIds[] → revenueSnapshot refs`

Operational IDs are **foreign references** (not copies of Contact/Opp rows). Revenue/disbursement metrics **read** Deal/Accounting SSOTs — Marketing does not recalculate certified formulas (enterprise metric single implementation).

---

### 2.17 MarketingAnalyticsSnapshot (EME)

Pre-aggregated or query views: audience estimate, eligible, sent, delivered, bounced, opened, clicked, responded, qualified, contacts, opps, deals, disbursements, revenue, ROI, deliverability health.  
Comparisons: campaign / audience / channel / product. Funnel stages aligned to event taxonomy.

---

### 2.18 MarketingAuditEvent (EME)

Who/what/when for campaign mutations, approve, send controls, source access, asset changes — org audit conventions.

---

### 2.19 Explicit non-entities

| Forbidden / avoided | Reason |
|---------------------|--------|
| `Lead` | Terminology freeze |
| `MarketingProspect` as operational person | External only |
| Full `MarketingAudienceRow` mirror table | No 100k+ Supabase clone |
| Parallel `MarketingContact` | Use ECM at handoff |

---

## 3. Relationship diagram

```text
Organization
  └── MarketingDataSourceBinding
        └── MarketingDatasetRef (discovered tabs)
              └── AudienceDefinition (filters + identity strategy)
                    └── Campaign ──< CampaignVersion (immutable)
                          ├── ContentDocument / ContentTemplate / ContentBlock
                          ├── MarketingAsset (refs)
                          ├── SenderIdentity / ChannelConfig
                          ├── SchedulePolicy / BatchPolicy
                          ├── RoutingPolicy
                          ├── NotificationPolicy
                          ├── RecipientExecutionLedger (*)
                          ├── EngagementEvent (*)
                          ├── QualificationRecord (*)
                          │     └── AttributionLink → ContactId / OpportunityId / DealIds
                          └── MarketingAnalyticsSnapshot
SuppressionRecord (org/channel scoped; consulted pre-send)
```

---

## 4. Campaign lifecycle (formal)

### 4.1 States

| State | Meaning |
|-------|---------|
| DRAFT | Editable; not sendable |
| PREVIEW | Preview/test focus; still not production send |
| READY_FOR_REVIEW | Submitted for approval |
| APPROVED | Version frozen for publish; not yet scheduled/running |
| SCHEDULED | Waiting for start window / next_run |
| RUNNING | Workers actively claiming/sending |
| PAUSED | No new claims; in-flight may finish or cancel-by-policy |
| COMPLETED | Audience exhausted or endAt reached cleanly |
| STOPPED | Hard stop by admin (terminal-ish; may archive) |
| CANCELLED | Abandoned before/during without completion |
| FAILED | Terminal failure (auth, guard critical unresolved, etc.) |

`RESUMED` = **action** transitioning `PAUSED → RUNNING` (or `PAUSED → SCHEDULED` if outside window).

### 4.2 Legal transitions (recommended)

```text
DRAFT → PREVIEW | READY_FOR_REVIEW | CANCELLED
PREVIEW → DRAFT | READY_FOR_REVIEW | CANCELLED
READY_FOR_REVIEW → DRAFT | APPROVED | CANCELLED
APPROVED → SCHEDULED | RUNNING | DRAFT(new version)* | CANCELLED
SCHEDULED → RUNNING | PAUSED | CANCELLED | FAILED
RUNNING → PAUSED | COMPLETED | STOPPED | FAILED
PAUSED → RUNNING | SCHEDULED | STOPPED | CANCELLED | FAILED
COMPLETED → (terminal; clone to new campaign for reuse)
STOPPED → (terminal; optional clone)
CANCELLED → (terminal)
FAILED → DRAFT(recovery clone) | STOPPED
```

\*Edits after APPROVED require **new CampaignVersion** and re-approval; do not mutate frozen version.

### 4.3 Actions vs states

| Action | Effect |
|--------|--------|
| SAVE | Persist draft version — never send |
| PREVIEW | Enter preview / render modes |
| TEST_SEND | Isolated path — **not** production ledger SENT (separate TestSendLog) |
| APPROVE | Freeze version → APPROVED |
| PUBLISH / SCHEDULE | APPROVED → SCHEDULED |
| RUN | SCHEDULED/APPROVED → RUNNING (if policy allows) |
| PAUSE / RESUME / STOP / COMPLETE | As transitions above |

---

## 5. Response / qualification lifecycle

```text
EngagementEvent (OPEN/CLICK/…)     ← marketing only
        │
        ▼ (rule match)
QualificationRecord.NEW
        │
        ▼
ROUTING (claim assignee via RoutingPolicy — idempotent)
        │
        ▼
HANDOFF_IN_PROGRESS
  Identity Resolution (ECM search)
    ├─ found → reuse Contact
    └─ not found → controlled progressive Contact create
  Opportunity create (OPP SSOT) + attribution stamps
  ENE notify assignee (NotificationPolicy)
        │
        ▼
HANDOFF_COMPLETE (contactId + opportunityId set)
```

Thereafter: Opportunity / Deal ownership & permissions = operational SSOTs.

---

## 6. Routing lifecycle

```text
Qualification created
  → load RoutingPolicy
  → try insert Assignment(qualificationId, assigneeId)  [unique]
      ├─ success → advance RR cursor (if RR) in same txn
      └─ conflict → return existing assignee (idempotent)
  → apply NotificationPolicy
  → handoff with assignee as initial Opportunity owner (per OPP create contract)
```

---

## 7. Module boundary diagram

```text
┌──────────────── EME (new) ────────────────┐
│ Domain services + ports + Marketing UI    │
│ Owns: campaigns, ledger, engagement, …    │
└───────┬───────────────┬───────────┬───────┘
        │               │           │
   DataSourcePort  ChannelPorts  Handoff/Notify
        │               │           │
   Sheets/CSV/…    ESP/WA/Ads   ECM/OPP/ENE
```

---

## 8. Data ownership diagram

```text
┌────────────── EXTERNAL ──────────────┐
│ Raw rows (100k–1M+) Google Sheet tabs│
└──────────────────▲───────────────────┘
                   │ stream at execute
┌──────────────────┴───────────────────┐
│ EME: bindings, defs, ledger, events, │
│ suppression, qualification, attrs    │
└──────────────────┬───────────────────┘
                   │ handoff only
┌──────────────────▼───────────────────┐
│ ECM Contact · Opportunity · Deal     │
└──────────────────────────────────────┘
```

---

## STOP

Logical model only. No tables created. Awaiting PO approval.
