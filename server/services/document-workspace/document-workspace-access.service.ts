/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014B
 * Canonical Document Workspace access resolver.
 * Organisation, hierarchy and record membership are resolved server-side.
 */
import "server-only";

import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { userAdminService } from "@server/services/user-admin.service";
import { lockDocumentWorkspaceContext } from "@/lib/document-workspace/context-lock";
import {
  capabilityAllowed,
  decideAuthenticatedActor,
  decideCrossTransactionSelection,
  decideDocumentBelongsToContext,
  decideHierarchyVisibility,
  decideOrganizationScope,
  decideParticipantBelongsToTransaction,
  publicDocumentWorkspaceAccessMessage,
  type DocumentWorkspaceAccessActor,
  type DocumentWorkspaceAccessFailure,
  type DocumentWorkspaceCapability,
} from "@/lib/document-workspace/access-decision";
import type { Role } from "@/constants/roles";
import type { DocumentWorkspaceResolvedContext } from "@/types/document-workspace-context";

export type DocumentWorkspaceAuthorisedContext = {
  ok: true;
  organizationId: string;
  actor: DocumentWorkspaceAccessActor;
  capability: DocumentWorkspaceCapability;
  opportunityId: string;
  dealId: string | null;
  contactId: string | null;
  companyId: string | null;
  documentId: string | null;
  lock: DocumentWorkspaceResolvedContext;
};

function accessError(
  failure: DocumentWorkspaceAccessFailure,
): never {
  throw Object.assign(new Error(failure.message), {
    statusCode: failure.httpStatus,
    code: failure.code,
    expose: false,
  });
}

export function throwDocumentWorkspaceAccessFailure(
  failure: DocumentWorkspaceAccessFailure,
): never {
  accessError({
    ...failure,
    message: publicDocumentWorkspaceAccessMessage(failure.httpStatus),
  });
}

export async function resolveAuthenticatedDocumentWorkspaceActor(input: {
  userId: string;
}): Promise<DocumentWorkspaceAccessActor> {
  if (!isDatabaseAvailable()) {
    throw Object.assign(new Error("Document Workspace requires enterprise persistence."), {
      statusCode: 503,
      code: "DOCUMENT_WORKSPACE_UNAVAILABLE",
    });
  }
  const organizationId = await resolvePilotOrganizationId();
  const user = await prisma.user.findFirst({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
    },
  });
  const decided = decideAuthenticatedActor({
    tokenUserId: input.userId,
    user: user
      ? {
          id: user.id,
          isActive: user.isActive,
          organizationId,
          role: user.role,
        }
      : null,
  });
  if (!decided.ok) throwDocumentWorkspaceAccessFailure(decided);
  if (!user) throwDocumentWorkspaceAccessFailure({
    ok: false,
    httpStatus: 401,
    code: "UNAUTHENTICATED",
    message: publicDocumentWorkspaceAccessMessage(401),
  });
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    organizationId,
    displayName: `${user.firstName} ${user.lastName}`.trim(),
  };
}

