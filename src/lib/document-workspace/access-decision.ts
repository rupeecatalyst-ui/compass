/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014B
 * Pure access decisions. Callers supply server-resolved records — never browser claims.
 */

import { ROLE_HIERARCHY, ROLES, type Role } from "@/constants/roles";
import {
  actorCanSeeCase,
  hasOrgWideCaseVisibility,
  type CaseVisibilityActor,
} from "@/lib/enterprise-case-visibility";
import { hasMinimumRole } from "@/lib/permissions";
import { validateLockedDocumentSelection } from "@/lib/document-workspace/selection";
import {
  DOCUMENT_WORKSPACE_GENERIC_FILE_REJECTED,
  DOCUMENT_WORKSPACE_GENERIC_FORBIDDEN,
  DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE,
  DOCUMENT_WORKSPACE_GENERIC_UNAUTHENTICATED,
  DOCUMENT_WORKSPACE_GENERIC_UPLOAD_LINK,
} from "@/constants/document-workspace-security";

export type DocumentWorkspaceCapability =
  | "view"
  | "download"
  | "upload"
  | "replace"
  | "review"
  | "delete"
  | "request"
  | "share";

export type DocumentWorkspaceAccessHttpStatus = 401 | 403 | 404 | 400 | 410 | 422 | 429;

export function publicDocumentWorkspaceAccessMessage(
  httpStatus: DocumentWorkspaceAccessHttpStatus,
): string {
  if (httpStatus === 401) return DOCUMENT_WORKSPACE_GENERIC_UNAUTHENTICATED;
  if (httpStatus === 403) return DOCUMENT_WORKSPACE_GENERIC_FORBIDDEN;
  if (httpStatus === 410) return DOCUMENT_WORKSPACE_GENERIC_UPLOAD_LINK;
  if (httpStatus === 422) return DOCUMENT_WORKSPACE_GENERIC_FILE_REJECTED;
  if (httpStatus === 429) return "Please wait and try again.";
  if (httpStatus === 400) return DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE;
  return DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE;
}

export function isTokenAuthFailure(err: unknown): err is { status: number; body: never } {
  if (!err || typeof err !== "object") return false;
  return "status" in err && "body" in err && !("statusCode" in err);
}

export type DocumentWorkspaceAccessFailure = {
  ok: false;
  httpStatus: DocumentWorkspaceAccessHttpStatus;
  code: string;
  message: string;
};

export type DocumentWorkspaceAccessActor = {
  userId: string;
  email: string;
  role: Role | string;
  isActive: boolean;
  organizationId: string;
  displayName?: string | null;
};

export type DocumentWorkspaceRecordSnapshot = {
  id: string;
  organizationId: string;
  opportunityId?: string | null;
  isDeleted?: boolean;
  primaryOwnerUserId?: string | null;
  relationshipManagerUserId?: string | null;
  relationshipManagerName?: string | null;
  assignedUserIds?: string[] | null;
  primaryContactId?: string | null;
  companyId?: string | null;
};

export type DocumentWorkspaceDocumentSnapshot = {
  id: string;
  organizationId: string;
  opportunityId: string;
  dealId?: string | null;
  status?: string | null;
  participantId?: string | null;
  contactId?: string | null;
  ownerEntityId?: string | null;
};

function deny(
  httpStatus: DocumentWorkspaceAccessHttpStatus,
  code: string,
  message: string,
): DocumentWorkspaceAccessFailure {
  return { ok: false, httpStatus, code, message };
}

export function mapDocumentWorkspaceAccessHttp(code: string): DocumentWorkspaceAccessHttpStatus {
  if (code === "UNAUTHENTICATED" || code === "INVALID_TOKEN") return 401;
  if (code === "INACTIVE_USER" || code === "FORBIDDEN_CAPABILITY") return 403;
  if (code === "EXPIRED" || code === "OTP_EXPIRED") return 410;
  if (code === "INVALID_FILE" || code === "VALIDATION") return 422;
  if (code === "BAD_REQUEST") return 400;
  return 404;
}

