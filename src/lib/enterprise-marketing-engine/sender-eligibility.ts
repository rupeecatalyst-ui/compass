/**
 * CO-MARKETING-REDESIGN-013 — Sender eligibility for production-capable execution.
 * Unapproved or simulated senders cannot be used for production-capable approval/send.
 */

import {
  MARKETING_SENDER_NOT_APPROVED,
  MARKETING_SENDER_SIMULATED_NOT_VERIFIED,
} from "@/constants/enterprise-marketing-engine/sender-deliverability";
import type { MarketingSenderIdentity } from "@/types/enterprise-marketing-email-delivery";

export function marketingSenderIsApprovedForProduction(
  identity: Pick<MarketingSenderIdentity, "active" | "approvalStatus" | "simulated"> | null,
): boolean {
  if (!identity) return false;
  return identity.active && identity.approvalStatus === "APPROVED" && identity.simulated !== true;
}

export function assertMarketingSenderEligibleForCampaignApproval(input: {
  identity: MarketingSenderIdentity | null;
  senderIdentityId?: string | null;
  productionCapable?: boolean;
}): void {
  if (input.senderIdentityId) {
    if (!input.identity) {
      throw Object.assign(new Error("Linked sender identity was not found"), {
        statusCode: 400,
        code: MARKETING_SENDER_NOT_APPROVED,
      });
    }
    if (!input.identity.active) {
      throw Object.assign(new Error("Sender identity is inactive"), {
        statusCode: 400,
        code: MARKETING_SENDER_NOT_APPROVED,
      });
    }
    if (input.identity.approvalStatus !== "APPROVED") {
      throw Object.assign(new Error("Campaign approval requires an approved sender identity"), {
        statusCode: 400,
        code: MARKETING_SENDER_NOT_APPROVED,
      });
    }
    if (input.identity.simulated) {
      throw Object.assign(new Error("A simulated sender cannot be used for production-capable execution"), {
        statusCode: 400,
        code: MARKETING_SENDER_SIMULATED_NOT_VERIFIED,
      });
    }
  }
  if (input.productionCapable) {
    if (!marketingSenderIsApprovedForProduction(input.identity)) {
      throw Object.assign(
        new Error("Production-capable execution requires an approved, non-simulated sender identity"),
        { statusCode: 400, code: MARKETING_SENDER_NOT_APPROVED },
      );
    }
  }
}

export function forbidMarketingSenderVerificationEmail(): never {
  throw Object.assign(new Error("Sender verification email must not be triggered"), {
    statusCode: 403,
    code: "SENDER_VERIFY_EMAIL_FORBIDDEN",
  });
}

export function forbidMarketingDnsMutation(): never {
  throw Object.assign(new Error("DNS lookup or mutation is forbidden from Marketing deliverability"), {
    statusCode: 403,
    code: "DNS_MUTATION_FORBIDDEN",
  });
}
