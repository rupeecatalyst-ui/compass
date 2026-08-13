/**
 * CO-MARKETING-MKT-11 — Live Opportunity create via existing Opportunity Registry.
 * Creates Dialogue (identity only) — does not alter Opportunity lifecycle or invent product/amount.
 */

import type { MarketingOpportunityCreatePort } from "@/lib/enterprise-marketing-engine/ports/qualification-handoff.port";
import { enterpriseOpportunityService } from "@server/services/enterprise-opportunity";

export function createLiveOpportunityCreatePort(): MarketingOpportunityCreatePort {
  return {
    async createDialogue(input) {
      const created = await enterpriseOpportunityService.createOpportunity(
        {
          createAsDialogue: true,
          primaryBorrowerKind: "individual",
          primaryContactId: input.contactId,
          primaryContactName: input.contactName ?? null,
          primaryContactEmail: input.contactEmail ?? null,
          primaryContactMobile: input.contactPhone ?? null,
          primaryOwnerUserId: input.assigneeUserId,
          relationshipManagerUserId: input.assigneeUserId,
          sourceCampaignLabel: input.campaignName || input.campaignId,
          sourceCode: "marketing_engine",
        },
        input.actorUserId,
      );
      const row = created as { id?: string };
      if (!row.id) {
        throw Object.assign(new Error("Opportunity Registry did not return an id"), {
          statusCode: 500,
          code: "OPPORTUNITY_CREATE_FAILED",
        });
      }
      return { opportunityId: row.id, created: true, lifecycle: "dialogue" };
    },
  };
}
