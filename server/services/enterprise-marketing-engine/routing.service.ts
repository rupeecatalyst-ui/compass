/**
 * CO-MARKETING-MKT-12 — Configurable routing (user / team / round-robin / closed rules).
 * Initial assignee only — Opportunity ownership remains authoritative after handoff.
 */

import {
  assembleMarketingRoutingContext,
  pickMarketingAssignee,
} from "@/lib/enterprise-marketing-engine/routing/pick-assignee";
import type { MarketingRoutingPort } from "@/lib/enterprise-marketing-engine/ports/routing.port";
import type { MarketingQualificationRecord } from "@/types/enterprise-marketing-qualification";
import { marketingAssignmentStore } from "./assignment-store";
import { marketingCampaignStore } from "./campaign-store";
import { marketingRoutingPolicyStore } from "./routing-policy-store";

function nowIso() {
  return new Date().toISOString();
}

async function pickForQualification(qualification: MarketingQualificationRecord, policyId: string) {
  const policy = marketingRoutingPolicyStore.get(policyId);
  if (!policy) {
    throw Object.assign(new Error("Routing policy is not configured"), {
      statusCode: 400,
      code: "ROUTING_UNCONFIGURED",
    });
  }
  const campaign = await marketingCampaignStore.getForOrg(
    qualification.campaignId,
    qualification.organizationId,
  );
  const context = assembleMarketingRoutingContext({
    campaignId: qualification.campaignId,
    product: qualification.product ?? campaign?.product,
    customerCategory: qualification.customerCategory,
    city: qualification.city,
    territory: qualification.territory,
    source: qualification.source ?? campaign?.channel ?? qualification.channel,
    partnerId: qualification.partnerId,
    teamId: qualification.teamId,
  });
  const picked = pickMarketingAssignee({ policy, context });
  if (typeof picked.nextCursor === "number") {
    marketingRoutingPolicyStore.advanceCursor(policy.id, picked.nextCursor);
  }
  return picked;
}

export const marketingRoutingService: MarketingRoutingPort & {
  assignForQualification(
    qualification: MarketingQualificationRecord,
    routingPolicyId: string,
  ): ReturnType<typeof marketingAssignmentStore.claim> & { mode: string };
} = {
  async assign(request) {
    const qualification = {
      id: request.qualificationId,
      organizationId: request.organizationId,
      campaignId: request.campaignId,
      channel: "EMAIL" as const,
      recipientFingerprint: request.qualificationId,
      intent: "explicit_requirement" as const,
      businessState: "QUALIFIED" as const,
      processState: "ROUTING" as const,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const existing = marketingAssignmentStore.get(request.qualificationId);
    if (existing) {
      return {
        assigneeUserId: existing.assigneeUserId,
        mode: existing.mode,
        idempotent: true,
      };
    }
    const picked = await pickForQualification(qualification, request.routingPolicyId);
    const claimed = marketingAssignmentStore.claim({
      qualificationId: request.qualificationId,
      assigneeUserId: picked.userId,
      mode: picked.mode,
      routingPolicyId: request.routingPolicyId,
      assignedAt: nowIso(),
    });
    return {
      assigneeUserId: claimed.assignment.assigneeUserId,
      mode: claimed.assignment.mode,
      idempotent: claimed.idempotent,
    };
  },

  async assignForQualification(qualification, routingPolicyId) {
    const existing = marketingAssignmentStore.get(qualification.id);
    if (existing) {
      return { assignment: existing, idempotent: true, mode: existing.mode };
    }
    const picked = await pickForQualification(qualification, routingPolicyId);
    const claimed = marketingAssignmentStore.claim({
      qualificationId: qualification.id,
      assigneeUserId: picked.userId,
      mode: picked.mode,
      routingPolicyId,
      assignedAt: nowIso(),
    });
    return { ...claimed, mode: claimed.assignment.mode };
  },
};
