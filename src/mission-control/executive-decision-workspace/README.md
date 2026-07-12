# Executive Decision Workspace

Appears immediately below CHANAKYA Executive Briefing on Mission Control landing.

## Folder structure

```
executive-decision-workspace/
  components/
    SectionHeader
    PriorityBadge / SeverityBadge / TrendIndicator / EmptyState
    PriorityActionsSection / PriorityActionCard
    ExecutiveWatchList / WatchListCard
    PendingApprovalsSection / ApprovalCard
    EnterpriseHighlightsSection / HighlightCard
  types.ts
  providers.ts
  ExecutiveDecisionWorkspace.tsx
```

## Section order

1. Priority Actions (filter-ready)
2. Executive Watch List
3. Pending Executive Approvals
4. Enterprise Highlights

## Integration

`ExecutiveBriefingPage` renders `ExecutiveDecisionWorkspace` below `ExecutiveBriefCard`.
UI components consume provider models only — no origin awareness.

## Future TODOs

- [ ] Replace providers with insight / decision API clients
- [ ] Bind Approve / Reject to approval workflow + audit (currently inert)
- [ ] Drive watch list from Executive Narrative Engine
- [ ] Align priority actions with `ExecutiveBriefModel` recommendations
- [ ] Replace trend placeholders with engine-provided trend contracts (no local KPI math)
- [ ] Persist priority filter preference per executive session
