/**
 * Executive Narrative Engine — shared Mission Control intelligence layer.
 * SPR-007.2B — architecture only (no AI, no KPIs, no data access).
 */

export type * from "./types";
export type * from "./contracts";

export {
  createExecutiveSourceModuleRegistry,
  defaultExecutiveSourceModuleRegistry,
  listRegisteredExecutiveSourceModules,
} from "./registry";
export type { ExecutiveSourceModuleRegistryPort } from "./registry";

export {
  transformInsightsToNarrative,
  transformNarrativeToBriefModel,
  transformInsightsToBriefModel,
} from "./transformers";

export {
  createExecutiveInsightProvider,
  createExecutiveNarrativeProvider,
  createExecutiveBriefProvider,
  createExecutiveNarrativeEngine,
} from "./providers";
export type {
  ExecutiveInsightProvider,
  ExecutiveNarrativeProvider,
  ExecutiveBriefProvider,
  ExecutiveNarrativeEngine,
} from "./providers";

export {
  useExecutiveBrief,
  useExecutiveNarrative,
  useExecutiveInsights,
} from "./hooks";

export {
  createExecutiveIntelligenceId,
  uniqueSourceModules,
  nowIso,
} from "./utils";
