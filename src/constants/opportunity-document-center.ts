/**
 * CO-ARCH — Opportunity Document Center constitutional scopes.
 * Applicant docs belong to a participant; Shared docs belong to the Opportunity.
 */

import type { EdieDocumentModuleId } from "@/types/edie-certified-rules";
import type { LoanParticipant, LoanParticipantRole } from "@/types/loan-participant";
import { LOAN_PARTICIPANT_ROLE_LABELS } from "@/types/loan-participant";

/** Document ownership scope — frozen constitutional model. */
export type OpportunityDocumentScope = "applicant" | "shared";

/** Selector value: participant id, or shared Opportunity bucket. */
export type DocumentCenterScopeKey = `participant:${string}` | "shared";

export const DOCUMENT_CENTER_SHARED_SCOPE_KEY: DocumentCenterScopeKey = "shared";

/** EDIE modules that belong to Shared Opportunity Documents. */
export const SHARED_OPPORTUNITY_DOCUMENT_MODULES: readonly EdieDocumentModuleId[] = [
  "property",
  "existing_loan",
] as const;

/** EDIE modules that belong to Applicant Documents. */
export const APPLICANT_DOCUMENT_MODULES: readonly EdieDocumentModuleId[] = [
  "customer_kyc",
  "address_proof",
  "business_constitution",
  "financial",
  "banking",
] as const;

/**
 * BAT #22 — Business-friendly Document Owner role labels.
 * Always "Primary Applicant" (not Borrower) for Document Center.
 */
export function documentCenterOwnerRoleLabel(
  role?: LoanParticipantRole | string | null,
): string {
  if (role === "primary_applicant") return "Primary Applicant";
  if (role === "co_applicant") return "Co-Applicant";
  if (role === "guarantor") return "Guarantor";
  if (role === "company") return "Company";
  if (role && role in LOAN_PARTICIPANT_ROLE_LABELS) {
    return LOAN_PARTICIPANT_ROLE_LABELS[role as LoanParticipantRole];
  }
  return "Participant";
}

export function resolveDocumentScopeForModule(
  moduleId: EdieDocumentModuleId | string | undefined,
): OpportunityDocumentScope {
  if (!moduleId) return "applicant";
  if ((SHARED_OPPORTUNITY_DOCUMENT_MODULES as readonly string[]).includes(moduleId)) {
    return "shared";
  }
  return "applicant";
}

export function resolveDocumentScopeForTypeRef(typeRef: string): OpportunityDocumentScope {
  const lower = typeRef.toLowerCase();
  if (
    lower.includes("property") ||
    lower.includes("sale-agreement") ||
    lower.includes("valuation") ||
    lower.includes("legal") ||
    lower.includes("noc") ||
    lower.includes("collateral") ||
    lower.includes("builder") ||
    lower.includes("society") ||
    lower.includes("existing-loan") ||
    lower.includes("bt-")
  ) {
    return "shared";
  }
  return "applicant";
}

export function participantScopeKey(participantId: string): DocumentCenterScopeKey {
  return `participant:${participantId}`;
}

export function parseParticipantScopeKey(
  key: DocumentCenterScopeKey,
): string | null {
  if (key === "shared") return null;
  if (key.startsWith("participant:")) return key.slice("participant:".length);
  return null;
}

/** Tab / compact label: "Role - Name" (no Co-Applicant numbering). */
export function documentCenterScopeLabel(
  key: DocumentCenterScopeKey,
  participants: LoanParticipant[],
): string {
  if (key === "shared") return "Shared Opportunity Documents";
  const id = parseParticipantScopeKey(key);
  const hit = participants.find((p) => p.id === id);
  if (!hit) return "Primary Applicant";
  return `${documentCenterOwnerRoleLabel(hit.role)} - ${hit.name}`;
}

/** Active owner banner parts for the selected Document Owner tab. */
export function documentCenterActiveOwner(
  key: DocumentCenterScopeKey,
  participants: LoanParticipant[],
): { roleLabel: string; name: string; isShared: boolean } {
  if (key === "shared") {
    return {
      roleLabel: "Shared Opportunity Documents",
      name: "Opportunity",
      isShared: true,
    };
  }
  const id = parseParticipantScopeKey(key);
  const hit = participants.find((p) => p.id === id);
  if (!hit) {
    return { roleLabel: "Primary Applicant", name: "—", isShared: false };
  }
  return {
    roleLabel: documentCenterOwnerRoleLabel(hit.role),
    name: hit.name.trim() || "—",
    isShared: false,
  };
}

export function buildDocumentCenterScopeOptions(
  participants: LoanParticipant[],
): Array<{ key: DocumentCenterScopeKey; label: string }> {
  const people = [...participants].sort((a, b) => {
    const rank = (r?: LoanParticipantRole) => {
      if (r === "primary_applicant") return 0;
      if (r === "co_applicant") return 1;
      if (r === "guarantor") return 2;
      if (r === "company") return 3;
      return 4;
    };
    return rank(a.role) - rank(b.role) || a.name.localeCompare(b.name);
  });

  const opts: Array<{ key: DocumentCenterScopeKey; label: string }> = people.map(
    (p) => ({
      key: participantScopeKey(p.id),
      label: documentCenterScopeLabel(participantScopeKey(p.id), participants),
    }),
  );

  if (opts.length === 0) {
    opts.push({
      key: participantScopeKey("primary"),
      label: "Primary Applicant",
    });
  }

  opts.push({
    key: DOCUMENT_CENTER_SHARED_SCOPE_KEY,
    label: "Shared Opportunity Documents",
  });

  return opts;
}

export const DEAL_DOCUMENTS_EDIT_BLOCK_MESSAGE =
  "Documents can only be edited from the Opportunity Document Center.";
