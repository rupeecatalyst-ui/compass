# CO-MARKETING-MKT-07 — Email Delivery Provider Foundation

**Sprint:** CO-MARKETING-MKT-07  
**Status:** Implementation complete · **STOP — awaiting Product Owner review**  
**Architecture:** CO-MARKETING-ARCH-001  
**Builds on:** MKT-06 scheduler + execution ledger dry-run foundation

---

## Summary

MKT-07 introduces a **provider-neutral Email Delivery Port** and supporting infrastructure for campaign email — without enabling live bulk send. The default mode is **`dry_run`**: requests are validated, idempotency is enforced, and delivery intent is recorded with **no external ESP/SMTP contact**.

Live production email remains blocked by:

- `ENTERPRISE_MARKETING_EXECUTION_ENABLED = false`
- `ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false`
- `ENTERPRISE_MARKETING_EMAIL_MODE` default `dry_run` (live requires explicit env + flags + PO approval)

---

## Architecture

```text
Marketing Execution (MKT-06)
  └── tickBatch / runNextBatch
        └── EMAIL channel claim
              └── marketingEmailDeliveryService.deliverForExecutionClaim()
                    ├── resolve sender identity (store — no credentials on campaign)
                    ├── render HTML + plaintext (existing email-render + personalization)
                    ├── validate request (provider-neutral)
                    ├── idempotency (delivery record store + execution ledger)
                    └── MarketingEmailDeliveryPort
                          └── dry_run adapter (MKT-07)
                          └── [future] resend / sendgrid / ses / smtp adapters
```

### Provider boundary

| Layer | Responsibility |
|-------|----------------|
| **Core engine** | Delivery request, outcomes, idempotency, ledger integration |
| **Sender identity store** | Configurable from/reply-to, verification status, opaque provider mapping |
| **Delivery port** | Single `deliver()` contract — vendor replaceable |
| **Adapters** | Provider-specific implementation (credentials from server env only) |
| **Dry-run adapter** | Validate + simulate outcomes — zero network I/O |

---

## Components created

| Path | Purpose |
|------|---------|
| `src/types/enterprise-marketing-email-delivery.ts` | Delivery request, outcomes, sender identity, records |
| `src/constants/enterprise-marketing-engine/email-delivery.ts` | Outcomes, email mode, provider env key map |
| `src/lib/enterprise-marketing-engine/ports/email-delivery.port.ts` | `MarketingEmailDeliveryPort` |
| `src/lib/enterprise-marketing-engine/email-delivery/*` | Validation, outcome→ledger mapping, email redaction |
| `server/services/enterprise-marketing-engine/sender-identity-store.ts` | Configurable sender identities |
| `server/services/enterprise-marketing-engine/delivery-record-store.ts` | Delivery idempotency + observability |
| `server/services/enterprise-marketing-engine/adapters/dry-run-email-delivery.adapter.ts` | Safe dry-run provider |
| `server/services/enterprise-marketing-engine/email-delivery.service.ts` | Port resolver, deliver(), execution integration |
| `src/app/api/admin/marketing/sender-identities/route.ts` | Admin sender CRUD (no secrets) |

## Components modified

| Path | Change |
|------|--------|
| `server/services/enterprise-marketing-engine/execution.service.ts` | EMAIL channel routes through delivery service |
| `src/constants/enterprise-marketing-engine/safety.ts` | MKT-07 flags + sprint marker |
| `src/lib/enterprise-marketing-engine/safety.ts` | `assertEmailDeliveryAllowed`, `assertDryRunExecutionAllowed` |
| `src/lib/enterprise-marketing-engine/ports/email-channel.port.ts` | Legacy alias → delivery types |
| `src/types/enterprise-marketing-campaign.ts` | `senderIdentityId`, `batchPolicy` |
| `server/services/enterprise-marketing-engine/foundation.service.ts` | MKT-07 capability status |
| `.env.example` | Documented `ENTERPRISE_MARKETING_EMAIL_MODE` + provider env keys |

---

## Delivery request (provider-neutral)

Structured request includes: campaign + version + batch context, recipient fingerprint + email, resolved sender identity, subject, HTML + text bodies, optional asset refs, tracking metadata, and **idempotency key**. No vendor-specific fields in the core domain.

---

## Sender identity

- Org-scoped configurable identities with display name, from address, reply-to, active flag, verification status
- Opaque `providerMapping` (type + profile id + `credentialConfigured` boolean)
- Default seeded identity uses example domain — **not** personal Gmail/Hostinger
- Campaign may reference `senderIdentityId`; credentials never stored on campaign records

---

## Security

- Provider API keys / SMTP passwords: **server environment only** (`MARKETING_EMAIL_PROVIDER_ENV_KEYS`)
- Admin API rejects `apiKey`, `smtpPassword`, `password` in request body
- Public DTOs expose `credentialConfigured` boolean only
- Delivery records store **redacted** recipient email (`a***@domain.com`)
- Isolated from Enterprise Communication Center operational send paths

---

## Failure model (provider-neutral)

`ACCEPTED` · `SENT` · `FAILED` · `RETRYABLE_FAILURE` · `PERMANENT_FAILURE` · `RATE_LIMITED` · `BLOCKED` · `CANCELLED`

Dry-run adapter simulates failure classes via recipient email / fingerprint patterns for verification.

---

## Idempotency

1. **Execution ledger** (MKT-06): `(campaignId, channel, recipientFingerprint)`
2. **Delivery record store** (MKT-07): `idempotencyKey` — duplicate `deliver()` returns prior outcome with `duplicate: true`

---

## Verification

```bash
npm run verify:co-marketing-mkt-07
```

Covers: dry-run delivery, malformed email, missing sender, duplicate request, retryable/permanent/rate-limit/blocked outcomes, execution disabled, live send unauthorized, secret protection in API + DTO.

Engineering gates:

- TypeScript: ✅
- Lint: (run `npm run lint`)
- Verify script: ✅

---

## Explicit non-goals (MKT-07)

- No live ESP/SMTP adapter implementation
- No bulk live campaign send
- No Contact/Opportunity workflow changes
- No ENCE/operational communication changes
- MKT-08 not started

---

## Final status

**Ready for Product Owner review** — email delivery infrastructure in dry-run mode only. Live send requires separate PO authorization and future adapter sprint.
