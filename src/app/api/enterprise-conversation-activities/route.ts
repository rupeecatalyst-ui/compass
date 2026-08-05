/**
 * CO-VOICE-002 — Enterprise Conversation Activity Registry API.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { enterpriseConversationActivityService } from "@server/services/enterprise-conversation-activity/enterprise-conversation-activity.service";
import type { EnterpriseConversationActivity } from "@/types/enterprise-conversation-activity";

export async function GET(request: Request) {
  try {
    requireAccessToken(request);
    const url = new URL(request.url);
    const contextType = url.searchParams.get("contextType")?.trim();
    const contextId = url.searchParams.get("contextId")?.trim();
    if (!contextType || !contextId) {
      return errorResponse(400, "VALIDATION", "contextType and contextId are required");
    }
    const items = await enterpriseConversationActivityService.listByContext({
      contextType,
      contextId,
    });
    return successResponse({ items, durable: enterpriseConversationActivityService.isDurable() });
  } catch (err) {
    const e = err as { status?: number; statusCode?: number };
    if (e.status === 401 || e.statusCode === 401) return fromAuthError(err as never);
    return errorResponse(
      (err as { statusCode?: number }).statusCode || 500,
      (err as { code?: string }).code || "ECIE_ACTIVITY_ERROR",
      err instanceof Error ? err.message : "Failed to list conversation activities",
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    const body = (await request.json()) as EnterpriseConversationActivity;
    if (!body?.contextType || !body?.contextId || !body?.activityCode) {
      return errorResponse(
        400,
        "VALIDATION",
        "contextType, contextId and activityCode are required",
      );
    }
    const item = await enterpriseConversationActivityService.upsertFromClient(
      body,
      actor.userId,
    );
    return successResponse(
      { item, durable: enterpriseConversationActivityService.isDurable() },
      201,
    );
  } catch (err) {
    const e = err as { status?: number; statusCode?: number };
    if (e.status === 401 || e.statusCode === 401) return fromAuthError(err as never);
    return errorResponse(
      (err as { statusCode?: number }).statusCode || 500,
      (err as { code?: string }).code || "ECIE_ACTIVITY_ERROR",
      err instanceof Error ? err.message : "Failed to save conversation activity",
    );
  }
}
