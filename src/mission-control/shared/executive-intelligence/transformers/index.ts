/**
 * Placeholder transformers — structural mapping only.
 * No scoring, no KPI math, no LLM, no rules evaluation.
 */

import type {
  ExecutiveBriefModel,
  ExecutiveInsight,
  ExecutiveNarrative,
  ExecutiveNarrativeSection,
  ExecutiveNarrativeSectionEntry,
  ExecutiveObservation,
  ExecutiveRecommendation,
  ExecutiveRisk,
} from "../contracts";
import type { ExecutiveInsightSeverity, ExecutiveNarrativeSectionKind } from "../types";
import { createExecutiveIntelligenceId, nowIso, uniqueSourceModules } from "../utils";

const SECTION_TITLES: Record<ExecutiveNarrativeSectionKind, string> = {
  executive_summary: "Executive Summary",
  critical_risks: "Critical Risks",
  positive_developments: "Positive Developments",
  operational_observations: "Operational Observations",
  recommendations: "Recommendations",
  watch_list: "Watch List",
};

const SEVERITY_RANK: Record<ExecutiveInsightSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

function maxSeverity(
  severities: readonly ExecutiveInsightSeverity[],
): ExecutiveInsightSeverity | "none" {
  if (severities.length === 0) return "none";
  return [...severities].sort((a, b) => SEVERITY_RANK[b] - SEVERITY_RANK[a])[0]!;
}

function toEntry(insight: ExecutiveInsight): ExecutiveNarrativeSectionEntry {
  return {
    id: insight.id,
    title: insight.title,
    body: insight.summary,
    severity: insight.severity,
    sourceModule: insight.sourceModule,
    relatedInsightIds: [insight.id],
  };
}

function buildSection(
  kind: ExecutiveNarrativeSectionKind,
  entries: ExecutiveNarrativeSectionEntry[],
): ExecutiveNarrativeSection {
  return {
    kind,
    title: SECTION_TITLES[kind],
    entries,
  };
}

/**
 * Maps structured insights into a narrative shell.
 * Placement is deterministic placeholder logic (severity / category), not intelligence.
 */
export function transformInsightsToNarrative(
  insights: readonly ExecutiveInsight[],
): ExecutiveNarrative {
  const critical = insights.filter((i) => i.severity === "critical" || i.severity === "high");
  const positive = insights.filter(
    (i) => i.category === "commercial" || i.severity === "info",
  );
  const operational = insights.filter(
    (i) => i.category === "operations" || i.category === "workflow" || i.category === "observability",
  );
  const watch = insights.filter((i) => i.severity === "medium" || i.severity === "low");

  const observations: ExecutiveObservation[] = insights.map((i) => ({
    id: `obs_${i.id}`,
    text: i.summary,
    severity: i.severity,
    sourceModule: i.sourceModule,
    relatedInsightIds: [i.id],
  }));

  const recommendations: ExecutiveRecommendation[] = insights
    .filter((i) => Boolean(i.recommendation))
    .map((i) => ({
      id: `rec_${i.id}`,
      text: i.recommendation!,
      priority: i.severity,
      sourceModule: i.sourceModule,
      relatedInsightIds: [i.id],
    }));

  const risks: ExecutiveRisk[] = critical.map((i) => ({
    id: `risk_${i.id}`,
    title: i.title,
    summary: i.summary,
    severity: i.severity,
    sourceModule: i.sourceModule,
    relatedInsightIds: [i.id],
    watch: i.severity === "high",
  }));

  const summaryEntries: ExecutiveNarrativeSectionEntry[] =
    insights.length === 0
      ? [
          {
            id: "summary_placeholder",
            body: "No executive insights are available in this placeholder pipeline.",
          },
        ]
      : insights.slice(0, 3).map(toEntry);

  const sections: ExecutiveNarrativeSection[] = [
    buildSection("executive_summary", summaryEntries),
    buildSection("critical_risks", critical.map(toEntry)),
    buildSection(
      "positive_developments",
      positive.length > 0 ? positive.map(toEntry) : [],
    ),
    buildSection("operational_observations", operational.map(toEntry)),
    buildSection(
      "recommendations",
      recommendations.map((r) => ({
        id: r.id,
        body: r.text,
        severity: r.priority,
        sourceModule: r.sourceModule,
        relatedInsightIds: r.relatedInsightIds,
      })),
    ),
    buildSection("watch_list", watch.map(toEntry)),
  ];

  const sourceModules = uniqueSourceModules(insights.map((i) => i.sourceModule));

  return {
    id: createExecutiveIntelligenceId("narrative"),
    title: "Executive Narrative",
    generatedAt: nowIso(),
    sourceModules,
    sections,
    observations,
    recommendations,
    risks,
    overallRiskLevel: maxSeverity(insights.map((i) => i.severity)),
    confidence: undefined,
    provenance: "placeholder",
  };
}

/**
 * Flattens a narrative into the UI-facing ExecutiveBriefModel.
 */
export function transformNarrativeToBriefModel(
  narrative: ExecutiveNarrative,
): ExecutiveBriefModel {
  const summarySection = narrative.sections.find((s) => s.kind === "executive_summary");
  const summary =
    summarySection?.entries.map((e) => e.body).join("\n\n") ||
    "Executive briefing is awaiting structured insights.";

  const positive =
    narrative.sections.find((s) => s.kind === "positive_developments")?.entries ?? [];
  const watchList = narrative.sections.find((s) => s.kind === "watch_list")?.entries ?? [];

  return {
    id: createExecutiveIntelligenceId("brief"),
    presentedBy: "CHANAKYA",
    title: "Executive Brief",
    summary,
    observations: narrative.observations.map((o) => o.text),
    recommendations: narrative.recommendations.map((r) => r.text),
    riskLevel: narrative.overallRiskLevel,
    confidence: narrative.confidence,
    generatedAt: narrative.generatedAt,
    sourceModules: narrative.sourceModules,
    narrative,
    criticalRisks: narrative.risks,
    positiveDevelopments: [...positive],
    watchList: [...watchList],
  };
}

/** Convenience pipeline: insights → narrative → brief model */
export function transformInsightsToBriefModel(
  insights: readonly ExecutiveInsight[],
): ExecutiveBriefModel {
  return transformNarrativeToBriefModel(transformInsightsToNarrative(insights));
}
