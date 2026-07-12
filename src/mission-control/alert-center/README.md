# Enterprise Alert Center

Defender-style centralized alert surface for Mission Control.

Placeholder providers only — no channel delivery, no KPI engine, no workflows.

## Route

`/mission-control/alert-center`

## Folder structure

```
alert-center/
  components/
    AlertSummaryStrip · AlertFilterBar
    AlertTimeline · AlertCard · AlertDetailsPanel
    AlertStatistics · QuickActions
    SeverityBadge · CategoryBadge · AlertStatusBadge · EmptyState
  AlertCenterWidgetLayout.tsx   WidgetShell framing
  types.ts · providers.ts
  EnterpriseAlertCenter.tsx
```

## Providers

`EnterpriseAlertProvider` · `AlertSummaryProvider` · `AlertStatisticsProvider` · `AlertFilterProvider`

## Integration notes

- Consumes providers only; future engines publish via Enterprise Alert Framework.
- Widget Framework `WidgetShell` frames each zone (summary, filters, timeline, details, statistics, actions).
- Deep-linked from Briefing, Decision Workspace, and Situation Room.

## Future TODOs

- [ ] Bind providers to Alert Framework bus (`listPublished` + projection)
- [ ] Persist acknowledgement / dismiss with audit
- [ ] Live date-range and module facets from insight APIs
- [ ] Register Alert Center zones as pluggable Mission Control widgets in the global registry
