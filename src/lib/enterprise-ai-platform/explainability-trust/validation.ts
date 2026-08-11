/**
 * Explainability validation (CO-AI-110).
 */

import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import {
  EAI_EXPLAINABILITY_FORBIDDEN_CLAIMS,
  EAI_TRUST_REASON_CATALOGUE,
} from "@/constants/enterprise-ai-platform/explainability";
import type {
  EaiTrustPackage,
  EaiExplainabilityValidationResult,
} from "@/types/enterprise-ai-explainability";

export function validateEaiTrustPackage(
  pkg: Omit<EaiTrustPackage, "validation">,
): EaiExplainabilityValidationResult {
  const issues: EaiExplainabilityValidationResult["issues"] = [];

  if (pkg.blocked) {
    if (pkg.refusalText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
      issues.push({
        code: "invalid_outside_refusal",
        message: "Outside domain must use fixed refusal",
        severity: "error",
      });
    }
    return { valid: !issues.some((i) => i.severity === "error"), issues };
  }

  const exp = pkg.recommendationExplanation;

  // All reason codes must be in catalogue
  for (const rc of exp.reasonCodes) {
    if (!(rc.code in EAI_TRUST_REASON_CATALOGUE)) {
      issues.push({
        code: "fabricated_reason_code",
        message: `Unknown reason code: ${rc.code}`,
        severity: "error",
      });
    }
  }

  // Epistemic separation
  for (const f of exp.supportingFacts) {
    if (f.statementClass !== "fact") {
      issues.push({
        code: "fact_mislabelled",
        message: "Supporting facts must be labelled as fact",
        severity: "error",
      });
    }
  }
  for (const a of exp.assumptions) {
    if (a.statementClass !== "assumption") {
      issues.push({
        code: "assumption_mislabelled",
        message: "Assumptions must be labelled as assumption",
        severity: "error",
      });
    }
  }
  if (exp.statementClass !== "recommendation") {
    issues.push({
      code: "recommendation_mislabelled",
      message: "Primary explanation must be labelled recommendation",
      severity: "error",
    });
  }

  // Never hide uncertainty
  if (exp.confidenceExplanation.uncertaintyLines.length === 0) {
    issues.push({
      code: "hidden_uncertainty",
      message: "Confidence explanation must surface uncertainty",
      severity: "error",
    });
  }

  // Decision trace present
  if (pkg.decisionTrace.length === 0) {
    issues.push({
      code: "empty_decision_trace",
      message: "Decision trace must record observed stages",
      severity: "error",
    });
  }

  // Trace sequence integrity
  for (let i = 0; i < pkg.decisionTrace.length; i++) {
    if (pkg.decisionTrace[i]!.sequence !== i + 1) {
      issues.push({
        code: "trace_sequence",
        message: "Decision trace sequence must be 1..n",
        severity: "error",
      });
      break;
    }
  }

  // Flattened inventories must match classes
  if (pkg.facts.some((f) => f.statementClass !== "fact")) {
    issues.push({
      code: "inventory_fact_class",
      message: "Package facts inventory must only contain facts",
      severity: "error",
    });
  }
  if (pkg.assumptions.some((a) => a.statementClass !== "assumption")) {
    issues.push({
      code: "inventory_assumption_class",
      message: "Package assumptions inventory must only contain assumptions",
      severity: "error",
    });
  }
  if (pkg.recommendations.some((r) => r.statementClass !== "recommendation")) {
    issues.push({
      code: "inventory_recommendation_class",
      message: "Package recommendations inventory must only contain recommendations",
      severity: "error",
    });
  }

  const blob = [
    exp.recommendationSummary,
    ...exp.facingLines,
    ...exp.confidenceExplanation.explanationLines,
  ]
    .join(" ")
    .toLowerCase();

  for (const claim of EAI_EXPLAINABILITY_FORBIDDEN_CLAIMS) {
    if (blob.includes(claim)) {
      issues.push({
        code: "forbidden_claim",
        message: `Explanation fabricates or overclaims: "${claim}"`,
        severity: "error",
      });
    }
  }

  if (exp.reasonCodes.length === 0) {
    issues.push({
      code: "no_reason_codes",
      message: "In-domain explanation must include reason codes",
      severity: "error",
    });
  }

  return { valid: !issues.some((i) => i.severity === "error"), issues };
}
