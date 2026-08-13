# ADR — Enterprise Marketing Engine (EME)

**Programme:** CO-MARKETING-ARCH-001  
**ADR working ID:** ADR-EME-001 (assign formal ADR number on Product Owner certification)  
**Status:** **PROPOSED** · Awaiting Product Owner Review & Architecture Approval  
**Date:** 2026-08-12  
**Type:** Architecture Design ONLY — **Implementation NOT authorised**  
**Foundation:** [`CO-MARKETING-ALIGN-001-ENGINEERING-ALIGNMENT-REPORT.md`](../co-marketing-align-001/CO-MARKETING-ALIGN-001-ENGINEERING-ALIGNMENT-REPORT.md)

**Related (do not reopen / do not violate):**

- ADR-017 / CAD-2026-001 — Business Data Provenance  
- ADR-018 — Start Loan Journey / Opportunity lifecycle (FROZEN)  
- Pre-Launch Single Implementation Rule  
- Business Capability Ownership  
- Enterprise Notification Engine (ENE) constitution  
- Enterprise Contact Master / Opportunity Registry SSOTs  
- Navigation Architecture (Administration = configuration; no operational workspaces parked incorrectly)

---

## 1. Status of authorisation

| Item | Decision |
|------|----------|
| Alignment (CO-MARKETING-ALIGN-001) | Product Owner authorised architecture design |
| This ADR (architecture) | **PROPOSED** — awaiting PO approve / certify / freeze |
| Implementation under this ADR | **NOT authorised** |
| Schema / migrations / providers / deploy | **Forbidden** until separate implementation wave authorisation |

---

## 2. Context

Rupee Catalyst requires a dedicated **Marketing Acquisition Operating System** inside Catalyst One to:

- Acquire loan and Wealth Partner interest via campaigns  
- Execute email / WhatsApp / (later) digital channels  
- Measure engagement, qualify responses, route to users  
- Hand off only qualified responses into existing Contact → Opportunity architecture  

There is **no** existing Campaign Engine suitable for this purpose.

Existing surfaces named “marketing” (Partner Marketing desk, public site marketing UI, free-text `sourceCampaignLabel`) are **not** this system and **must not** be extended into it.

---

## 3. Decision summary (required decisions 1–20)

| # | Decision | Ruling |
|---|----------|--------|
| 1 | Marketing is a new bounded module | **ACCEPT** — Enterprise Marketing Engine (EME) |
| 2 | Existing marketing surfaces are not extended into the acquisition OS | **ACCEPT** — isolate Partner Marketing desk & public site UI |
| 3 | Google Sheets is the initial raw audience source | **ACCEPT** — via Marketing Data Source Port; Sheets = first adapter |
| 4 | Raw audience is not mirrored into Supabase | **ACCEPT** — freeze: no 100k+ prospect mirror table |
| 5 | Marketing stores execution state, not the raw database | **ACCEPT** — see Logical Model |
| 6 | Campaign Engine is provider-neutral | **ACCEPT** — Data Source / Channel ports |
| 7 | Email is provider-neutral | **ACCEPT** — Marketing Email Adapter |
| 8 | WhatsApp is provider-neutral | **ACCEPT** — Marketing WhatsApp Adapter |
| 9 | Digital campaigns are adapter-based | **ACCEPT** — no single ad network hard-code |
| 10 | Marketing Prospect is not an operational Contact | **ACCEPT** — external audience record ≠ ECM Contact |
| 11 | No Lead entity is created | **ACCEPT** — frozen C1 terminology |
| 12 | Qualified response crosses into existing Opportunity architecture | **ACCEPT** — after identity resolution |
| 13 | Existing C1 ownership remains authoritative after handoff | **ACCEPT** — routing is initial assignment only |
| 14 | Enterprise Notification Engine is reused | **ACCEPT** — internal assignee notify |
| 15 | CHANAKYA is reused for internal C1 notifications | **ACCEPT** — persona only; not WP |
| 16 | Campaign routing is configurable | **ACCEPT** — Single / Round Robin / Pool / future rules |
| 17 | Batch execution is asynchronous and idempotent | **ACCEPT** — serverless-safe job model + ledger |
| 18 | Campaign content is versioned | **ACCEPT** — immutable sent snapshot |
| 19 | Marketing assets are reusable | **ACCEPT** — Marketing Asset Library (not Document Registry) |
| 20 | Existing C1 operational workflows remain untouched | **ACCEPT** — additive, isolated module |

---

## 4. Business capability ownership

| Pillar | Value |
|--------|-------|
| Canonical identity | **Enterprise Marketing Engine (EME)** / Marketing Command Center (UI) |
| Canonical route (proposed) | `/admin/marketing` (Command Center) — **PO to confirm** vs primary-nav entry |
| Primary workspace | Marketing Command Center + Campaign Builder |
| Authoritative data owner | EME for campaign/audience-exec/engagement/suppression/qualification/attribution **until** handoff; then ECM + Opportunity + Deal SSOTs |
| Active implementation | **One** — new EME only (Partner Marketing desk remains partner resource projection, not acquisition OS) |

