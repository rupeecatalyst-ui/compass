# CO-MARKETING-ALIGN-001 — Engineering Alignment Report

**Sprint:** CO-MARKETING-ALIGNMENT-001  
**Type:** Alignment / Discovery **ONLY**  
**Date:** 2026-08-12  
**Status:** AWAITING PRODUCT OWNER REVIEW  
**Scope:** Inspect · reason · document · **STOP**

**Explicitly not done:** implementation · schema · migrations · deploy · Google Drive/Sheets connection · email send · WhatsApp send · digital ads · production change

---

## UNDERSTANDING CONFIRMATION

**Engineering understanding matches the Product Owner’s intended model: YES.**

Confirmed alignment on the following non-negotiables:

| PO intent | Engineering reading |
|-----------|---------------------|
| Dedicated Marketing module for acquisition/campaigns | Separate bounded context — **not** an extension of operational CRM desks |
| Must not pollute Contacts / Opportunities / Deals / Loan / Accounting / WP ops | Marketing owns campaign execution; operational SSOTs remain authoritative after handoff |
| Raw audience (~100k+) stays in Google Drive → Sheets → tabs | **Not** mirrored as a 100k+ Supabase “prospect” table |
| Marketing Prospect ≠ Contact ≠ Customer ≠ Opportunity ≠ Deal | No new Lead entity; frozen C1 terminology preserved |
| Campaign-first lifecycle with SAVE ≠ SEND | Explicit states and actions (Draft → … → Completed; Stopped / Cancelled / Failed) |
| Batched, paced, idempotent sending | Recipient processing ledger — not sheet row numbers alone |
| Provider-agnostic email / WhatsApp / digital adapters | Replaceable adapters; no provider chosen in this sprint |
| Qualification before operational entry | OPEN/CLICK stay marketing; qualified response → identity resolve → Opportunity |
| Routing is initial assignment only | Existing Opportunity ownership/permissions remain SSOT after handoff |
| Internal notify via existing engines | ENE (+ CHANAKYA persona); no second notification system |
| Marketing Asset Library ≠ Document Registry | Separate marketing DAM boundary |
| Future scale 1M+ | Async jobs, queues, workers, retries, provider limits |

**Residual uncertainty (PO decisions required before architecture freeze):** listed in §14 and answers **Z** below. None overturn the core model above.

---

## 1. Product Owner understanding

Rupee Catalyst will add a **Marketing Module** inside Catalyst One whose purpose is acquisition:

- Generate loan business and Wealth Partner interest  
- Run email / WhatsApp / (later) digital campaigns  
- Measure engagement, qualify responses, route to C1 users  
- Ultimately create **Opportunities** (and downstream Deals) via **existing** Opportunity architecture  

It is **campaign-driven**, configurable, reusable, and scalable. The external marketing audience database (~100k+, growing toward 1M+) remains outside Supabase. Catalyst One stores **execution, engagement, suppression, attribution, and analytics state** — not a duplicate of the raw sheet.

Crossing into operations happens only after a **qualified business response**, via Contact/identity resolution → Opportunity create — never from open/click alone.

---

## 2. Existing architecture relevant to Marketing

### 2.1 What exists today (inspected)

| Area | What it is | Production-relevant? | Suitable as Marketing engine? |
|------|------------|----------------------|-------------------------------|
| **Partner Marketing desk** (`partner-marketing.service.ts`, WP `/marketing`) | Projects experience-catalogue creatives for partners (brochure / shareable / campaign_announcement types) | Partner Gateway surface | **No** — partner resource projection, not campaign execution |
| **COMPASS public site “marketing” UI** (`src/components/marketing/*`, site routes) | Public website / brochure UI | Public site | **No** — brand site, not acquisition campaign OS |
| **Opportunity `sourceCampaignLabel`** | Free-text attribution field on Lead Information / Opportunity | Yes (manual label) | **Partial** — keep for display; **insufficient** as Marketing attribution SSOT |
| **ECM Contact Registry** | Operational party identity | Yes | **Reuse at handoff only** — not marketing audience store |
| **Enterprise Opportunity Service / Registry** | Opportunity lifecycle SSOT | Yes | **Reuse after qualification** — do not invent Lead |
| **Enterprise Deal Registry** | Per-lender Deal SSOT | Yes | Downstream of Opportunity; Marketing attributes into Deal analytics later |
| **ENE (Enterprise Notification Engine)** | In-app notifications + toast host; CHANAKYA-facing | Yes (CO-NOTIFICATION-001) | **Reuse for assignee notify** — not bulk email |
| **ENCE** | Communication registry; **`ENCE_EXTERNAL_DELIVERY_ENABLED = false`** (simulation) | Simulation / foundation | **Do not overload** as bulk marketing sender; may inform patterns |
| **ECC** | Enterprise Communication Center; sender identities / domains config concepts | Partial | **Reuse concepts** for marketing sending identity config; keep operational vs marketing domains separate |
| **EC360 consent / excludeFromMarketing** | Customer consent / exclusion signals on operational entities | Partial | **Input to suppression** at handoff / enrichment — not sheet audience SSOT |
| **Document Registry / Opportunity Document Center** | Operational documents | Yes | **Do not** store marketing banners/creatives as loan docs |
| **ETE** | Task engine | Yes | Optional post-handoff tasks; **not** campaign queue |
| **Vercel cron** | Currently `/api/cron/enterprise-metrics` pattern | Yes | **Pattern reuse** for batch workers — Marketing needs dedicated cron/queue routes |
| **EBI / EME / dashboards** | Operational / executive metrics | Yes | Marketing Command Center should be **Marketing-owned metrics** consuming attribution joins — not duplicate Opp/Deal formulas |

