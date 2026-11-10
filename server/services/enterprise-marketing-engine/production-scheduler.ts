/**
 * In-process pacing scheduler for launched campaigns.
 * Ticks only SCHEDULED and RUNNING campaigns. An approved campaign is not sent
 * until a Super Admin launches it. No-ops outside production.
 */

import { isMarketingPacingCronActivated } from "@/lib/enterprise-marketing-engine/execution/cron-activation";
import { resolveMarketingOrganizationId } from "./organization";
import { marketingExecutionService } from "./execution.service";
import { isMarketingProductionLiveEnabled } from "./production-mode.service";

let started = false;

export type MarketingProductionSchedulerDeps = {
  isActivated: () => boolean;
  productionLive: () => Promise<boolean>;
  runDue: () => Promise<unknown>;
};

export async function tickMarketingProductionScheduler(
  deps: MarketingProductionSchedulerDeps = {
    isActivated: isMarketingPacingCronActivated,
    productionLive: async () => {
      const organizationId = await resolveMarketingOrganizationId();
      return isMarketingProductionLiveEnabled(organizationId);
    },
    runDue: () => marketingExecutionService.runDueCampaigns(),
  },
): Promise<"not_activated" | "production_off" | "executed"> {
  if (!deps.isActivated()) return "not_activated";
  if (!(await deps.productionLive())) return "production_off";
  await deps.runDue();
  return "executed";
}

export function startMarketingProductionScheduler(): void {
  if (started || process.env.NODE_ENV !== "production") return;
  started = true;
  const timer = setInterval(() => {
    void tickMarketingProductionScheduler().catch((error: unknown) => {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: unknown }).code)
          : "tick_failed";
      console.error(`Marketing production scheduler tick failed: ${code}`);
    });
  }, 60_000);
  timer.unref?.();
}
