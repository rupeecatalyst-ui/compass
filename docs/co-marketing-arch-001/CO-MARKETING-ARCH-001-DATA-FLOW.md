# CO-MARKETING-ARCH-001 — Data Flow Architecture

**Status:** PROPOSED (architecture only)  
**Companion:** ADR · Logical Model · Roadmap

---

## 1. Architecture diagram (system context)

```text
                 ┌─────────────────────────────┐
                 │  Marketing Command Center   │
                 │  (Campaign Builder / Ops)   │
                 └──────────────┬──────────────┘
                                │
                 ┌──────────────▼──────────────┐
                 │ Enterprise Marketing Engine │
                 │ (Campaign · Audience · Exec)│
                 └───┬──────────┬──────────┬───┘
         DataSource  │          │ Channels │  Handoff
             Port    │          │  Port    │   Port
                 ┌───▼───┐  ┌───▼───┐  ┌───▼──────────┐
                 │Google │  │Email  │  │ ECM + Opp +  │
                 │Sheets │  │WA/Ads │  │ ENE          │
                 │(+fut) │  │Adapt. │  │              │
                 └───────┘  └───────┘  └──────────────┘
```

---

## 2. Module boundary diagram

See Logical Model §7. Summary:

- **Inside EME:** everything campaign/acquisition until Qualification handoff completes.  
- **Outside EME:** Contact, Opportunity, Deal, Loan, Documents, Accounting, Partner ops ownership.  
- **Shared infrastructure:** Auth, RBAC, Org, Audit, Cron patterns, object storage (Marketing DAM bucket).

---

## 3. Audience execution flow

```text
Google Drive
    → Google Spreadsheet (file)
        → Selected Tab (dynamic discovery)
            → Apply Audience filters
                → Eligibility checks
                    → Suppression lookup (fingerprint/channel)
                        → Deduplication (ledger + policy)
                            → Campaign Eligible Audience (streamed, not materialized)
                                → Batch Execution (paced claims)
```

**External DB remains external.** Eligible audience is a **virtual** result of streaming + gates.

---

## 4. Batch / pacing engine (serverless-safe)

### 4.1 Design constraints

- Vercel/serverless: **no** long-running HTTP holding 100k sends.  
- Each worker invocation: short, bounded work (one batch or N seconds).  
- Durable state in EME DB: campaign lease, `nextRunAt`, ledger rows.

### 4.2 Job model

```text
Cron tick (e.g. every 1–5 min)  OR  queue wake
  → Find campaigns WHERE status=RUNNING|SCHEDULED
       AND nextRunAt <= now
       AND within send window (timezone)
       AND dailyMax not exceeded
       AND DeliverabilityGuard ≠ CRITICAL (policy)
  → Acquire campaign lease (optimistic lock / leaseToken + expiry)
  → Open DataSource stream from checkpoint (not row number alone;
       prefer external key cursor or fingerprint watermark)
  → For up to batchSize candidates:
       compute fingerprint
       if suppressed/ineligible/already ledgered → SKIP ledger row
       else INSERT ledger CLAIMED (unique) → send via Channel Adapter
            with idempotencyKey
       on provider accept → SENT/ACCEPTED
       on failure → FAILED_RETRYABLE / TERMINAL
  → Update checkpoint, sent counters, nextRunAt = now + interval
  → Release lease
```

### 4.3 Configurable pacing

`batchSize` · `interval` · `dailyMax` · `sendWindow` · `timezone` · `startAt` · `endAt` — all campaign/version policy fields. Example (100 / 2.5h / 9–7) is illustrative only.

---

## 5. Recipient ledger & idempotency

```text
Claim attempt
  → INSERT ledger (campaignId, channel, fingerprint) status=CLAIMED
      ├─ success → proceed send
      └─ unique violation → already processed → skip (no second send)

Provider webhook (delivery/open/…)
  → upsert EngagementEvent by providerEventId (dedupe)
  → update ledger status monotonically (never SENT → unset)

Pause/Resume
  → PAUSED: workers stop new claims; unique ledger prevents double on resume

Sheet row reorder/insert/delete
  → fingerprint/stable key still identifies person; row index never sole key
```

---

## 6. Email channel flow

```text
Campaign Engine
  → Email Channel service
    → Provider Adapter (TBD ESP)
      → Provider API send(idempotencyKey, html, to, headers)
← webhooks: delivery, bounce, complaint, open, click, unsubscribe
  → Engagement + Suppression + Deliverability Guard metrics
```

---

## 7. Deliverability Guard

| State | Typical inputs | Execution response |
|-------|----------------|--------------------|
| **HEALTHY** | Bounce/complaint within policy; auth OK | Continue scheduled batches |
| **WARNING** | Elevated soft bounce, throttle signals, rising complaints | Reduce batch size / lengthen interval / pause new campaigns by policy; alert admins |
| **CRITICAL** | Hard bounce spike, spam complaint threshold, auth failure, provider block | **Auto-PAUSE** RUNNING campaigns on that sender/domain; require human resume |

