/**
 * Placeholder providers — mock contracts only.
 * Future: replace with insight API clients (no direct table access).
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
import { nowIso } from "../utils";

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

function mockInsights(): ExecutiveInsight[] {
  const generatedAt = nowIso();
  return [
    {
      id: "insight_ops_attention",
      category: "operations",
      severity: "medium",
      title: "Operational areas require attention",
      summary: "Three operational areas require attention today.",
      recommendation: "Open the Situation Room for operational detail.",
      sourceModule: "workflow-engine",
      confidence: undefined,
      generatedAt,
      metadata: { placeholder: true },
      provenance: "placeholder",
    },
    {
      id: "insight_revenue_stable",
      category: "commercial",
      severity: "info",
      title: "Revenue performance stable",
      summary: "Revenue performance is stable.",
      sourceModule: "opportunity-lifecycle",
      generatedAt,
      provenance: "placeholder",
    },
    {
      id: "insight_credit_workload",
      category: "credit",
      severity: "high",
      title: "Credit operations workload elevated",
      summary: "Credit operations have increased workload.",
      recommendation: "Inspect Situation Room for credit posture.",
      sourceModule: "credit-risk-engine",
      generatedAt,
      provenance: "placeholder",
    },
    {
      id: "insight_sla_alerts",
      category: "workflow",
      severity: "critical",
      title: "SLA alerts require review",
      summary: "Two SLA alerts require review.",
      recommendation: "Review SLA alerts in Alert Center.",
      sourceModule: "workflow-engine",
      generatedAt,
      provenance: "placeholder",
    },
    {
      id: "insight_security_cadence",
      category: "security",
      severity: "low",
      title: "Security posture check recommended",
      summary: "Routine executive review of security operations is due.",
      recommendation: "Visit Security Operations.",
      sourceModule: "security-operations",
      generatedAt,
      provenance: "placeholder",
    },
  ];
}

export function createExecutiveInsightProvider(): ExecutiveInsightProvider {
  const store = mockInsights();
  return {
    async listInsights() {
      return store;
    },
    async getInsight(id) {
      return store.find((i) => i.id === id);
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
