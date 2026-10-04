/**
 * CO-MARKETING-MKT-11 / REDESIGN-016 — Fixture Dialogue Opportunity create.
 * Isolated from live Opportunity Registry. Reuses contact+campaign. Stores attribution.
 * Does not introduce a Lead entity.
 */

import type { MarketingOpportunityCreatePort } from "@/lib/enterprise-marketing-engine/ports/qualification-handoff.port";
import { canonicalCommittedRupees } from "@/lib/advantage-committed";

type FixtureOpportunity = {
  id: string;
  contactId: string;
  campaignId: string;
  campaignName: string | null;
  snapshotId: string | null;
  snapshotRecipientId: string | null;
  qualificationId: string | null;
  recipientFingerprint: string | null;
  assigneeUserId: string | null;
  source: string | null;
  sourceDetail: string | null;
  productCode: string | null;
  advantageCommittedAmount: string | null;
};

const opportunities = new Map<string, FixtureOpportunity>();
let seq = 0;

export const marketingFixtureOpportunityDirectory = {
  list() {
    return [...opportunities.values()];
  },
  get(id: string) {
    return opportunities.get(id) ?? null;
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
        return {
          opportunityId: existing.id,
          created: false,
          lifecycle: "dialogue",
          campaignId: existing.campaignId,
          snapshotId: existing.snapshotId,
          snapshotRecipientId: existing.snapshotRecipientId,
          qualificationId: existing.qualificationId,
          assigneeUserId: existing.assigneeUserId,
        };
      }
      const id = `mkt-fix-opp-${++seq}`;
      const row: FixtureOpportunity = {
        id,
        contactId: input.contactId,
        campaignId: input.campaignId,
        campaignName: input.campaignName ?? null,
        snapshotId: input.snapshotId ?? null,
        snapshotRecipientId: input.snapshotRecipientId ?? null,
        qualificationId: input.qualificationId ?? null,
        recipientFingerprint: input.recipientFingerprint ?? null,
        assigneeUserId: input.assigneeUserId ?? null,
        source: input.source ?? "marketing_engine",
        sourceDetail: input.sourceDetail ?? null,
        productCode: input.productCode ?? null,
        advantageCommittedAmount: canonicalCommittedRupees(
          input.authorizedAdvantageCommittedAmount,
        ),
      };
      opportunities.set(id, row);
      return {
        opportunityId: id,
        created: true,
        lifecycle: "dialogue",
        campaignId: row.campaignId,
        snapshotId: row.snapshotId,
        snapshotRecipientId: row.snapshotRecipientId,
        qualificationId: row.qualificationId,
        assigneeUserId: row.assigneeUserId,
      };
    },
  };
}
