import type { ComplianceRuleId, ComplianceVerdict } from "@/types/enterprise-architecture";

export const COMPLIANCE_VERDICT_LABELS: Record<ComplianceVerdict, string> = {
  pass: "Pass",
  warning: "Warning",
  fail: "Fail",
};

export const COMPLIANCE_VERDICT_VARIANT: Record<ComplianceVerdict, "success" | "warning" | "error"> = {
  pass: "success",
  warning: "warning",
  fail: "error",
};

export const COMPLIANCE_RULE_LABELS: Record<ComplianceRuleId, string> = {
  metadata_driven: "Metadata Driven",
  version_controlled: "Version Controlled",
  audit_enabled: "Audit Enabled",
  permission_model: "Permission Model",
  api_registered: "API Registered",
  events_registered: "Events Registered",
  documentation_exists: "Documentation Exists",
  configuration_driven: "Configuration Driven",
  reusable: "Reusable",
  performance_budget_defined: "Performance Budget Defined",
  no_hardcoded_business_logic: "No Hardcoded Business Logic",
};

/** Weight per rule for overall score — extensible via registerComplianceRule. */
export const DEFAULT_COMPLIANCE_RULE_WEIGHTS: Record<ComplianceRuleId, number> = {
  metadata_driven: 10,
  version_controlled: 10,
  audit_enabled: 8,
  permission_model: 8,
  api_registered: 7,
  events_registered: 6,
  documentation_exists: 9,
  configuration_driven: 9,
  reusable: 10,
  performance_budget_defined: 8,
  no_hardcoded_business_logic: 15,
};

export function scoreFromVerdict(verdict: ComplianceVerdict, weight: number): number {
  if (verdict === "pass") return weight;
  if (verdict === "warning") return weight * 0.5;
  return 0;
}
