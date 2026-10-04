/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014D
 * Deterministic inbound attachment classification. No invented AI scores.
 * Loose name matches never auto-attach. Unknown never becomes Other silently.
 */

import { DOCUMENT_INTAKE_UNCLASSIFIED_TYPE_PREFIX, isUnclassifiedDocumentTypeRef } from "@/constants/document-intake";
import {
  DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_METHODS,
  DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES,
  DOCUMENT_WORKSPACE_INBOUND_CONFIDENCE_BANDS,
  type DocumentWorkspaceInboundClassificationMethod,
  type DocumentWorkspaceInboundClassificationOutcome,
  type DocumentWorkspaceInboundConfidenceBand,
} from "@/constants/document-workspace-inbound";
import type { DocumentRegistryRecord } from "@/types/document-registry";

export type InboundLodCandidate = {
  requestRef: string;
  typeRef: string;
  label: string;
  participantId?: string | null;
};

export type InboundClassificationInput = {
  matchReason?: string | null;
  matchStatus?: string | null;
  opportunityId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  openTransactionCount?: number;
  filename?: string | null;
  mimeType?: string | null;
  fileSecurityRejected?: boolean;
  duplicateOfDocumentId?: string | null;
  lodCandidates?: InboundLodCandidate[];
  secureRequest?: {
    opportunityId: string;
    dealId?: string | null;
    contactId?: string | null;
    typeRef?: string | null;
    requestRef?: string | null;
  } | null;
  employeeConfirmedOther?: boolean;
  lodFormallyUsesOther?: boolean;
};

export type InboundClassificationSnapshot = {
  outcome: DocumentWorkspaceInboundClassificationOutcome;
  method: DocumentWorkspaceInboundClassificationMethod;
  confidenceBand: DocumentWorkspaceInboundConfidenceBand;
  evidenceCodes: string[];
  suggestedTypeRef: string | null;
  suggestedLodRequestRef: string | null;
  suggestedParticipantId: string | null;
  reviewReason: string | null;
  decidedAt: string | null;
  decidedByUserId: string | null;
  otherExplicitlyConfirmed: boolean;
};

export function isFormalOtherTypeRef(typeRef: string | null | undefined): boolean {
  const value = typeRef?.trim().toLowerCase() || "";
  if (!value) return false;
  if (isUnclassifiedDocumentTypeRef(value)) return false;
  return value === "doc:other" || value === "other" || value.endsWith(":other");
}

export function inboundFileCountsTowardReadiness(record?: DocumentRegistryRecord | null): boolean {
  if (!record || record.status !== "active") return false;
  if (isUnclassifiedDocumentTypeRef(record.typeRef)) return false;
  if (record.uploadSource === "email" && !record.verifiedAt) return false;
  return Boolean(record.versions?.length);
}

export function inboundOutcomeCountsTowardReadiness(
  outcome: DocumentWorkspaceInboundClassificationOutcome | null | undefined,
): boolean {
  return (
    outcome === DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.CLASSIFIED_AUTOMATICALLY ||
    outcome === DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.ATTACHED_MANUALLY
  );
}

export function inboundOutcomeIsNewEligible(
  outcome: DocumentWorkspaceInboundClassificationOutcome | null | undefined,
): boolean {
  if (!outcome) return true;
  return (
    outcome !== DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.IGNORED &&
    outcome !== DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.REJECTED_FILE_SECURITY &&
    outcome !== DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.DUPLICATE_CANDIDATE
  );
}

function normalizeFilenameToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function suggestLodFromFilename(input: {
  filename: string;
  lodCandidates: InboundLodCandidate[];
}): InboundLodCandidate | "ambiguous" | null {
  const token = normalizeFilenameToken(input.filename);
  if (!token || token.length < 3) return null;
  const hits = input.lodCandidates.filter((item) => {
    const label = normalizeFilenameToken(item.label);
    const typeRef = normalizeFilenameToken(item.typeRef.replace(/^doc:/, ""));
    return (label && token.includes(label)) || (typeRef && token.includes(typeRef));
  });
  if (hits.length === 1) return hits[0]!;
  if (hits.length > 1) return "ambiguous";
  return null;
}

