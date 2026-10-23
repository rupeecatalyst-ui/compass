import { NextResponse } from "next/server";
import { errorResponse, fromAuthError, requireAccessToken } from "@/lib/api/auth-route-utils";
import {
  previewRecommendationClientMessage,
  sendRecommendationClientMessage,
} from "@server/services/opportunity-assessment/recommendation-client-delivery";

type Ctx = { params: Promise<{ opportunityId: string }> };

function isDeliveryFailure(error: unknown): error is { status: number; code: string; message: string } {
  return Boolean(error && typeof error === "object" && "status" in error && "code" in error && "message" in error);
}

export async function POST(request: Request, context: Ctx) {
  try {
    const actor = requireAccessToken(request);
    const { opportunityId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      versionNumber?: unknown;
      confirm?: unknown;
      resend?: unknown;
    };
    const versionNumber = body.versionNumber;
    if (typeof versionNumber !== "number" || !Number.isInteger(versionNumber) || versionNumber < 1) {
      return errorResponse(400, "RECOMMENDATION_VERSION_REQUIRED", "Choose a recommendation version.");
    }
    if (body.confirm !== true) {
      const preview = await previewRecommendationClientMessage({
        userId: actor.userId,
        opportunityId,
        versionNumber,
      });
      return NextResponse.json({ success: true, data: { ...preview, sent: false } }, { headers: { "Cache-Control": "no-store" } });
    }
    const sent = await sendRecommendationClientMessage({
      userId: actor.userId,
      opportunityId,
      versionNumber,
      resend: body.resend === true,
    });
    return NextResponse.json({
      success: true,
      data: {
        ...sent,
        sent: true,
        deliveryConfirmed: false,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isDeliveryFailure(error)) return errorResponse(error.status, error.code, error.message);
    if (typeof error === "object" && error && "status" in error && "body" in error) {
      return fromAuthError(error as { status: number; body: never });
    }
    return errorResponse(503, "RECOMMENDATION_EMAIL_FAILED", "The recommendation email could not be prepared.");
  }
}
