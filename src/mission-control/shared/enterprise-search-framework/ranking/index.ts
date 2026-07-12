/**
 * Search ranking contracts — signals and strategies only.
 * No scoring / ranking engine execution in this sprint.
 */

import type { SearchRankingContract } from "../contracts";

export const DEFAULT_SEARCH_RANKING_CONTRACT: SearchRankingContract = {
  id: "ranking-default-placeholder",
  label: "Default Ranking Contract",
  description:
    "Placeholder ranking contract for enterprise search. Engines bind later.",
  strategy: "hybrid_placeholder",
  version: "0.1.0",
  signals: [
    {
      id: "signal-lexical",
      label: "Lexical match",
      weight: 0.45,
      strategy: "lexical",
      description: "Title, subtitle, keywords overlap (future).",
    },
    {
      id: "signal-recency",
      label: "Recency",
      weight: 0.25,
      strategy: "recency",
      description: "Prefer recently updated entities (future).",
    },
    {
      id: "signal-module-priority",
      label: "Module priority",
      weight: 0.2,
      strategy: "module_priority",
      description: "Publisher / module boost (future).",
    },
    {
      id: "signal-relevance",
      label: "Relevance placeholder",
      weight: 0.1,
      strategy: "relevance_placeholder",
      description: "Reserved for future relevance models — not AI in this sprint.",
    },
  ],
};

export function listSearchRankingContracts(): readonly SearchRankingContract[] {
  return [DEFAULT_SEARCH_RANKING_CONTRACT];
}

export function getSearchRankingContract(
  id: string,
): SearchRankingContract | undefined {
  return listSearchRankingContracts().find((c) => c.id === id);
}