export function cannotAutoAttachFromLooseNameMatch(input: {
  matchReason?: string | null;
  filenameOnly?: boolean;
}): boolean {
  if (input.filenameOnly) return true;
  const reason = input.matchReason?.trim() || "";
  return reason === "loose_name_match" || reason === "filename_only" || reason === "borrower_name_match";
}

export function decideSilentOtherAssignment(input: {
  typeRef: string;
  employeeConfirmedOther?: boolean;
  lodFormallyUsesOther?: boolean;
}): { ok: true } | { ok: false; code: "SILENT_OTHER" } {
  if (!isFormalOtherTypeRef(input.typeRef) && !isUnclassifiedDocumentTypeRef(input.typeRef)) {
    return { ok: true };
  }
  if (isUnclassifiedDocumentTypeRef(input.typeRef)) {
    return { ok: false, code: "SILENT_OTHER" };
  }
  if (input.employeeConfirmedOther || input.lodFormallyUsesOther) return { ok: true };
  return { ok: false, code: "SILENT_OTHER" };
}

export function classifyInboundAttachment(input: InboundClassificationInput): InboundClassificationSnapshot {
  const evidenceCodes: string[] = [];
  const lodCandidates = input.lodCandidates ?? [];

  if (input.fileSecurityRejected) {
    return {
      outcome: DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.REJECTED_FILE_SECURITY,
      method: DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_METHODS.MANUAL_REVIEW,
      confidenceBand: DOCUMENT_WORKSPACE_INBOUND_CONFIDENCE_BANDS.NONE,
      evidenceCodes: ["file_security_rejected"],
      suggestedTypeRef: null,
      suggestedLodRequestRef: null,
      suggestedParticipantId: null,
      reviewReason: null,
      decidedAt: null,
      decidedByUserId: null,
      otherExplicitlyConfirmed: false,
    };
  }

  if (input.duplicateOfDocumentId) {
    return {
      outcome: DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.DUPLICATE_CANDIDATE,
      method: DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_METHODS.MANUAL_REVIEW,
      confidenceBand: DOCUMENT_WORKSPACE_INBOUND_CONFIDENCE_BANDS.REVIEW_REQUIRED,
      evidenceCodes: ["content_hash_duplicate"],
      suggestedTypeRef: null,
      suggestedLodRequestRef: null,
      suggestedParticipantId: null,
      reviewReason: null,
      decidedAt: null,
      decidedByUserId: null,
      otherExplicitlyConfirmed: false,
    };
  }

  if (cannotAutoAttachFromLooseNameMatch({ matchReason: input.matchReason })) {
    return {
      outcome: DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.UNCLASSIFIED_REVIEW_REQUIRED,
      method: DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_METHODS.FILENAME_METADATA,
      confidenceBand: DOCUMENT_WORKSPACE_INBOUND_CONFIDENCE_BANDS.REVIEW_REQUIRED,
      evidenceCodes: ["loose_name_match_blocked"],
      suggestedTypeRef: null,
      suggestedLodRequestRef: null,
      suggestedParticipantId: null,
      reviewReason: null,
      decidedAt: null,
      decidedByUserId: null,
      otherExplicitlyConfirmed: false,
    };
  }

  let method: DocumentWorkspaceInboundClassificationMethod =
    DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_METHODS.MANUAL_REVIEW;
  let transactionLinked = Boolean(input.opportunityId);
  let automaticType = false;
  let suggested: InboundLodCandidate | null = null;

  const secure = input.secureRequest;
  if (secure?.opportunityId && (!input.opportunityId || secure.opportunityId === input.opportunityId)) {
    method = DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_METHODS.SECURE_REQUEST_ID;
    evidenceCodes.push("secure_request_identifier");
    transactionLinked = true;
    if (secure.typeRef && !isUnclassifiedDocumentTypeRef(secure.typeRef) && !isFormalOtherTypeRef(secure.typeRef)) {
      suggested = {
        requestRef: secure.requestRef || secure.typeRef,
        typeRef: secure.typeRef,
        label: secure.typeRef,
        participantId: null,
      };
      automaticType = true;
      evidenceCodes.push("secure_request_type_ref");
    }
  } else if (input.matchReason === "outbound_thread_headers") {
    method = DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_METHODS.CONVERSATION_THREAD;
    evidenceCodes.push("outbound_thread_headers");
    transactionLinked = true;
  } else if (input.matchReason === "deal_reference" || input.matchReason === "opportunity_reference") {
    method = DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_METHODS.OPPORTUNITY_DEAL_REFERENCE;
    evidenceCodes.push(input.matchReason);
    transactionLinked = true;
  } else if (input.matchReason === "single_open_transaction_for_sender") {
    method = DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_METHODS.SENDER_LINKED_TRANSACTION;
    evidenceCodes.push("single_open_transaction_for_sender");
    transactionLinked = true;
  } else if ((input.openTransactionCount ?? 0) > 1 || input.matchReason === "multiple_open_transactions_for_sender") {
    return {
      outcome: DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.UNCLASSIFIED_REVIEW_REQUIRED,
      method: DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_METHODS.CONTACT_COMPANY_RELATIONSHIP,
      confidenceBand: DOCUMENT_WORKSPACE_INBOUND_CONFIDENCE_BANDS.REVIEW_REQUIRED,
      evidenceCodes: ["ambiguous_sender_transactions"],
      suggestedTypeRef: null,
      suggestedLodRequestRef: null,
      suggestedParticipantId: null,
      reviewReason: null,
      decidedAt: null,
      decidedByUserId: null,
      otherExplicitlyConfirmed: false,
    };
  } else if (input.contactId) {
    method = DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_METHODS.CONTACT_COMPANY_RELATIONSHIP;
    evidenceCodes.push("contact_relationship");
  }

  if (!suggested && input.filename && lodCandidates.length) {
    const fromName = suggestLodFromFilename({ filename: input.filename, lodCandidates });
    if (fromName && fromName !== "ambiguous") {
      suggested = fromName;
      evidenceCodes.push("filename_metadata");
      if (method === DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_METHODS.MANUAL_REVIEW) {
        method = DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_METHODS.FILENAME_METADATA;
      }
    } else if (fromName === "ambiguous") {
      evidenceCodes.push("filename_metadata_ambiguous");
    }
  }

  if (!transactionLinked) {
    return {
      outcome: DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.UNCLASSIFIED_REVIEW_REQUIRED,
      method,
      confidenceBand: DOCUMENT_WORKSPACE_INBOUND_CONFIDENCE_BANDS.REVIEW_REQUIRED,
      evidenceCodes: evidenceCodes.length ? evidenceCodes : ["no_verified_transaction_match"],
      suggestedTypeRef: suggested?.typeRef ?? null,
      suggestedLodRequestRef: suggested?.requestRef ?? null,
      suggestedParticipantId: suggested?.participantId ?? null,
      reviewReason: null,
      decidedAt: null,
      decidedByUserId: null,
      otherExplicitlyConfirmed: false,
    };
  }

  if (automaticType && suggested) {
    const otherGate = decideSilentOtherAssignment({
      typeRef: suggested.typeRef,
      employeeConfirmedOther: input.employeeConfirmedOther,
      lodFormallyUsesOther: input.lodFormallyUsesOther,
    });
    if (!otherGate.ok) {
      return {
        outcome: DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.UNCLASSIFIED_REVIEW_REQUIRED,
        method,
        confidenceBand: DOCUMENT_WORKSPACE_INBOUND_CONFIDENCE_BANDS.REVIEW_REQUIRED,
        evidenceCodes: [...evidenceCodes, "other_not_silently_assigned"],
        suggestedTypeRef: null,
        suggestedLodRequestRef: null,
        suggestedParticipantId: null,
        reviewReason: null,
        decidedAt: null,
        decidedByUserId: null,
        otherExplicitlyConfirmed: false,
      };
    }
    return {
      outcome: DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.CLASSIFIED_AUTOMATICALLY,
      method,
      confidenceBand: DOCUMENT_WORKSPACE_INBOUND_CONFIDENCE_BANDS.AUTOMATIC,
      evidenceCodes,
      suggestedTypeRef: suggested.typeRef,
      suggestedLodRequestRef: suggested.requestRef,
      suggestedParticipantId: suggested.participantId ?? null,
      reviewReason: null,
      decidedAt: null,
      decidedByUserId: null,
      otherExplicitlyConfirmed: false,
    };
  }

  if (suggested) {
    return {
      outcome: DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.SUGGESTED_REVIEW_REQUIRED,
      method,
      confidenceBand: DOCUMENT_WORKSPACE_INBOUND_CONFIDENCE_BANDS.REVIEW_REQUIRED,
      evidenceCodes,
      suggestedTypeRef: suggested.typeRef,
      suggestedLodRequestRef: suggested.requestRef,
      suggestedParticipantId: suggested.participantId ?? null,
      reviewReason: null,
      decidedAt: null,
      decidedByUserId: null,
      otherExplicitlyConfirmed: false,
    };
  }

  return {
    outcome: DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.UNCLASSIFIED_REVIEW_REQUIRED,
    method,
    confidenceBand: DOCUMENT_WORKSPACE_INBOUND_CONFIDENCE_BANDS.REVIEW_REQUIRED,
    evidenceCodes: evidenceCodes.length ? evidenceCodes : ["type_unknown"],
    suggestedTypeRef: null,
    suggestedLodRequestRef: null,
    suggestedParticipantId: null,
    reviewReason: null,
    decidedAt: null,
    decidedByUserId: null,
    otherExplicitlyConfirmed: false,
  };
}

