---
id: marketing.execution-safety
title: Marketing execution and production safety
summary: MARKETING TEST MODE, controlled batches, SIMULATED vs ACTUALLY SENT, and production gates.
categoryId: marketing
status: fixture
audience: admin
updated: 2026-08-13
tags: marketing, dry-run, safety, flags, test-mode
related: marketing.overview, marketing.engagement-qualification-handoff, marketing.troubleshooting
---

# Marketing execution and production safety

## Mode ladder (do not collapse)

| Mode | Meaning |
| --- | --- |
| A. UI ACTIVE | Command Center usable |
| B. TEST / DRY-RUN ACTIVE | Default — SIMULATED delivery |
| C. CONTROLLED PROVIDER TEST | Requires separate PO + provider gate |
| D. PRODUCTION LIVE | Unrestricted bulk — **not** enabled in ACTIVATION-002 |

## Controlled test execution

1. Campaign SCHEDULED or RUNNING
2. Lease configured (Save pacing)
3. Run controlled test batch (5 / 10 / 20)
4. Review execution ID / batch / ledger counts
5. Label remains **SIMULATED** · **actuallySent: false**

## Production safety (mandatory)

- `ENTERPRISE_MARKETING_EXECUTION_ENABLED = false` (code const)
- `ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false` (code const)
- `ENTERPRISE_MARKETING_EXECUTION_DRY_RUN_ENABLED = true`
- Handoff mode default `fixture` (`ENTERPRISE_MARKETING_HANDOFF_MODE`)
- Sheets mode `off` | `fixture` | `live` (env) — no 100k Supabase mirror

## Related articles

- [Engagement, qualification, and handoff](/admin/user-manual/marketing/engagement-qualification-handoff)
- [Troubleshooting](/admin/user-manual/marketing/troubleshooting)