### 2.2 What does **not** exist

- No Campaign / Audience / MarketingRecipient / MarketingAsset Prisma models  
- No Administration nav entry for a Marketing Command Center  
- No Google Drive / Google Sheets connector  
- No marketing email / WhatsApp / ads provider adapters  
- No recipient processing ledger / batch scheduler / deliverability guard  
- No Marketing Asset Library / content block system  
- No marketing-specific RBAC roles (beyond general org/admin patterns)

### 2.3 Verdict on existing “marketing” naming

**Replace intent for campaign OS:** existing Partner Marketing + site marketing components must **not** be extended into the acquisition engine. They may remain as separate surfaces. The campaign module should be a **new bounded module** with clear naming (e.g. Enterprise Marketing Engine / Marketing Command Center) to avoid collision with Partner Marketing desk.

---

## 3. Proposed bounded-module boundary

```
┌─────────────────────────────────────────────────────────────┐
│  MARKETING BOUNDED MODULE (new)                             │
│  Campaign · Source catalog · Audience defs · Content        │
│  Assets · Execution · Recipient ledger · Engagement         │
│  Suppression · Qualification · Routing policy · Attribution │
│  Marketing analytics · Channel adapters                     │
└───────────────────────────┬─────────────────────────────────┘
                            │ explicit handoff APIs only
┌───────────────────────────▼─────────────────────────────────┐
│  OPERATIONAL CATALYST ONE (unchanged ownership)             │
│  ECM Contact · Opportunity · Deal · Loan · Docs · WP ops    │
│  ENE (notify) · Permissions · Identity · Accounting         │
└─────────────────────────────────────────────────────────────┘
```

**Marketing may call (consume):**

- Auth / org / RBAC  
- ECM search + progressive Contact create (at qualification handoff)  
- Opportunity create/update APIs (at handoff)  
- ENE createNotification (assignee alert)  
- Observability / audit patterns  
- Cron / job infrastructure patterns  

**Marketing must not:**

- Write arbitrary Contact/Opportunity fields without handoff rules  
- Become a second CRM, Lead registry, or Deal owner  
- Use Document Registry as creative DAM  
- Use Gmail/Hostinger as bulk engine  
- Bypass permissions via sheet access  

---

## 4. Data ownership model

| Data | Owner | Storage |
|------|-------|---------|
| Raw audience rows (100k–1M+) | External Marketing DB | **Google Drive / Sheets only** |
| Sheet source catalog (file IDs, tab IDs, sync metadata) | Marketing | C1 DB (config) |
| Audience definition (source + tab + filters + fingerprint rules) | Marketing | C1 DB |
| Campaign + lifecycle + pacing config | Marketing | C1 DB |
| Content templates / blocks / versions | Marketing | C1 DB (+ asset refs) |
| Marketing assets (binaries / CDN URLs) | Marketing DAM | Object storage + Marketing Asset metadata in C1 |
| Recipient processing state (per campaign × identity key) | Marketing | C1 DB (ledger — **not** full row mirror) |
| Delivery / engagement events | Marketing | C1 DB (or append-only event store) |
| Consent / suppression (marketing) | Marketing | C1 suppression ledger (+ consume EC360 signals) |
| Qualification records | Marketing | C1 DB |
| Routing policy + durable RR cursor | Marketing | C1 DB |
| Attribution chain IDs | Marketing | C1 DB; stamped onto Opportunity/Contact via governed fields |
| Contact / Opportunity / Deal | Operational SSOTs | Existing C1 |

