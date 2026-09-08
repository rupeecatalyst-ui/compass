/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014
 * Linked Parties from Opportunity Loan Structure / Deal participants.
 * Identity is canonical entity ID + role. Display names are never used to match.
 */

import { LOAN_PARTICIPANT_ROLE_LABELS, type LoanParticipant } from "@/types/loan-participant";
import {
  DOCUMENT_WORKSPACE_NO_CO_APPLICANT,
  DOCUMENT_WORKSPACE_PROPERTY_CONTEXT_LABEL,
  DOCUMENT_WORKSPACE_SHARED_CONTEXT_LABEL,
} from "@/constants/document-workspace-refinement-014";

export type DocumentWorkspacePartyKind = "contact" | "company" | "context";

export type DocumentWorkspaceLinkedParty = {
  key: string;
  entityId: string | null;
  entityKind: DocumentWorkspacePartyKind;
  participantRowId: string | null;
  role: string;
  roleLabel: string;
  displayName: string;
  email: string | null;
  selectable: boolean;
  emptyHint?: string;
};

export type DealParticipantSnapshot = {
  id: string;
  ecmContactId: string;
  role: string;
  isDeleted?: boolean;
  displayName?: string | null;
  email?: string | null;
  entityKind?: "contact" | "company";
};

function partyKey(entityId: string, role: string): string {
  return `party:${entityId}:${role}`;
}

function roleLabel(role: string): string {
  if (role in LOAN_PARTICIPANT_ROLE_LABELS) {
    return LOAN_PARTICIPANT_ROLE_LABELS[role as keyof typeof LOAN_PARTICIPANT_ROLE_LABELS];
  }
  if (role === "primary_customer") return "Primary applicant";
  if (role === "authorized_signatory") return "Authorised Signatory";
  if (role === "nominee") return "Nominee";
  return role.replace(/_/g, " ");
}

function mapDealRole(role: string): string {
  if (role === "primary_customer") return "primary_applicant";
  return role;
}

export function mergeLinkedParties(input: {
  opportunityParticipants: LoanParticipant[];
  dealParticipants?: DealParticipantSnapshot[] | null;
  lockKind: "opportunity" | "deal";
}): DocumentWorkspaceLinkedParty[] {
  const byKey = new Map<string, DocumentWorkspaceLinkedParty>();

  const upsert = (party: DocumentWorkspaceLinkedParty) => {
    const existing = byKey.get(party.key);
    if (!existing) {
      byKey.set(party.key, party);
      return;
    }
    byKey.set(party.key, {
      ...existing,
      participantRowId: existing.participantRowId || party.participantRowId,
      displayName: existing.displayName || party.displayName,
      email: existing.email || party.email,
    });
  };

  for (const participant of input.opportunityParticipants) {
    if (participant.status === "inactive") continue;
    const entityId = participant.entityId?.trim() || "";
    if (!entityId) continue;
    const role = participant.role || "other";
    upsert({
      key: partyKey(entityId, role),
      entityId,
      entityKind: participant.entityType === "company" ? "company" : "contact",
      participantRowId: participant.id,
      role,
      roleLabel: roleLabel(role),
      displayName: participant.name?.trim() || "Not specified",
      email: participant.email?.trim() || null,
      selectable: true,
    });
  }

  if (input.lockKind === "deal") {
    for (const participant of input.dealParticipants ?? []) {
      if (participant.isDeleted) continue;
      const entityId = participant.ecmContactId?.trim() || "";
      if (!entityId) continue;
      const role = mapDealRole(participant.role);
      upsert({
        key: partyKey(entityId, role),
        entityId,
        entityKind: participant.entityKind === "company" ? "company" : "contact",
        participantRowId: participant.id,
        role,
        roleLabel: roleLabel(role),
        displayName: participant.displayName?.trim() || "Not specified",
        email: participant.email?.trim() || null,
        selectable: true,
      });
    }
  }

  const parties = [...byKey.values()].sort((a, b) => {
    const rank = (role: string) =>
      role === "primary_applicant" ? 0 : role === "co_applicant" ? 1 : role === "guarantor" ? 2 : role === "company" ? 3 : 4;
    return rank(a.role) - rank(b.role) || a.displayName.localeCompare(b.displayName);
  });

  const hasCoApplicant = parties.some((p) => p.role === "co_applicant");
  if (!hasCoApplicant) {
    parties.splice(1, 0, {
      key: "empty:co_applicant",
      entityId: null,
      entityKind: "contact",
      participantRowId: null,
      role: "co_applicant",
      roleLabel: "Co-Applicant",
      displayName: DOCUMENT_WORKSPACE_NO_CO_APPLICANT,
      email: null,
      selectable: false,
      emptyHint: DOCUMENT_WORKSPACE_NO_CO_APPLICANT,
    });
  }

  parties.push(
    {
      key: "shared",
      entityId: null,
      entityKind: "context",
      participantRowId: null,
      role: "shared",
      roleLabel: DOCUMENT_WORKSPACE_SHARED_CONTEXT_LABEL,
      displayName: DOCUMENT_WORKSPACE_SHARED_CONTEXT_LABEL,
      email: null,
      selectable: true,
    },
    {
      key: "property",
      entityId: null,
      entityKind: "context",
      participantRowId: null,
      role: "property",
      roleLabel: DOCUMENT_WORKSPACE_PROPERTY_CONTEXT_LABEL,
      displayName: DOCUMENT_WORKSPACE_PROPERTY_CONTEXT_LABEL,
      email: null,
      selectable: true,
    },
  );

  return parties;
}

export function defaultLinkedPartyKey(parties: DocumentWorkspaceLinkedParty[]): string {
  const primary = parties.find((p) => p.selectable && p.role === "primary_applicant");
  if (primary) return primary.key;
  const first = parties.find((p) => p.selectable && p.entityId);
  return first?.key || "shared";
}

export function partyMatchesRow(input: {
  party: DocumentWorkspaceLinkedParty;
  ownerTab: string;
  ownerEntityId?: string | null;
  participantRowId?: string | null;
  participantRole?: string | null;
  contactId?: string | null;
  companyId?: string | null;
}): boolean {
  if (input.party.key === "shared") return input.ownerTab === "shared";
  if (input.party.key === "property") return input.ownerTab === "property";
  if (!input.party.selectable || !input.party.entityId) return false;

  const entity = input.ownerEntityId?.trim() || input.contactId?.trim() || input.companyId?.trim() || "";
  const role = input.participantRole?.trim() || "";
  if (entity && entity === input.party.entityId) {
    if (!role || role === input.party.role) return true;
  }
  if (input.participantRowId && input.participantRowId === input.party.participantRowId) {
    return true;
  }
  if (input.ownerTab === "primary" && input.party.role === "primary_applicant") {
    return !entity || entity === input.party.entityId;
  }
  if (input.ownerTab === "co_applicants" && input.party.role === "co_applicant") {
    return !entity || entity === input.party.entityId;
  }
  if (input.ownerTab === "guarantors" && input.party.role === "guarantor") {
    return !entity || entity === input.party.entityId;
  }
  if (input.ownerTab === "business" && (input.party.role === "company" || input.party.entityKind === "company")) {
    return !entity || entity === input.party.entityId;
  }
  return false;
}
