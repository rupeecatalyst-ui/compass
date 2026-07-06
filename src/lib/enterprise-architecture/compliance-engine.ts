/**
 * Architecture Compliance Engine — design-time evaluation only.
 * Extensible rule registry; no runtime graph traversal.
 */

import {
  COMPLIANCE_RULE_LABELS,
  DEFAULT_COMPLIANCE_RULE_WEIGHTS,
  scoreFromVerdict,
} from "@/constants/architecture-compliance";
import { DOCUMENTATION_STATUS_LABELS } from "@/constants/documentation-status";
import type {
  ComplianceEvaluation,
  ComplianceRuleId,
  ComplianceRuleResult,
  ComplianceVerdict,
  EnterpriseRegistryRecord,
} from "@/types/enterprise-architecture";

export interface ComplianceRuleDefinition {
  id: ComplianceRuleId;
  label: string;
  weight: number;
  evaluate: (artifact: EnterpriseRegistryRecord) => { verdict: ComplianceVerdict; message: string };
}

const customRules: ComplianceRuleDefinition[] = [];

/** Extensibility — modules can register additional rules at bootstrap. */
export function registerComplianceRule(rule: ComplianceRuleDefinition): void {
  const idx = customRules.findIndex((r) => r.id === rule.id);
  if (idx >= 0) customRules[idx] = rule;
  else customRules.push(rule);
}

function verdictFromFlag(
  value: boolean,
  passMsg: string,
  failMsg: string,
  warnIfFalse = false,
): { verdict: ComplianceVerdict; message: string } {
  if (value) return { verdict: "pass", message: passMsg };
  if (warnIfFalse) return { verdict: "warning", message: failMsg };
  return { verdict: "fail", message: failMsg };
}

