# CO-C1-COMMUNICATION-001 — Inbound Email (Remaining Infrastructure)

Status: **NOT IMPLEMENTED** — documented gap only (no fake ingestion).

## Current state

Catalyst One has **no production inbound mail ingestion** for `connect@rupeecatalyst.com` replies.

Outbound operational email is implemented via Hostinger SMTP (CUSTOMERS profile). Inbound requires a separate, auditable pipeline.

## Required production architecture (future)

```
Customer reply → connect@rupeecatalyst.com mailbox
  → IMAP/POP polling OR Hostinger forwarding webhook (if PO-approved)
  → inbound-mail-ingestion service (server-only)
  → parse Message-ID / In-Reply-To / References / From
  → match sender ECM Contact → Opportunity/Deal (open transaction heuristic)
  → email_received EAR event
  → ENE CUSTOMER_EMAIL_RECEIVED (+ attachment variant)
  → Document Registry (uploadSource: email) for validated attachments
```

## Hostinger prerequisites (ops)

1. Dedicated mailbox or alias for `connect@rupeecatalyst.com` with programmatic access (IMAP/POP or approved webhook).
2. TLS credentials stored as server env only (never Git, never browser, never Postgres).
3. Rate limits and attachment size policy documented.
4. SPF/DKIM/DMARC already aligned for outbound; inbound must not break deliverability.

## Security

- Validate MIME types and size before Document Registry ingest.
- Dedupe on `Message-ID` + attachment hash.
- Never attach to a transaction without confident sender + correlation match.
- Fail closed when correlation ambiguous — queue for manual review instead of wrong transaction linkage.

## ENE event types (reserved in code)

- `CUSTOMER_EMAIL_RECEIVED`
- `CUSTOMER_EMAIL_ATTACHMENT_RECEIVED`

These are defined in the notification engine types but **not emitted** until inbound ingestion is live and tested.

## Certification rule

Do **not** claim inbound email or attachment ingestion works until a controlled production test demonstrates:

1. Reply received in mailbox
2. Ingestion job runs on Hostinger
3. `email_received` activity on correct Opportunity/Deal
4. Dialogue/Activity visible after reload
5. Notification delivered with correct href
