/**
 * CO-ORG-004 — Executive intelligence providers.
 * Empty until certified Executive Briefing / EBI snapshot binds.
 * Never invent ops/credit/SLA narratives as production truth.
 */

import type {
  ExecutiveBriefModel,
  ExecutiveInsight,
  ExecutiveNarrative,
} from "../contracts";
import {
  transformInsightsToBriefModel,
  transformInsightsToNarrative,
} from "../transformers";

export interface ExecutiveInsightProvider {
  listInsights(): Promise<readonly ExecutiveInsight[]>;
  getInsight(id: string): Promise<ExecutiveInsight | undefined>;
}

export interface ExecutiveNarrativeProvider {
  getNarrative(insights?: readonly ExecutiveInsight[]): Promise<ExecutiveNarrative>;
}

export interface ExecutiveBriefProvider {
  getBrief(insights?: readonly ExecutiveInsight[]): Promise<ExecutiveBriefModel>;
}

export function createExecutiveInsightProvider(): ExecutiveInsightProvider {
  return {
    async listInsights() {
      return [];
    },
    async getInsight() {
      return undefined;
    },
  };
}

export function createExecutiveNarrativeProvider(
  insightProvider: ExecutiveInsightProvider = createExecutiveInsightProvider(),
): ExecutiveNarrativeProvider {
  return {
    async getNarrative(insights) {
      const source = insights ?? (await insightProvider.listInsights());
      return transformInsightsToNarrative(source);
    },
  };
}

export function createExecutiveBriefProvider(
  insightProvider: ExecutiveInsightProvider = createExecutiveInsightProvider(),
): ExecutiveBriefProvider {
  return {
    async getBrief(insights) {
      const source = insights ?? (await insightProvider.listInsights());
      return transformInsightsToBriefModel(source);
    },
  };
}

/** Facade for composition roots / hooks */
export interface ExecutiveNarrativeEngine {
  insights: ExecutiveInsightProvider;
  narrative: ExecutiveNarrativeProvider;
  brief: ExecutiveBriefProvider;
}

export function createExecutiveNarrativeEngine(): ExecutiveNarrativeEngine {
  const insights = createExecutiveInsightProvider();
  return {
    insights,
    narrative: createExecutiveNarrativeProvider(insights),
    brief: createExecutiveBriefProvider(insights),
  };
}
