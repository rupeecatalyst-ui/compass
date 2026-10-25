/**
 * CO-MARKETING-REDESIGN-013 — Sender eligibility for production-capable execution.
 * Unapproved or simulated senders cannot be used for production-capable approval/send.
 */

import {
  MARKETING_SENDER_AWAITING_PROVIDER_VERIFICATION,
  MARKETING_SENDER_LIVE_NOT_VERIFIED,
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

export type MarketingSenderLiveReadiness = {
  eligible: boolean;
  approved: boolean;
  simulated: boolean;
  verificationStatus: MarketingSenderIdentity["verificationStatus"] | "MISSING";
  fromAddressPresent: boolean;
  displayNamePresent: boolean;
  replyToPresent: boolean;
  providerVerificationState: string;
  domainVerificationState: string;
  spfState: string;
  dkimState: string;
  lastVerificationAt: string | null;
  reasons: string[];
};

export function assessMarketingSenderLiveReadiness(
  identity: MarketingSenderIdentity | null,
): MarketingSenderLiveReadiness {
  const reasons: string[] = [];
  if (!identity) reasons.push(MARKETING_SENDER_NOT_APPROVED);
  else {
    if (!identity.active) reasons.push(MARKETING_SENDER_NOT_APPROVED);
    if (identity.approvalStatus !== "APPROVED") reasons.push(MARKETING_SENDER_NOT_APPROVED);
    if (identity.simulated) reasons.push(MARKETING_SENDER_SIMULATED_NOT_VERIFIED);
    if (identity.verificationStatus !== "VERIFIED") reasons.push(MARKETING_SENDER_LIVE_NOT_VERIFIED);
    if (!identity.fromAddress?.trim() || !identity.displayName?.trim()) {
      reasons.push("SENDER_IDENTITY_INCOMPLETE");
    }
    if (identity.verificationStatus !== "VERIFIED") {
      reasons.push(MARKETING_SENDER_AWAITING_PROVIDER_VERIFICATION);
    }
  }
  if (!identity) reasons.push(MARKETING_SENDER_AWAITING_PROVIDER_VERIFICATION);
  const verified = identity?.verificationStatus === "VERIFIED";
  const awaiting = MARKETING_SENDER_AWAITING_PROVIDER_VERIFICATION;
  return {
    eligible: reasons.length === 0,
    approved: Boolean(identity && identity.approvalStatus === "APPROVED" && identity.active),
    simulated: identity?.simulated === true,
    verificationStatus: identity?.verificationStatus ?? "MISSING",
    fromAddressPresent: Boolean(identity?.fromAddress?.trim()),
    displayNamePresent: Boolean(identity?.displayName?.trim()),
    replyToPresent: Boolean(identity?.replyTo?.trim()),
    providerVerificationState: verified ? "VERIFIED" : awaiting,
    domainVerificationState: verified ? "NOT_ASSESSED" : awaiting,
    spfState: verified ? "NOT_ASSESSED" : awaiting,
    dkimState: verified ? "NOT_ASSESSED" : awaiting,
    lastVerificationAt: identity?.lastValidationAt ?? null,
    reasons,
  };
}

/** Revalidate a linked campaign sender. Unlinked legacy campaigns are left unchanged. */
export function assertLinkedCampaignSender(input: {
  identity: MarketingSenderIdentity | null;
  senderIdentityId?: string | null;
  campaignFromAddress?: string | null;
  campaignFromName?: string | null;
}): void {
  if (!input.senderIdentityId) return;
  const readiness = assessMarketingSenderLiveReadiness(input.identity);
  if (!readiness.eligible || !input.identity) {
    throw Object.assign(new Error("The linked sender must be approved, active, non-simulated, and verified."), {
      statusCode: 400,
      code: readiness.reasons.includes(MARKETING_SENDER_AWAITING_PROVIDER_VERIFICATION)
        ? MARKETING_SENDER_AWAITING_PROVIDER_VERIFICATION
        : readiness.reasons[0] ?? MARKETING_SENDER_NOT_APPROVED,
    });
  }
  const from = (input.campaignFromAddress ?? "").trim().toLowerCase();
  const name = (input.campaignFromName ?? "").trim();
  if (
    from !== input.identity.fromAddress.trim().toLowerCase() ||
    (name && name !== input.identity.displayName.trim())
  ) {
    throw Object.assign(new Error("Campaign sender does not match the linked sender identity."), {
      statusCode: 400,
      code: "SENDER_IDENTITY_MISMATCH",
    });
  }
}

export function assertMarketingSenderEligibleForLiveSend(input: {
  identity: MarketingSenderIdentity | null;
}): MarketingSenderLiveReadiness {
  const readiness = assessMarketingSenderLiveReadiness(input.identity);
  if (readiness.eligible) return readiness;
  throw Object.assign(new Error(readiness.reasons[0] ?? MARKETING_SENDER_LIVE_NOT_VERIFIED), {
    statusCode: 403,
    code: readiness.reasons.includes(MARKETING_SENDER_AWAITING_PROVIDER_VERIFICATION)
      ? MARKETING_SENDER_AWAITING_PROVIDER_VERIFICATION
      : MARKETING_SENDER_LIVE_NOT_VERIFIED,
    reasons: readiness.reasons,
    liveEligible: false,
  });
}
