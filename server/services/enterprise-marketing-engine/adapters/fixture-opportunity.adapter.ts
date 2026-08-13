/**
 * CO-MARKETING-MKT-11 — Fixture Dialogue Opportunity create (isolated from live Opportunity Registry).
 * Live mode uses enterpriseOpportunityService without changing Opportunity lifecycle.
 */

import type { MarketingOpportunityCreatePort } from "@/lib/enterprise-marketing-engine/ports/qualification-handoff.port";

const opportunities = new Map<string, { id: string; contactId: string; campaignId: string }>();
let seq = 0;

export const marketingFixtureOpportunityDirectory = {
  list() {
    return [...opportunities.values()];
  },
  reset() {
    opportunities.clear();
    seq = 0;
  },
};

export function createFixtureOpportunityCreatePort(): MarketingOpportunityCreatePort {
  return {
    async createDialogue(input) {
      const existing = [...opportunities.values()].find(
        (o) => o.contactId === input.contactId && o.campaignId === input.campaignId,
      );
      if (existing) {
        return { opportunityId: existing.id, created: false, lifecycle: "dialogue" };
      }
      const id = `mkt-fix-opp-${++seq}`;
      opportunities.set(id, {
        id,
        contactId: input.contactId,
        campaignId: input.campaignId,
      });
      return { opportunityId: id, created: true, lifecycle: "dialogue" };
    },
  };
}
