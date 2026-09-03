/**
 * CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009
 * Load or delete one private chat. Delete never mutates Catalyst One records.
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { createCorrelationId, OPS_CORRELATION_HEADER } from "@/lib/ops/correlation";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  deleteChanakyaInappSessionForActor,
  loadChanakyaInappSessionForActor,
  setChanakyaInappMessageFeedback,
} from "@/lib/chanakya-inapp-conversation";
import { CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE } from "@/constants/chanakya-conversation-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ sessionId: string }> };

export async function GET(request: Request, ctx: Ctx): Promise<Response> {
  const correlationId = createCorrelationId();
  try {
    const auth = requireAccessToken(request);
    const organizationId = await resolvePilotOrganizationId();
    if (!organizationId?.trim()) {
      return errorResponse(
        503,
        "ORG_CONTEXT_UNAVAILABLE",
        CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE,
        undefined,
        { correlationId },
      );
    }
    const { sessionId } = await ctx.params;
    const session = await loadChanakyaInappSessionForActor({
      sessionId,
      actorUserId: auth.userId,
      organizationId,
    });
    if (!session) {
      return errorResponse(404, "NOT_FOUND", "That chat is not available.", undefined, {
        correlationId,
      });
    }
    const response = successResponse({
      sessionId: session.sessionId,
      title: session.title,
      messages: session.messages.map((msg) => ({
        ...msg,
        provenance: [],
        availabilityNotes: [],
      })),
      activeEntity: session.activeEntity,
      updatedAt: session.updatedAt,
    });
    response.headers.set(OPS_CORRELATION_HEADER, correlationId);
    return response;
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && "body" in error) {
      return fromAuthError(error as { status: number; body: import("@/types/api").ApiResponse }, {
        endpoint: "/api/chanakya/conversation/sessions/[sessionId]",
      });
    }
    return errorResponse(
      503,
      "UNAVAILABLE",
      CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE,
      undefined,
      { correlationId },
    );
  }
}

export async function DELETE(request: Request, ctx: Ctx): Promise<Response> {
  const correlationId = createCorrelationId();
  try {
    const auth = requireAccessToken(request);
    const organizationId = await resolvePilotOrganizationId();
    if (!organizationId?.trim()) {
      return errorResponse(
        503,
        "ORG_CONTEXT_UNAVAILABLE",
        CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE,
        undefined,
        { correlationId },
      );
    }
    const { sessionId } = await ctx.params;
    const deleted = await deleteChanakyaInappSessionForActor({
      sessionId,
      actorUserId: auth.userId,
      organizationId,
    });
    if (!deleted) {
      return errorResponse(404, "NOT_FOUND", "That chat is not available.", undefined, {
        correlationId,
      });
    }
    const response = successResponse({ deleted: true, businessRecordsMutated: false });
    response.headers.set(OPS_CORRELATION_HEADER, correlationId);
    return response;
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && "body" in error) {
      return fromAuthError(error as { status: number; body: import("@/types/api").ApiResponse }, {
        endpoint: "/api/chanakya/conversation/sessions/[sessionId]",
      });
    }
    return errorResponse(
      503,
      "UNAVAILABLE",
      CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE,
      undefined,
      { correlationId },
    );
  }
}

export async function POST(request: Request, ctx: Ctx): Promise<Response> {
  const correlationId = createCorrelationId();
  try {
    const auth = requireAccessToken(request);
    const organizationId = await resolvePilotOrganizationId();
    if (!organizationId?.trim()) {
      return errorResponse(
        503,
        "ORG_CONTEXT_UNAVAILABLE",
        CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE,
        undefined,
        { correlationId },
      );
    }
    const { sessionId } = await ctx.params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const messageId = typeof body?.messageId === "string" ? body.messageId : "";
    const feedback =
      body?.feedback === "up" || body?.feedback === "down" || body?.feedback === null
        ? body.feedback
        : undefined;
    if (!messageId || feedback === undefined) {
      return errorResponse(400, "INVALID_BODY", "Feedback could not be recorded.", undefined, {
        correlationId,
      });
    }
    const ok = await setChanakyaInappMessageFeedback({
      sessionId,
      messageId,
      actorUserId: auth.userId,
      organizationId,
      feedback,
    });
    if (!ok) {
      return errorResponse(404, "NOT_FOUND", "That chat is not available.", undefined, {
        correlationId,
      });
    }
    const response = successResponse({ recorded: true });
    response.headers.set(OPS_CORRELATION_HEADER, correlationId);
    return response;
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && "body" in error) {
      return fromAuthError(error as { status: number; body: import("@/types/api").ApiResponse }, {
        endpoint: "/api/chanakya/conversation/sessions/[sessionId]",
      });
    }
    return errorResponse(
      503,
      "UNAVAILABLE",
      CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE,
      undefined,
      { correlationId },
    );
  }
}
