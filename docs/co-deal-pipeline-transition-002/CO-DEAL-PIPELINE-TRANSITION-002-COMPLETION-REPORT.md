# CO-DEAL-PIPELINE-TRANSITION-002 — Opportunity → Deal Initial Pipeline State

**Status:** Fixed · Verified locally · **NOT DEPLOYED**  
**Date:** 2026-08-10  
**Extends:** CO-DEAL-PIPELINE-TRANSITION-001  

## Canonical initial state

Frozen `LENDER_CASE_STAGES`:

| Order | id | Label |
|------:|----|-------|
| 1 | `identified` | **Identified** |
| 2 | `prelogin` | Pre Login |
| 3 | `logged_in_wip` | Logged In – WIP |
| … | … | Soft Approved → … → Disbursed · Lost · Hold |

**Identified is NOT Prelogin.** They are distinct frozen stages.  
**Move to Deal → persist `identified`.** Do not invent a new IDENTIFIED enum.  
**Login** is a separate transition to `logged_in_wip`.

## Path fixed

```
Opportunity → lender identified → Move to Deal
  → buildDealCreateBodyFromOpportunity
       grossStage = identified   (forced; ignores stale caseStage)
       snapshot.stage + lenders[].caseStage = identified
  → POST Enterprise Deal (server canonicalizes grossStage)
  → deal-pipeline-runtime projects deal.grossStage → Kanban Identified
```

## Files changed

| File | Change |
|------|--------|
| `src/lib/enterprise-deal/deal-create-from-opportunity.ts` | Always persist `identified`; snap lenders to Identified |
| `server/services/enterprise-deal/enterprise-deal.service.ts` | Canonicalize create `grossStage` |
| `src/lib/enterprise-deal/map-deal-to-registry-row.ts` | Labels from `LENDER_CASE_STAGE_LABELS` |
| `scripts/co-deal-pipeline-transition-002-verify.mjs` | Verify + read-only impact |
| `package.json` | `verify:co-deal-pipeline-transition-002` |
| This report | |

## Existing Deals

**No mutations.** Read-only impact listed in verify output (`possiblyIncorrectInit` heuristic for Deals currently at Logged In – WIP with little stage activity). Remediation requires separate PO authorization.

## Wealth Partner

Consumes the same Deal `grossStage` / Partner Deal stage APIs — no Partner-specific stages.

## Deploy

Not performed.
