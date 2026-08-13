# CO-MARKETING-MKT-09 — WhatsApp Campaign Channel Foundation

**Sprint:** CO-MARKETING-MKT-09  
**Status:** Implementation complete · **STOP — awaiting Product Owner review**  
**Architecture:** CO-MARKETING-ARCH-001  
**Builds on:** MKT-06 execution ledger · MKT-07 email delivery pattern  

**Hard stop:** Do **not** start MKT-10. Do **not** deploy. No real WhatsApp send.

---

## Summary

MKT-09 introduces a **provider-neutral WhatsApp Delivery Port** parallel to the MKT-07 email delivery architecture. Core Marketing Engine remains unbound to any WhatsApp vendor.

Default mode is **`dry_run`**:

- Validate recipients (E.164-style phone)
- Resolve **approved** templates and substitute variables
- Record delivery / execution observability
- **Never** contact WhatsApp infrastructure

Live WhatsApp remains blocked by:

- `ENTERPRISE_MARKETING_EXECUTION_ENABLED = false`
- `ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false`
- `ENTERPRISE_MARKETING_WHATSAPP_MODE` default `dry_run`

**No free-form bulk messaging** — only approved templates; channel policy enforces `requiresApprovedTemplate` + `forbidFreeFormBulk`.

---

## Architecture

```text
Marketing Execution (MKT-06)
  └── tickBatch / runNextBatch
        └── WHATSAPP channel claim
              └── marketingWhatsAppDeliveryService.deliverForExecutionClaim()
                    ├── assert channel policy (WhatsApp eligible)
                    ├── resolve approved template (store)
                    ├── render variables (provider-neutral)
                    ├── validate request (phone + required vars)
                    ├── idempotency (delivery record + execution ledger)
                    └── MarketingWhatsAppDeliveryPort
                          └── dry_run adapter (MKT-09)
                          └── [future] Meta / BSP adapters
```

### Provider boundary

| Layer | Responsibility |
|-------|----------------|
| **Core engine** | Delivery request, outcomes, idempotency, ledger integration |
| **Template store** | Approved templates: name, category, language, variables, active, approval, opaque provider mapping |
| **Channel policy** | Configurable eligibility: Email · WhatsApp · (extensible DIGITAL) |
| **Delivery port** | Single `deliver()` contract — vendor replaceable |
| **Dry-run adapter** | Validate + simulate outcomes — zero network I/O |

---

## Components created

| Path | Purpose |
|------|---------|
| `src/types/enterprise-marketing-whatsapp-delivery.ts` | Template, request, outcomes, delivery records |
| `src/constants/enterprise-marketing-engine/whatsapp-delivery.ts` | Modes, categories, default channel eligibility, provider env key map |
| `src/lib/enterprise-marketing-engine/ports/whatsapp-delivery.port.ts` | `MarketingWhatsAppDeliveryPort` |
| `src/lib/enterprise-marketing-engine/whatsapp-delivery/template-render.ts` | Render, phone/variable validation, free-form refuse, phone redaction |
| `src/lib/enterprise-marketing-engine/whatsapp-delivery/map-outcome.ts` | Outcome → ledger status mapping |
| `server/services/enterprise-marketing-engine/whatsapp-template-store.ts` | In-memory templates (seeded `welcome_professional`) |
| `server/services/enterprise-marketing-engine/whatsapp-delivery-record-store.ts` | Delivery idempotency + observability |
| `server/services/enterprise-marketing-engine/channel-policy-store.ts` | Email / WhatsApp eligibility (+ future channels) |
| `server/services/enterprise-marketing-engine/adapters/dry-run-whatsapp-delivery.adapter.ts` | Safe dry-run provider |
| `server/services/enterprise-marketing-engine/whatsapp-delivery.service.ts` | Port resolver, preview, deliver, execution integration |
| `src/app/api/admin/marketing/whatsapp/route.ts` | Admin template upsert / preview / dry-run (no secrets) |
| `scripts/co-marketing-mkt-09-verify.mjs` | Engineering verify gate |

## Components modified