---

## 5. Google Sheets source model

```
Google Drive file
    → Google Spreadsheet
        → Sheet / Tab (discovered dynamically)
            → Audience dataset (logical)
```

**Principles:**

1. Do **not** hard-code tab names (Self Employed, Salaried, …).  
2. Connector discovers files/tabs via Google APIs at config time.  
3. Campaign binds: `driveFileId` + `spreadsheetId` + `sheetId`/`gid` + optional filter expression.  
4. Read path for execution: streaming / ranged reads with cursor + checksum — **not** bulk import to Supabase.  
5. Sheet mutations are expected; identity of a recipient must use a **stable fingerprint** (normalized email/phone hash + optional external row key column if present), **not** row index alone.

**Integration recommendation (future sprint — not now):**

- Dedicated `MarketingGoogleSheetsAdapter` behind ports  
- Service account or OAuth with least privilege (Drive file scope)  
- Secrets in env / vault — never in campaign JSON  
- Rate-limit and cache schema (headers) separately from row streaming  

---

## 6. Campaign model

**Campaign** is the reusable business object.

Suggested conceptual fields (architecture only):

- Identity: name, objective, product/service, org  
- Source: Drive → Sheet → Tab + audience filters  
- Channel: EMAIL | WHATSAPP | DIGITAL (extensible)  
- Content: template/version refs, personalization map  
- Sender identity: marketing subdomain / WhatsApp WABA / ads account  
- Schedule + batch: size, interval, daily cap, window, TZ, start/end  
- Routing + notification policies  
- Status + analytics rollups + attribution key  

**Lifecycle (conceptual):**

`DRAFT → PREVIEW → READY/REVIEW → APPROVED → SCHEDULED → RUNNING ⇄ PAUSED → COMPLETED`  
Also: `STOPPED | CANCELLED | FAILED`

**Actions ≠ auto-send:** SAVE, PREVIEW, APPROVE, PUBLISH, SCHEDULE, RUN, PAUSE, RESUME, STOP, COMPLETE — each explicit.

**Reusability:** clone campaign · campaign template · reusable audience · content · assets · sender · routing · notification policies.

---

## 7. Routing model

Configured **per campaign** (or reusable Routing Policy):

1. SINGLE_USER  
2. ROUND_ROBIN (durable cursor in DB; transactional claim)  
3. TEAM / USER_POOL  
4. RULE_BASED (future)

**Boundary:** Marketing routing assigns the **qualified response / initial Opportunity owner** only. After Opportunity exists, C1 ownership, RBAC, and Deal assignment rules remain authoritative. Do **not** invent a parallel operational ownership engine.

Round-robin must survive retries/idempotency: store `(campaignId, responseId) → assigneeId` once; RR cursor advances only on successful claim.

---

## 8. Notification model

| Audience | Channel | Engine |
|----------|---------|--------|
| Internal C1 assignee | In-app (primary) | **ENE** — CHANAKYA persona |
| Internal C1 assignee | Email / WhatsApp digest (future) | Prefer ENCE/ECC paths when external delivery is certified — **not** marketing bulk adapters |
| Wealth Partners | Partner surfaces / Gateway | **Not** CHANAKYA internal messaging |

Campaign configures: immediate vs digest; channels allowlisted. **No second notification system.**

---

## 9. Integration model

```
Marketing Engine
  ├── SheetsSourceAdapter (Google)
  ├── EmailDeliveryAdapter (ESP TBD)
  ├── WhatsAppDeliveryAdapter (BSP TBD)
  ├── DigitalAdsAdapter (platform TBD)
  ├── Handoff → ECM + Opportunity Service
  ├── Notify → ENE
  └── Events → Attribution + Analytics
```

Providers are **replaceable**. Capabilities required of email ESP (recommend for PO vendor selection later):

- Transactional/marketing send API with idempotency keys  
- Templates or raw MIME / HTML  
- Webhooks: delivery, bounce (hard/soft), complaint, open, click, unsubscribe  
- Suppression list sync or event-driven unsubscribe  
- Domain auth (SPF/DKIM/DMARC), subdomain sending  
- Rate limits / batch APIs · reputation metrics  

WhatsApp: template approval, consent, opt-out, delivery receipts, rate limits.  
Digital: campaign create/sync, spend/conversion webhooks — no single-platform hard-code.

---

