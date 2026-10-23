import { errorResponse, fromAuthError, requireAccessToken } from "@/lib/api/auth-route-utils";
import { renderRecommendationPdf } from "@server/services/opportunity-assessment/recommendation-client-delivery";

type Ctx = { params: Promise<{ opportunityId: string }> };

function isDeliveryFailure(error: unknown): error is { status: number; code: string; message: string } {
  return Boolean(error && typeof error === "object" && "status" in error && "code" in error && "message" in error);
}

export async function GET(request: Request, context: Ctx) {
  try {
    const actor = requireAccessToken(request);
    const { opportunityId } = await context.params;
    const versionNumber = Number(new URL(request.url).searchParams.get("version"));
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      return errorResponse(400, "RECOMMENDATION_VERSION_REQUIRED", "Choose a recommendation version.");
    }
    const pdf = await renderRecommendationPdf({ userId: actor.userId, opportunityId, versionNumber });
    return new Response(new Uint8Array(pdf.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdf.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (isDeliveryFailure(error)) return errorResponse(error.status, error.code, error.message);
    if (typeof error === "object" && error && "status" in error && "body" in error) {
      return fromAuthError(error as { status: number; body: never });
    }
    return errorResponse(503, "RECOMMENDATION_PDF_FAILED", "The recommendation PDF could not be prepared.");
  }
}
