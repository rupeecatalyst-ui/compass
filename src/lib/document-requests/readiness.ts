/**
 * Opportunity Document Readiness — Critical vs Journey completion.
 * Consumes Document Request item state + Document Registry presence (same repository).
 */

import type {
  DocumentRequestItemState,
  OpportunityDocumentReadinessSnapshot,
  OpportunityDocumentReadinessState,
} from "@/types/document-requests";

function isUploaded(status: DocumentRequestItemState["status"]): boolean {
  return status === "uploaded" || status === "under_verification" || status === "verified";
}

function isVerified(status: DocumentRequestItemState["status"]): boolean {
  return status === "verified";
}

export function deriveOpportunityDocumentReadiness(
  items: DocumentRequestItemState[],
): OpportunityDocumentReadinessSnapshot {
  const total = items.length;
  const uploaded = items.filter((i) => isUploaded(i.status)).length;
  const verified = items.filter((i) => isVerified(i.status)).length;
  const pending = items.filter((i) => !isUploaded(i.status)).length;
  const criticalItems = items.filter((i) => i.category === "critical");
  const journeyItems = items.filter((i) => i.category === "journey");
  const criticalPending = criticalItems.filter((i) => !isUploaded(i.status)).length;
  const journeyPending = journeyItems.filter((i) => !isUploaded(i.status)).length;
  const underVerification = items.some((i) => i.status === "under_verification");
  const criticalComplete = criticalItems.length > 0 && criticalPending === 0;
  const completionPct = total === 0 ? 0 : Math.round((uploaded / total) * 100);

  let state: OpportunityDocumentReadinessState;
  let label: string;

  if (total === 0) {
    state = "awaiting_critical_documents";
    label = "LOD not generated";
  } else if (underVerification && criticalPending === 0) {
    state = "under_verification";
    label = "Under Verification";
  } else if (criticalComplete && journeyPending > 0) {
    state = "journey_documents_pending";
    label = "Journey Documents Pending";
  } else if (criticalComplete && journeyPending === 0) {
    state = "ready_for_lender_submission";
    label = "Ready for Lender Submission";
  } else {
    state = "awaiting_critical_documents";
    label = "Awaiting Critical Documents";
  }

  return {
    state,
    label,
    total,
    uploaded,
    verified,
    pending,
    criticalPending,
    journeyPending,
    completionPct,
    criticalComplete,
  };
}
