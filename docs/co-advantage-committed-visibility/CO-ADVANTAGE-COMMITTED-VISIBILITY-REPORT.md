# Advantage Committed (₹)

**Local status: READY FOR CONTROLLED HOSTINGER DEPLOYMENT**

Hostinger production remains **FROZEN** until Product Owner explicitly approves this SHA. This worktree did **not** deploy, push, apply the migration, enable Marketing execution, or connect Sheets / email / WhatsApp / SMS / ads.

Base: `3c9b48a` (detached). Do not amend `9395feb7` or `3c9b48a`.

## What shipped locally

Canonical Opportunity field: `advantageCommittedAmount`  
Exact UI label everywhere: **Advantage Committed (₹)**

| Product | Amount present | Display |
|---|---|---|
| HOME_LOAN / HOME_LOAN_BT | yes | `₹1,25,000` (Indian grouping, string, not float) |
| HOME_LOAN / HOME_LOAN_BT | missing | `Not committed` (never ₹0) |
| Any other product | — | `Not applicable` |

Flow: Marketing qualification (after explicit qualify) → Opportunity SSOT → Deal inherit → Accounting inherit.

Compass Advantage live snapshot remains a **calculation**. Recalculation cannot write the committed Opportunity fact.

## Immutability

Ordinary create / update / import / bulk / Deal / Accounting / API cannot set or change the amount. Correction is SUPER_ADMIN + reason + original/revised + requesting/approving users + append-only history.

## Migration (not applied)

`prisma/migrations/20260906133000_co_advantage_committed_visibility/`

Additive only. Requires explicit PO approval before Hostinger `prisma migrate deploy`.

## Local gates

| Gate | Result |
|---|---|
| `scripts/co-advantage-committed-verify.mjs` (20 scenarios) | PASS |
| `tsc --noEmit` (8GB heap) | PASS |
| ESLint on changed files `--max-warnings=0` | PASS |
| My Deals Kanban verifier | PASS |
| Contact 360 verifier | PASS |
| Prisma validate (dummy `DATABASE_URL` / `DIRECT_URL`) | PASS |
| Safe Next build (no migrate; execution OFF; email `dry_run`) | PASS |
| Fixture screenshots (9) | PASS |
| Secret / outbound-call scan on new SSOT | PASS |

Screenshots: `docs/co-advantage-committed-visibility/screenshots/` (local fixture HTML, not live production data).

## Manual ops still required before production

1. Product Owner approval of this SHA  
2. Hostinger deploy of that SHA only  
3. `prisma migrate deploy` of the additive migration  
4. Do **not** enable Marketing cron / live send as part of this change  

## CO-CHANAKYA-RELEASE-FREEZE-015

Acknowledged. No Hostinger production action was taken in this sprint.
