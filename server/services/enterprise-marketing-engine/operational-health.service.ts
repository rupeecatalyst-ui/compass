/**
 * CO-MARKETING-REDESIGN-020 — Operational health API snapshot. Dry-run only.
 */

import { getConfiguredMarketingDurabilityPorts } from "@/lib/enterprise-marketing-engine/durability/composition";
import { composeMarketingOperationalHealth } from "@/lib/enterprise-marketing-engine/operational-health";
import type { MarketingOperationalHealthSnapshot } from "@/types/enterprise-marketing-recovery";

export const marketingOperationalHealthService = {
  async snapshot(input: {
    organizationId: string;
    campaignId?: string | null;
  }): Promise<MarketingOperationalHealthSnapshot> {
    return composeMarketingOperationalHealth({
      organizationId: input.organizationId,
      campaignId: input.campaignId ?? null,
      ports: getConfiguredMarketingDurabilityPorts(),
      recovery: null,
    });
  },
};
