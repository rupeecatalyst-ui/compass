import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import {
  composeManualDocumentEmail,
  createDocumentCustomerRequest,
  listDeletedDocumentWorkspaceDocuments,
  listDocumentWorkspaceLinkedParties,
  listUnseenInboundEmailDocuments,
  markDocumentVersionSeen,
  moveDocumentWorkspaceToDeleted,
  recordShareEvent,
  refuseDocumentWorkspacePermanentPurge,
  regenerateUploadSession,
  restoreDocumentWorkspaceDeleted,
  revokeUploadSession,
} from "@server/services/document-workspace/document-workspace-refinement-014.service";
import {
  listInboundEmailReviewQueue,
  listUnseenInboundEmailSummary,
  prepareDocumentRequestHandoff,
  recordWhatsAppHandoffOpened,
  recordWhatsAppHandoffCancelled,
  reviewInboundAttachment,
} from "@server/services/document-workspace/document-workspace-refinement-014d.service";
import {
  documentWorkspaceHttpError,
  isTokenAuthFailure,
} from "@/lib/document-workspace/access-decision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function wrap(err: unknown) {
  if (isTokenAuthFailure(err)) {
    return fromAuthError(err);
  }
  const mapped = documentWorkspaceHttpError(err);
  return errorResponse(mapped.status, mapped.code, mapped.message);
}

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    const url = new URL(request.url);
    const view = url.searchParams.get("view")?.trim() || "parties";
    const claimedOrganizationId = url.searchParams.get("organizationId");
    if (view === "inbound-review") {
      const opportunityId = url.searchParams.get("opportunityId")?.trim() || "";
      if (!opportunityId) return errorResponse(400, "VALIDATION", "opportunityId is required");
      const data = await listInboundEmailReviewQueue({
        actorUserId: actor.userId,
        opportunityId,
        dealId: url.searchParams.get("dealId"),
      });
      return successResponse(data);
    }
    if (view === "inbound-new-summary") {
      const opportunityIds = url.searchParams.get("opportunityIds")?.split(",") ?? [];
      const data = await listUnseenInboundEmailSummary({
        actorUserId: actor.userId,
        opportunityIds,
      });
      return successResponse(data);
    }
    if (view === "inbound-new") {
      const opportunityId = url.searchParams.get("opportunityId")?.trim() || "";
      if (!opportunityId) return errorResponse(400, "VALIDATION", "opportunityId is required");
      const data = await listUnseenInboundEmailDocuments({
        userId: actor.userId,
        opportunityId,
        dealId: url.searchParams.get("dealId"),
      });
      return successResponse(data);
    }
    if (view === "deleted") {
      const opportunityId = url.searchParams.get("opportunityId")?.trim() || "";
      if (!opportunityId) return errorResponse(400, "VALIDATION", "opportunityId is required");
      const data = await listDeletedDocumentWorkspaceDocuments({
        actorUserId: actor.userId,
        opportunityId,
        dealId: url.searchParams.get("dealId"),
      });
      return successResponse({ items: data });
    }
    const opportunityId = url.searchParams.get("opportunityId")?.trim() || "";
    if (!opportunityId) return errorResponse(400, "VALIDATION", "opportunityId is required");
    const data = await listDocumentWorkspaceLinkedParties({
      actorUserId: actor.userId,
      opportunityId,
      dealId: url.searchParams.get("dealId"),
      claimedOrganizationId,
    });
    return successResponse(data);
  } catch (err) {
    return wrap(err);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action || "");

    if (action === "create_request") {
      const data = await createDocumentCustomerRequest({
        actorUserId: actor.userId,
        opportunityId: String(body.opportunityId || ""),
        dealId: typeof body.dealId === "string" ? body.dealId : null,
        claimedOrganizationId: typeof body.organizationId === "string" ? body.organizationId : null,
        partyEntityId: String(body.partyEntityId || ""),
        partyEntityKind: (body.partyEntityKind as "contact" | "company" | "context") || "contact",
        participantRowId: typeof body.participantRowId === "string" ? body.participantRowId : null,
        participantRole: typeof body.participantRole === "string" ? body.participantRole : null,
        items: Array.isArray(body.items)
          ? (body.items as Array<{ typeRef: string; categoryLabel: string; requestRef: string }>)
          : [],
      });
      return successResponse(data, 201);
    }

    if (action === "revoke_session") {
      return successResponse(
        await revokeUploadSession({
          requestId: String(body.requestId || ""),
          actorUserId: actor.userId,
        }),
      );
    }

    if (action === "regenerate_session") {
      return successResponse(
        await regenerateUploadSession({
          requestId: String(body.requestId || ""),
          actorUserId: actor.userId,
        }),
      );
    }

    if (action === "mark_seen") {
      return successResponse(
        await markDocumentVersionSeen({
          userId: actor.userId,
          documentId: String(body.documentId || ""),
          versionKey: String(body.versionKey || ""),
        }),
      );
    }

    if (action === "share_event") {
      return successResponse(
        await recordShareEvent({
          actorUserId: actor.userId,
          opportunityId: String(body.opportunityId || ""),
          dealId: typeof body.dealId === "string" ? body.dealId : null,
          recipientLabel: String(body.recipientLabel || "Recipient"),
          recipientEmail: typeof body.recipientEmail === "string" ? body.recipientEmail : null,
          recipientContactId: typeof body.recipientContactId === "string" ? body.recipientContactId : null,
          documentIds: Array.isArray(body.documentIds) ? (body.documentIds as string[]) : [],
          versionIds: Array.isArray(body.versionIds) ? (body.versionIds as string[]) : [],
          attachmentMode: body.attachmentMode === "zip" ? "zip" : "individual",
          zipFilename: typeof body.zipFilename === "string" ? body.zipFilename : null,
          outboxId: typeof body.outboxId === "string" ? body.outboxId : null,
        }),
      );
    }

    if (action === "compose_validate") {
      return successResponse(
        await composeManualDocumentEmail({
          actorUserId: actor.userId,
          opportunityId: String(body.opportunityId || ""),
          dealId: typeof body.dealId === "string" ? body.dealId : null,
          documentIds: Array.isArray(body.documentIds) ? (body.documentIds as string[]) : [],
          to: Array.isArray(body.to) ? (body.to as string[]) : [],
          cc: Array.isArray(body.cc) ? (body.cc as string[]) : [],
          htmlBody: String(body.htmlBody || ""),
        }),
      );
    }

    if (action === "move_to_deleted") {
      return successResponse(
        await moveDocumentWorkspaceToDeleted({
          actorUserId: actor.userId,
          opportunityId: String(body.opportunityId || ""),
          dealId: typeof body.dealId === "string" ? body.dealId : null,
          documentId: typeof body.documentId === "string" ? body.documentId : null,
          clientRecordId: typeof body.clientRecordId === "string" ? body.clientRecordId : null,
          reason: String(body.reason || ""),
        }),
      );
    }

    if (action === "restore_deleted") {
      return successResponse(
        await restoreDocumentWorkspaceDeleted({
          actorUserId: actor.userId,
          opportunityId: String(body.opportunityId || ""),
          dealId: typeof body.dealId === "string" ? body.dealId : null,
          documentId: String(body.documentId || ""),
          reason: String(body.reason || ""),
        }),
      );
    }

    if (action === "permanent_purge") {
      return successResponse(
        await refuseDocumentWorkspacePermanentPurge({
          actorUserId: actor.userId,
          opportunityId: String(body.opportunityId || ""),
          documentId: typeof body.documentId === "string" ? body.documentId : null,
        }),
      );
    }

    if (action === "inbound_review") {
      return successResponse(
        await reviewInboundAttachment({
          actorUserId: actor.userId,
          opportunityId: String(body.opportunityId || ""),
          dealId: typeof body.dealId === "string" ? body.dealId : null,
          documentId: String(body.documentId || ""),
          decision: body.decision as "confirm" | "change" | "duplicate" | "ignore" | "attach",
          typeRef: typeof body.typeRef === "string" ? body.typeRef : null,
          categoryLabel: typeof body.categoryLabel === "string" ? body.categoryLabel : null,
          participantId: typeof body.participantId === "string" ? body.participantId : null,
          targetOpportunityId: typeof body.targetOpportunityId === "string" ? body.targetOpportunityId : null,
          employeeConfirmedOther: body.employeeConfirmedOther === true,
          reason: typeof body.reason === "string" ? body.reason : null,
        }),
      );
    }

    if (action === "prepare_handoff") {
      return successResponse(
        await prepareDocumentRequestHandoff({
          actorUserId: actor.userId,
          opportunityId: String(body.opportunityId || ""),
          dealId: typeof body.dealId === "string" ? body.dealId : null,
          channel: body.channel === "whatsapp" ? "whatsapp" : "email",
          selectedRefs: Array.isArray(body.selectedRefs) ? (body.selectedRefs as string[]) : [],
          browserSubmittedMobile: typeof body.mobile === "string" ? body.mobile : null,
          to: Array.isArray(body.to) ? (body.to as string[]) : [],
          cc: Array.isArray(body.cc) ? (body.cc as string[]) : [],
          htmlBody: typeof body.htmlBody === "string" ? body.htmlBody : undefined,
          queueEmail: body.queueEmail === true,
        }),
      );
    }

    if (action === "whatsapp_handoff_opened") {
      return successResponse(
        await recordWhatsAppHandoffOpened({
          actorUserId: actor.userId,
          opportunityId: String(body.opportunityId || ""),
          dealId: typeof body.dealId === "string" ? body.dealId : null,
          correlationId: String(body.correlationId || ""),
        }),
      );
    }

    if (action === "whatsapp_handoff_cancelled") {
      return successResponse(
        await recordWhatsAppHandoffCancelled({
          actorUserId: actor.userId,
          opportunityId: String(body.opportunityId || ""),
          dealId: typeof body.dealId === "string" ? body.dealId : null,
          correlationId: String(body.correlationId || ""),
        }),
      );
    }

    return errorResponse(400, "VALIDATION", "Unknown Document Workspace action.");
  } catch (err) {
    return wrap(err);
  }
}
