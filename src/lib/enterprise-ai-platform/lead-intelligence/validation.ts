/**
 * Lead Intelligence validation (CO-AI-109).
 */

import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import { EAI_LEAD_INTELLIGENCE_FORBIDDEN_CLAIMS } from "@/constants/enterprise-ai-platform/lead-intelligence";
import type {
  EaiLeadIntelligenceResult,
  EaiLeadIntelligenceValidationResult,
} from "@/types/enterprise-ai-lead-intelligence";

export function validateEaiLeadIntelligenceResult(
  result: Omit<EaiLeadIntelligenceResult, "validation">,
): EaiLeadIntelligenceValidationResult {
  const issues: EaiLeadIntelligenceValidationResult["issues"] = [];

  if (result.leadsCreated !== false) {
    issues.push({ code: "lead_created", message: "Must never create leads", severity: "error" });
  }
  if (result.opportunitiesCreated !== false) {
    issues.push({
      code: "opportunity_created",
      message: "Must never create opportunities",
      severity: "error",
    });
  }
  if (result.crmModified !== false) {
    issues.push({ code: "crm_modified", message: "Must never modify CRM", severity: "error" });
  }
  if (result.workflowsTriggered !== false) {
    issues.push({
      code: "workflow_triggered",
      message: "Must never trigger workflows",
      severity: "error",
    });
  }

  if (result.blocked) {
    if (result.refusalText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
      issues.push({
        code: "invalid_outside_refusal",
        message: "Outside domain must use fixed refusal",
        severity: "error",
      });
    }
    if (result.actionProposalIds.length > 0) {
      issues.push({
        code: "outside_proposals",
        message: "Outside domain must not emit proposals",
        severity: "error",
      });
    }
    return { valid: !issues.some((i) => i.severity === "error"), issues };
  }

  for (const dim of [
    result.leadReadiness,
    result.opportunityReadiness,
    result.documentReadiness,
    result.customerReadiness,
  ]) {
    if (dim.score < 0 || dim.score > 100) {
      issues.push({
        code: "invalid_readiness_score",
        message: `${dim.dimension} readiness score out of range`,
        severity: "error",
      });
    }
  }

  if (result.priorityScore < 0 || result.priorityScore > 100) {
    issues.push({
      code: "invalid_priority",
      message: "Priority score must be 0–100",
      severity: "error",
    });
  }

  // Ranking integrity
  const ranks = result.rankedProposals.map((p) => p.rank);
  for (let i = 0; i < ranks.length; i++) {
    if (ranks[i] !== i + 1) {
      issues.push({
        code: "ranking_order",
        message: "Ranked proposals must be ordered 1..n",
        severity: "error",
      });
      break;
    }
  }

  for (const p of result.rankedProposals) {
    if (!p.requiresHumanApproval || !p.executionForbidden) {
      issues.push({
        code: "execution_not_forbidden",
        message: "Every ranked proposal must require approval and forbid execution",
        severity: "error",
      });
    }
  }

  const blob = [
    ...result.nextBestActions.map((a) => `${a.title} ${a.summary}`),
    ...result.rankedProposals.map((p) => `${p.title} ${p.summary}`),
  ]
    .join(" ")
    .toLowerCase();

  for (const claim of EAI_LEAD_INTELLIGENCE_FORBIDDEN_CLAIMS) {
    if (blob.includes(claim)) {
      issues.push({
        code: "forbidden_execution_claim",
        message: `Text claims side effect: "${claim}"`,
        severity: "error",
      });
    }
  }

  if (result.nextBestActions.length === 0) {
    issues.push({
      code: "empty_nba",
      message: "In-domain result should include next best actions",
      severity: "warning",
    });
  }

  return { valid: !issues.some((i) => i.severity === "error"), issues };
}
