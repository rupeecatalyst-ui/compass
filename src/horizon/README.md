# Horizon — Strategic Planning Workspace

Catalyst One's long-horizon planning surface.

**Not** Mission Control. **Not** operational loan origination. **Not** a classic PM / task / workflow tool.

## Route

Single screen only: `/horizon`

No nested routes (`/horizon/projects`, `/tasks`, etc.). Interaction stays in-workspace via expand/collapse, inline edit, right slide-over, modal dialogs, and action menus.

## Folder structure

```
src/horizon/
  HorizonWorkspace.tsx          # Single-screen composition
  shell.tsx                     # Isolated premium dark shell
  types.ts                      # Domain interfaces
  providers.ts                  # Placeholder providers
  components/
    HorizonHeader · ModeSwitcher
    PortfolioOverview
    HierarchyNode · HierarchyActionsMenu
    DetailSlideOver · PlaceholderActionDialog
    TodaysFocus · UpcomingMilestones · WaitingOn · ParkingLot
    RecentProgress · QuickNotes
    ProgressIndicator · HealthBadge · PriorityBadge · StatusBadge · EmptyState
    InitiativesPanel            # Compact tree (legacy panel)
  initiative-workspace/
    InitiativesWorkspace        # Primary hierarchy working area
    HierarchyTree · *Card · ExpandCollapseControl · ProgressBar
    InlineEditableText
    types · providers
src/app/(horizon)/horizon/      # Next.js route + layout
```

## Hierarchy

Initiative → Workstream → Milestone → Activity (frozen — no additional levels)

## Modes

Operational · Strategic — header switcher (UI only)

## CHANAKYA

Factual status only on expanded initiative cards: Last Updated · Current Status · Next Milestone · Delay Information. No advice or recommendations.

## Architecture summary

- Independent module beside Mission Control (separate shell / route group)
- Single-screen initiative card board; expand inline for hierarchy
- Placeholder providers only
- No AI recommendations, chat, notifications, analytics, Gantt, database, or automation

## Future TODOs

- [ ] Persist portfolio / initiative hierarchy
- [ ] Bind mode switcher to authorization grants
- [ ] Drag-and-drop reparenting
- [ ] Aggregate progress / health from children
- [ ] Live providers from enterprise engines
- [ ] Intentional cross-links to operational modules when required
- [ ] Optional export packs (no AI)
