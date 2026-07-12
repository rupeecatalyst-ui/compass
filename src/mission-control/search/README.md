# Enterprise Search Center

Unified search experience for Catalyst One. Modules publish searchable entities; this surface **consumes providers only**.

## Route

`/mission-control/search`

## Folder structure

```
search/
  EnterpriseSearch.tsx
  types.ts
  providers.ts
  components/
    SearchBar · SearchCategoryTabs · FilterBar
    SearchResults · SearchResultCard · PreviewPanel
    RecentSearches · SavedSearches · EmptyState
  index.ts
```

## Providers (placeholders)

SearchProvider · SearchCategoryProvider · RecentSearchProvider · SavedSearchProvider · SearchCenterProvider

## Integration

Search Center providers delegate to the Enterprise Search Framework:

```ts
import {
  createEnterpriseSearchFramework,
  projectSearchEntitiesToResults,
} from "@/mission-control/shared/enterprise-search-framework";

const framework = createEnterpriseSearchFramework();
const entities = await framework.entityProvider.listEntities({ text: "west" });
const results = projectSearchEntitiesToResults(entities);
```

Modules register via `SearchRegistry.registerPublisher` / `registerEntity` (in-memory placeholders today).

## Future TODOs

- [ ] Module entity publishers / registry
- [ ] Persist recent / saved searches
- [ ] Keyboard command palette (⌘K)
- [ ] Permission-aware result visibility
- [ ] Indexing pipeline (deferred)
- [ ] Supabase / DB search (explicitly deferred)
- [ ] AI ranking (explicitly deferred)
