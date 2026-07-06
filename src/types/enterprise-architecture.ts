/**
 * CARB v1 — Catalyst Architecture Review Board.
 * Enterprise platform types. Module-agnostic; reusable across CEOS capabilities.
 */

/** Registry artifact classification — extensible via prefix registry metadata. */
export type EnterpriseArtifactType =
  | "capability"
  | "object"
  | "screen"
  | "api"
  | "policy"
  | "rule"
  | "workflow"
  | "event"
  | "report"
  | "dashboard"
  | "widget"
  | "integration"
  | "permission"
  | "role"
  | "module"
  | "service";

export type EnterpriseArtifactStatus =
  | "planned"
  | "design"
  | "development"
  | "review"
  | "active"
  | "deprecated"
  | "retired";

/** Documentation readiness — prepares integration with SAGE. */
export type DocumentationStatus =
  | "no_documentation"
  | "draft"
  | "review"
  | "published"
  | "outdated";

export type ComplianceVerdict = "pass" | "warning" | "fail";

export type ComplianceRuleId =
  | "metadata_driven"
  | "version_controlled"
  | "audit_enabled"
  | "permission_model"
  | "api_registered"
  | "events_registered"
  | "documentation_exists"
  | "configuration_driven"
  | "reusable"
  | "performance_budget_defined"
  | "no_hardcoded_business_logic";

/** Design-time architecture metadata — evaluated by compliance engine only. */
export interface EnterpriseArchitectureMetadata {
  metadataDriven: boolean;
  versionControlled: boolean;
  auditEnabled: boolean;
  permissionModelDefined: boolean;
  apiRegistered: boolean;
  eventsRegistered: boolean;
  configurationDriven: boolean;
  reusable: boolean;
  performanceBudgetDefined: boolean;
  noHardcodedBusinessLogic: boolean;
}

/**
 * Performance budget — stored at design-time; not enforced at runtime.
 */
export interface PerformanceBudget {
  id: string;
  enterpriseId: string;
  label: string;
  expectedQueries: number;
  expectedApiCalls: number;
  expectedCacheUsage: string;
  expectedMemoryProfile: string;
  expectedResponseTimeMs: number;
  expectedAsyncEvents: number;
  expectedSyncOperations: number;
}

/**
 * Enterprise catalog record — not a graph node.
 * No runtime dependency analysis or traversal.
 */
export interface EnterpriseRegistryRecord {
  enterpriseId: string;
  name: string;
  type: EnterpriseArtifactType;
  parentId: string | null;
  owner: string;
  status: EnterpriseArtifactStatus;
  version: string;
  description: string;
  createdDate: string;
  modifiedDate: string;
  documentationStatus: DocumentationStatus;
  complianceScore: number;
  performanceBudgetId: string | null;
  architectureMetadata: EnterpriseArchitectureMetadata;
  /** Reserved — ATLAS Enterprise Knowledge Graph */
  atlasId: string | null;
  /** Reserved — SAGE Knowledge Hub */
  sageId: string | null;
  /** Reserved — FORGE Configuration Studio */
  forgeId: string | null;
}

export interface ComplianceRuleResult {
  ruleId: ComplianceRuleId;
  label: string;
  verdict: ComplianceVerdict;
  message: string;
}

export interface ComplianceEvaluation {
  enterpriseId: string;
  results: ComplianceRuleResult[];
  overallScore: number;
  evaluatedAt: string;
}

export interface EnterpriseIdPrefixConfig {
  code: string;
  label: string;
  description: string;
  artifactType: EnterpriseArtifactType;
  padLength: number;
}

export type ArchitectureSectionId =
  | "overview"
  | "atlas"
  | "compliance"
  | "registry"
  | "performance"
  | "documentation"
  | "health";

export interface ArchitectureDashboardMetrics {
  totalArtifacts: number;
  activeArtifacts: number;
  averageComplianceScore: number;
  documentationPublished: number;
  performanceBudgetsDefined: number;
  complianceFailures: number;
  complianceWarnings: number;
  healthScore: number;
}

/** Extension hook — reserved for COMPASS AI Platform integration. */
export interface CompassIntegrationHook {
  hookId: string;
  label: string;
  status: "reserved";
}
