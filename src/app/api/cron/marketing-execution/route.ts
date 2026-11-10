/**
 * CO-MARKETING-MKT-13 — Dry-run marketing execution cron.
 * Does not enable live bulk email or WhatsApp. Not registered in vercel.json until PO approval.
 */
import { ENTERPRISE_MARKETING_EXECUTION_ENABLED } from "@/constants/enterprise-marketing-engine";
import { isMarketingPacingCronActivated } from "@/lib/enterprise-marketing-engine/execution/cron-activation";
import { handleMarketingExecutionCron } from "@server/services/enterprise-marketing-engine/marketing-execution-cron";
import { marketingExecutionService } from "@server/services/enterprise-marketing-engine/execution.service";
import { resolveMarketingOrganizationId } from "@server/services/enterprise-marketing-engine/organization";
import { isMarketingProductionLiveEnabled } from "@server/services/enterprise-marketing-engine/production-mode.service";

export async function POST(request: Request) {
  return handleMarketingExecutionCron(request, {
    isActivated: isMarketingPacingCronActivated,
    productionLive: async () => {
      try {
        return await isMarketingProductionLiveEnabled(await resolveMarketingOrganizationId());
      } catch {
        return false;
      }
    },
    runDue: () => marketingExecutionService.runDueCampaigns(),
    readSecret: () => process.env.CRON_SECRET?.trim() ?? "",
    nodeEnv: () => process.env.NODE_ENV,
    executionEnabled: () => ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  });
}
