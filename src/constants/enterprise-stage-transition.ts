/**
 * CO-WF-006 — Enterprise Stage Transition (sub-stages + guidance constants).
 * Reuses Lender Pipeline / EOLE stage masters — not a new workflow engine.
 */

import type { LenderCaseStage } from "@/types/catalyst-one";
import { EOLE_DEFAULT_SUB_STAGES } from "@/constants/enterprise-opportunity-lifecycle-engine/pipeline-stages";

export type EnterpriseSubStageOption = {
  id: string;
  label: string;
};

/** Sub-stages belonging to each Lender Case Stage (Kanban / Deal). */
export const LENDER_CASE_SUB_STAGES: Record<LenderCaseStage, EnterpriseSubStageOption[]> = {
  identified: [
    { id: "shortlisted", label: "Shortlisted" },
    { id: "awaiting_documents", label: "Awaiting Documents" },
    { id: "ready_to_approach", label: "Ready to Approach" },
  ],
  prelogin: [
    { id: "contacted", label: "Contacted" },
    { id: "documents_pending", label: "Documents Pending" },
    { id: "documents_received", label: "Documents Received" },
    { id: "login_ready", label: "Login Ready" },
  ],
  logged_in_wip: [
    { id: "under_credit", label: "Under Credit" },
    { id: "query_raised", label: "Query Raised" },
    { id: "query_resolved", label: "Query Resolved" },
    { id: "awaiting_decision", label: "Awaiting Decision" },
  ],
  soft_approved: [
    { id: "offer_shared", label: "Offer Shared" },
    { id: "customer_accepted", label: "Customer Accepted" },
    { id: "pending_final", label: "Pending Final Approval" },
  ],
  final_approved: [
    { id: "docs_for_agreement", label: "Docs for Agreement" },
    { id: "awaiting_signing", label: "Awaiting Signing" },
  ],
  closure_wip: [
    { id: "agreement_signing", label: "Agreement Signing" },
    { id: "pre_authorization", label: "Pre Authorization" },
    { id: "authorized", label: "Authorized" },
    { id: "bt_cheque_deposited", label: "BT Cheque Deposited" },
    { id: "property_papers_submitted", label: "Property Papers Submitted" },
    { id: "top_up_awaited", label: "Top-up Awaited" },
  ],
  disbursed: [
    { id: "first_tranche", label: "First Tranche" },
    { id: "final_tranche", label: "Final Tranche" },
    { id: "fully_disbursed", label: "Fully Disbursed" },
  ],
  lost: [
    { id: "rejected", label: "Rejected" },
    { id: "customer_declined", label: "Customer Declined" },
    { id: "better_offer", label: "Better Offer" },
    { id: "eligibility", label: "Eligibility" },
    { id: "documentation", label: "Documentation" },
    { id: "other", label: "Other" },
  ],
  hold: [
    { id: "awaiting_customer", label: "Awaiting Customer" },
    { id: "awaiting_lender", label: "Awaiting Lender" },
    { id: "internal_review", label: "Internal Review" },
  ],
};

export function listLenderSubStagesForStage(
  stage: LenderCaseStage | string | null | undefined,
): EnterpriseSubStageOption[] {
  if (!stage) return [];
  return LENDER_CASE_SUB_STAGES[stage as LenderCaseStage] ?? [];
}

export function lenderSubStageLabel(
  stage: LenderCaseStage | string | null | undefined,
  subStageId?: string | null,
): string {
  if (!subStageId?.trim()) return "";
  const hit = listLenderSubStagesForStage(stage).find((s) => s.id === subStageId);
  return hit?.label ?? subStageId;
}

export function listEoleSubStagesForStage(
  stageCode: string | null | undefined,
): EnterpriseSubStageOption[] {
  if (!stageCode?.trim()) return [];
  return EOLE_DEFAULT_SUB_STAGES.filter((s) => s.stageCode === stageCode).map((s) => ({
    id: s.subStageCode,
    label: s.subStageName,
  }));
}

export function eoleSubStageLabel(
  stageCode: string | null | undefined,
  subStageCode?: string | null,
): string {
  if (!subStageCode?.trim()) return "";
  const hit = listEoleSubStagesForStage(stageCode).find((s) => s.id === subStageCode);
  return hit?.label ?? subStageCode;
}
