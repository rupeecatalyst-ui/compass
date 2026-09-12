/**
 * CO-MARKETING-REDESIGN-013 — Sender identity registry service.
 * No verification emails. No credentials. No DNS mutation.
 */

import { ENTERPRISE_MARKETING_EXECUTION_ENABLED } from "@/constants/enterprise-marketing-engine";
import { MARKETING_PERMISSIONS } from "@/constants/enterprise-marketing-engine/permissions";
import { assertMarketingPermission } from "@/lib/enterprise-marketing-engine/permissions";
import {
  forbidMarketingDnsMutation,
  forbidMarketingSenderVerificationEmail,
} from "@/lib/enterprise-marketing-engine/sender-eligibility";
import { recordMarketingAuditEvent } from "./audit";
import { marketingSenderIdentityStore } from "./sender-identity-store";

type Actor = {
  userId?: string;
  role?: string;
  organizationId?: string | null;
  marketingPermissions?: string[];
};

function orgId(actorOrg?: string | null) {
  const trimmed = (actorOrg ?? "").trim();
  if (!trimmed || trimmed === "default") {
    throw Object.assign(new Error("Marketing requires an authenticated organization"), {
      statusCode: 400,
      code: "ORGANIZATION_REQUIRED",
    });
  }
  return trimmed;
}

function assertNoSend() {
  void ENTERPRISE_MARKETING_EXECUTION_ENABLED;
}

export const marketingSenderService = {
  list(actor: Actor) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.SENDER_MANAGE);
    const organizationId = orgId(actor.organizationId);
    return marketingSenderIdentityStore
      .list(organizationId)
      .map((row) => marketingSenderIdentityStore.toPublicDto(row));
  },

  upsert(
    actor: Actor,
    input: Parameters<typeof marketingSenderIdentityStore.upsert>[0],
  ) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.SENDER_MANAGE);
    const organizationId = orgId(actor.organizationId);
    if (input.verificationStatus === "VERIFIED" && (input.simulated ?? true)) {
      throw Object.assign(new Error("Simulated sender identities cannot be marked verified"), {
        statusCode: 400,
        code: "SENDER_SIMULATED_NOT_VERIFIED",
      });
    }
    const saved = marketingSenderIdentityStore.upsert({
      ...input,
      organizationId,
      createdByUserId: actor.userId ?? null,
      approvalStatus: input.approvalStatus === "APPROVED" ? "PENDING_APPROVAL" : input.approvalStatus,
    });
    recordMarketingAuditEvent({
      kind: "email.sender_identity.upsert",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { senderIdentityId: saved.id, simulated: saved.simulated, approvalStatus: saved.approvalStatus },
    });
    return marketingSenderIdentityStore.toPublicDto(saved);
  },

  approve(actor: Actor, senderId: string) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.SENDER_APPROVE);
    const organizationId = orgId(actor.organizationId);
    const saved = marketingSenderIdentityStore.approve({
      organizationId,
      id: senderId,
      actorUserId: actor.userId ?? null,
    });
    recordMarketingAuditEvent({
      kind: "email.sender_identity.approve",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { senderIdentityId: saved.id, approvedAt: saved.approvedAt },
    });
    return marketingSenderIdentityStore.toPublicDto(saved);
  },

  triggerVerificationEmail(actor: Actor, senderId: string): never {
    void actor.userId;
    void senderId;
    return forbidMarketingSenderVerificationEmail();
  },

  lookupDns(actor: Actor): never {
    void actor.userId;
    return forbidMarketingDnsMutation();
  },
};
