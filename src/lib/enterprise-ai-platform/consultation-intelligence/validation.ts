/**
 * Consultation validation (CO-AI-108).
 */

import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import { EAI_CONSULTATION_FORBIDDEN_CLAIMS } from "@/constants/enterprise-ai-platform/consultation-intelligence";
import type {
  EaiConsultationObject,
  EaiConsultationValidationResult,
} from "@/types/enterprise-ai-consultation";

export function validateEaiConsultationObject(
  consultation: Omit<EaiConsultationObject, "validation">,
): EaiConsultationValidationResult {
  const issues: EaiConsultationValidationResult["issues"] = [];

  if (consultation.crmRecordsCreated !== false) {
    issues.push({
      code: "crm_created",
      message: "Consultation must never create CRM records",
      severity: "error",
    });
  }
  if (consultation.workflowsExecuted !== false) {
    issues.push({
      code: "workflow_executed",
      message: "Consultation must never execute workflows",
      severity: "error",
    });
  }

  if (consultation.blocked) {
    if (consultation.refusalText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
      issues.push({
        code: "invalid_outside_refusal",
        message: "Outside domain must use fixed refusal",
        severity: "error",
      });
    }
    if (consultation.lifecycleState !== "outside_refused") {
      issues.push({
        code: "outside_state",
        message: "Blocked consultation must be outside_refused",
        severity: "error",
      });
    }
    return { valid: !issues.some((i) => i.severity === "error"), issues };
  }

  if (!consultation.summary.facingText.trim()) {
    issues.push({
      code: "empty_summary",
      message: "In-domain consultation must include a summary",
      severity: "error",
    });
  }

  if (consultation.customerObjectives.length === 0) {
    issues.push({
      code: "no_objectives",
      message: "Consultation should capture at least one customer objective",
      severity: "warning",
    });
  }

  if (consultation.completionScore.score < 0 || consultation.completionScore.score > 100) {
    issues.push({
      code: "invalid_completion_score",
      message: "Completion score must be 0–100",
      severity: "error",
    });
  }

  if (consultation.confidence.scoreHint < 0 || consultation.confidence.scoreHint > 100) {
    issues.push({
      code: "invalid_confidence",
      message: "Confidence scoreHint must be 0–100",
      severity: "error",
    });
  }

  if (consultation.transitions.length === 0) {
    issues.push({
      code: "no_transitions",
      message: "Lifecycle should record at least one transition",
      severity: "warning",
    });
  }

  const blob = [
    consultation.summary.facingText,
    ...consultation.summary.consultantNotes,
    ...consultation.customerObjectives.map((o) => o.text),
  ]
    .join(" ")
    .toLowerCase();

  for (const claim of EAI_CONSULTATION_FORBIDDEN_CLAIMS) {
    if (blob.includes(claim)) {
      issues.push({
        code: "forbidden_execution_claim",
        message: `Consultation text claims side effect: "${claim}"`,
        severity: "error",
      });
    }
  }

  // Long response guard — micro communication should keep summary short
  const paragraphs = consultation.summary.facingText.split(/\n\s*\n/).filter(Boolean);
  if (paragraphs.length > 1) {
    issues.push({
      code: "long_summary",
      message: "Consultation summary must stay short (Micro Communication)",
      severity: "error",
    });
  }

  return { valid: !issues.some((i) => i.severity === "error"), issues };
}