| Path | Change |
|------|--------|
| `server/services/enterprise-marketing-engine/execution.service.ts` | WHATSAPP channel routes through WhatsApp delivery service |
| `src/types/enterprise-marketing-campaign.ts` | Optional `whatsappTemplateId` |
| `src/constants/enterprise-marketing-engine/safety.ts` | MKT-09 sprint + WhatsApp mode |
| `src/lib/enterprise-marketing-engine/safety.ts` | `assertWhatsAppDeliveryAllowed` |
| `src/lib/enterprise-marketing-engine/ports/whatsapp-channel.port.ts` | Legacy alias → delivery types |
| `src/lib/enterprise-marketing-engine/ports/index.ts` | Export WhatsApp delivery port |
| `src/lib/enterprise-marketing-engine/disabled-ports.ts` | Disabled WhatsApp delivery port stub |
| `src/constants/enterprise-marketing-engine/index.ts` | Export WhatsApp constants |
| `server/services/enterprise-marketing-engine/foundation.service.ts` | Sprint MKT-09 · `whatsappMode` · `whatsappSend: dry_run_foundation` |
| `server/services/enterprise-marketing-engine/index.ts` | Export WhatsApp / channel-policy services |
| `src/types/enterprise-marketing-engine.ts` | Foundation status WhatsApp fields |
| `.env.example` | `ENTERPRISE_MARKETING_WHATSAPP_MODE` + provider env keys (documented only) |
| `package.json` | `verify:co-marketing-mkt-09` |

---

## Template model

Approved WhatsApp templates support:

- Template name  
- Category  
- Language  
- Variables  
- Active / inactive  
- Approval state (`PENDING` / `APPROVED` / `REJECTED` / …)  
- Opaque provider mapping (no credentials on campaign)

Seeded dry-run template: **`welcome_professional`** (APPROVED, active).

Campaigns may reference `whatsappTemplateId`. Delivery **refuses** free-form body / unrestricted bulk text.

---

## Channel policy

Configurable eligibility (extensible):

| Channel | Default | Notes |
|---------|---------|--------|
| Email | Enabled | MKT-07 dry-run path |
| WhatsApp | Enabled | Requires approved template · forbids free-form bulk |
| Digital (future) | Disabled | Slot reserved for extensibility |

Policy is org-scoped via `channel-policy-store` — not hardcoded into execution for a single vendor.

---

## Dry-run behaviour

1. Channel policy check  
2. Template resolve + approval/active gates  
3. Variable substitution + missing-variable detection  
4. Recipient phone validation  
5. Idempotency key / ledger fingerprint (MKT-06 reuse)  
6. Dry-run adapter outcome simulation  
7. Delivery record + ledger finalize (`delivered` / `failed`)  

**No WhatsApp API, BSP, or Meta Graph calls.**

---

## Idempotency

1. **Execution ledger** (MKT-06): `(campaignId, channel, recipientFingerprint)`  
2. **WhatsApp delivery record store**: `idempotencyKey` — duplicate `deliver()` returns prior outcome with `duplicate: true`

---

## Security / hard gates

- Provider tokens: **server environment only** (documented keys; unused in dry-run)  
- Admin API rejects secrets in body (`apiKey`, `accessToken`, `password`, …)  
- Admin API rejects free-form bulk messaging payloads  
- Delivery records store **redacted** phone  
- Isolated from Enterprise Communication Center operational WhatsApp paths  
- Live adapter path throws / blocked until EXECUTION + PROVIDER_CONNECT + `live` mode (not implemented for production send)

---

## Verification

```bash
npm run verify:co-marketing-mkt-09
```

**Result:** ✅ PASS (engineering gate only)

Covered:

- Template rendering · variable substitution · missing variables  
- Invalid recipients · free-form bulk blocked  
- Dry-run SENT · failure / rate-limit simulation  
- Duplicate idempotency · execution disabled · live not authorized  
- Secrets rejected · channel policy Email + WhatsApp  
- No provider secrets on template DTO  

TypeScript (`tsc --noEmit`): ✅ (no MKT-09-related errors)

---

## Explicitly out of scope (STOP)

- ❌ MKT-10 and later marketing sprints  
- ❌ Real WhatsApp / Meta / BSP sending  
- ❌ Free-form bulk messaging UI or API  
- ❌ Vercel / production deploy  
- ❌ Contact / Opportunity / Deal mutation from Marketing  
- ❌ Durable Postgres marketing stores (still in-memory foundation)

---

## Manual / ops notes

None required for dry-run foundation. Live WhatsApp would later need Product Owner approval, provider credentials in server env, and `ENTERPRISE_MARKETING_*` live flags — **not enabled in this sprint**.

---

## Final status

| Gate | Status |
|------|--------|
| Implementation | ✅ Complete |
| Verify script | ✅ PASS |
| TypeScript | ✅ |
| Deploy | ⏸️ Not started (hard stop) |
| MKT-10 | ⏸️ Not started (hard stop) |
| Business Certification | ⏸️ Awaiting Product Owner · E2E not claimed |

**STOP after MKT-09 verification.**
