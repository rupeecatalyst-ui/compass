/**
 * Advisory Reasoning validation (CO-AI-106).
 */

import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import type {
  EaiAdvisoryReasoningResult,
  EaiAdvisoryValidationResult,
} from "@/types/enterprise-ai-advisory-reasoning";

const FORBIDDEN = [
  "you qualify",
  "approved for",
  "foir calculated",
  "interest rate is",
  "loan sanctioned",
] as const;

export function validateEaiAdvisoryReasoningResult(
  result: Omit<EaiAdvisoryReasoningResult, "validation">,
): EaiAdvisoryValidationResult {
  const issues: EaiAdvisoryValidationResult["issues"] = [];

  if (result.blocked) {
    if (result.refusalText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
      issues.push({
        code: "invalid_outside_refusal",
        message: "Outside domain must use fixed refusal",
        severity: "error",
      });
    }
    if (result.facingText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
      issues.push({
        code: "outside_facing_mismatch",
        message: "Facing text must equal fixed outside refusal",
        severity: "error",
      });
    }
    return { valid: !issues.some((i) => i.severity === "error"), issues };
  }

  if (!result.facingText.trim()) {
    issues.push({
      code: "empty_facing_text",
      message: "In-domain advice must produce facing text",
      severity: "error",
    });
  }

  const paragraphs = result.facingText.split(/\n\s*\n/).filter(Boolean);
  if (paragraphs.length > 1) {
    issues.push({
      code: "long_response",
      message: "Advisory responses must not use long paragraphs",
      severity: "error",
    });
  }

  const lineCount = result.facingText.split("\n").filter(Boolean).length;
  if (lineCount > 6) {
    issues.push({
      code: "too_many_lines",
      message: `Facing text has ${lineCount} lines — keep micro communication short`,
      severity: "warning",
    });
  }

  const blob = `${result.facingText} ${result.fragments.map((f) => f.lines.join(" ")).join(" ")}`.toLowerCase();
  for (const claim of FORBIDDEN) {
    if (blob.includes(claim)) {
      issues.push({
        code: "forbidden_calculation_claim",
        message: `Advisory text claims calculation/approval: "${claim}"`,
        severity: "error",
      });
    }
  }

  if (result.fragments.length === 0) {
    issues.push({
      code: "no_fragments",
      message: "In-domain result should include advice fragments",
      severity: "warning",
    });
  }

  return { valid: !issues.some((i) => i.severity === "error"), issues };
}