export async function resolveDocumentWorkspaceAccess(input: {
  userId: string;
  capability: DocumentWorkspaceCapability;
  claimedOrganizationId?: string | null;
  opportunityId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  documentId?: string | null;
  participantEntityId?: string | null;
  allowedParticipantIds?: Array<string | null | undefined>;
}): Promise<DocumentWorkspaceAuthorisedContext> {
  const actor = await resolveAuthenticatedDocumentWorkspaceActor({ userId: input.userId });
  if (!capabilityAllowed(actor.role as Role, input.capability)) {
    throwDocumentWorkspaceAccessFailure({
      ok: false,
      httpStatus: 403,
      code: "FORBIDDEN_CAPABILITY",
      message: publicDocumentWorkspaceAccessMessage(403),
    });
  }

  let opportunityId = input.opportunityId?.trim() || "";
  let dealId = input.dealId?.trim() || "";
  let documentRow: {
    id: string;
    organizationId: string;
    opportunityId: string;
    dealId: string | null;
    status: string | null;
    participantId: string | null;
    contactId: string | null;
    ownerEntityId: string | null;
  } | null = null;
  const requestedDocumentId = input.documentId?.trim() || "";
  if (requestedDocumentId) {
    documentRow = await prisma.enterpriseTransactionDocument.findFirst({
      where: { id: requestedDocumentId },
      select: {
        id: true,
        organizationId: true,
        opportunityId: true,
        dealId: true,
        status: true,
        participantId: true,
        contactId: true,
        ownerEntityId: true,
      },
    });
    if (!documentRow) {
      throwDocumentWorkspaceAccessFailure({
        ok: false,
        httpStatus: 404,
        code: "NOT_FOUND",
        message: publicDocumentWorkspaceAccessMessage(404),
      });
    }
    if (!opportunityId) opportunityId = documentRow.opportunityId;
    if (!dealId && documentRow.dealId) dealId = documentRow.dealId;
  }

  const deal = dealId
    ? await prisma.enterpriseDeal.findFirst({
        where: { id: dealId },
        select: {
          id: true,
          organizationId: true,
          opportunityId: true,
          dealNumber: true,
          primaryCounterpartyName: true,
          productLabel: true,
          relationshipManagerUserId: true,
          relationshipManagerName: true,
          primaryOwnerUserId: true,
          grossStage: true,
          isDeleted: true,
          archived: true,
        },
      })
    : null;

  const resolvedOpportunityId = opportunityId || deal?.opportunityId || "";
  const opportunity = resolvedOpportunityId
    ? await prisma.enterpriseOpportunity.findFirst({
        where: { id: resolvedOpportunityId },
        select: {
          id: true,
          organizationId: true,
          opportunityNumber: true,
          primaryContactId: true,
          companyId: true,
          primaryContactName: true,
          companyName: true,
          productLabel: true,
          relationshipManagerUserId: true,
          relationshipManagerName: true,
          primaryOwnerUserId: true,
          requirementStage: true,
          isDeleted: true,
        },
      })
    : null;

  const locked = lockDocumentWorkspaceContext({
    request: {
      organizationId: input.claimedOrganizationId,
      opportunityId: resolvedOpportunityId || input.opportunityId,
      dealId: dealId || null,
      contactId: input.contactId,
      companyId: input.companyId,
    },
    actorOrganizationId: actor.organizationId,
    opportunity,
    deal: deal
      ? {
          ...deal,
          lenderName: deal.primaryCounterpartyName,
        }
      : null,
  });

  if (!locked.ok) {
    const forged =
      input.claimedOrganizationId?.trim() &&
      input.claimedOrganizationId.trim() !== actor.organizationId;
    throwDocumentWorkspaceAccessFailure({
      ok: false,
      httpStatus: locked.code === "CROSS_ORGANIZATION" && forged ? 403 : 404,
      code: locked.code,
      message: publicDocumentWorkspaceAccessMessage(
        locked.code === "CROSS_ORGANIZATION" && forged ? 403 : 404,
      ),
    });
  }

  const orgScope = decideOrganizationScope({
    actorOrganizationId: actor.organizationId,
    recordOrganizationId: locked.context.organizationId,
    claimedOrganizationId: input.claimedOrganizationId,
  });
  if (!orgScope.ok) throwDocumentWorkspaceAccessFailure(orgScope);

  const downlineUserIds = await userAdminService.resolveDownlineUserIds(actor.userId);
  const visible = decideHierarchyVisibility({
    actor,
    opportunity: {
      id: locked.context.opportunityId,
      organizationId: locked.context.organizationId,
      primaryOwnerUserId: opportunity?.primaryOwnerUserId,
      relationshipManagerUserId: opportunity?.relationshipManagerUserId,
      relationshipManagerName: opportunity?.relationshipManagerName,
    },
    deal: deal
      ? {
          id: deal.id,
          organizationId: deal.organizationId,
          opportunityId: deal.opportunityId,
          primaryOwnerUserId: deal.primaryOwnerUserId,
          relationshipManagerUserId: deal.relationshipManagerUserId,
          relationshipManagerName: deal.relationshipManagerName,
          isDeleted: deal.isDeleted,
        }
      : null,
    downlineUserIds,
  });
  if (!visible.ok) throwDocumentWorkspaceAccessFailure(visible);

  const documentId = requestedDocumentId || null;
  if (documentId) {
    const belongs = decideDocumentBelongsToContext({
      organizationId: locked.context.organizationId,
      opportunityId: locked.context.opportunityId,
      dealId: locked.context.dealId,
      document: documentRow,
    });
    if (!belongs.ok) throwDocumentWorkspaceAccessFailure(belongs);
  }

  const participant = decideParticipantBelongsToTransaction({
    requestedEntityId: input.participantEntityId,
    allowedEntityIds: input.allowedParticipantIds ?? [
      locked.context.contactId,
      locked.context.companyId,
    ],
  });
  if (!participant.ok) throwDocumentWorkspaceAccessFailure(participant);

  return {
    ok: true,
    organizationId: locked.context.organizationId,
    actor,
    capability: input.capability,
    opportunityId: locked.context.opportunityId,
    dealId: locked.context.dealId,
    contactId: locked.context.contactId,
    companyId: locked.context.companyId,
    documentId,
    lock: locked.context,
  };
}

export async function assertDocumentsInAuthorisedContext(input: {
  context: DocumentWorkspaceAuthorisedContext;
  documentIds: string[];
}): Promise<void> {
  if (!input.documentIds.length) {
    throwDocumentWorkspaceAccessFailure({
      ok: false,
      httpStatus: 400,
      code: "BAD_REQUEST",
      message: publicDocumentWorkspaceAccessMessage(400),
    });
  }
  const rows = await prisma.enterpriseTransactionDocument.findMany({
    where: {
      id: { in: input.documentIds },
      organizationId: input.context.organizationId,
    },
    select: {
      id: true,
      organizationId: true,
      opportunityId: true,
      dealId: true,
    },
  });
  if (rows.length !== input.documentIds.length) {
    throwDocumentWorkspaceAccessFailure({
      ok: false,
      httpStatus: 404,
      code: "NOT_FOUND",
      message: publicDocumentWorkspaceAccessMessage(404),
    });
  }
  const selection = decideCrossTransactionSelection({
    organizationId: input.context.organizationId,
    opportunityId: input.context.opportunityId,
    dealId: input.context.dealId,
    selected: rows,
  });
  if (!selection.ok) throwDocumentWorkspaceAccessFailure(selection);
}