---

## 5. Module boundary

```text
┌──────────────────────────────────────────────────────────────────┐
│ ENTERPRISE MARKETING ENGINE (NEW BOUNDED MODULE)                 │
│                                                                  │
│  Campaign Domain · Data Source Port · Audience Engine            │
│  Content / Template / Asset Library · Preview / Test Send        │
│  Batch / Pacing · Recipient Execution Ledger                     │
│  Channel Adapters (Email / WhatsApp / Digital)                   │
│  Deliverability Guard · Suppression · Qualification              │
│  Routing Policies · Attribution · Marketing Analytics            │
└────────────────────────────┬─────────────────────────────────────┘
                             │ explicit handoff & notify ports only
┌────────────────────────────▼─────────────────────────────────────┐
│ OPERATIONAL CATALYST ONE (UNCHANGED OWNERSHIP)                   │
│  Auth · RBAC · Org · Audit · ECM · Opportunity · Deal · Loan     │
│  Document Center · ENE · (ENCE/ECC operational — not bulk ESP)   │
└──────────────────────────────────────────────────────────────────┘
```

**Reuse ≠ coupling:** EME **calls** published APIs/ports of ECM, Opportunity, ENE, Auth/RBAC, Audit, Cron. It does **not** embed their domain logic, duplicate their stores, or write outside handoff contracts.

---

## 6. Data ownership freeze

### External (SSOT)

```text
Google Drive → Google Spreadsheet → Sheet/Tab → Raw Audience Rows
```

- Dynamic discovery of files/sheets/tabs — **no hard-coded category names**  
- Future sources via same **Marketing Data Source Port** (CSV, Excel, API, DB, …)

### Catalyst One (minimum persistent Marketing state)

| Store | Why |
|-------|-----|
| Campaign + versions + config | Reusable business object; immutable “what was sent” |
| Data-source bindings + audience definitions + filters | Campaign composition without mirroring rows |
| Schedule + batch policy | Pacing / windows / caps |
| Recipient execution ledger | Idempotent “already processed?” without full sheet copy |
| Delivery / engagement events | Analytics + webhooks + attribution |
| Suppression / consent metadata | Eligibility gate |
| Routing + notification policies | Qualification handoff config |
| Attribution links | Chain to Contact/Opportunity/Deal without raw DB |
| Marketing analytics aggregates | Command Center KPIs |
| Audit records | Governance |

**Forbidden:** Supabase table that mirrors the full external marketing database.

---

## 7. Ports (conceptual — not implemented)

### 7.1 Marketing Data Source Port

Responsibilities: list sources · discover datasets (tabs) · read schema/headers · stream/page eligible rows · optional stable external key column · health check.

Initial adapter: Google Drive / Sheets. Engine must not assume Sheets is sole source.

### 7.2 Marketing Email Channel Port

send (idempotency key) · webhook ingest (delivery/bounce/complaint/open/click/unsubscribe) · throttle metadata · suppression sync hooks.

### 7.3 Marketing WhatsApp Channel Port

approved templates · consent/opt-out · send · delivery/failure · rate limits · attribution ids.

### 7.4 Marketing Digital Ads Port

campaign sync · spend/impression/click · conversion webhooks — platform-agnostic.

### 7.5 Operational Handoff Port

identity resolve (ECM) · progressive Contact create · Opportunity create with attribution stamps · optional ETE task (future, PO) · **must not** invent Lead.

### 7.6 Internal Notify Port

ENE createNotification (CHANAKYA persona) for C1 assignees only.

---

## 8. Lifecycle decisions

### Campaign lifecycle (formal)

States: `DRAFT` · `PREVIEW` · `READY_FOR_REVIEW` · `APPROVED` · `SCHEDULED` · `RUNNING` · `PAUSED` · `COMPLETED` · `STOPPED` · `CANCELLED` · `FAILED`

`RESUMED` is modelled as a **transition action** `PAUSED → RUNNING` (not a durable resting state), to avoid ambiguous dual states.

Legal transitions and content immutability: see Logical Model + Data Flow.

**SAVE ≠ SEND.** Explicit actions: SAVE, PREVIEW, APPROVE, PUBLISH/SCHEDULE, RUN, PAUSE, RESUME, STOP, COMPLETE.

### Qualification boundary (frozen)

`OPEN` / `CLICK` / `VIEW` / `VISIT` = marketing activity only.  
Qualified response → identity resolution → Contact reuse/create → Opportunity.  
**No Lead entity.**

---

## 9. Content & assets

- **Block-oriented email document model** with email-safe HTML render pipeline, reusable blocks, template versioning, desktop/mobile preview, Test Send isolated from production ledger path.  
- **Marketing Asset Library** separate from Opportunity Document Center / Document Registry.  
- Campaign Version freezes content + asset refs actually used at APPROVED/SCHEDULED/RUN.

---

## 10. Execution & deliverability

