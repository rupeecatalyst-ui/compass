import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import {
  composeManualDocumentEmail,
  createDocumentCustomerRequest,
  listDocumentWorkspaceLinkedParties,
  listUnseenInboundEmailDocuments,
  markDocumentVersionSeen,
  recordShareEvent,
  regenerateUploadSession,
  revokeUploadSession,
} from "@server/services/document-workspace/document-workspace-refinement-014.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function wrap(err: unknown) {
  if (typeof err === "object" && err && "status" in err) {
    return fromAuthError(err as { status: number; body: never });
  }
  const e = err as { statusCode?: number; code?: string; message?: string };
  return errorResponse(
    e.statusCode || 500,
    e.code || "DOCUMENT_WORKSPACE_014_FAILED",
    e.message || "Document Workspace request failed",
  );
}

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    const url = new URL(request.url);
    const view = url.searchParams.get("view")?.trim() || "parties";
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
    const opportunityId = url.searchParams.get("opportunityId")?.trim() || "";
    if (!opportunityId) return errorResponse(400, "VALIDATION", "opportunityId is required");
    const data = await listDocumentWorkspaceLinkedParties({
      opportunityId,
      dealId: url.searchParams.get("dealId"),
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
          to: Array.isArray(body.to) ? (body.to as string[]) : [],
          cc: Array.isArray(body.cc) ? (body.cc as string[]) : [],
          htmlBody: String(body.htmlBody || ""),
        }),
      );
    }

    return errorResponse(400, "VALIDATION", "Unknown Document Workspace action.");
  } catch (err) {
    return wrap(err);
  }
}
