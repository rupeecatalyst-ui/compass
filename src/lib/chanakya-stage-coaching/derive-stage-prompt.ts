/**
 * CF-CHANAKYA-005 — Derive celebration + next-step coaching from stage movement.
 */

import { getStageIndex, STAGE_LABELS } from "@/constants/loan-stage-master";
import { normalizeLenderCaseStage } from "@/constants/lender-pipeline";
import type { LoanFile, LoanLenderExecution, PipelineStage } from "@/types/catalyst-one";
import type {
  ChanakyaCoachingPrompt,
  ChanakyaCoachingQuickAction,
} from "@/types/chanakya-closed-loop-coaching";
import { getLatestChanakyaCoachingResponse, rankChanakyaCoachingQuickActions } from "@/lib/chanakya-closed-loop-coaching/response-store";
import type { ChanakyaStageTransitionRecord } from "./transition-store";
import { getPendingChanakyaStageTransition } from "./transition-store";

const STAGE_COACHING_LABELS: Partial<Record<PipelineStage, string>> = {
  logged_in: "Login WIP",
  credit_wip: "Credit WIP",
  pre_login: "Pre Login",
};

const EXPECTED_DAYS_BY_STAGE: Partial<Record<PipelineStage, number>> = {
  raw_lead: 3,
  pre_login: 5,
  logged_in: 7,
  credit_wip: 10,
  soft_approved: 5,
};

const STAGE_FOLLOWUP_ACTIONS: ChanakyaCoachingQuickAction[] = [
  { id: "call_banker", label: "Call" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "email", label: "Email" },
  { id: "mark_followup_complete", label: "Mark Follow-up Complete" },
];

function stageDisplayLabel(stage: PipelineStage): string {
  return STAGE_COACHING_LABELS[stage] ?? STAGE_LABELS[stage];
}

function isMeaningfulForwardTransition(from: PipelineStage, to: PipelineStage): boolean {
  const fromIdx = getStageIndex(from);
  const toIdx = getStageIndex(to);
  return fromIdx >= 0 && toIdx > fromIdx;
}

function dayCountLabel(days: number): string {
  const n = Math.max(1, Math.round(days));
  return n === 1 ? "1 day" : `${n} days`;
}

function turnaroundAssessment(fromStage: PipelineStage, days: number): string {
  const expected = EXPECTED_DAYS_BY_STAGE[fromStage] ?? 5;
  if (days <= expected) {
    return "This is within our expected turnaround time.";
  }
  return "Solid progress — let's keep momentum on the next step.";
}

function bankerHonorific(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return "the banker";
  if (/^(mr|mrs|ms|dr)\b/i.test(cleaned)) return cleaned;
  return `Mr ${cleaned}`;
}

function pickLenderCase(file: LoanFile): LoanLenderExecution | undefined {
  const cases = (file.lenders ?? []).filter((c) => c.status !== "closed");
  if (cases.length === 0) return undefined;
  const primary = cases.find((c) => c.isPrimary);
  if (primary) return primary;
  const logged = cases.find((c) => {
    const stage = normalizeLenderCaseStage(c.caseStage);
    return stage === "logged_in_wip" || stage === "prelogin";
  });
  return logged ?? cases[0];
}

function buildLoginAckQuestion(lender: LoanLenderExecution): string {
  const banker = lender.relationshipManager?.trim();
  if (banker) {
    return `I recommend confirming that ${bankerHonorific(banker)} from ${lender.lender} has acknowledged the login.`;
  }
  return `I recommend confirming that ${lender.lender} has acknowledged the login.`;
}

function buildRecommendation(
  file: LoanFile,
  transition: ChanakyaStageTransitionRecord,
): Pick<ChanakyaCoachingPrompt, "question" | "lenderCaseId" | "meta"> {
  const lender = pickLenderCase(file);
  const org = file.businessDetails?.companyName?.trim() || file.customerName;
  const baseMeta = {
    organisationName: org,
    fromStage: transition.fromStage,
    toStage: transition.toStage,
    daysElapsed: transition.daysInPreviousStage,
    transitionId: transition.id,
  };

  if (
    transition.toStage === "logged_in" ||
    (transition.fromStage === "raw_lead" && transition.toStage === "pre_login")
  ) {
    const lenderName = lender?.lender ?? file.lender;
    const banker = lender?.relationshipManager?.trim();
    return {
      question: lender
        ? buildLoginAckQuestion(lender)
        : `I recommend confirming that ${lenderName} has acknowledged the login.`,
      lenderCaseId: lender?.id,
      meta: {
        ...baseMeta,
        lenderName,
        bankerName: banker,
        targetLoanStage: transition.toStage === "logged_in" ? "logged_in" : undefined,
        targetLenderStage: "logged_in_wip",
      },
    };
  }

  if (transition.toStage === "credit_wip") {
    return {
      question: "I recommend confirming that credit processing has been assigned on this file.",
      lenderCaseId: lender?.id,
      meta: {
        ...baseMeta,
        lenderName: lender?.lender ?? file.lender,
        bankerName: lender?.relationshipManager,
      },
    };
  }

  const toLabel = stageDisplayLabel(transition.toStage);
  return {
    question: `I recommend reviewing the next actions to keep this file moving in ${toLabel}.`,
    lenderCaseId: lender?.id,
    meta: {
      ...baseMeta,
      lenderName: lender?.lender ?? file.lender,
      bankerName: lender?.relationshipManager,
    },
  };
}

/**
 * Build stage-movement coaching when a meaningful transition is pending.
 */
export function deriveChanakyaStageCoachingPrompt(
  file: LoanFile,
  firstName: string,
): ChanakyaCoachingPrompt | null {
  const transition = getPendingChanakyaStageTransition(file.id);
  if (!transition) return null;
  if (!isMeaningfulForwardTransition(transition.fromStage, transition.toStage)) return null;

  const promptId = `stage-coach:${transition.id}`;
  const prior = getLatestChanakyaCoachingResponse(promptId);
  if (prior?.answer === "yes") return null;

  const days = Math.max(1, transition.daysInPreviousStage);
  const fromLabel = stageDisplayLabel(transition.fromStage);
  const toLabel = stageDisplayLabel(transition.toStage);
  const name = firstName.trim() || "there";
  const recommendation = buildRecommendation(file, transition);
  const actions = rankChanakyaCoachingQuickActions(
    "stage_movement",
    STAGE_FOLLOWUP_ACTIONS,
  ) as ChanakyaCoachingQuickAction[];

  return {
    id: promptId,
    triggerKind: "stage_movement",
    loanFileId: file.id,
    lenderCaseId: recommendation.lenderCaseId,
    celebration: {
      headline: `Excellent progress ${name}.`,
      body: `You moved this opportunity from ${fromLabel} to ${toLabel} in just ${dayCountLabel(days)}.`,
      assessment: turnaroundAssessment(transition.fromStage, days),
    },
    recommendationLabel: "Next Recommendation",
    headlineContext: recommendation.meta.organisationName ?? file.customerName,
    question: recommendation.question,
    yesLabel: "YES",
    noLabel: "NO",
    quickActions: actions,
    meta: recommendation.meta,
  };
}