## 10. Security model

- Marketing uses existing org auth + RBAC.  
- New permissions suggested (future): `marketing.campaign.*`, `marketing.source.*`, `marketing.asset.*`, `marketing.analytics.*`, `marketing.approve`.  
- Sheet credentials and audience PII access: admin-only; audit access.  
- Campaign admins only see sources/users/analytics they are authorized for.  
- Handoff respects ECM/Opportunity create permissions of the **acting system user / assignee**.  
- Marketing must not become a bypass to customer/Opportunity data.

---

## 11. Scalability model

For 100k → 1M+:

- Async job queue (or durable cron + lease locks) for batch ticks  
- Configurable batch size / interval / daily cap / send window  
- Idempotent recipient ledger with unique `(campaignId, recipientFingerprint, channel)`  
- Provider throttling + Deliverability Guard (HEALTHY / WARNING / CRITICAL)  
- Webhook workers for engagement (at-least-once + dedupe by provider event id)  
- Do not rely on Vercel serverless alone for multi-hour campaigns without durable state (lease + next_run_at)  

---

## 12. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Accidental 100k row import to Supabase | High | Architecture freeze: no prospect mirror table |
| Confusing Partner Marketing desk with Campaign OS | Medium | Separate module name + nav; do not extend WP marketing service |
| Using ENCE as bulk ESP | High | Keep ENCE operational/simulation; Marketing Email Adapter separate |
| Mixing creatives into Document Registry | Medium | Marketing Asset Library |
| Double-send on retry | Critical | Idempotent ledger + provider idempotency keys |
| Row-number identity after sheet edits | High | Fingerprint + optional stable external key column |
| Premature Opportunity on open/click | High | Explicit qualification gate |
| Parallel ownership after handoff | High | Routing only at qualification; then Opportunity SSOT |
| Domain reputation bleed | High | Dedicated marketing subdomain + ESP |
| Silent modification of ECM/Opp for “convenience” | High | Dependency list + PO approval for any operational extension |
| Serverless timeout mid-batch | High | Small batches + durable cursor + lease |

---

## 13. Dependencies

### Reuse as-is (no silent rewrite)

- Auth / org / RBAC patterns  
- ECM Contact APIs (search + progressive create)  
- Enterprise Opportunity create  
- ENE in-app notifications  
- Cron auth pattern (`CRON_SECRET`)  
- Observability / audit conventions  

### Likely **extensions** (must be reported & PO-approved — not silent)

| Dependency | Why |
|------------|-----|
| Opportunity attribution fields | `sourceCampaignLabel` alone is weak; may need structured `marketingCampaignId` / `marketingResponseId` / channel stamps |
| ENE event types / CEI titles | New “qualified marketing response” notification types |
| Admin navigation | New Marketing Command Center under Administration or dedicated primary entry (PO decision) |
| Permissions matrix | Marketing roles |
| Object storage / CDN | Marketing assets |
| Job/queue infrastructure | Beyond single metrics cron |
| EC360 / consent bridge | Map operational marketing exclusion into suppression |
| Partner Gateway (optional later) | If WP acquisition responses need partner-facing notify |

### Explicitly **out of scope** for Marketing to own

- Contact Registry redesign  
- Opportunity lifecycle redesign / new Lead entity  
- Deal / Lender Pipeline / Document Center  
- Replacing ENCE/ECC for all org email  

---

## 14. Decisions required (Product Owner)

Before the **implementation architecture** prompt:

1. **Nav placement:** Administration-only vs primary-nav “Marketing Command Center”?  
2. **Module name:** Enterprise Marketing Engine vs Marketing Command Center branding?  
3. **Stable recipient identity:** require a mandatory external key column in sheets, or email/phone hash sufficient?  
4. **Minimum PII persisted** on recipient ledger (hash-only vs email/phone plaintext for send)?  
5. **Opportunity attribution schema:** extend `sourceCampaignLabel` only vs add structured foreign keys?  
6. **Who creates Contact:** system service account vs assigned RM at handoff?  
7. **Wealth Partner acquisition path:** Opportunity-only vs WP application entity?  
8. **Approve authority:** any campaign admin vs dual-control approve?  
9. **ESP / WhatsApp BSP shortlist** (selection later — confirm adapter capability checklist OK)?  
10. **Marketing subdomain** naming (example `campaign.rupeecatalyst.com` — confirm later)?  
11. **Deliverability Guard policy:** auto-pause thresholds (PO numbers)?  
12. **Retention:** how long to keep recipient ledger / engagement events?  
13. **Relation to Partner Marketing desk:** keep separate forever?  
14. **Queue technology preference:** Vercel cron + DB leases vs external queue (SQS/Cloud Tasks/Inngest)?  

