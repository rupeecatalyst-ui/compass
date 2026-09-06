/**
 * CO-MARKETING-MKT-11 — Live Opportunity create via existing Opportunity Registry.
 * Creates Dialogue (identity only) — does not invent product/amount on create.
 * Attribution and authorised Advantage Committed (₹) are stamped after create.
 */

import type { MarketingOpportunityCreatePort } from "@/lib/enterprise-marketing-engine/ports/qualification-handoff.port";
import { enterpriseOpportunityService } from "@server/services/enterprise-opportunity";
import { commitAdvantageFromMarketing } from "@server/services/advantage-committed/advantage-committed.service";

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
          sourceCode: input.source?.trim() || "marketing_engine",
          marketingCampaignId: input.campaignId,
          marketingSourceDetail: input.sourceDetail ?? null,
          marketingProspectRef:
            input.snapshotRecipientId ||
            input.snapshotId ||
            input.qualificationId ||
            input.recipientFingerprint ||
            null,
        },
        input.actorUserId,
      );
      const row = created as { id?: string; organizationId?: string };
      if (!row.id) {
        throw Object.assign(new Error("Opportunity Registry did not return an id"), {
          statusCode: 500,
          code: "OPPORTUNITY_CREATE_FAILED",
        });
      }
      await commitAdvantageFromMarketing({
        organizationId: row.organizationId || input.organizationId,
        opportunityId: row.id,
        authorizedAmount: input.authorizedAdvantageCommittedAmount,
        productCode: input.productCode,
        productLabel: input.productLabel,
        actorUserId: input.actorUserId,
        campaignId: input.campaignId,
        campaignName: input.campaignName,
        sourceCode: input.source?.trim() || "marketing_engine",
        sourceDetail: input.sourceDetail,
        prospectRef:
          input.snapshotRecipientId ||
          input.snapshotId ||
          input.qualificationId ||
          input.recipientFingerprint ||
          null,
      });
      return { opportunityId: row.id, created: true, lifecycle: "dialogue" };
    },
  };
}
