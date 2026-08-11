/**
 * CO-AI-G2-W6 — Policy Validation Harness types.
 * Evaluates Shadow Mode responses — reports only; never mutates responses.
 */

export const EAO_POLICY_VALIDATION_VERSION = "1.0.0-g2-w6" as const;

export const EAO_POLICY_VALIDATION_DIMENSION_IDS = [
  "loan_domain",
  "policy_compliance",
  "hallucination_risk",
  "sensitive_data_exposure",
  "business_rule_compliance",
  "enterprise_guardrails",
] as const;

export type EaoPolicyValidationDimensionId =
  (typeof EAO_POLICY_VALIDATION_DIMENSION_IDS)[number];

export const EAO_POLICY_VALIDATION_DIMENSION_LABELS: Record<
  EaoPolicyValidationDimensionId,
  string
> = {
  loan_domain: "Loan Domain",
  policy_compliance: "Policy Compliance",
  hallucination_risk: "Hallucination Risk",
  sensitive_data_exposure: "Sensitive Data Exposure",
  business_rule_compliance: "Business Rule Compliance",
  enterprise_guardrails: "Enterprise Guardrails",
};

export type EaoPolicyValidationSeverity = "info" | "warn" | "fail";

export interface EaoPolicyValidationFinding {
  severity: EaoPolicyValidationSeverity;
  code: string;
  detail: string;
}

export interface EaoPolicyValidationDimensionResult {
  dimensionId: EaoPolicyValidationDimensionId;
  label: string;
  /** 0–100 (higher = safer / more compliant) */
  score: number;
  passed: boolean;
  findings: EaoPolicyValidationFinding[];
}

export interface EaoPolicyValidationInput {
  /** Shadow / model facing text under evaluation */
  shadowFacingText: string;
  customerUtterance: string;
  /** Optional live text for contrast (not modified) */
  liveFacingText?: string;
  shadowId?: string;
  sessionId?: string;
  conversationId?: string;
  label?: string;
}

export interface EaoPolicyValidationReport {
  reportId: string;
  version: typeof EAO_POLICY_VALIDATION_VERSION;
  label: string;
  shadowId?: string;
  customerUtterance: string;
  /** Echo of evaluated text — never rewritten by harness */
  evaluatedFacingText: string;
  overallScore: number;
  passed: boolean;
  dimensions: EaoPolicyValidationDimensionResult[];
  /** Aggregated fail/warn findings */
  findings: EaoPolicyValidationFinding[];
  recommendations: string[];
  validatedAt: string;
  /** Harness does not alter shadow or live responses */
  responseUnmodified: true;
  customerIsolated: true;
}

export interface EaoPolicyValidationSuiteReport {
  reportId: string;
  title: string;
  version: typeof EAO_POLICY_VALIDATION_VERSION;
  reports: EaoPolicyValidationReport[];
  suiteOverallScore: number;
  passCount: number;
  failCount: number;
  generatedAt: string;
  responseUnmodified: true;
  customerIsolated: true;
}