export function unclassifiedTypeRefPlaceholder(id: string): string {
  return `${DOCUMENT_INTAKE_UNCLASSIFIED_TYPE_PREFIX}${id}`;
}

export function parseInboundClassificationJson(
  value: unknown,
): InboundClassificationSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const outcome = String(row.outcome || "");
  const method = String(row.method || "");
  const outcomes = Object.values(DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES) as string[];
  const methods = Object.values(DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_METHODS) as string[];
  if (!outcomes.includes(outcome) || !methods.includes(method)) return null;
  return {
    outcome: outcome as DocumentWorkspaceInboundClassificationOutcome,
    method: method as DocumentWorkspaceInboundClassificationMethod,
    confidenceBand: (String(row.confidenceBand || DOCUMENT_WORKSPACE_INBOUND_CONFIDENCE_BANDS.NONE) as DocumentWorkspaceInboundConfidenceBand),
    evidenceCodes: Array.isArray(row.evidenceCodes) ? row.evidenceCodes.map((item) => String(item)) : [],
    suggestedTypeRef: typeof row.suggestedTypeRef === "string" ? row.suggestedTypeRef : null,
    suggestedLodRequestRef: typeof row.suggestedLodRequestRef === "string" ? row.suggestedLodRequestRef : null,
    suggestedParticipantId: typeof row.suggestedParticipantId === "string" ? row.suggestedParticipantId : null,
    reviewReason: typeof row.reviewReason === "string" ? row.reviewReason : null,
    decidedAt: typeof row.decidedAt === "string" ? row.decidedAt : null,
    decidedByUserId: typeof row.decidedByUserId === "string" ? row.decidedByUserId : null,
    otherExplicitlyConfirmed: row.otherExplicitlyConfirmed === true,
  };
}
