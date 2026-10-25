/**
 * In-process pacing scheduler for launched campaigns.
 * Ticks only SCHEDULED and RUNNING campaigns. An approved campaign is not sent
 * until a Super Admin launches it. No-ops outside production.
 */

import { resolveMarketingOrganizationId } from "./organization";
import { marketingExecutionService } from "./execution.service";
import { isMarketingProductionLiveEnabled } from "./production-mode.service";

let started = false;

export function startMarketingProductionScheduler(): void {
  if (started || process.env.NODE_ENV !== "production") return;
  started = true;
  const timer = setInterval(() => {
    void tickWhenProductionEnabled();
  }, 60_000);
  timer.unref?.();
}

async function tickWhenProductionEnabled(): Promise<void> {
  try {
    const organizationId = await resolveMarketingOrganizationId();
    if (!(await isMarketingProductionLiveEnabled(organizationId))) return;
    await marketingExecutionService.runDueCampaigns();
  } catch (error: unknown) {
    const code =
      error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code) : "tick_failed";
    console.error(`Marketing production scheduler tick failed: ${code}`);
  }
}
