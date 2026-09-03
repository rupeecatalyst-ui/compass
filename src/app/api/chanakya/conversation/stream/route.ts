/**
 * CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009
 * SSE stream for Ask CHANAKYA. Read-only. Never auto-sends. Never mutates records.
 */

import { NextResponse } from "next/server";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
} from "@/lib/api/auth-route-utils";
import { createCorrelationId, OPS_CORRELATION_HEADER } from "@/lib/ops/correlation";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { runChanakyaInappConversationTurnStream } from "@/lib/chanakya-inapp-conversation";
import { CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE } from "@/constants/chanakya-conversation-intelligence";
import type { ApiResponse } from "@/types/api";
import { CHANAKYA_CHANGE_PERIODS, type ChanakyaChangePeriod } from "@/types/chanakya-enterprise-read-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function encodeSse(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`;
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

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return errorResponse(400, "INVALID_BODY", "Please ask a question.", undefined, {
        correlationId,
      });
    }

    const message = typeof body.message === "string" ? body.message : "";
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
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
    const changePeriod = (CHANAKYA_CHANGE_PERIODS as readonly string[]).includes(changePeriodRaw)
      ? (changePeriodRaw as ChanakyaChangePeriod)
      : null;
    const idempotencyKey =
      typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : null;

    const abort = new AbortController();
    request.signal.addEventListener("abort", () => abort.abort(), { once: true });

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(encodeSse(payload)));
        };
        try {
          for await (const event of runChanakyaInappConversationTurnStream({
            actorUserId: auth.userId,
            actorRole: auth.role,
            organizationId,
            request: {
              sessionId,
              message,
              opportunityId,
              dealId,
              changePeriod,
              idempotencyKey,
            },
            signal: abort.signal,
          })) {
            send(event);
          }
        } catch {
          send({ type: "error", message: CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE });
        } finally {
          controller.close();
        }
      },
    });

    const response = new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        [OPS_CORRELATION_HEADER]: correlationId,
      },
    });
    return response;
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && "body" in error) {
      return fromAuthError(error as { status: number; body: ApiResponse }, {
        endpoint: "/api/chanakya/conversation/stream",
      });
    }
    return NextResponse.json(
      {
        success: false,
        error: { code: "UNAVAILABLE", message: CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE },
      },
      { status: 503, headers: { [OPS_CORRELATION_HEADER]: correlationId } },
    );
  }
}