---

## 15. Recommended next architecture sprint

**CO-MARKETING-ARCH-001** (design-only or ADR + schema proposal — still no provider connect unless PO authorizes):

1. ADR: Marketing bounded context + handoff contract  
2. Logical data model: Campaign, AudienceDefinition, SourceBinding, ContentTemplate, MarketingAsset, RecipientLedger, EngagementEvent, Suppression, Qualification, RoutingPolicy, Attribution  
3. API surface + permission matrix  
4. Sheets adapter interface (discover + stream + fingerprint)  
5. Email/WhatsApp/Digital port interfaces + webhook contracts  
6. Batch executor + Deliverability Guard state machine  
7. Handoff sequence: Qualification → Contact resolve/create → Opportunity create → ENE notify  
8. Analytics metric ownership (Marketing SSOT; join Opp/Deal for revenue)  
9. Phased delivery roadmap (Foundation → Email MVP → WhatsApp → Digital → Command Center analytics)  
10. Replacement / isolation notes for existing “marketing” named surfaces  

**Then** wait for PO certification of ARCH before any implementation wave.

---

# Answers A–Z (engineering)

### A. Does existing C1 architecture support this concept?

**Yes, as a new bounded module** that reuses identity, Opportunity, ENE, auth, and job patterns. **No** existing campaign engine exists; current “marketing” surfaces are **not** this product.

### B. Which enterprise components should Marketing reuse?

Auth/RBAC · ECM (handoff) · Opportunity Service (handoff) · ENE (internal notify) · cron/job patterns · audit/observability · optionally EC360 exclusion signals · optionally ECC sender-identity **concepts** for domain config.

### C. Which components should be isolated inside Marketing?

Campaign SSOT · Sheets connector · audience definitions · recipient ledger · engagement/suppression · content/templates · Marketing Asset Library · channel adapters · qualification · routing policies · marketing analytics · deliverability guard.

### D. Where should the Marketing module live architecturally?

Recommended layout (future):

- `src/lib/enterprise-marketing-engine/` (compose / domain)  
- `server/services/enterprise-marketing-engine/` (API/services)  
- `src/app/(dashboard)/admin/marketing/` or `/marketing/` (PO nav decision)  
- `src/app/api/marketing/**` + `src/app/api/cron/marketing/**`  
- `src/types/enterprise-marketing-engine.ts`  
- `src/constants/enterprise-marketing-engine/`  
- Docs under `docs/co-marketing-*`  

Prisma models namespaced `Marketing*` — separate from Contact/Opportunity tables.

### E. How should Google Drive/Sheets be integrated?

Adapter port · OAuth/service account · discover tabs dynamically · campaign binds file+sheet+tab · stream rows at send time · never bulk-mirror to Supabase.

### F. What should be stored in Catalyst One?

Campaign config · source bindings · audience defs · content/assets metadata · recipient **processing** rows (fingerprint + status + last event) · engagement events · suppression · qualification · routing cursor · attribution IDs · analytics aggregates. Optionally minimal sendable address fields required for delivery (PO decision on PII retention).

### G. What must remain external?

Full raw marketing database rows · Google Sheet as audience SSOT · ESP/WhatsApp/ads provider systems of record for provider-native templates/reputation (synced via webhooks).

### H. How should campaign execution work?

State machine · explicit RUN/SCHEDULE · worker claims campaign lease · loads next eligible unsent fingerprints from sheet stream ∩ ledger · sends via adapter · records result · respects pause/window/cap/guard.

### I. How should batching work?

Per-campaign: `batchSize`, `interval`, `dailyCap`, `sendWindow`, `timezone`, `startAt`, `endAt` — all configurable; no hard-coded 100.

### J. How should recipient state work?

Durable ledger keyed by `(campaignId, fingerprint[, channel])` with statuses e.g. PENDING / CLAIMED / SENT / DELIVERED / BOUNCED / SKIPPED / FAILED; unique constraint + provider idempotency key; survive restart/pause/retry without double-send. **Not** sheet row numbers alone.

### K. How should rich content work?

Content Template + versioned blocks (subject, preview, rich HTML/JSON document model, CTA, disclaimer, unsubscribe) · personalization tokens · desktop/mobile preview · Test Send ≠ production. Prefer structured block editor over plain-text-only.

### L. How should assets work?

