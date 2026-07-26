# CO-ARCH — Canonical Journey Header & Context Preservation

**Status:** ENTERPRISE FROZEN  
**Date:** 2026-07-24

## Canonical stages

1. Lead Creation  
2. Documents  
3. Credit Bench  
4. LIFE  
5. Lender Pipeline  
6. Disbursed  
7. Journey Complete  

## Rules

- Same header across Opportunity and Deal execution workspaces  
- Current / Completed / Upcoming visual states  
- Context preserved on every stage hop  
- Selection screen only on left-nav without active context  

## SSOT

- `src/constants/canonical-journey-header.ts`
- `.cursor/rules/canonical-journey-header.mdc`
- UI: `CanonicalJourneyHeader` (also renders from Opportunity Workspace stage aliases)
