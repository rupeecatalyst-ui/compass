/**
 * Owner tabs for Document Workspace — maps participants + document scope.
 */

import {
  documentCenterOwnerRoleLabel,
  resolveDocumentScopeForTypeRef,
} from "@/constants/opportunity-document-center";
import type { DocumentWorkspaceOwnerTabId } from "@/constants/document-workspace";
import type { DocumentRegistryRecord } from "@/types/document-registry";
import type { DocumentRequestItemState } from "@/types/document-requests";
import type { LoanParticipant } from "@/types/loan-participant";

export function resolveDocumentWorkspaceOwnerTab(input: {
  record?: DocumentRegistryRecord | null;
  lodItem?: DocumentRequestItemState | null;
  participants: LoanParticipant[];
}): { tab: DocumentWorkspaceOwnerTabId; ownerLabel: string } {
  const typeRef = input.record?.typeRef || input.lodItem?.typeRef || "";
  const scope =
    input.record?.links.documentScope ||
    (input.lodItem?.ownerScope === "security" ? "shared" : "applicant");

  if (scope === "lender") {
    return { tab: "shared", ownerLabel: "Lender-specific" };
  }

  const propertyLike =
    resolveDocumentScopeForTypeRef(typeRef) === "shared" &&
    /property|collateral|security|sale-agreement|valuation|legal|noc|builder|society/i.test(
      typeRef,
    );
  if (propertyLike || input.lodItem?.ownerScope === "security") {
    return {
      tab: "property",
      ownerLabel: input.lodItem?.ownerName || "Property / Security",
    };
  }

  if (scope === "shared" && !input.lodItem?.participantId && !input.record?.links.participantId) {
    return { tab: "shared", ownerLabel: "Shared Transaction" };
  }

  const participantId =
    input.record?.links.participantId || input.lodItem?.participantId || "";
  const person = input.participants.find((p) => p.id === participantId);
  const role = person?.role || input.lodItem?.ownerRoleLabel;
  const name =
    person?.name ||
    input.lodItem?.ownerName ||
    documentCenterOwnerRoleLabel(typeof role === "string" ? role : undefined);

  if (role === "company" || input.lodItem?.ownerRoleLabel === "Company") {
    return { tab: "business", ownerLabel: name };
  }
  if (role === "guarantor") {
    return { tab: "guarantors", ownerLabel: name };
  }
  if (role === "co_applicant") {
    return { tab: "co_applicants", ownerLabel: name };
  }
  return { tab: "primary", ownerLabel: name };
}
