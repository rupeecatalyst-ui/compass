/**
 * CO-CHANAKYA-PHASE1-INAPP-CONVERSATION-CLOSURE-037
 * Employee JWT — read-only multi-turn Ask CHANAKYA conversation.
 * Mutations of business records are never performed by this route.
 */

import { NextResponse } from "next/server";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { createCorrelationId, OPS_CORRELATION_HEADER } from "@/lib/ops/correlation";
import { recordBusinessAudit } from "@/lib/ops/record";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { runChanakyaInappConversationTurn } from "@/lib/chanakya-inapp-conversation";
import { CHANAKYA_INAPP_CONVERSATION_SPRINT } from "@/constants/chanakya-inapp-conversation";
import { CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE } from "@/constants/chanakya-conversation-intelligence";
import { CHANAKYA_CHANGE_PERIODS, type ChanakyaChangePeriod } from "@/types/chanakya-enterprise-read-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function methodNotAllowed(correlationId: string): NextResponse {
  return errorResponse(
    405,
    "METHOD_NOT_ALLOWED",
    "Ask CHANAKYA conversation accepts POST turns only. Business mutations are not supported.",
    undefined,
    {
      correlationId,
      module: "ChanakyaInappConversation",
      action: "METHOD_NOT_ALLOWED",
    },
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  const correlationId = createCorrelationId();
  void request;
  return methodNotAllowed(correlationId);
}

export async function PUT(request: Request): Promise<NextResponse> {
  const correlationId = createCorrelationId();
  void request;
  return methodNotAllowed(correlationId);
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const correlationId = createCorrelationId();
  void request;
  return methodNotAllowed(correlationId);
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const correlationId = createCorrelationId();
  void request;
  return methodNotAllowed(correlationId);
}

export async function POST(request: Request): Promise<NextResponse> {
  const correlationId = createCorrelationId();
  try {
    const auth = requireAccessToken(request);
    const organizationId = await resolvePilotOrganizationId();
    if (!organizationId?.trim()) {
      return errorResponse(
        503,
        "ORG_CONTEXT_UNAVAILABLE",
        "Organization context unavailable.",
        undefined,
        { correlationId },
      );
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return errorResponse(400, "INVALID_BODY", "JSON body is required.", undefined, {
        correlationId,
      });
    }

    const message = typeof body.message === "string" ? body.message : "";
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId : null;
    const opportunityId =
      typeof body.opportunityId === "string"
        ? body.opportunityId
        : typeof body.opportunityRef === "string"
          ? body.opportunityRef
          : null;
    const dealId =
      typeof body.dealId === "string"
        ? body.dealId
        : typeof body.dealRef === "string"
          ? body.dealRef
          : null;

    const changePeriodRaw =
      typeof body.changePeriod === "string" ? body.changePeriod.trim() : "";
    const changePeriod = (CHANAKYA_CHANGE_PERIODS as readonly string[]).includes(
      changePeriodRaw,
    )
      ? (changePeriodRaw as ChanakyaChangePeriod)
      : null;

    const result = await runChanakyaInappConversationTurn({
      actorUserId: auth.userId,
      actorRole: auth.role,
      organizationId,
      request: {
        sessionId,
        message,
        opportunityId,
        dealId,
        changePeriod,
        idempotencyKey:
          typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : null,
      },
    });

    recordBusinessAudit({
      actorUserId: auth.userId,
      module: "ChanakyaInappConversation",
      action: "conversation.turn",
      entityId:
        result.activeEntity.dealId ||
        result.activeEntity.opportunityId ||
        result.sessionId,
      previousValue: null,
      newValue: {
        sprint: CHANAKYA_INAPP_CONVERSATION_SPRINT,
        intent: result.intent,
        compileMode: result.compileMode,
        readOnly: true,
        // Never log message bodies, PII, or generated text
        modelStatus: result.modelStatus,
        evidenceCount: result.evidence.length,
      },
      result: "Success",
      correlationId: result.correlationId || correlationId,
    });

    const response = successResponse(result);
    response.headers.set(OPS_CORRELATION_HEADER, result.correlationId || correlationId);
    return response;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      "body" in error
    ) {
      return fromAuthError(
        error as { status: number; body: import("@/types/api").ApiResponse },
        { correlationId },
      );
    }

    const statusCode =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode) || 500
        : 500;
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code || "CONVERSATION_TURN_FAILED")
        : "CONVERSATION_TURN_FAILED";
    const message =
      statusCode >= 500
        ? CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE
        : code === "MESSAGE_REQUIRED"
          ? "Please ask a question."
          : code === "MESSAGE_TOO_LONG"
            ? "Please shorten your question."
            : CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE;

    return errorResponse(statusCode >= 500 ? 503 : statusCode, code, message, undefined, {
      correlationId,
      module: "ChanakyaInappConversation",
      action: "conversation.turn",
    });
  }
}
