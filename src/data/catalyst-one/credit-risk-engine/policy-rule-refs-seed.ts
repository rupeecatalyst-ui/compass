import type { PolicyRuleReference } from "@/types/credit-risk-engine";

/**
 * Policy → Rule version references.
 * Policies assemble rules from the Rule Library — no duplicated business logic.
 */
export const DEFAULT_POLICY_RULE_REFS: PolicyRuleReference[] = [
  // policy_001 — Secured Home Loan (published v2.1)
  { id: "pref_001", policyId: "policy_001", ruleId: "rule_001", ruleCode: "FIN_FOIR_MAX", ruleName: "Maximum FOIR Threshold", sectionId: "financial", majorVersion: 2, minorVersion: 0, sortOrder: 1 },
  { id: "pref_002", policyId: "policy_001", ruleId: "rule_002", ruleCode: "PROP_LTV_MAX", ruleName: "Maximum LTV Ratio", sectionId: "property", majorVersion: 1, minorVersion: 2, sortOrder: 1 },
  { id: "pref_003", policyId: "policy_001", ruleId: "rule_003", ruleCode: "BUR_CIBIL_MIN", ruleName: "Minimum Bureau Score", sectionId: "bureau", majorVersion: 3, minorVersion: 1, sortOrder: 1 },
  { id: "pref_004", policyId: "policy_001", ruleId: "rule_007", ruleCode: "FIN_DBR_MAX", ruleName: "Maximum DBR Threshold", sectionId: "financial", majorVersion: 1, minorVersion: 0, sortOrder: 2 },
  { id: "pref_005", policyId: "policy_001", ruleId: "rule_006", ruleCode: "SCR_FIN_HEALTH", ruleName: "Financial Health Score", sectionId: "financial", majorVersion: 1, minorVersion: 0, sortOrder: 3 },
  // policy_002 — LAP Metro (approved) — pinned older FOIR v1.0 for upgrade demo
  { id: "pref_006", policyId: "policy_002", ruleId: "rule_002", ruleCode: "PROP_LTV_MAX", ruleName: "Maximum LTV Ratio", sectionId: "property", majorVersion: 1, minorVersion: 0, sortOrder: 1 },
  { id: "pref_007", policyId: "policy_002", ruleId: "rule_005", ruleCode: "GEO_METRO_ONLY", ruleName: "Metro City Restriction", sectionId: "geography", majorVersion: 1, minorVersion: 0, sortOrder: 1 },
  { id: "pref_008", policyId: "policy_002", ruleId: "rule_003", ruleCode: "BUR_CIBIL_MIN", ruleName: "Minimum Bureau Score", sectionId: "bureau", majorVersion: 2, minorVersion: 0, sortOrder: 1 },
  // policy_003 — Construction Finance (testing) — missing FOIR warning demo (LTV only)
  { id: "pref_009", policyId: "policy_003", ruleId: "rule_002", ruleCode: "PROP_LTV_MAX", ruleName: "Maximum LTV Ratio", sectionId: "property", majorVersion: 1, minorVersion: 2, sortOrder: 1 },
  { id: "pref_010", policyId: "policy_003", ruleId: "rule_003", ruleCode: "BUR_CIBIL_MIN", ruleName: "Minimum Bureau Score", sectionId: "bureau", majorVersion: 3, minorVersion: 1, sortOrder: 1 },
  // policy_004 — Working Capital (draft)
  { id: "pref_011", policyId: "policy_004", ruleId: "rule_004", ruleCode: "BANK_ABB_MIN", ruleName: "Minimum Average Bank Balance", sectionId: "banking", majorVersion: 1, minorVersion: 0, sortOrder: 1 },
  { id: "pref_012", policyId: "policy_004", ruleId: "rule_008", ruleCode: "BANK_HEALTH_MIN", ruleName: "Banking Health Score", sectionId: "banking", majorVersion: 1, minorVersion: 0, sortOrder: 2 },
];
