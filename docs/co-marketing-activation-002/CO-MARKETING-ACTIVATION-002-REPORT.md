# CO-MARKETING-ACTIVATION-002 — Report

**Status:** Implementation + verification complete · Controlled Vercel deploy prepared  
**Date:** 2026-08-13  
**Tree:** dirty working tree on `compass-hl03-conversation-first` @ `e41ab4ce87e8b06e57add4b3e63ba45ad1deee74` (+ local activation changes)

## Product Owner intent

Activate the **complete Marketing Command Center product workflow** for end-to-end BAT in **MARKETING TEST MODE**.

Does **not** mean unrestricted production bulk email/WhatsApp send.

## What was already implemented (MKT-01…13)

- Command Center routes under `/admin/marketing`
- Data sources (Sheets / fixture), audiences, campaigns, content, assets
- Lifecycle governance, preview, engagement, analytics
- Dry-run execution engine (leases, ledger, pacing 100 / 2.5h)
- Qualification + Opportunity handoff (fixture default)
- Assignment + ENE notification foundation
- MKT-13 hardening / scale certification

## What ACTIVATION-002 completed

| Area | Change |
| --- | --- |
| Controlled test execution | Admin API `configure_execution`, `run_test_batch`, `run_next_batch` + execution summary |
| Campaign UI | Schedule start, batch/pacing editors, 5/10/20 controlled test, execution status strip |
| Honesty | SIMULATED vs ACTUALLY SENT labels; no disabled “Test Send later” stub |
| Command Center | Live flags from foundation API; MARKETING TEST MODE banner |
| Settings | Sender identities desk (no secrets) |
| Deliverability | Pending / NOT CONNECTED checklist (no false certification) |
| Responses | Fixture ingest form for Qualify → Handoff BAT |
| User Manual | Marketing section updated in central Administration User Manual |
| Safety | `EXECUTION_ENABLED=false`, `PROVIDER_CONNECT=false` unchanged |

## Mode status

| Mode | Status |
| --- | --- |
| A. UI ACTIVE | Yes |
| B. TEST / DRY-RUN ACTIVE | Yes (default) |
| C. CONTROLLED PROVIDER TEST | Not enabled — requires separate PO gate |
| D. PRODUCTION LIVE | **OFF** |

## Feature flags (exact)

| Flag | Value |
| --- | --- |
| `ENTERPRISE_MARKETING_EXECUTION_ENABLED` | `false` (code const) |
| `ENTERPRISE_MARKETING_EXECUTION_DRY_RUN_ENABLED` | `true` |
| `ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED` | `false` (code const) |
| `ENTERPRISE_MARKETING_HANDOFF_ENABLED` | `true` |
| `ENTERPRISE_MARKETING_HANDOFF_MODE` | env default `fixture` |
| `ENTERPRISE_MARKETING_SHEETS_MODE` | env `off` \| `fixture` \| `live` |
| Email / WhatsApp delivery mode | default `dry_run` |

**No flag was flipped to enable unrestricted live bulk send.**

## Component status matrix

| Capability | Status |
| --- | --- |
| Google Sheets / worksheet selection | Usable (fixture or live Sheets mode via env) |
| Audience management | Usable (stream/paged — no 100k mirror) |
| Campaign creation | Usable |
| Content / Design Studio | Usable |
| Preview | Usable |
| Scheduler / batch / pacing | Usable (dry-run lease) |
| Publishing / lifecycle | Usable (state machine) |
| Controlled execution | Usable (SIMULATED) |
| Pause / Resume | Usable |
| Engagement | Usable from dry-run events |
| Analytics | Usable (Unavailable when metric not supplied) |
| Qualification | Usable (+ fixture ingest) |
| Opportunity handoff | Usable (fixture default) |
| Assignment | Usable via Responses policies |
| Notification | In-app ENE; email/WA dry-run |
| User Manual | Central Admin User Manual · Marketing section |
| Deliverability | Configuration surface · pending |

## Verification

| Suite | Result |
| --- | --- |
| `verify:co-marketing-activation-002` | PASS |
| MKT-01 | PASS |
| MKT-02 | PASS |
| MKT-03 | PASS |
| MKT-04 | PASS |
| MKT-05 | PASS |
| MKT-06 | Covered by MKT-13 |
| MKT-07 | PASS |
| MKT-08 | PASS (after accepting controlled SIMULATED test) |
| MKT-09 | PASS |
| MKT-10 | PASS |
| MKT-11 | PASS |
| MKT-12 | PASS |
| MKT-13 | PASS |
| User Manual verify | PASS |

## Production blockers (intentional)

1. Live bulk execution const remains false  
2. Provider connect remains false  
3. Deliverability not certified  
4. Durable Postgres marketing stores not authorised (in-memory certification risk on serverless restart)  
5. Live handoff requires `ENTERPRISE_MARKETING_HANDOFF_MODE=live` + PO approval  

## PO BAT path

1. `/admin/marketing` — confirm TEST MODE banner  
2. Data Sources → fixture/live sheet + worksheet  
3. Audiences → bind + preview  
4. Campaigns → create → content → preview → save pacing → Approve → Schedule → Run  
5. Controlled test (5/10/20) — expect SIMULATED  
6. Engagement / Analytics  
7. Responses → ingest fixture → QUALIFIED → handoff  
8. Administration → User Manual → Marketing section  

## Deployment

| Field | Value |
| --- | --- |
| Deployment ID | `dpl_84YNgxEGuKW7SAGs5YtSoFUdxhc6` |
| URL | https://catalyst-fvms10ug7-rupee-catalyst.vercel.app |
| Production alias | https://catalyst-one-two.vercel.app |
| Ready state | READY |
| Build | Remote Vercel Next.js 15.5.20 — Completed |
| Marketing mode | MARKETING TEST MODE (dry-run / fixture) |
| Provider status | NOT CONNECTED |
| Live bulk execution | OFF |
| Test-mode status | ACTIVE (controlled 5/10/20 SIMULATED batches) |

## STOP

Await Product Owner validation. Do not enable live bulk send without a separate authorisation sprint.

