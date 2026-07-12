/**
 * Executive Narrative Engine — primitive types.
 * SPR-007.2B — contracts only; no intelligence.
 */

export type ExecutiveInsightSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info";

export type ExecutiveInsightCategory =
  | "risk"
  | "operations"
  | "commercial"
  | "credit"
  | "compliance"
  | "security"
  | "observability"
  | "customer"
  | "partner"
  | "document"
  | "product"
  | "workflow"
  | "other";

export type ExecutiveNarrativeSectionKind =
  | "executive_summary"
  | "critical_risks"
  | "positive_developments"
  | "operational_observations"
  | "recommendations"
  | "watch_list";

export type ExecutiveSourceModuleStatus =
  | "registered"
  | "planned"
  | "active"
  | "suspended"
  | "deprecated";

export type ExecutiveIntelligenceProvenance =
  | "placeholder"
  | "rules"
  | "analytics"
  | "ai"
  | "manual"
  | "unknown";

/** Opaque metadata bag — engines may attach structured context later */
export type ExecutiveInsightMetadata = Readonly<Record<string, string | number | boolean | null>>;
