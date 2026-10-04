/**
 * CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009
 * Private four-day chat history for the authenticated employee + organisation.
 * GET lists. Never mutates Catalyst One business records.
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
  createChanakyaInappSession,
  listChanakyaInappSessionsForActor,
} from "@/lib/chanakya-inapp-conversation";
import { CHANAKYA_CHAT_RETENTION_NOTICE } from "@/constants/chanakya-conversational-intelligence";
import { CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE } from "@/constants/chanakya-conversation-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
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
    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    const sessions = await listChanakyaInappSessionsForActor({
      actorUserId: auth.userId,
      organizationId,
      query,
    });
    const response = successResponse({
      sessions,
      retentionNotice: CHANAKYA_CHAT_RETENTION_NOTICE,
    });
    response.headers.set(OPS_CORRELATION_HEADER, correlationId);
    return response;
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && "body" in error) {
      return fromAuthError(error as { status: number; body: import("@/types/api").ApiResponse }, {
        endpoint: "/api/chanakya/conversation/sessions",
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

export async function POST(request: Request): Promise<Response> {
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
    const session = await createChanakyaInappSession({
      actorUserId: auth.userId,
      organizationId,
    });
    const response = successResponse({
      sessionId: session.sessionId,
      title: session.title,
      messages: [],
      activeEntity: session.activeEntity,
      updatedAt: session.updatedAt,
    });
    response.headers.set(OPS_CORRELATION_HEADER, correlationId);
    return response;
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && "body" in error) {
      return fromAuthError(error as { status: number; body: import("@/types/api").ApiResponse }, {
        endpoint: "/api/chanakya/conversation/sessions",
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
