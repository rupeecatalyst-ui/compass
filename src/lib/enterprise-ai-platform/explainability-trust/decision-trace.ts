/**
 * Decision Trace (CO-AI-110).
 * Records observed pipeline stages — never fabricates hidden steps.
 */

import type { EaiConsultationObject } from "@/types/enterprise-ai-consultation";
import type { EaiLeadIntelligenceResult } from "@/types/enterprise-ai-lead-intelligence";
import type {
  EaiDecisionTraceStep,
  EaiTrustReasonCodeId,
} from "@/types/enterprise-ai-explainability";
import type { EaiFdiDecisionPackage } from "@/types/enterprise-ai-financial-decision";
import type { EaiPlannerPlan } from "@/types/enterprise-ai-planner";
import type { EaiAdvisoryReasoningResult } from "@/types/enterprise-ai-advisory-reasoning";

function newId(): string {
  return `eai_trace_${crypto.randomUUID().slice(0, 8)}`;
}

export function buildEaiDecisionTrace(input: {
  blocked?: boolean;
  consultation?: EaiConsultationObject;
  leadIntelligence?: EaiLeadIntelligenceResult;
  fdiPackage?: EaiFdiDecisionPackage;
  plannerPlan?: EaiPlannerPlan;
  advisoryResult?: EaiAdvisoryReasoningResult;
}): EaiDecisionTraceStep[] {
  const steps: EaiDecisionTraceStep[] = [];
  let seq = 1;
  const now = new Date().toISOString();

  const push = (
    stage: string,
    inputSummary: string,
    outputSummary: string,
    reasonCodes: EaiTrustReasonCodeId[],
  ) => {
    steps.push({
      stepId: newId(),
      sequence: seq++,
      stage,
      inputSummary,
      outputSummary,
      reasonCodes,
      at: now,
    });
  };

  if (input.blocked) {
    push(
      "domain_boundary",
      "Utterance evaluated",
      "Outside domain — recommendation blocked",
      ["RC_OUTSIDE_DOMAIN"],
    );
    return steps;
  }

  push(
    "domain_boundary",
    "Utterance evaluated",
    "Approved financial domain — proceed",
    [],
  );

  if (input.consultation) {
    push(
      "consultation_intelligence",
      `Consultation ${input.consultation.consultationId}`,
      `State ${input.consultation.lifecycleState}; facts ${input.consultation.keyFacts.length}; completion ${input.consultation.completionScore.score}`,
      input.consultation.completionScore.score >= 70
        ? ["RC_CONSULTATION_COMPLETE"]
        : ["RC_CONSULTATION_INCOMPLETE"],
    );
  }

  if (input.plannerPlan) {
    push(
      "planner",
      `Plan ${input.plannerPlan.planId}`,
      `Questions ${input.plannerPlan.selectedQuestions.length}; missing unknown ${input.plannerPlan.missingInformation.filter((m) => !m.alreadyKnown).length}`,
      ["RC_INFORMATION_GAPS"],
    );
  }

  if (input.fdiPackage) {
    push(
      "financial_decision_intelligence",
      `FDI ${input.fdiPackage.packageId}`,
      `Recommendations ${input.fdiPackage.recommendations.length}; confidence ${input.fdiPackage.confidence.band}`,
      ["RC_ENGINE_DECISION_REQUIRED"],
    );
  }

  if (input.advisoryResult) {
    push(
      "advisory_reasoning",
      `Advisory ${input.advisoryResult.resultId}`,
      `Modes ${input.advisoryResult.modesUsed.join(", ") || "none"}`,
      [],
    );
  }

  if (input.leadIntelligence) {
    const li = input.leadIntelligence;
    push(
      "lead_intelligence",
      `Lead Intelligence ${li.resultId}`,
      `Lead ${li.leadReadiness.band}; Opportunity ${li.opportunityReadiness.band}; ranked ${li.rankedProposals.length}`,
      [
        li.leadReadiness.band === "ready" || li.leadReadiness.band === "strong"
          ? "RC_LEAD_READY"
          : "RC_LEAD_NOT_READY",
        "RC_PROPOSAL_DRAFT_ONLY",
      ],
    );
  }

  push(
    "explainability_trust",
    "Assemble Trust Package",
    "Label facts, assumptions, recommendations; surface uncertainty",
    ["RC_HUMAN_APPROVAL_REQUIRED"],
  );

  return steps;
}