- Asynchronous batch jobs (cron + durable lease + next_run_at) — no long-running HTTP.  
- Configurable batch size, interval, daily max, send window, timezone, start/end.  
- Recipient Execution Ledger keyed by campaign + recipient fingerprint (+ channel); not sheet row index alone.  
- Deliverability Guard: `HEALTHY` continue · `WARNING` throttle/pause-by-policy · `CRITICAL` auto-pause.  
- Dedicated marketing sending subdomain (example only: `campaign.rupeecatalyst.com`) — SPF/DKIM/DMARC/alignment — **not configured in this sprint**.

---

## 11. Routing & notifications

- Modes: Single User · Round Robin · Team/User Pool · future Rule-Based.  
- Durable RR cursor + idempotent `(qualificationId → assigneeId)` claim.  
- After Opportunity create: **Opportunity ownership SSOT** — Marketing does not run parallel ownership.  
- Internal notify: **ENE + CHANAKYA**. No second notification engine.  
- Wealth Partners: do **not** auto-expose CHANAKYA internal messaging.

---

## 12. Security

Reuse Auth · Org · RBAC · Audit. Add Marketing-scoped permissions (create/approve/send/source/asset/analytics/routing). No bypass of operational Contact/Opportunity/Deal permissions at handoff.

---

## 13. Dependencies / extensions required (do not silently modify)

| Dependency | Why | Where | Impact | Recommended solution |
|------------|-----|-------|--------|----------------------|
| Structured Opportunity attribution | `sourceCampaignLabel` insufficient | Opportunity Registry fields / provenance | Enables ROI chain | PO-approved additive fields (`marketingCampaignId`, `marketingQualificationId`, channel) — keep label for human display |
| ENE notification types | New assignee alerts | ENE event catalog / CEI titles | In-app routing alerts | Additive event types only |
| Admin navigation entry | Command Center discoverability | `navigation.ts` / Administration Console | New config surface | Additive admin child — **not** primary-nav CRM module (recommend; PO confirm) |
| Marketing RBAC permissions | Least privilege | permissions matrix | New roles | Additive permissions |
| Object storage / CDN | Creatives | infra | Asset binaries | Marketing DAM bucket + metadata in EME |
| Job runner beyond metrics cron | Batch pacing | `/api/cron/marketing/*` + leases | Durable execution | Cron + DB lease pattern first; external queue later if needed |
| EC360 / excludeFromMarketing bridge | Operational DNC into suppression | Suppression Engine | Eligibility | Read-only consume at known-identity enrichment |
| Queue technology (optional later) | 1M+ scale | infra | Throughput | PO decision: DB-lease cron vs SQS/Cloud Tasks/Inngest |

**Must NOT reuse as acquisition OS:** Partner Marketing desk · public `src/components/marketing/*` · ENCE as bulk ESP · Document Registry as creative DAM · ETE as campaign send queue · inventing Lead.

---

## 14. Legacy Retirement Impact

| Capability | Current | Proposed | Retirement |
|------------|---------|----------|------------|
| Acquisition campaigns | None | EME | N/A — greenfield |
| Partner Marketing desk | Partner creatives projection | Unchanged | **Do not retire** — isolate naming |
| Public site marketing UI | Brand site | Unchanged | **Do not retire** |
| `sourceCampaignLabel` | Manual free text | Display + optional bridge from EME stamps | **Do not remove** without Replacement Certification |

Replacement Certification required only if/when any of the above is retired or redirected.

---

## 15. Consequences

### Positive

- Clear acquisition OS without polluting CRM SSOTs  
- Scale to 100k–1M+ without mirroring raw DB  
- Provider replaceability  
- Auditable, versioned, paced campaigns  
- Clean qualification → Opportunity path  

### Risks / trade-offs

- Sheets latency & mutation require fingerprint design  
- Serverless needs careful lease/idempotency design  
- Attribution requires PO-approved Opportunity field extension  
- Two “marketing” nouns in product (Partner vs EME) — naming discipline required  

---

## 16. Architecture artefacts in this package

1. This ADR  
2. [`CO-MARKETING-ARCH-001-LOGICAL-MODEL.md`](./CO-MARKETING-ARCH-001-LOGICAL-MODEL.md)  
3. [`CO-MARKETING-ARCH-001-DATA-FLOW.md`](./CO-MARKETING-ARCH-001-DATA-FLOW.md)  
4. [`CO-MARKETING-ARCH-001-INTEGRATION-MATRIX.md`](./CO-MARKETING-ARCH-001-INTEGRATION-MATRIX.md)  
5. [`CO-MARKETING-ARCH-001-UI-UX-ARCHITECTURE.md`](./CO-MARKETING-ARCH-001-UI-UX-ARCHITECTURE.md)  
6. [`CO-MARKETING-ARCH-001-IMPLEMENTATION-ROADMAP.md`](./CO-MARKETING-ARCH-001-IMPLEMENTATION-ROADMAP.md)  

---

## 17. Final stop

Architecture design only. **No code · no schema · no migration · no provider · no deploy.**

**WAIT FOR PRODUCT OWNER REVIEW AND APPROVAL** before any implementation prompt.
