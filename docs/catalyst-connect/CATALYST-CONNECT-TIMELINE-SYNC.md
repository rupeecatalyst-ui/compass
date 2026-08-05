# Catalyst Connect — Partner Business Timeline Sync

**Programme:** CO-WP-TIMELINE-001  
**Status:** Implementation complete (local) — no deploy unless PO requests  
**Constitution:** Catalyst Connect is presentation only; Catalyst One owns milestone projection.

## Directive

Replace Stage / Sub Stage status chrome with a **business-friendly opportunity timeline**.  
Show only partner-relevant milestones. Hide internal enterprise workflow stages.

## Partner milestones (frozen order)

1. Opportunity Created  
2. Documents Pending  
3. Documents Complete  
4. Submitted  
5. Under Review  
6. Sent to Lender  
7. Decision Received  
8. Disbursed  

## Never exposed to partners

- Credit Workbench / credit assessment sub-stages  
- Capture in progress / Requirement review / Lender login labels  
- Policy / risk / CIBIL / scoring  
- Raw Opportunity Registry stage inventory  

## SSOT (Catalyst One)

| Concern | Path |
|---|---|
| Milestone catalog | `src/constants/enterprise-partner-business-timeline/` |
| Types | `src/types/enterprise-partner-business-timeline.ts` |
| Projection | `src/lib/enterprise-partner-business-timeline/project.ts` |
| Wire-in | `applyWorkspaceProjection` → `businessTimeline` on Partner Opportunity detail |

## Connect (Wealth Partner App)

| Surface | Change |
|---|---|
| Workspace header | Progress + Status (milestone) — Stage / Sub Stage removed |
| Overview | Progress / Status + compact milestone rail |
| Timeline tab | Full milestone list from `businessTimeline` |
| Business Hub rows | Single progress chip (`stageLabel` projected as current milestone) |

## Acceptance

- Timeline communicates business progress without enterprise workflow complexity.  
- Connect does not invent milestone logic — consumes C1 projection only.
