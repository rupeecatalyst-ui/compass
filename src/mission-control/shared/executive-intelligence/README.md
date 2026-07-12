# Executive Narrative Engine (SPR-007.2B)

Shared intelligence **architecture** for Mission Control. No AI, no KPIs, no database access.

## Folder structure

```
shared/executive-intelligence/
  contracts/       ExecutiveInsight, ExecutiveNarrative, ExecutiveBriefModel, …
  types/           Severity, category, section kind primitives
  providers/       Placeholder insight / narrative / brief providers
  transformers/    Insight[] → Narrative → ExecutiveBriefModel
  registry/        Source module metadata registry
  hooks/           useExecutiveBrief, useExecutiveNarrative, useExecutiveInsights
  utils/           Ids / timestamps / helpers
```

## Design principle

Executive Briefing UI must consume **only** `ExecutiveBriefModel`.

It must never know:

- where data came from
- how it was calculated
- whether AI, rules, or analytics produced it

`provenance` on contracts is opaque metadata for audit planes — not UI branching.

## Pipeline

```
ExecutiveInsight[]  →  ExecutiveNarrative  →  ExecutiveBriefModel
        ↑                      ↑                      ↑
 InsightProvider      NarrativeProvider         BriefProvider
```

## Integration notes (future sprints)

1. **SPR-007.2C+** — Replace placeholder providers with insight API clients per source module.
2. Wire `useExecutiveBrief()` into CHANAKYA Executive Briefing page; map `ExecutiveBriefModel` into presentation cards (do not pass raw insights to UI).
3. Activate source modules in the registry (`status: "active"`) as engines publish contracts.
4. Optional: stream narrative sections into `ExecutiveBriefCard` without layout redesign.
5. Keep transformers free of scoring / KPI math — enrichment belongs in producing engines.
6. Never query business tables from this layer; only consume standardized insight payloads.
