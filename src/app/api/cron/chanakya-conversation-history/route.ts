/**
 * CO-C1-CHANAKYA-DURABLE-HISTORY-009A
 * Bounded expired CHANAKYA chat cleanup. Hostinger scheduler: Bearer $CRON_SECRET.
 * Deletes only expired conversation sessions (messages cascade). Never mutates
 * contacts, companies, Opportunities, Deals, documents, proposals, tasks,
 * activities, or accounting records.
 */
import { errorResponse, successResponse } from "@/lib/api/auth-route-utils";
import { cleanupExpiredChanakyaConversationHistory } from "@/lib/chanakya-inapp-conversation";
import { CHANAKYA_CHAT_CLEANUP_BATCH_SIZE } from "@/constants/chanakya-conversational-intelligence";

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
    const result = await cleanupExpiredChanakyaConversationHistory({
      limit: CHANAKYA_CHAT_CLEANUP_BATCH_SIZE,
    });
    return successResponse({
      deletedSessions: result.deletedSessionIds.length,
      businessRecordsMutated: false,
    });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      status,
      (error as { code?: string }).code ?? "CHANAKYA_HISTORY_CRON_FAILED",
      error instanceof Error ? error.message : "CHANAKYA history cron failed",
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