Guard evaluates rolling windows per sender identity / subdomain / org.

---

## 8. Email domain isolation (design only)

```text
Business mail:           @rupeecatalyst.com          (ops — untouched)
Marketing send identity: @campaign.rupeecatalyst.com (example only)
```

Architecture accounts for SPF · DKIM · DMARC · alignment · bounce domain · list-unsubscribe · reputation isolation. **No configuration in this sprint.**

---

## 9. WhatsApp / Digital (future flows)

Same Campaign Engine → Channel Port → Provider Adapter pattern.  
WhatsApp: template send + consent gate before claim.  
Digital: adapter sync + conversion webhook → Engagement/Qualification rules.

---

## 10. Consent / suppression flow

```text
Audience row (streamed)
  → Consent/Eligibility (channel-appropriate; sheet flags + org policy)
  → Suppression ledger (unsubscribe, invalid, hard bounce, complaint,
       channel opt-out, DNC, prior suppression, EC360 exclude when known)
  → Deduplication
  → Campaign eligibility
  → Send
```

**Consent provenance:** each SuppressionRecord stores `reason`, `source` (webhook | manual | import | EC360), `evidenceEventId`, `recordedAt`, `actorId` if manual.

---

## 11. Qualification → operational handoff

```text
Marketing engagement (open/click/view)     ≠ Opportunity
        │
Configured qualification event
        ▼
Qualified Response (EME)
        ▼
Identity Resolution (ECM search by email/phone)
        ├─ YES → reuse Contact
        └─ NO  → controlled progressive Contact create
        ▼
Opportunity create (Opportunity Registry SSOT)
  + attribution stamps (dependency: structured fields)
        ▼
ENE notify assignee (CHANAKYA persona)
        ▼
Operational ownership / permissions take over
```

**No Lead entity.**

---

## 12. Response lifecycle diagram

```text
[Engagement] → (rules) → [Qualification.NEW]
 → [ROUTING claim] → [HANDOFF_IN_PROGRESS]
 → [Contact resolve/create] → [Opportunity create]
 → [ENE notify] → [HANDOFF_COMPLETE]
 → (ops) Deal / Revenue (read for attribution)
```

---

## 13. Routing lifecycle diagram

```text
Qualification
  → RoutingPolicy.mode
      SINGLE → assignee = configured user
      RR → next member by durable cursor (txn with assignment insert)
      POOL → pick from pool (strategy TBD)
      RULES → future
  → Assignment unique(qualificationId)
  → NotificationPolicy
  → Handoff with initial owner
  → STOP Marketing ownership influence
```

---

## 14. Attribution data flow

```text
Campaign → Audience → Source → Sheet/Tab → Channel
  → RecipientFingerprint → Engagement* → Qualification
  → ContactId → OpportunityId → DealId(s) → Revenue (from ops SSOTs)
```

Stored as AttributionLink + foreign keys; **not** a copy of sheet columns.

---

## 15. Analytics derivation flow

```text
Ledger + EngagementEvent + Qualification + AttributionLink
  → Marketing metric compose (EME-owned acquisition funnel)
  → Join read-only Opportunity/Deal/Disbursement metrics via existing SSOTs
  → Command Center views (comparison, funnel, deliverability)
```

Do **not** duplicate certified Opportunity/Deal revenue formulas — consume them.

---

## 16. Failure / recovery matrix

| Failure | Recovery | Duplicate-send prevention |
|---------|----------|---------------------------|
| Google API down | Backoff; keep RUNNING/PAUSED; retry next tick | No claim without stream; no send without ledger insert |
| Sheet unavailable | Mark source ERROR; pause campaign optional | Same |
| Provider failure / throttle | Retryable ledger status; respect Retry-After | Idempotency key + unique ledger |
| Partial batch failure | Commit successes; retry failures only | Per-recipient ledger |
| Duplicate webhook | Dedupe providerEventId | Monotonic status |
| Serverless kill mid-batch | Lease expiry; CLAIMED without provider id → reclaim/reconcile job | Unique fingerprint; provider idempotency |
| Worker restart | Lease + nextRunAt | Same |
| Pause / resume | Status gate on claim | Ledger uniqueness |
| Source data change | Fingerprint still identity; optional content hash for audit | Same person ≠ new send if already SENT |

---

## 17. Test Send vs production

```text
Test Send → TestSendLog (separate) → Adapter send to allowlisted testers
         → NEVER writes production RecipientExecutionLedger as SENT
         → NEVER increments campaign production analytics as campaign blast
```

---

## STOP

Data-flow design only. No connections established. Awaiting PO review.