export function documentWorkspaceHttpError(err: unknown): {
  status: number;
  code: string;
  message: string;
  retryAfterMs?: number;
} {
  const e = err as { statusCode?: number; code?: string; retryAfterMs?: number };
  const status = Number(e.statusCode) || 500;
  const retryAfterMs = typeof e.retryAfterMs === "number" ? e.retryAfterMs : undefined;
  if (status === 401) {
    return { status, code: e.code || "UNAUTHENTICATED", message: publicDocumentWorkspaceAccessMessage(401) };
  }
  if (status === 403) {
    return { status, code: e.code || "FORBIDDEN", message: publicDocumentWorkspaceAccessMessage(403) };
  }
  if (status === 410) {
    return { status, code: e.code || "EXPIRED", message: publicDocumentWorkspaceAccessMessage(410) };
  }
  if (status === 422) {
    return { status, code: e.code || "INVALID_FILE", message: DOCUMENT_WORKSPACE_GENERIC_FILE_REJECTED };
  }
  if (status === 429) {
    return {
      status,
      code: e.code || "RATE_LIMITED",
      message: publicDocumentWorkspaceAccessMessage(429),
      retryAfterMs,
    };
  }
  if (status === 400) {
    return { status, code: e.code || "BAD_REQUEST", message: publicDocumentWorkspaceAccessMessage(400) };
  }
  if (status === 404) {
    return { status, code: e.code || "NOT_FOUND", message: publicDocumentWorkspaceAccessMessage(404) };
  }
  if (status >= 500) {
    return { status: 500, code: "DOCUMENT_WORKSPACE_FAILED", message: "Document Workspace request failed" };
  }
  return { status, code: e.code || "NOT_FOUND", message: publicDocumentWorkspaceAccessMessage(404) };
}

export function decideAuthenticatedActor(input: {
  tokenUserId?: string | null;
  user: { id: string; isActive: boolean; organizationId: string; role: string } | null;
}): DocumentWorkspaceAccessFailure | { ok: true } {
  if (!input.tokenUserId?.trim()) {
    return deny(401, "UNAUTHENTICATED", DOCUMENT_WORKSPACE_GENERIC_UNAUTHENTICATED);
  }
  if (!input.user) {
    return deny(401, "UNAUTHENTICATED", DOCUMENT_WORKSPACE_GENERIC_UNAUTHENTICATED);
  }
  if (!input.user.isActive) {
    return deny(403, "INACTIVE_USER", DOCUMENT_WORKSPACE_GENERIC_FORBIDDEN);
  }
  return { ok: true };
}

export function capabilityAllowed(
  role: Role | string,
  capability: DocumentWorkspaceCapability,
): boolean {
  if (!(role in ROLE_HIERARCHY)) return false;
  const typed = role as Role;
  if (capability === "view" || capability === "download" || capability === "request") {
    return hasMinimumRole(typed, ROLES.VIEWER);
  }
  if (capability === "upload" || capability === "share") {
    return hasMinimumRole(typed, ROLES.VIEWER);
  }
  if (capability === "replace" || capability === "review") {
    return hasMinimumRole(typed, ROLES.ANALYST);
  }
  if (capability === "delete") {
    return hasMinimumRole(typed, ROLES.MANAGER);
  }
  return false;
}

