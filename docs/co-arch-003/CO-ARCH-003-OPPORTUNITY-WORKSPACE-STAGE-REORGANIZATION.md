# CO-ARCH — Opportunity Workspace Stage Reorganization

**Status:** Ready for Product Architecture Certification  
**Date:** 2026-07-24

## Canonical Opportunity Workspace (frozen)

Exactly four primary stages, in order:

1. **Opportunity Creation** (`/credit-bench`) — landing after Start Loan Journey  
2. **Document Center** (`/document-center`) — against active Opportunity  
3. **Credit Workbench** (`/credit-workbench`) — eligibility before strategy  
4. **Strategy Workbench** (`/opportunities`) — lender strategy before Deal  

## Visual progression

`OpportunityWorkspaceStageRail` — horizontal connected stepper with:

- Current (teal highlight + “Current”)
- Completed (check)
- Upcoming (muted)

Mounted via `LeadOpportunityJourneyChrome` when `opportunityWorkspaceStage` is set.

## Navigation rules

- Stage hops use `buildOpportunityWorkspaceStageHref` with `file` + `opportunityId`
- Active Opportunity Context preserved in session
- Continue / Back walk the four stages only
- No list re-pick while navigating stages

## Out of scope (unchanged)

Deal creation · Move to Deal · Deal Workspace · Accounting · Lender Pipeline

## SSOT

- `src/constants/opportunity-workspace-stages.ts`
- `.cursor/rules/opportunity-workspace-stages.mdc`
