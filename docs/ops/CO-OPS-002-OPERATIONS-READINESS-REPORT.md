# CO-OPS-002 — Operations Readiness Report

**Sprint:** Enterprise Operational Excellence & Observability  
**Date:** 2026-07-26  
**Scope:** Observability, diagnostics, monitoring, logging, auditing, operational support  
**Constraint compliance:** No new business features · No workflow changes · No architecture redesign · No UI redesign · No database model changes

---

## Executive summary

Catalyst One now has an **operational foundation** suitable for long-term production support: structured logging with redaction, correlation IDs on API failures, in-process audit/error/performance rings, a System Health API, live enrichment of Mission Control Observability and Alert Center, an operational runbook, and this readiness report.

Support engineers can diagnose failures via `x-correlation-id`, inspect health posture without secrets, and receive derived alerts for database, auth configuration, error rate, login failure spikes, and severe runtime errors.

---

## Operational maturity

| Area | Maturity | Notes |
|------|----------|-------|
| Structured logging | Strong | JSON ops channel; redaction of secrets/PII patterns |
| Correlation | Strong | Header + `ApiError.correlationId` |
| Business audit | Good | Key create/transition/upload/login paths wired; instance ring + console |
| Error observability | Good | Route wrapper + errorResponse recording |
| Performance observability | Moderate | API duration ring + top slow endpoints; client page/workspace timers deferred |
| Health dashboard | Good | Live signals merged into existing Observability Center (no UI redesign) |
| Alerting | Good | Rule-derived ops alerts + existing SDE feed |
| Runbooks | Strong | Deployment, rollback, incident, recovery, auth, DB, daily checks |
| Durable telemetry store | Gap | Rings are process-local (serverless instances); durable APM still recommended |

---

## Monitoring coverage

| Signal | Covered |
|--------|---------|
| Application status | Yes |
| Database status | Yes (SELECT 1 + Build Information) |
| Authentication status | Yes (JWT secret presence/length gate) |
| API health / error rate | Yes (in-process window) |
| Migration status | Yes (latest `_prisma_migrations` when DB up) |
| Active users (estimate) | Yes (15m actor window on this instance) |
| Deal registry posture | Surfaced via Build Information fields on health snapshot |
| External APM / multi-region rollup | Not in this sprint |

---

## Audit coverage

| Event | Status |
|-------|--------|
| Customer Created | Wired (`POST /api/ecm/contacts`) |
| Deal Created | Wired (`POST /api/enterprise-deals`) |
| Lender Assigned | Wired (counterparties POST) |
| Document Uploaded | Wired (documents POST) |
| Status Changed | Wired (transitions POST) |
| Login success/failure | Wired (`POST /api/auth/login`) — no password logged |
| Opportunity Created | Partial — no dedicated opportunity REST route in scope; EDL/domain audits remain elsewhere |
| Accounting Entry | Partial — accounting remains primarily workspace/EDL surfaces; follow-up wiring recommended |
| Workflow Executed | Covered via status transition + structured workflow module logs |

Each recorded audit stores: **Who** · **When** · **What** · **Previous Value** · **New Value** (scalars, redacted).

---

## Logging coverage

Standard fields: Timestamp · User ID · Module · Entity ID · Action · Result (Success/Failure) · Correlation ID.

Explicit non-goals enforced by redaction helpers: passwords, JWTs, Authorization headers, sensitive key names.

---

## Performance summary

- API timings recorded for routes using `withOpsRoute`.
- Slow operations (≥2000 ms) emit warn-level structured logs.
- Ops Health returns **Top 10 slowest endpoints** (avg/max/samples) for the instance window.
- Top 10 slowest **database queries** as a durable ranking is **not** shipped (would require Prisma middleware + durable store) — listed under Known Risks / Recommendations.

---

## Known risks

1. **Instance-local rings** — On Vercel, each serverless isolate has its own ring; cross-instance correlation requires log aggregation (Vercel Log Drain / external SIEM).
2. **Opportunity / Accounting audit gaps** — Not all business events share one REST surface; coverage is incomplete until remaining writers emit `recordBusinessAudit`.
3. **Client page / workspace / registry load timings** — Not instrumented in UI (sprint forbids redesign); recommend a future non-visual beacon.
4. **Alert delivery** — Alerts surface in Mission Control; email/PagerDuty/Slack webhooks are not configured in this sprint.
5. **JWT misconfiguration** — Fail-closed auth is correct; Ops Health will show Authentication **down** until secrets meet policy.

---

## Recommendations

1. Attach a log drain / SIEM and index `correlationId`.
2. Add Prisma query middleware to record slow queries into the ops ring (still no schema change).
3. Expand `recordBusinessAudit` to Opportunity create and Accounting posting paths.
4. Optional client beacon API for page/workspace/registry durations (no UI chrome).
5. Wire Alert Center criticals to on-call notification channel when ops staffing is ready.
6. Keep using `npm run cert:production` as a pre-release gate.

---

## Operations Score

| Dimension | Score (/10) |
|-----------|-------------|
| Logging | 8.5 |
| Audit | 7.5 |
| Error observability | 8.0 |
| Performance observability | 6.5 |
| Health dashboard | 8.0 |
| Alerting | 7.5 |
| Runbooks / process | 8.5 |
| **Overall Operations Score** | **7.8 / 10** |

**Verdict:** **GO WITH OBSERVATIONS** — suitable as the v1.x operational foundation; close durable telemetry and remaining audit writers in a follow-up ops sprint.

---

## Deliverables map

| Phase | Deliverable |
|-------|-------------|
| 1 Logging | `src/lib/ops/*`, `withOpsRoute`, redaction |
| 2 Audit | `recordBusinessAudit` on key APIs + Ops Health `recentAudits` |
| 3 Errors | `recordOpsError`, correlation on `ApiError` |
| 4 Performance | API timing ring + top slow endpoints |
| 5 Health dashboard | `GET /api/admin/ops-health` + Observability enrichment |
| 6 Alerting | `deriveOpsAlerts` + Alert Center merge |
| 7 Runbook | `docs/ops/CO-OPS-002-OPERATIONAL-RUNBOOK.md` |
| 8 This report | `docs/ops/CO-OPS-002-OPERATIONS-READINESS-REPORT.md` |