export function decideOrganizationScope(input: {
  actorOrganizationId: string;
  recordOrganizationId: string;
  claimedOrganizationId?: string | null;
}): DocumentWorkspaceAccessFailure | { ok: true } {
  const actorOrg = input.actorOrganizationId.trim();
  const recordOrg = input.recordOrganizationId.trim();
  if (!actorOrg || !recordOrg || actorOrg !== recordOrg) {
    return deny(404, "CROSS_ORGANIZATION", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  const claimed = input.claimedOrganizationId?.trim();
  if (claimed && claimed !== actorOrg) {
    return deny(403, "FORGED_ORGANIZATION", DOCUMENT_WORKSPACE_GENERIC_FORBIDDEN);
  }
  return { ok: true };
}

export function decideHierarchyVisibility(input: {
  actor: CaseVisibilityActor & { organizationId: string };
  opportunity: DocumentWorkspaceRecordSnapshot;
  deal?: DocumentWorkspaceRecordSnapshot | null;
  downlineUserIds: string[];
}): DocumentWorkspaceAccessFailure | { ok: true } {
  if (hasOrgWideCaseVisibility(input.actor.role)) {
    if (input.opportunity.organizationId !== input.actor.organizationId) {
      return deny(404, "CROSS_ORGANIZATION", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
    }
    return { ok: true };
  }
  const subject = input.deal
    ? {
        primaryOwnerUserId: input.deal.primaryOwnerUserId || input.opportunity.primaryOwnerUserId,
        relationshipManagerUserId:
          input.deal.relationshipManagerUserId || input.opportunity.relationshipManagerUserId,
        relationshipManagerName:
          input.deal.relationshipManagerName || input.opportunity.relationshipManagerName,
        assignedUserIds: [
          ...(input.deal.assignedUserIds ?? []),
          ...(input.opportunity.assignedUserIds ?? []),
        ],
      }
    : {
        primaryOwnerUserId: input.opportunity.primaryOwnerUserId,
        relationshipManagerUserId: input.opportunity.relationshipManagerUserId,
        relationshipManagerName: input.opportunity.relationshipManagerName,
        assignedUserIds: input.opportunity.assignedUserIds,
      };
  const visible = actorCanSeeCase(input.actor, subject, {
    scope: "my_team",
    downlineUserIds: input.downlineUserIds,
  });
  if (!visible) {
    return deny(404, "UNAUTHORIZED", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  return { ok: true };
}

export function decideDocumentBelongsToContext(input: {
  organizationId: string;
  opportunityId: string;
  dealId?: string | null;
  document: DocumentWorkspaceDocumentSnapshot | null;
  allowDeletedLifecycle?: boolean;
}): DocumentWorkspaceAccessFailure | { ok: true } {
  if (!input.document) {
    return deny(404, "NOT_FOUND", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  const status = String(input.document.status || "").toLowerCase();
  if (status === "quarantined") {
    return deny(404, "NOT_FOUND", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  if (
    (status === "deleted" || status === "eligible_for_purge" || status === "superseded") &&
    !input.allowDeletedLifecycle
  ) {
    return deny(404, "NOT_FOUND", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  const selection = validateLockedDocumentSelection({
    organizationId: input.organizationId,
    opportunityId: input.opportunityId,
    dealId: input.dealId,
    selected: [
      {
        id: input.document.id,
        organizationId: input.document.organizationId,
        opportunityId: input.document.opportunityId,
        dealId: input.document.dealId,
      },
    ],
  });
  if (!selection.ok) {
    return deny(404, selection.code, DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  return { ok: true };
}

export function decideParticipantBelongsToTransaction(input: {
  requestedEntityId?: string | null;
  allowedEntityIds: Array<string | null | undefined>;
}): DocumentWorkspaceAccessFailure | { ok: true } {
  const requested = input.requestedEntityId?.trim();
  if (!requested) return { ok: true };
  const allowed = new Set(
    input.allowedEntityIds.map((id) => id?.trim()).filter((id): id is string => Boolean(id)),
  );
  if (!allowed.has(requested)) {
    return deny(404, "PARTICIPANT_MISMATCH", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  return { ok: true };
}

export function decideDealBelongsToOpportunity(input: {
  opportunityId: string;
  dealOpportunityId?: string | null;
  dealDeleted?: boolean;
}): DocumentWorkspaceAccessFailure | { ok: true } {
  if (input.dealDeleted) {
    return deny(404, "NOT_FOUND", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  if ((input.dealOpportunityId || "").trim() !== input.opportunityId.trim()) {
    return deny(404, "OPPORTUNITY_DEAL_MISMATCH", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  return { ok: true };
}

export function decideCrossTransactionSelection(input: {
  organizationId: string;
  opportunityId: string;
  dealId?: string | null;
  selected: Array<{
    id: string;
    organizationId?: string | null;
    opportunityId?: string | null;
    dealId?: string | null;
  }>;
}): DocumentWorkspaceAccessFailure | { ok: true } {
  const result = validateLockedDocumentSelection({
    organizationId: input.organizationId,
    opportunityId: input.opportunityId,
    dealId: input.dealId,
    selected: input.selected,
  });
  if (!result.ok) {
    const status = result.code === "EMPTY" ? 400 : 404;
    return deny(status, result.code, DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  return { ok: true };
}
