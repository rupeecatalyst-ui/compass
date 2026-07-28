/**
 * CO-DOC-002 — Durable Document Registry association helpers.
 *
 * Documents must remain visible across Opportunity / Deal runtime keys and
 * Document Owner (participant) identity changes.
 *
 * P1 isolation: applicant docs are loaded only for the selected participant's
 * Contact ID. Never show another participant's Contact documents.
 */
import {
  DOCUMENT_CENTER_SHARED_SCOPE_KEY,
  parseParticipantScopeKey,
  resolveDocumentScopeForTypeRef,
  type DocumentCenterScopeKey,
} from "@/constants/opportunity-document-center";
import type { DocumentRegistryRecord } from "@/types/document-registry";
import type { LoanParticipant } from "@/types/loan-participant";

export type DocumentRegistryRuntimeKeys = {
  /** Runtime case id (Opportunity UUID or Deal/LoanFile id). */
  runtimeKey: string;
  /** Canonical Opportunity Registry id when known. */
  opportunityId?: string;
};

/** Resolve list keys from a LoanFile-shaped runtime case. */
export function resolveDocumentRegistryRuntimeKeys(file: {
  id?: string | null;
  enterpriseOpportunityId?: string | null;
  opportunityId?: string | null;
}): DocumentRegistryRuntimeKeys {
  const runtimeKey = file.id?.trim() || "";
  const opportunityId =
    file.enterpriseOpportunityId?.trim() ||
    file.opportunityId?.trim() ||
    undefined;
  return { runtimeKey, opportunityId };
}

/**
 * BAT #22 / CO-DOC-002 — Document Owner match (Contact-authoritative).
 *
 * Documents belong to Contacts. When the selected participant has a Contact ID,
 * only records stamped with that Contact are shown. Participant-id match is a
 * recovery path when Contact cannot be compared (remapped lp-* → opp-primary-*).
 * Legacy unstamped applicant uploads remain Primary Applicant only.
 */
export function recordMatchesDocumentOwnerScope(
  record: DocumentRegistryRecord,
  documentOwnerScope: DocumentCenterScopeKey,
  participants: LoanParticipant[],
): boolean {
  const docScope =
    record.links.documentScope ??
    resolveDocumentScopeForTypeRef(record.typeRef);
  const participantId = record.links.participantId?.trim() || "";
  const contactId = record.links.contactId?.trim() || "";

  if (documentOwnerScope === DOCUMENT_CENTER_SHARED_SCOPE_KEY) {
    return docScope === "shared";
  }
  if (docScope === "shared" || docScope === "lender") return false;

  const selected = parseParticipantScopeKey(documentOwnerScope);
  // Never fail open — parse failure must not expose every participant's docs.
  if (!selected) return false;

  const primary = participants.find((p) => p.role === "primary_applicant");
  const selectedParticipant =
    participants.find((p) => p.id === selected) ??
    (selected === "primary" ? primary : undefined);

  const selectedContactId =
    selectedParticipant?.entityId?.trim() ||
    (selected === "primary" ? primary?.entityId?.trim() || "" : "");

  const isSelectedPrimary =
    selected === "primary" ||
    selected === primary?.id ||
    selectedParticipant?.role === "primary_applicant" ||
    documentOwnerScope.endsWith(":primary");

  // 1) Contact ownership is authoritative when both sides are known.
  if (contactId && selectedContactId) {
    return contactId === selectedContactId;
  }

  // 2) Participant-id stamp (BAT #22 recovery when Contact cannot be compared).
  if (participantId && participantId === selected) {
    return true;
  }

  // 3) Legacy uploads with no owner stamps → Primary Applicant only.
  if (!participantId && !contactId) {
    return isSelectedPrimary;
  }

  // 4) Doc has Contact stamp but selected participant has no entityId —
  //    allow only exact participant-id match (already handled) or primary
  //    Contact match when viewing Primary without entityId on the row.
  if (contactId && isSelectedPrimary && primary?.entityId?.trim() === contactId) {
    return true;
  }

  return false;
}
