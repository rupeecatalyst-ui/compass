/**
 * CO-MARKETING-REDESIGN-017 — Campaign attribution dashboard application service.
 * Read-only projection. Does not create Opportunity, Deal, or Accounting records.
 */

import {
  ENTERPRISE_MARKETING_HANDOFF_MODE,
  MARKETING_PERMISSIONS,
} from "@/constants/enterprise-marketing-engine";
import { composeMarketingAttributionDashboard } from "@/lib/enterprise-marketing-engine/attribution/compose-attribution";
import type { MarketingAttributionReadPort } from "@/lib/enterprise-marketing-engine/ports/attribution-read.port";
import {
  assertMarketingPermission,
  type MarketingPermissionActor,
} from "@/lib/enterprise-marketing-engine/permissions";
import type { MarketingAttributionDashboard, MarketingAttributionFilters } from "@/types/enterprise-marketing-attribution";
import { createFixtureAttributionReadPort } from "./adapters/fixture-attribution-ssot.adapter";
import { marketingCampaignStore } from "./campaign-store";
import { marketingQualificationStore } from "./qualification-store";

function resolveAttributionReadPort(): MarketingAttributionReadPort {
  if (ENTERPRISE_MARKETING_HANDOFF_MODE === "live") {
    // Lazy require so fixture verify does not load live Opportunity/Deal/Accounting services.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./adapters/live-attribution-ssot.adapter") as {
      createLiveAttributionReadPort: () => MarketingAttributionReadPort;
    };
    return mod.createLiveAttributionReadPort();
  }
  return createFixtureAttributionReadPort();
}

export const marketingAttributionService = {
  async getDashboard(
    actor: MarketingPermissionActor,
    filters: MarketingAttributionFilters = {},
  ): Promise<MarketingAttributionDashboard> {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.ANALYTICS_VIEW);
    const organizationId = actor.organizationId ?? "default";
    const campaigns = await marketingCampaignStore.list(organizationId);
    const qualifications = marketingQualificationStore.list(organizationId);
    const opportunityIds = [
      ...new Set(qualifications.map((row) => row.opportunityId).filter((id): id is string => Boolean(id))),
    ];
    const ssot = await resolveAttributionReadPort().load({ organizationId, opportunityIds });
    return composeMarketingAttributionDashboard({
      organizationId,
      filters,
      campaigns,
      qualifications,
      opportunities: ssot.opportunities,
      deals: ssot.deals,
      accounting: ssot.accounting,
      campaignCosts: ssot.campaignCosts,
      accountingAvailable: ssot.accountingAvailable,
    });
  },
};
