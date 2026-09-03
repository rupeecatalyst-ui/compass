/**
 * CO-C1-CONTEXT-LOCKED-DOCUMENT-WORKSPACE-008
 * Server lock: Opportunity / Deal IDs only. Hierarchy + organisation enforced here.
 */

import "server-only";

import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { userAdminService } from "@server/services/user-admin.service";
import { actorCanSeeCase, hasOrgWideCaseVisibility, type CaseVisibilityActor } from "@/lib/enterprise-case-visibility";
import {
  lockDocumentWorkspaceContext,
  parseDocumentWorkspaceSearchParams,
} from "@/lib/document-workspace/context-lock";
import type {
  DocumentWorkspaceContextInput,
  DocumentWorkspaceLockResult,
} from "@/types/document-workspace-context";

function actorMaySee(input: {
  actor: CaseVisibilityActor;
  downlineUserIds: string[];
  primaryOwnerUserId?: string | null;
  relationshipManagerUserId?: string | null;
  relationshipManagerName?: string | null;
}): boolean {
  if (hasOrgWideCaseVisibility(input.actor.role)) return true;
  return actorCanSeeCase(
    input.actor,
    {
      primaryOwnerUserId: input.primaryOwnerUserId,
      relationshipManagerUserId: input.relationshipManagerUserId,
      relationshipManagerName: input.relationshipManagerName,
      assignedUserIds: [
        input.primaryOwnerUserId,
        input.relationshipManagerUserId,
      ].filter((id): id is string => Boolean(id?.trim())),
    },
    {
      scope: "my_team",
      downlineUserIds: input.downlineUserIds,
    },
  );
}

export async function resolveDocumentWorkspaceContext(input: {
  actor: CaseVisibilityActor;
  request: DocumentWorkspaceContextInput;
}): Promise<DocumentWorkspaceLockResult> {
  if (!isDatabaseAvailable()) {
    throw Object.assign(new Error("Document Workspace context requires enterprise persistence."), {
      statusCode: 503,
      code: "DOCUMENT_WORKSPACE_CONTEXT_UNAVAILABLE",
    });
  }

  const actorOrganizationId = await resolvePilotOrganizationId();
  if (!actorOrganizationId) {
    throw Object.assign(new Error("Organization context unavailable."), {
      statusCode: 503,
      code: "ORG_CONTEXT_UNAVAILABLE",
    });
  }

  let opportunityId = input.request.opportunityId?.trim() || "";
  const dealId = input.request.dealId?.trim() || "";

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

  if (dealId && deal && !opportunityId && deal.opportunityId) {
    opportunityId = deal.opportunityId;
  }

  const opportunity = opportunityId
    ? await prisma.enterpriseOpportunity.findFirst({
        where: { id: opportunityId },
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
    request: { ...input.request, opportunityId: opportunityId || input.request.opportunityId },
    actorOrganizationId,
    opportunity,
    deal: deal
      ? {
          ...deal,
          lenderName: deal.primaryCounterpartyName,
        }
      : null,
  });

  if (!locked.ok) return locked;

  const downlineUserIds = input.actor.userId
    ? await userAdminService.resolveDownlineUserIds(input.actor.userId)
    : [];

  const visible = actorMaySee({
    actor: input.actor,
    downlineUserIds,
    primaryOwnerUserId:
      deal?.primaryOwnerUserId || opportunity?.primaryOwnerUserId,
    relationshipManagerUserId:
      deal?.relationshipManagerUserId || opportunity?.relationshipManagerUserId,
    relationshipManagerName:
      deal?.relationshipManagerName || opportunity?.relationshipManagerName,
  });
  if (!visible) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "You are not authorised to open this Document Workspace transaction.",
    };
  }

  return locked;
}

export function parseDocumentWorkspaceContextRequest(url: URL): DocumentWorkspaceContextInput {
  return parseDocumentWorkspaceSearchParams(url.searchParams);
}
