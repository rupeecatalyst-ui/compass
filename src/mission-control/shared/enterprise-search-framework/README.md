# Enterprise Search Framework

Reusable search infrastructure for Catalyst One.

Modules **publish** searchable entities. Mission Control Search Center **consumes providers only**.

## Non-goals (this sprint)

- No indexing
- No API / Supabase / DB queries
- No AI ranking
- No UI redesign

## Folder structure

```
enterprise-search-framework/
  types/           Primitive enums
  contracts/       SearchEntity · SearchPublisher · SearchRegistry · …
  categories/      Taxonomy
  ranking/         Ranking contracts (signals only)
  metadata/        Scopes + metadata helpers
  registry/        Placeholder publishers + in-memory registry
  providers/       SearchRegistry · Entity · Configuration · Category
  adapters/        Project entities → Search Center models
  index.ts
```

## Registered publishers (placeholders)

Customer 360 · Opportunity Lifecycle · Loan Workspace · Partner Management · Document Intelligence · Product Intelligence · Mission Control · Horizon · Security · Configuration · Workflow Engine

## Integration

```ts
import {
  createEnterpriseSearchFramework,
  projectSearchEntitiesToResults,
} from "@/mission-control/shared/enterprise-search-framework";

const framework = createEnterpriseSearchFramework();
const entities = await framework.entityProvider.listEntities({ text: "west" });
const results = projectSearchEntitiesToResults(entities);
```

Search Center providers may delegate to this framework via adapters.

## Future TODOs

- [ ] Module-side publisher SDKs
- [ ] Permission enforcement on entity visibility
- [ ] Real ranking engines bound to ranking contracts
- [ ] Persistent registry / entity catalog
- [ ] Indexing pipeline (deferred)
- [ ] Cross-tenant scope isolation
