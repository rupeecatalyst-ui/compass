# CO-MARKETING-MKT-13 — Production Readiness Report

**Sprint:** CO-MARKETING-MKT-13  
**Type:** Hardening + certification (no major new product functionality)  
**Date:** 2026-08-12  
**Status:** Certification artefacts complete · **STOP — awaiting Product Owner approval**  

**Hard stop (observed):**

- Do **not** deploy to Vercel  
- Do **not** enable real bulk email  
- Do **not** enable real WhatsApp campaigns  
- Do **not** activate production campaign execution  

---

## Final recommendation

**Do not go live with Marketing campaign execution.**

The Enterprise Marketing Engine (EME) is **architecturally bounded** and the **qualified-handoff path is implementable in fixture mode**. Live bulk send, live provider connect, durable Postgres marketing stores, and production cron are **intentionally off**.

| Recommendation | Meaning |
|----------------|---------|
| **Not production-ready for campaign send** | `ENTERPRISE_MARKETING_EXECUTION_ENABLED = false` must remain false |
| **Not production-ready for WhatsApp campaigns** | `ENTERPRISE_MARKETING_WHATSAPP_MODE` default `dry_run`; provider connect false |
| **Handoff BAT only after PO sets live identity mode** | Default `ENTERPRISE_MARKETING_HANDOFF_MODE=fixture` |
| **May remain in certification / BAT as a bounded admin module** | Authoring, audience preview, dry-run execution, qualification queue |

**Product Owner must explicitly approve** any later change that enables live send, live WhatsApp, live Sheets, live ECM/Opportunity writes, or Vercel cron registration.

---

## MKT-01 → MKT-13 status matrix

| Sprint | Scope | Implementation | Verify | Live send | Notes |
|--------|-------|----------------|--------|-----------|-------|
| MKT-01 | Module foundation, nav, permissions, safety | Complete | Script present | Off | Admin Command Center shells |
| MKT-02 | Google Sheets data-source READ | Complete | Script present | Off | Fixture + live adapter; no import |
| MKT-03 | Audience engine | Complete | Script present | Off | Definitions + capped preview; no row mirror |
| MKT-04 | Content + assets + builder | Complete | Script present | Off | Block document + DAM |
| MKT-05 | Campaign lifecycle / approval | Complete | Script present | Off | SAVE ≠ publish |
| MKT-06 | Scheduler, batch, ledger, leases | Complete (in-memory) | Covered by MKT-13 | Off | Dry-run tick; no durable DB |
| MKT-07 | Email delivery port | Complete | Script present | Off | dry_run default |
| MKT-08 | Email composer / content engine | Complete | Script present | Off | HTML, plaintext, UTM, versioning |
| MKT-09 | WhatsApp abstraction | Complete | Script present | Off | Template-only; dry_run |
| MKT-10 | Engagement + analytics | **Complete** | **`verify:co-marketing-mkt-10` Pass** | Off | Dashboard + API + funnel; dry-run Unavailable metrics honest |
| MKT-11 | Qualification + Contact/Opportunity handoff | Complete | Script present | Off | Fixture identity default; no Lead |
| MKT-12 | Routing + ENE notification | Complete | Script present | Off | Assignee-only ENE; retry ledger |
| **MKT-13** | **Hardening + certification** | **This report** | **`verify:co-marketing-mkt-13`** | **Off** | Scale simulation; safety regression |

---

## 1. Architecture compliance

| Check | Result | Evidence |
|-------|--------|----------|
| Marketing Engine is bounded | **Pass** | Isolated package under `server/services/enterprise-marketing-engine` + `/admin/marketing/*`. Not a primary-nav CRM module |
| Existing Catalyst One operational workflows intact | **Pass** | Opportunity/Deal ENE fan-out unchanged (no `explicitRecipientUserIds` on operational create). Contact/Opportunity SSOTs reused only on qualified handoff |
| Raw Google Sheet audience remains external | **Pass** | Stream/preview only. `ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED = false` |
| No 100k+ audience mirror in Supabase | **Pass** | No Prisma `MarketingProspect` / `MarketingAudienceRow`. 100k test generates rows in the fixture adapter and does not persist them |
| Execution ledger = touched rows only | **Pass** | Unique `(campaign, channel, fingerprint)` claim; 100k source produced a batch-sized ledger in verify |
| Idempotency | **Pass** | Ledger `tryClaim`; engagement `providerEventId`; assignment `qualificationId`; ENE dedupe key |
| Pacing | **Pass** | Default 100 / 2.5h / daily cap / send window (`MARKETING_DEFAULT_BATCH_POLICY`) |
| Leases | **Pass** | 90s TTL; concurrent worker skip; expiry reclaim |
| Provider abstraction | **Pass** | Email + WhatsApp ports; dry-run adapters; live blocked |
| Campaign content reusable | **Pass** | Templates, blocks, asset library, immutable approved versions |
| Qualification boundary | **Pass** | Raw recipients are not Contacts/Opportunities/Leads |
| Handoff is controlled | **Pass** | Explicit QUALIFIED only; mass convert refused |

