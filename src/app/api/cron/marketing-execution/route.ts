/**
 * CO-MARKETING-MKT-13 — Dry-run marketing execution cron.
 * Does not enable live bulk email or WhatsApp. Not registered in vercel.json until PO approval.
 */
import { errorResponse, successResponse } from "@/lib/api/auth-route-utils";
import { ENTERPRISE_MARKETING_EXECUTION_ENABLED } from "@/constants/enterprise-marketing-engine";
import { marketingExecutionService } from "@server/services/enterprise-marketing-engine/execution.service";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return errorResponse(401, "UNAUTHORIZED", "Invalid cron secret");
    }
  } else if (process.env.NODE_ENV === "production") {
    return errorResponse(
      503,
      "CRON_NOT_CONFIGURED",
      "Set CRON_SECRET to enable Marketing execution cron.",
    );
  }

  if (ENTERPRISE_MARKETING_EXECUTION_ENABLED) {
    return errorResponse(
      403,
      "LIVE_SEND_BLOCKED",
      "Marketing cron refuses to run while live execution is enabled.",
    );
  }

  try {
    const result = await marketingExecutionService.runDueCampaigns();
    return successResponse({
      dryRun: true,
      liveSend: false,
      processed: result.processed,
      results: result.results,
    });
  } catch (err) {
    return errorResponse(
      500,
      "MARKETING_CRON_FAILED",
      err instanceof Error ? err.message : "Marketing cron failed",
    );
  }
}
