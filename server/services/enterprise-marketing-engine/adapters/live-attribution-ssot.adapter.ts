/**
 * CO-MARKETING-REDESIGN-017 — Live attribution SSOT read.
 * Read-only. Must never create or mutate Opportunity, Deal, or Accounting records.
 * Default overnight path is fixture; this adapter returns empty amounts rather than inventing them.
 */

import type { MarketingAttributionReadPort } from "@/lib/enterprise-marketing-engine/ports/attribution-read.port";

export function createLiveAttributionReadPort(): MarketingAttributionReadPort {
  return {
    kind: "live",
    async load() {
      return {
        opportunities: [],
        deals: [],
        accounting: [],
        campaignCosts: [],
        accountingAvailable: false,
      };
    },
  };
}
