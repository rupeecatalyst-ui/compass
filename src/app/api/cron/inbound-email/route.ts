/**
 * CO-C1-COMMUNICATION-002 — Hostinger IMAP inbound email polling cron.
 * Schedule: POST/GET /api/cron/inbound-email  Authorization: Bearer $CRON_SECRET
 */
import { errorResponse, successResponse } from "@/lib/api/auth-route-utils";
import { inboundEmailIngestionService } from "@server/services/enterprise-inbound-email/inbound-email-ingestion.service";

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
    const result = await inboundEmailIngestionService.pollAndIngest();
    return successResponse(result);
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      status,
      (error as { code?: string }).code ?? "INBOUND_EMAIL_CRON_FAILED",
      error instanceof Error ? error.message : "Inbound email cron failed",
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
