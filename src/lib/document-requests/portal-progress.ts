/**
 * Customer Portal progress bands — derived from Document Requests readiness SSOT.
 */

import { deriveOpportunityDocumentReadiness } from "@/lib/document-requests/readiness";
import type {
  CustomerPortalProgressSnapshot,
  DocumentRequestItemState,
} from "@/types/document-requests";

export function deriveCustomerPortalProgress(
  items: DocumentRequestItemState[],
): CustomerPortalProgressSnapshot {
  const base = deriveOpportunityDocumentReadiness(items);
  const awaitingVerification = items.some(
    (i) => i.status === "uploaded" || i.status === "under_verification",
  );
  const anyPending = base.pending > 0;

  let band: CustomerPortalProgressSnapshot["band"];
  let bandLabel: string;
  let applicationStatusLabel: string;

  if (base.total === 0) {
    band = "pending_documents";
    bandLabel = "Pending Documents";
    applicationStatusLabel = "Awaiting Document List";
  } else if (base.state === "ready_for_lender_submission" && base.verified === base.total) {
    band = "ready";
    bandLabel = "Ready";
    applicationStatusLabel = "Documents Complete";
  } else if (!anyPending && awaitingVerification) {
    band = "awaiting_verification";
    bandLabel = "Awaiting Verification";
    applicationStatusLabel = "Under Verification";
  } else if (base.uploaded > 0 && anyPending) {
    band = "in_progress";
    bandLabel = "In Progress";
    applicationStatusLabel = "Document Collection In Progress";
  } else if (anyPending) {
    band = "pending_documents";
    bandLabel = "Pending Documents";
    applicationStatusLabel = "Documents Pending";
  } else {
    band = "in_progress";
    bandLabel = "In Progress";
    applicationStatusLabel = "Document Collection In Progress";
  }

  return {
    ...base,
    band,
    bandLabel,
    applicationStatusLabel,
  };
}
