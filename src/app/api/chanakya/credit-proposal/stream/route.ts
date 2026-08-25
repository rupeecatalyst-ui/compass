/**
 * CO-CHANAKYA-CREDIT-PROPOSAL-002 — SSE stream for MAKE PROPOSAL.
 * Read-only generation. Never mutates Opportunity / documents / send.
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
} from "@/lib/api/auth-route-utils";
import {
  enterpriseOpportunityApiGuard,
  mapOpportunityRouteError,
} from "@/app/api/enterprise-opportunities/_lib/route-utils";
import {
  encodeSseEvent,
  runChanakyaCreditProposalStream,
} from "@/lib/chanakya-credit-proposal";
import type { ChanakyaCreditProposalStreamRequest } from "@/types/chanakya-credit-proposal";
import type { ApiResponse } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    enterpriseOpportunityApiGuard();
    requireAccessToken(request);

    const body = (await request.json().catch(() => ({}))) as ChanakyaCreditProposalStreamRequest;
    const opportunityId = String(body.opportunityId || "").trim();
    if (!opportunityId) {
      return errorResponse(400, "OPPORTUNITY_REQUIRED", "opportunityId is required");
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (payload: string) => {
          controller.enqueue(encoder.encode(payload));
        };
        try {
          for await (const event of runChanakyaCreditProposalStream({
            opportunityId,
            stated: body.stated,
            lenderName: body.lenderName,
            documentPresence: body.documentPresence,
          })) {
            send(encodeSseEvent(event));
          }
        } catch (err) {
          const mapped = mapOpportunityRouteError(err);
          send(
            encodeSseEvent({
              type: "error",
              code: mapped.body.error?.code || "PROPOSAL_STREAM_FAILED",
              message:
                mapped.body.error?.message ||
                (err instanceof Error ? err.message : "Proposal stream failed"),
            }),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse }, {
        endpoint: "/api/chanakya/credit-proposal/stream",
      });
    }
    const mapped = mapOpportunityRouteError(err);
    return errorResponse(
      mapped.status,
      mapped.body.error?.code || "PROPOSAL_STREAM_FAILED",
      mapped.body.error?.message || "Unable to start proposal stream",
    );
  }
}