**Marketing Asset Library** (metadata in C1 + blob in object storage/CDN). Types: image, banner, logo, creative, content block. **Do not** use Opportunity Document Center / Document Registry as DAM.

### M. How should email provider abstraction work?

`MarketingEmailAdapter` with send / webhook ingest / suppression sync; ESP behind interface; dedicated marketing subdomain; capabilities listed in §9.

### N. How should WhatsApp abstraction work?

Parallel `MarketingWhatsAppAdapter` under same Campaign channel enum; templates + consent + opt-out + receipts; not a separate CRM.

### O. How should digital campaign abstraction work?

`MarketingDigitalAdsAdapter` — platform-agnostic create/sync/attribution webhooks; no single-network hard-code.

### P. How should consent/suppression work?

Marketing Suppression ledger (email/phone/fingerprint, reason, source, campaign scope). Sources: unsubscribe webhook · complaint · hard bounce · manual · EC360 `excludeFromMarketing` when identity is known. Check before every send.

### Q. How should response qualification work?

Engagement events ≠ qualification. Configurable qualification rules (form submit, reply intent, WP application, explicit CTA “apply”, WhatsApp enquiry keyword, etc.) create a Qualification record → then handoff.

### R. How should routing work?

See §7 — durable single/RR/pool; initial assignee only.

### S. How should notifications work?

See §8 — ENE for C1 users; no parallel notify bus; no CHANAKYA to WP automatically.

### T. How should attribution work?

Persist chain: Campaign → Audience → Channel → RecipientFingerprint → Response/Qualification → ContactId → OpportunityId → (later DealId / revenue). Stamp governed fields on Opportunity at create; Marketing analytics joins operational SSOTs read-only.

### U. How does Marketing cross into Contact/Opportunity?

```
Marketing record (external)
  → Engagement (marketing)
  → Qualified Response (marketing)
  → Contact identity resolution / progressive create (ECM)
  → Opportunity create (Opportunity Registry)
  → ENE notify assignee
```

No Lead entity. No auto Opp on open/click.

### V. How do we guarantee operations remain untouched?

Module isolation · handoff-only APIs · no dual write of operational SSOTs · no Document Registry reuse · no ENCE bulk hijack · CHC/ADR before any operational schema extension · Replacement Certification if any legacy “marketing” path is retired.

### W. What existing architecture creates risks/conflicts?

- Naming collision: Partner Marketing / site marketing  
- Weak attribution: free-text `sourceCampaignLabel`  
- ENCE simulation flag may tempt “just enable external delivery” for bulk — wrong tool  
- Document Registry gravity for “assets”  
- Progressive Contact + Opportunity uniqueness rules must be respected at handoff  
- Serverless cron limits vs long campaigns  

### X. What enterprise infrastructure would need extension?

See §13 (Opportunity attribution fields, ENE types, admin nav, permissions, object storage, job runner, consent bridge). Each is a **reported dependency**, not a silent edit.

### Y. What should the implementation sequence be?

1. Alignment (this doc) — **current**  
2. ARCH/ADR + logical model + ports  
3. Foundation schema + Campaign CRUD + lifecycle (no send)  
4. Sheets discover/bind (read-only)  
5. Content + Asset Library + Preview  
6. Recipient ledger + batch worker (dry-run)  
7. Email adapter + Test Send + webhooks  
8. Deliverability Guard  
9. Qualification + routing + ENE + Opportunity handoff  
10. Analytics Command Center  
11. WhatsApp channel  
12. Digital channel  

### Z. What decisions require PO approval before coding?

See §14. **Hard stop until PO reviews this alignment report.**

---

## Existing Marketing-related components — disposition summary

| Component | Reuse? | Action |
|-----------|--------|--------|
| Partner Marketing desk / WP `/marketing` | No (as campaign OS) | **Isolate** — keep as partner resource projection |
| `src/components/marketing/*` (public site) | No | **Isolate** — public COMPASS site |
| `sourceCampaignLabel` | Partial | **Extend or supersede** via structured attribution (PO decision) |
| ENCE / ECC | Patterns only | **Do not** become Marketing ESP |
| ENE | Yes | **Reuse** for assignee notifications |
| ECM + Opportunity | Yes | **Reuse** at qualification handoff only |

---

## Absolute stop

This sprint produced **documentation only**.

- No code modified (other than this report file)  
- No database / migration  
- No deployment  
- No Google / email / WhatsApp connection  

**WAIT FOR PRODUCT OWNER REVIEW** before issuing the implementation architecture prompt.
