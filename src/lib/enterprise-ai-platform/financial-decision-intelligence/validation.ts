/**
 * FDI Recommendation Validation (CO-AI-105).
 * Ensures FDI packages never claim calculated eligibility / approval / pricing.
 */

import {
  EAI_FDI_DISCLAIMERS,
  EAI_FDI_FORBIDDEN_CALCULATION_CLAIMS,
} from "@/constants/enterprise-ai-platform/financial-decision-intelligence";
import type {
  EaiFdiDecisionPackage,
  EaiFdiValidationIssue,
  EaiFdiValidationResult,
} from "@/types/enterprise-ai-financial-decision";

function textClaimsForbiddenCalculation(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const claim of EAI_FDI_FORBIDDEN_CALCULATION_CLAIMS) {
    if (lower.includes(claim)) return claim;
  }
  return undefined;
}

export function validateEaiFdiDecisionPackage(
  pkg: Omit<EaiFdiDecisionPackage, "validation">,
): EaiFdiValidationResult {
  const issues: EaiFdiValidationIssue[] = [];

  if (!pkg.packageId) {
    issues.push({ code: "missing_package_id", message: "packageId required", severity: "error" });
  }
  if (!pkg.disclaimers.some((d) => d.includes("does not approve"))) {
    issues.push({
      code: "missing_disclaimer",
      message: "Approval disclaimer required",
      severity: "error",
    });
  }
  for (const required of EAI_FDI_DISCLAIMERS.slice(0, 2)) {
    if (!pkg.disclaimers.includes(required)) {
      issues.push({
        code: "incomplete_disclaimers",
        message: `Missing disclaimer: ${required.slice(0, 60)}…`,
        severity: "warning",
      });
    }
  }

  if (!pkg.blocked && pkg.recommendations.length === 0) {
    issues.push({
      code: "empty_recommendations",
      message: "In-domain FDI package must include recommendations",
      severity: "error",
    });
  }

  for (const rec of pkg.recommendations) {
    const hit = textClaimsForbiddenCalculation(`${rec.title} ${rec.summary}`);
    if (hit) {
      issues.push({
        code: "forbidden_calculation_claim",
        message: `Recommendation claims calculation/approval language: "${hit}"`,
        severity: "error",
      });
    }
    if (rec.kind !== "outside_domain_refused" && rec.notCalculatedByFdi.length === 0) {
      issues.push({
        code: "missing_not_calculated",
        message: `Recommendation ${rec.recommendationId} must declare notCalculatedByFdi`,
        severity: "error",
      });
    }
  }

  for (const line of pkg.explanation.narrativeLines) {
    const hit = textClaimsForbiddenCalculation(line);
    if (hit) {
      issues.push({
        code: "explanation_calculation_claim",
        message: `Explanation claims calculation language: "${hit}"`,
        severity: "error",
      });
    }
  }

  for (const fact of pkg.engineFactsUsed) {
    if (fact.provenance !== "enterprise_engine") {
      issues.push({
        code: "invalid_engine_fact_provenance",
        message: `Engine fact ${fact.key} must have provenance enterprise_engine`,
        severity: "error",
      });
    }
    if (!fact.engineId.trim()) {
      issues.push({
        code: "missing_engine_id",
        message: `Engine fact ${fact.key} missing engineId`,
        severity: "error",
      });
    }
  }

  // Alternatives must not be product rankings (no score fields exist by type — check labels)
  for (const alt of pkg.alternatives) {
    if (/\brank\b|\bscore\b|\bbest product\b/i.test(`${alt.label} ${alt.description}`)) {
      issues.push({
        code: "product_ranking_forbidden",
        message: `Alternative looks like product ranking: ${alt.label}`,
        severity: "error",
      });
    }
  }

  if (pkg.blocked && pkg.refusalText !== "I'm not trained for this subject.") {
    issues.push({
      code: "invalid_outside_refusal",
      message: "Blocked FDI must use fixed outside-domain refusal",
      severity: "error",
    });
  }

  return {
    valid: !issues.some((i) => i.severity === "error"),
    issues,
  };
}