const BUILT_IN_RULES: ComplianceRuleDefinition[] = [
  {
    id: "metadata_driven",
    label: COMPLIANCE_RULE_LABELS.metadata_driven,
    weight: DEFAULT_COMPLIANCE_RULE_WEIGHTS.metadata_driven,
    evaluate: (a) =>
      verdictFromFlag(
        a.architectureMetadata.metadataDriven,
        "Artifact behavior is metadata-driven.",
        "Artifact contains hardcoded configuration — migrate to metadata.",
      ),
  },
  {
    id: "version_controlled",
    label: COMPLIANCE_RULE_LABELS.version_controlled,
    weight: DEFAULT_COMPLIANCE_RULE_WEIGHTS.version_controlled,
    evaluate: (a) =>
      verdictFromFlag(
        a.architectureMetadata.versionControlled && a.version !== "0.0.0",
        `Version ${a.version} is tracked.`,
        "Version control not enabled or version unset.",
      ),
  },
  {
    id: "audit_enabled",
    label: COMPLIANCE_RULE_LABELS.audit_enabled,
    weight: DEFAULT_COMPLIANCE_RULE_WEIGHTS.audit_enabled,
    evaluate: (a) =>
      verdictFromFlag(
        a.architectureMetadata.auditEnabled,
        "Audit trail is enabled.",
        "Audit trail not configured.",
        a.status === "planned",
      ),
  },
  {
    id: "permission_model",
    label: COMPLIANCE_RULE_LABELS.permission_model,
    weight: DEFAULT_COMPLIANCE_RULE_WEIGHTS.permission_model,
    evaluate: (a) =>
      verdictFromFlag(
        a.architectureMetadata.permissionModelDefined,
        "Permission model is defined.",
        "Permission model missing.",
        a.type === "widget",
      ),
  },
  {
    id: "api_registered",
    label: COMPLIANCE_RULE_LABELS.api_registered,
    weight: DEFAULT_COMPLIANCE_RULE_WEIGHTS.api_registered,
    evaluate: (a) => {
      const needsApi = ["api", "service", "integration", "capability"].includes(a.type);
      if (!needsApi) return { verdict: "pass", message: "API registration not required for this type." };
      return verdictFromFlag(
        a.architectureMetadata.apiRegistered,
        "API surface is registered.",
        "API not registered in enterprise catalog.",
      );
    },
  },
  {
    id: "events_registered",
    label: COMPLIANCE_RULE_LABELS.events_registered,
    weight: DEFAULT_COMPLIANCE_RULE_WEIGHTS.events_registered,
    evaluate: (a) => {
      const needsEvents = ["workflow", "event", "service", "integration"].includes(a.type);
      if (!needsEvents) return { verdict: "pass", message: "Event registration not required for this type." };
      return verdictFromFlag(
        a.architectureMetadata.eventsRegistered,
        "Domain events are registered.",
        "Events not registered.",
        a.status === "design",
      );
    },
  },
  {
    id: "documentation_exists",
    label: COMPLIANCE_RULE_LABELS.documentation_exists,
    weight: DEFAULT_COMPLIANCE_RULE_WEIGHTS.documentation_exists,
    evaluate: (a) => {
      if (a.documentationStatus === "published") {
        return { verdict: "pass", message: "Documentation is published." };
      }
      if (a.documentationStatus === "review" || a.documentationStatus === "draft") {
        return {
          verdict: "warning",
          message: `Documentation is ${DOCUMENTATION_STATUS_LABELS[a.documentationStatus].toLowerCase()}.`,
        };
      }
      if (a.documentationStatus === "outdated") {
        return { verdict: "warning", message: "Documentation is outdated — refresh required." };
      }
      return { verdict: "fail", message: "No documentation linked." };
    },
  },
  {
    id: "configuration_driven",
    label: COMPLIANCE_RULE_LABELS.configuration_driven,
    weight: DEFAULT_COMPLIANCE_RULE_WEIGHTS.configuration_driven,
    evaluate: (a) =>
      verdictFromFlag(
        a.architectureMetadata.configurationDriven,
        "Behavior is configuration-driven.",
        "Hardcoded behavior detected — use FORGE configuration (reserved).",
      ),
  },
  {
    id: "reusable",
    label: COMPLIANCE_RULE_LABELS.reusable,
    weight: DEFAULT_COMPLIANCE_RULE_WEIGHTS.reusable,
    evaluate: (a) =>
      verdictFromFlag(
        a.architectureMetadata.reusable,
        "Artifact is designed for cross-module reuse.",
        "Artifact is module-specific — consider generalizing.",
        a.status === "development",
      ),
  },
  {
    id: "performance_budget_defined",
    label: COMPLIANCE_RULE_LABELS.performance_budget_defined,
    weight: DEFAULT_COMPLIANCE_RULE_WEIGHTS.performance_budget_defined,
    evaluate: (a) =>
      verdictFromFlag(
        a.architectureMetadata.performanceBudgetDefined && a.performanceBudgetId !== null,
        "Performance budget is defined.",
        "Performance budget not defined.",
        a.status === "planned" || a.status === "design",
      ),
  },
  {
    id: "no_hardcoded_business_logic",
    label: COMPLIANCE_RULE_LABELS.no_hardcoded_business_logic,
    weight: DEFAULT_COMPLIANCE_RULE_WEIGHTS.no_hardcoded_business_logic,
    evaluate: (a) =>
      verdictFromFlag(
        a.architectureMetadata.noHardcodedBusinessLogic,
        "No hardcoded business logic in artifact.",
        "Hardcoded business logic detected — extract to Rule Library or metadata.",
      ),
  },
];

function getActiveRules(): ComplianceRuleDefinition[] {
  const builtInIds = new Set(BUILT_IN_RULES.map((r) => r.id));
  const overrides = customRules.filter((r) => builtInIds.has(r.id));
  const overrideIds = new Set(overrides.map((r) => r.id));
  const base = BUILT_IN_RULES.filter((r) => !overrideIds.has(r.id));
  const extras = customRules.filter((r) => !builtInIds.has(r.id));
  return [...base, ...overrides, ...extras];
}

export function evaluateArtifactCompliance(
  artifact: EnterpriseRegistryRecord,
): ComplianceEvaluation {
  const rules = getActiveRules();
  const results: ComplianceRuleResult[] = rules.map((rule) => {
    const { verdict, message } = rule.evaluate(artifact);
    return { ruleId: rule.id, label: rule.label, verdict, message };
  });

  const totalWeight = rules.reduce((sum, r) => sum + r.weight, 0);
  const earned = results.reduce((sum, result, i) => {
    const weight = rules[i]?.weight ?? 0;
    return sum + scoreFromVerdict(result.verdict, weight);
  }, 0);
  const overallScore = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0;

  return {
    enterpriseId: artifact.enterpriseId,
    results,
    overallScore,
    evaluatedAt: new Date().toISOString(),
  };
}

export function getComplianceRules(): ComplianceRuleDefinition[] {
  return getActiveRules();
}
