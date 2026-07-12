/**
 * Executive Narrative Engine — data contracts.
 * UI and consumers must not infer how values were produced.
 */

import type {
  ExecutiveInsightCategory,
  ExecutiveInsightMetadata,
  ExecutiveInsightSeverity,
  ExecutiveIntelligenceProvenance,
  ExecutiveNarrativeSectionKind,
  ExecutiveSourceModuleStatus,
} from "../types";

/** Registered producer of executive insights (metadata only). */
export interface ExecutiveSourceModule {
  id: string;
  displayName: string;
  description?: string;
  status: ExecutiveSourceModuleStatus;
  version: string;
  /** Capability tags — not runtime bindings */
  capabilityTags: readonly string[];
}

/** Atomic structured insight from any future engine. */
export interface ExecutiveInsight {
  id: string;
  category: ExecutiveInsightCategory;
  severity: ExecutiveInsightSeverity;
  title: string;
  summary: string;
  recommendation?: string;
  sourceModule: string;
  confidence?: number;
  generatedAt: string;
  metadata?: ExecutiveInsightMetadata;
  /** Opaque — UI must not branch on this for layout */
  provenance?: ExecutiveIntelligenceProvenance;
}

export interface ExecutiveObservation {
  id: string;
  text: string;
  severity?: ExecutiveInsightSeverity;
  sourceModule?: string;
  relatedInsightIds?: readonly string[];
}

export interface ExecutiveRecommendation {
  id: string;
  text: string;
  priority?: ExecutiveInsightSeverity;
  sourceModule?: string;
  relatedInsightIds?: readonly string[];
  navigateHint?: string;
}

export interface ExecutiveRisk {
  id: string;
  title: string;
  summary: string;
  severity: ExecutiveInsightSeverity;
  sourceModule?: string;
  relatedInsightIds?: readonly string[];
  watch?: boolean;
}

export interface ExecutiveNarrativeSectionEntry {
  id: string;
  title?: string;
  body: string;
  severity?: ExecutiveInsightSeverity;
  sourceModule?: string;
  relatedInsightIds?: readonly string[];
}

export interface ExecutiveNarrativeSection {
  kind: ExecutiveNarrativeSectionKind;
  title: string;
  entries: readonly ExecutiveNarrativeSectionEntry[];
}

/**
 * Structured narrative assembled from insights.
 * Sections: summary, risks, positives, observations, recommendations, watch list.
 */
export interface ExecutiveNarrative {
  id: string;
  title: string;
  generatedAt: string;
  sourceModules: readonly string[];
  sections: readonly ExecutiveNarrativeSection[];
  observations: readonly ExecutiveObservation[];
  recommendations: readonly ExecutiveRecommendation[];
  risks: readonly ExecutiveRisk[];
  overallRiskLevel: ExecutiveInsightSeverity | "none";
  confidence?: number;
  provenance?: ExecutiveIntelligenceProvenance;
}

/**
 * Presentation-facing brief contract for Mission Control UI.
 * Executive Briefing consumes this model only — never raw sources.
 */
export interface ExecutiveBriefModel {
  id: string;
  presentedBy: "CHANAKYA";
  title: string;
  /** Primary narrative text for the brief card */
  summary: string;
  observations: readonly string[];
  recommendations: readonly string[];
  riskLevel: ExecutiveInsightSeverity | "none";
  confidence?: number;
  generatedAt: string;
  sourceModules: readonly string[];
  narrative: ExecutiveNarrative;
  /** Optional structured extras for future UI sections */
  criticalRisks: readonly ExecutiveRisk[];
  positiveDevelopments: readonly ExecutiveNarrativeSectionEntry[];
  watchList: readonly ExecutiveNarrativeSectionEntry[];
}
