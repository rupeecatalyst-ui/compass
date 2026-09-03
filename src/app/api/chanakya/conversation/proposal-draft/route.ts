/**
 * CO-C1-CHANAKYA-PROPOSAL-PHASE1-009B
 * Chat cannot create a durable proposal record. Save as Draft from CHANAKYA is deferred.
 * Never sends. Never mutates Opportunity / Deal / document records.
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
} from "@/lib/api/auth-route-utils";
import { createCorrelationId, OPS_CORRELATION_HEADER } from "@/lib/ops/correlation";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { saveChanakyaChatProposalDraft } from "@/lib/chanakya-conversational-intelligence/proposal-chat";
import { CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE } from "@/constants/chanakya-conversation-intelligence";
import { CHANAKYA_PHASE1_CHAT_SAVE_DEFERRED_NOTICE } from "@/constants/chanakya-conversational-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const draftId = typeof body?.draftId === "string" ? body.draftId.trim() : "";
    if (!draftId) {
      return errorResponse(400, "INVALID_BODY", "A proposal draft is required.", undefined, {
        correlationId,
      });
    }
    const saved = await saveChanakyaChatProposalDraft({
      draftId,
      actorUserId: auth.userId,
      organizationId,
      confirmed: body?.confirmed === true,
      sessionId: typeof body?.sessionId === "string" ? body.sessionId : null,
    });
    void saved;
    const response = errorResponse(
      405,
      "PHASE1_CHAT_SAVE_DEFERRED",
      CHANAKYA_PHASE1_CHAT_SAVE_DEFERRED_NOTICE,
      undefined,
      { correlationId },
    );
    response.headers.set(OPS_CORRELATION_HEADER, correlationId);
    return response;
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && "body" in error) {
      return fromAuthError(error as { status: number; body: import("@/types/api").ApiResponse }, {
        endpoint: "/api/chanakya/conversation/proposal-draft",
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
