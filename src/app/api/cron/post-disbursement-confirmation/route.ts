import { errorResponse, successResponse } from "@/lib/api/auth-route-utils";
import { postDisbursementConfirmationService } from "@server/services/post-disbursement-confirmation/post-disbursement-confirmation.service";

function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw Object.assign(new Error("Set CRON_SECRET to enable this cron"), {
        statusCode: 503,
        code: "CRON_NOT_CONFIGURED",
      });
    }
    return;
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    throw Object.assign(new Error("Invalid cron secret"), {
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  }
}

export async function POST(request: Request) {
  try {
    authorizeCron(request);
    const result = await postDisbursementConfirmationService.processDueSchedules();
    return successResponse(result);
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      status,
      (error as { code?: string }).code ?? "POST_DISBURSEMENT_CRON_FAILED",
      error instanceof Error ? error.message : "Post-disbursement cron failed",
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
