/**
 * Marketing execution cron gate.
 * The pacing activation flag must be on before any due campaign is considered.
 */

import { errorResponse, successResponse } from "@/lib/api/auth-route-utils";
import { MARKETING_PACING_CRON_ACTIVATION } from "@/lib/enterprise-marketing-engine/execution/cron-activation";

export type MarketingExecutionCronDependencies = {
  isActivated: () => boolean;
  productionLive: () => Promise<boolean>;
  runDue: () => Promise<{ processed: number; results: unknown[] }>;
  readSecret: () => string;
  nodeEnv: () => string | undefined;
  executionEnabled: () => boolean;
};

export async function handleMarketingExecutionCron(
  request: Request,
  deps: MarketingExecutionCronDependencies,
) {
  if (!deps.isActivated()) {
    return errorResponse(
      403,
      MARKETING_PACING_CRON_ACTIVATION.code,
      MARKETING_PACING_CRON_ACTIVATION.message,
    );
  }

  const secret = deps.readSecret();
  if (secret) {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return errorResponse(401, "UNAUTHORIZED", "Invalid cron secret");
    }
  } else if (deps.nodeEnv() === "production") {
    return errorResponse(
      503,
      "CRON_NOT_CONFIGURED",
      "Set CRON_SECRET to enable Marketing execution cron.",
    );
  }

  let productionLive = false;
  try {
    productionLive = await deps.productionLive();
  } catch {
    productionLive = false;
  }
  if (!productionLive && !deps.executionEnabled()) {
    return errorResponse(
      403,
      "LIVE_SEND_BLOCKED",
      "Marketing scheduler refuses to run while production Marketing is off.",
    );
  }

  try {
    const result = await deps.runDue();
    return successResponse({
      dryRun: !productionLive,
      liveSend: productionLive,
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