**Hardening in this sprint (not new product features):**

- Audience APIs no longer refuse work because module-level handoff is enabled (regression from MKT-11)  
- Pause / resume / schedule lifecycle now updates the execution lease  
- Synthetic 1k / 10k / 100k **generated** fixture datasets (not stored)  
- Dry-run cron route exists but is **not** registered in `vercel.json`

---

## 2. Security

| Check | Result | Notes |
|-------|--------|-------|
| Provider secrets protected | **Pass** | Server-only env keys (`ENTERPRISE_MARKETING_RESEND_API_KEY`, Sheets private key, WhatsApp tokens). Documented never `NEXT_PUBLIC_*` |
| Frontend cannot access secrets | **Pass** | Sender/WhatsApp APIs reject credential payloads (`SECRETS_NOT_ALLOWED`) |
| RBAC | **Pass** | Admin layout SUPER_ADMIN/ADMIN + marketing permission keys. USER has none. ADMIN does not get `CAMPAIGN_SEND` by default |
| Campaign permissions | **Pass** | Create vs Approve split; SAVE never publishes |
| Audience permissions | **Pass** | Admin marketing APIs; definitions only |
| Source access | **Pass** | `SOURCE_MANAGE`; Sheets live requires service account, not browser keys |
| Recipient data protection | **Pass** | Public qualification DTOs redact match keys; engagement store has fingerprints not raw email/phone payloads |
| Auditability | **Pass** | Marketing audit events for ingest, handoff, execution dry-run, notification |
| Suppression | **Pass** | Org suppression ledger applied in audience preview + execution eligibility |
| Unsubscribe handling | **Pass (foundation)** | `UNSUBSCRIBE` reason exists; footer copy in content engine. **No live ESP unsubscribe webhook wired to production send** (send is off) |
| No unauthorized bulk sending | **Pass** | Execution flag false; provider connect false; live email/WhatsApp modes require both flags |

---

## 3. Execution safety

Verified in `npm run verify:co-marketing-mkt-13` (engineering gate):

| Scenario | Result |
|----------|--------|
| Pause | Tick returns `campaign_paused` |
| Resume | Tick no longer paused |
| Cancel / stop | Lifecycle + `onStop` clears `nextRunAt` |
| Retry | Failed ledger rows reclaimable with `allowRetryFailed`; terminal rows not re-sent |
| Duplicate execution | Same fingerprint not double-claimed while terminal/in-flight |
| Concurrent workers | Second holder gets `lease_held_by_other_worker` |
| Partial failure | Simulated `FAIL` external key / failed finalize; campaign continues |
| Provider rate limit | `RATE_LIMITED` → failed + retryable mapping |
| Scheduler / serverless restart | Lease TTL 90s; expired lease reclaimable; in-memory stores **reset on process restart** (known gap) |
| Campaign restart | Resume + cursor retained unless `resetCursor` |
| Execution lease expiry | Reclaim after `leaseExpiresAt` |

**Known gap:** execution ledger, leases, campaigns, audiences, and qualifications are **in-memory**. A serverless restart loses dry-run progress. Durable Postgres marketing tables were **not** authorised and **must not** be invented in this sprint.

---

## 4. Scalability

| Audience size | Method | Result |
|---------------|--------|--------|
| 1,000 | Generated stream, page-bounded | Pass |
| 10,000 | Generated stream, page-bounded | Pass |
| 100,000 | Generated stream, **not imported** | Pass — count 100,000; max page 200; one dry-run batch claimed 100; ledger 101 touched rows (not 100k); heap delta **32.0MB** |

The 100,000 test **does not** write production records to Supabase. Rows are computed from an index in the fixture adapter.

Audience preview remains capped (`MARKETING_AUDIENCE_SCAN_MAX_ROWS = 2000`). Full 100k eligibility materialization is forbidden.

---

## 5. Pacing

Default policy: **100 recipients every 2.5 hours**, daily max 500, 09:00–19:00 Asia/Kolkata (verify used a 00:00–23:59 window only to exercise ticks in CI).

