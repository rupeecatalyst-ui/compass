/**
 * Planner validation (CO-AI-107).
 * Consistency · question ordering · duplicates · recommendation quality · no execution.
 */

import {
  EAI_OUTSIDE_DOMAIN_REFUSAL,
} from "@/constants/enterprise-ai-platform/domain-governance";
import {
  EAI_PLANNER_ALLOWED_PROPOSAL_KINDS,
  EAI_PLANNER_FORBIDDEN_EXECUTION_CLAIMS,
  EAI_PLANNER_MAX_QUESTIONS,
} from "@/constants/enterprise-ai-platform/planner";
import type {
  EaiPlannerPlan,
  EaiPlannerValidationResult,
} from "@/types/enterprise-ai-planner";

const ALLOWED_KINDS = new Set<string>(EAI_PLANNER_ALLOWED_PROPOSAL_KINDS);

export function validateEaiPlannerPlan(
  plan: Omit<EaiPlannerPlan, "validation">,
): EaiPlannerValidationResult {
  const issues: EaiPlannerValidationResult["issues"] = [];

  if (plan.blocked) {
    if (plan.refusalText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
      issues.push({
        code: "invalid_outside_refusal",
        message: "Outside domain must use fixed refusal",
        severity: "error",
      });
    }
    if (plan.selectedQuestions.length > 0 || plan.actionProposalIds.length > 0) {
      issues.push({
        code: "outside_plan_leak",
        message: "Outside domain must not ask questions or emit proposals",
        severity: "error",
      });
    }
    return { valid: !issues.some((i) => i.severity === "error"), issues };
  }

  if (plan.selectedQuestions.length > EAI_PLANNER_MAX_QUESTIONS) {
    issues.push({
      code: "too_many_questions",
      message: `Selected ${plan.selectedQuestions.length} questions — max ${EAI_PLANNER_MAX_QUESTIONS}`,
      severity: "error",
    });
  }

  // Ordering: order must be strictly increasing from 1
  const orders = plan.selectedQuestions.map((q) => q.order);
  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== i + 1) {
      issues.push({
        code: "question_ordering",
        message: "Selected questions must be ordered 1..n by priority",
        severity: "error",
      });
      break;
    }
  }

  // Duplicates
  const texts = plan.selectedQuestions.map((q) => q.text.trim().toLowerCase());
  if (new Set(texts).size !== texts.length) {
    issues.push({
      code: "duplicate_questions",
      message: "Duplicate selected questions are not allowed",
      severity: "error",
    });
  }

  // Skip known
  for (const gap of plan.missingInformation) {
    if (gap.alreadyKnown && plan.selectedQuestions.some((q) => q.slotId === gap.slotId)) {
      issues.push({
        code: "reasked_known",
        message: `Re-asked known slot: ${gap.slotId}`,
        severity: "error",
      });
    }
  }

  // Recommendation quality — must have at least one NBA when in-domain
  if (plan.nextBestActions.length === 0) {
    issues.push({
      code: "empty_nba",
      message: "In-domain plan must include at least one next best action",
      severity: "error",
    });
  }

  if (plan.sequencedRecommendations.length === 0 && plan.nextBestActions.length > 0) {
    issues.push({
      code: "unsequenced",
      message: "Recommendations should be sequenced",
      severity: "warning",
    });
  }

  // Execution claims
  const blob = [
    ...plan.sequencedRecommendations,
    ...plan.nextBestActions.map((a) => `${a.title} ${a.summary}`),
  ]
    .join(" ")
    .toLowerCase();
  for (const claim of EAI_PLANNER_FORBIDDEN_EXECUTION_CLAIMS) {
    if (blob.includes(claim)) {
      issues.push({
        code: "execution_claim",
        message: `Planner text claims execution: "${claim}"`,
        severity: "error",
      });
    }
  }

  // Proposal kinds
  for (const action of plan.nextBestActions) {
    if (action.proposalKind && !ALLOWED_KINDS.has(action.proposalKind)) {
      issues.push({
        code: "forbidden_proposal_kind",
        message: `Planner must not auto-emit proposal kind ${action.proposalKind}`,
        severity: "error",
      });
    }
  }

  return { valid: !issues.some((i) => i.severity === "error"), issues };
}
