import type { PlatformCompositionRef } from "@/types/product-library";

/**
 * Design-time catalog for platform composition references.
 * Enterprise assets are stored inline on product versions via compositionAssets[].
 */
export const DEFAULT_PLATFORM_COMPOSITION_CATALOG: PlatformCompositionRef[] = [
  { refId: "policy_001", refType: "policy", version: "v2.1", status: "published", description: "Secured Home Loan — Standard Matrix" },
  { refId: "policy_002", refType: "policy", version: "v1.3", status: "published", description: "LAP — Metro Geography Pack" },
  { refId: "wf_001", refType: "workflow", version: "v1.0", status: "published", description: "Generic Approval Workflow" },
  { refId: "wf_002", refType: "workflow", version: "v1.0", status: "published", description: "Artifact Lifecycle Workflow" },
  { refId: "wf_003", refType: "workflow", version: "v1.0", status: "published", description: "Standard Execution Workflow" },
  { refId: "rule_001", refType: "rule", version: "v1.2", status: "published", description: "Minimum CIBIL Score" },
  { refId: "rule_002", refType: "rule", version: "v1.0", status: "published", description: "LAP LTV Threshold" },
  { refId: "rule_003", refType: "rule", version: "v1.1", status: "published", description: "Property Valuation Check" },
  { refId: "rule_004", refType: "rule", version: "v1.0", status: "published", description: "Personal Loan Income Multiplier" },
  { refId: "rule_005", refType: "rule", version: "v0.9", status: "draft", description: "SME Turnover Threshold" },
  { refId: "rule_006", refType: "rule", version: "v1.0", status: "published", description: "Working Capital DSCR" },
  { refId: "rule_007", refType: "rule", version: "v1.0", status: "published", description: "FOIR Threshold" },
  { refId: "decision_home", refType: "decision_matrix", version: "v1.0", status: "published", description: "Home loan decision matrix reference" },
  { refId: "decision_pl", refType: "decision_matrix", version: "v1.0", status: "published", description: "Personal loan decision matrix reference" },
  { refId: "decision_lap", refType: "decision_matrix", version: "v1.0", status: "published", description: "LAP decision matrix reference" },
];
