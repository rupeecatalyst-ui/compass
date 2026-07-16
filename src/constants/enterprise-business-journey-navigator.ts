/**
 * Business Journey Navigator — Enterprise UX Constitution.
 * Stage order/phases reuse Chanakya certified Loan Journey SSOT.
 * This module owns transition purpose copy + navigator resolve helpers only.
 */

import {
  CHANAKYA_LOAN_JOURNEY_STAGES,
} from "@/constants/chanakya-guide/loan-journey";
import type { ChanakyaLoanJourneyStageId } from "@/types/chanakya-guide";
import type { LeadJourneyModuleId } from "@/constants/lead-opportunity-journey";
import type { BusinessJourneyNavId } from "@/constants/enterprise-business-journey-navigation";

/** Purpose shown under Continue CTA — why the next step matters. */
export const BUSINESS_JOURNEY_TRANSITION_PURPOSE: Partial<
  Record<ChanakyaLoanJourneyStageId, string>
> = {
  contact: "Establish the customer identity that anchors every later workspace.",
  opportunity_workspace:
    "Frame the commercial need and open the guided opportunity path.",
  strategic_workspace:
    "Prepare the opportunity before collecting customer documents.",
  document_center:
    "Upload and organise customer documents before credit verification.",
  credit_workbench:
    "Verify stated facts against documents before loan execution.",
  loan_workspace:
    "Execute the active loan file without leaving the transaction.",
  lender_pipeline:
    "Track each lender case independently across the loan file.",
  tasks: "Clear follow-ups that protect SLAs and customer experience.",
  timeline: "Review chronological activity across the loan journey.",
  approval: "Secure lender approval before disbursement begins.",
  disbursement: "Complete fund release carefully and record outcomes.",
  accounting: "Record commercial and financial outcomes of the loan.",
  closure: "Close the transaction orderly after obligations are complete.",
};

export function getBusinessJourneyTransitionPurpose(
  nextStageId: ChanakyaLoanJourneyStageId | null | undefined,
): string {
  if (!nextStageId) return "Review journey completion and closure readiness.";
  return (
    BUSINESS_JOURNEY_TRANSITION_PURPOSE[nextStageId] ??
    CHANAKYA_LOAN_JOURNEY_STAGES.find((s) => s.id === nextStageId)?.objective ??
    "Continue the business journey for this transaction."
  );
}

export function leadModuleToNavigatorStageId(
  moduleId: LeadJourneyModuleId,
): ChanakyaLoanJourneyStageId {
  switch (moduleId) {
    case "credit_bench":
      return "opportunity_workspace";
    case "strategic_workspace":
      return "strategic_workspace";
    case "document_center":
      return "document_center";
    case "credit_workbench":
      return "credit_workbench";
    case "loan_workspace":
      return "loan_workspace";
    default:
      return "strategic_workspace";
  }
}

export function businessNavIdToNavigatorStageId(
  navId: BusinessJourneyNavId,
): ChanakyaLoanJourneyStageId {
  switch (navId) {
    case "opportunity_setup":
      return "opportunity_workspace";
    case "strategic_workspace":
      return "strategic_workspace";
    case "document_center":
      return "document_center";
    case "credit_workbench":
      return "credit_workbench";
    case "loan_workspace":
      return "loan_workspace";
    case "lender_pipeline":
      return "lender_pipeline";
    case "tasks":
      return "tasks";
    case "timeline":
      return "timeline";
    default:
      return "strategic_workspace";
  }
}

/** Resolve navigator highlight from Loan Workspace tab. */
export function loanTabToNavigatorStageId(
  tab: string | null | undefined,
): ChanakyaLoanJourneyStageId {
  switch (tab) {
    case "lenders":
      return "lender_pipeline";
    case "tasks":
      return "tasks";
    case "timeline":
      return "timeline";
    default:
      return "loan_workspace";
  }
}
