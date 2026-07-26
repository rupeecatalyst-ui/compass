# CO-ARCH — Opportunity Workspace Context Propagation (FROZEN)

**Status:** ENTERPRISE FROZEN  
**Date:** 2026-07-24

## Root cause (BAT)

My Opportunities read Opportunity Registry API. Document Center / Credit Bench / LIFE pickers and loaders still resolved legacy LoanFiles. New Opportunities have no LoanFile → invisible / stuck restoring.

## Architecture

Opportunity Registry is SSOT. Shared session context:

- opportunityId
- opportunityReference
- contactId
- customer
- product
- stage
- owner
- fileId (optional Deal attachment only — never Opportunity UUID)

Stages Lead Creation → Documents → Credit Bench → LIFE consume `useOpportunityWorkspaceContext` / `OpportunityBoundStage` — they do not independently choose an Opportunity.

## Selection

Only on left-nav (`entry=dashboard`) or when no active `opportunityId`.
