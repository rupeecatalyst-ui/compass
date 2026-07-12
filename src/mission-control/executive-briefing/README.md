# CHANAKYA Executive Briefing

Landing experience for Mission Control.

Layout: Greeting → Executive Brief → **Executive Decision Workspace** → Quick Actions.

## Structure

```
executive-briefing/
  components/
    ExecutiveGreeting
    ExecutiveBriefCard
    PriorityActions / PriorityActionCard   (legacy briefing cards; workspace has richer set)
    HighlightsSection / HighlightCard
    QuickActions / QuickActionButton
    EnterpriseHealthBadge
    MissionControlBadge
  services.ts          Placeholder services (mock only)
  types.ts             Contracts for future insight APIs
  ExecutiveBriefingPage.tsx
```

Decision workspace lives in `../executive-decision-workspace/`.

## TODOs — future AI / insight integration

- [ ] Replace `createExecutiveBriefService` mocks with standardized insight API responses
- [ ] Populate `confidence`, `sourceModules`, and `generatedAt` from CHANAKYA orchestration
- [ ] Wire Priority / Highlights services to engine insight contracts (no direct table queries)
- [ ] Personalize greeting from session principal
- [ ] Live-refresh Enterprise Health from Mission Control health plane
- [ ] Optional streaming summary into `ExecutiveBriefCard` without layout changes
- [ ] Align briefing brief with `useExecutiveBrief()` / `ExecutiveBriefModel`