| Check | Result |
|-------|--------|
| Scheduler does not exceed interval | Tick without `forceRun` returns `not_due_yet` when `nextRunAt` is in the future |
| Paused campaigns remain paused | Pass |
| Recipients not duplicated | Ledger fingerprint uniqueness |
| Restart resumes correctly | Cursor retained; resume clears pause |

Production cron is **not** enabled on Vercel. `POST /api/cron/marketing-execution` is dry-run only and requires `CRON_SECRET`.

---

## 6. Content

| Check | Result |
|-------|--------|
| HTML | Table + inline CSS renderer |
| Plain text | Override or derived from blocks |
| Images | `image` / hero / logo blocks |
| Links | CTA + UTM rewrite when tracking on |
| Personalization | Allowlisted `{{tokens}}` only |
| Mobile rendering | 360px vs 600px desktop |
| Missing personalization | Safe fallbacks (e.g. firstName → “there”) |
| Template versioning | Immutable freeze on approve |
| Corporate footer / signature | Footer + disclaimer blocks |

---

## 7. Handoff

Path verified:

```text
marketing response → qualification → existing Contact match
  → new Contact if unmatched → Dialogue Opportunity → assignment → ENE notify → Opportunity deep link
```

Unqualified (open/click) **cannot** hand off. No Lead entity.

Default identity/opportunity adapters remain **fixture**. Live ECM/Opportunity writes require `ENTERPRISE_MARKETING_HANDOFF_MODE=live` **and** Product Owner approval.

---

## 8. Failure / recovery

| Simulation | Recovery |
|------------|----------|
| Google Sheet / binding unavailable | Fail closed (error, no empty-success swallow on the bound path) |
| Provider unavailable | Live send impossible; dry-run records intent |
| Rate limit | Retryable failed ledger status |
| Malformed recipient | Invalid rows skipped/failed; retry of failed claim allowed |
| Campaign paused | No further claims |
| Database transient failure | **N/A for marketing stores** (in-memory). Operational ECM/Opportunity live path is fail-open on notify only after handoff completes |
| Webhook / event duplication | Engagement `providerEventId` idempotent |
| Worker interruption | In-flight claim aged > 120s can be retried; process restart **loses in-memory ledger** |

Notify failure after handoff **does not** roll back the Opportunity (MKT-12).

---

## 9. Operational UX

| Surface | Status | Operator clarity |
|---------|--------|------------------|
| Marketing Command Center | Present | Safety status + section nav |
| Campaign Registry / Builder | Present | Lifecycle, preview, routing/notification flags |
| Audience selection | Present | External source + filters; no row dump |
| Preview | Present | Desktop / mobile / plaintext |
| Scheduler | Policy on campaign; **no live countdown console** | Gap: operators do not see a dedicated execution progress desk |
| Execution progress | Service summary exists; **not a first-class UI** | Gap |
| Analytics | Functional dashboard + API (`verify:co-marketing-mkt-10`) | Dry-run; ISP “delivered” Unavailable unless ingested |
| Qualification / Handoff | Responses desk | Qualify + handoff + retry notify |
| Campaign status | Lifecycle labels | Understandable |

Understandable for **authoring and qualification**. Not yet an operator-grade live sending console — appropriate because live send is off.

---

## 10. Regression

Executed 2026-08-12 (engineering gates only):

| Gate | Status | Certification weight |
|------|--------|----------------------|
| TypeScript (`tsc --noEmit`, 8GB heap) | ✅ Pass | Engineering only |
| Lint (touched personalization / email-render / cron route) | ✅ No issues | Engineering only |
| Production Next.js build | ⏸️ Not run — **hard stop: no deploy** | Engineering only |
| Marketing verification | ✅ MKT-01, 02, 03, 04, 05, 07, 08, 09, **10**, 11, 12, **13** Pass | Engineering only |
| MKT-06 dedicated script | ⚠️ No dedicated script (covered by MKT-13 execution checks) | Engineering only |
| Catalyst One regression | Opportunity notify path statically unchanged (no `explicitRecipientUserIds`) | Engineering only |
| Authentication | Unchanged | Unchanged |
| Permissions | Marketing keys + admin layout; `CAMPAIGN_SEND` withheld from ADMIN | Engineering only |

**Build passing is not certification.** Live E2E on a deployed URL was **not** executed (hard stop: no deploy).

CO-QA-001: this module is **not** Business Certified.

---

## 11. Deployment requirements (do not execute)

### Migrations

**None authorised.** No Prisma marketing models. Do not add audience-row tables.

### Environment variables (server-only)

| Variable | Required now | Production later |
|----------|--------------|------------------|
| `ENTERPRISE_MARKETING_SHEETS_MODE` | `off` or `fixture` | `live` only with PO + service account |
| `GOOGLE_SHEETS_CLIENT_EMAIL` / `GOOGLE_SHEETS_PRIVATE_KEY` | No | Live Sheets only |
| `ENTERPRISE_MARKETING_EMAIL_MODE` | `dry_run` | `live` only with PO |
| `ENTERPRISE_MARKETING_RESEND_API_KEY` (or SendGrid/SES/SMTP) | No | Live email only |
| `ENTERPRISE_MARKETING_WHATSAPP_MODE` | `dry_run` | `live` only with PO |
| WhatsApp provider tokens | No | Live WhatsApp only |
| `ENTERPRISE_MARKETING_HANDOFF_MODE` | `fixture` | `live` only with PO |
| `CRON_SECRET` | If cron route is ever invoked | Required in production |

**Never** `NEXT_PUBLIC_*` for any of the above.

### Provider credentials

Not configured. Must not be committed. Must not be stored on campaign records.

### Cron

- Route: `POST /api/cron/marketing-execution` (dry-run, refuses if live execution flag is true)  
- **`vercel.json` does not register this cron**  
- Existing Vercel cron remains Enterprise Metrics only  

### Vercel configuration

No change required. Do not add marketing cron or live flags on deploy.

### External integrations

| Integration | Status |
|-------------|--------|
| Google Sheets | Read adapter exists; default off |
| Email ESP | Port + dry-run only |
| WhatsApp BSP | Port + dry-run only |
| ECM Contact | Live adapter exists; default fixture |
| Opportunity Registry | Live adapter exists; default fixture |
| ENE | Additive event type for marketing handoff |

### Feature flags (must remain)

```text
ENTERPRISE_MARKETING_EXECUTION_ENABLED = false
ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false
ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED = false
ENTERPRISE_MARKETING_MASS_HANDOFF_ENABLED = false
```

### Rollback strategy

1. Keep live flags false (current state — nothing to roll back in production send)  
2. If a future deploy enables live send: set execution + provider-connect false immediately; pause campaigns; do not replay ledger  
3. Do not delete Opportunity/Contact records created by approved live handoff  
4. In-memory marketing stores reset on restart — treat as non-durable  

### Production risks

1. **In-memory SSOT** for campaigns/audiences/ledger — lost on serverless restart  
2. **No production ESP/WhatsApp** — cannot claim deliverability  
3. **Live handoff** would write ECM + Opportunity — fixture is the safe default  
4. **Enabling vercel marketing cron without durable ledger** would duplicate or lose batches across instances  
5. **100k live Sheets** still must stream; never import  

---

## 12. Known gaps (honest)

1. No durable Postgres marketing persistence (campaign, audience definition, ledger, lease)  
2. No production ESP/WhatsApp webhook ingress for bounce/complaint/unsubscribe  
3. No operator execution-progress workspace (service-level only)  
4. Digital / ads channel still disabled  
5. ~~MKT-10 has code but no dedicated implementation-report folder~~ → **Closed by MKT-10 completion** (`docs/co-marketing-mkt-10/`, `verify:co-marketing-mkt-10`)  
6. Live E2E Scenario Pack not run on a deployed URL  
7. Multi-instance Vercel workers cannot share in-memory leases  
8. Operator Analytics/Engagement UI was placeholder at MKT-13 close → **Closed by MKT-10 completion** (functional panels + API)  

These gaps are **reasons not to enable live send**, not a licence to invent a second CRM or a 100k Supabase mirror.

---

## 13. Integration status

| System | Mode |
|--------|------|
| Administration Console | Additive Marketing child |
| Google Sheets | External SSOT; read |
| Opportunity Registry | Qualified handoff only |
| ECM Contact | Qualified handoff only |
| ENE / CHANAKYA notification host | Assignee alert on handoff |
| Partner Marketing desk | Isolated — not this engine |
| Document Registry | Not used as creative DAM |

---

## Certification statement

Engineering verification for MKT-13 is an **engineering gate**.

`npm run verify:co-marketing-mkt-13` — **PASS** (2026-08-12).  
Prior marketing verifies MKT-01 → MKT-12 including **MKT-10** — **PASS** (MKT-10 completion re-verified).

This report does **not** grant:

- Business Certification  
- Production Go-Live  
- Live bulk email  
- Live WhatsApp campaigns  
- Production campaign execution  

**STOP and wait for Product Owner approval.**
