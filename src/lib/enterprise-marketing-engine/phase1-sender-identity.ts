/**
 * CO-MARKETING-HOSTINGER-SMTP-001B — Frozen Phase 1 sender snapshot.
 * No schema. Admin upserts this identity after deployment; this helper never writes production data.
 */

import {
  MARKETING_PHASE1_FROM_EMAIL,
  MARKETING_PHASE1_FROM_NAME,
  MARKETING_PHASE1_REPLY_TO,
} from "@/constants/enterprise-marketing-engine/hostinger-smtp";
import type { MarketingEmailDeliverySender } from "@/types/enterprise-marketing-email-delivery";

export const MARKETING_PHASE1_SENDER_IDENTITY_ID = "mkt-sender-phase1-hostinger-smtp" as const;

export function marketingPhase1DeliverySender(): MarketingEmailDeliverySender {
  return {
    senderIdentityId: MARKETING_PHASE1_SENDER_IDENTITY_ID,
    displayName: MARKETING_PHASE1_FROM_NAME,
    fromAddress: MARKETING_PHASE1_FROM_EMAIL,
    replyTo: MARKETING_PHASE1_REPLY_TO,
  };
}

export function marketingPhase1SenderUpsertInput(organizationId: string) {
  return {
    organizationId,
    id: MARKETING_PHASE1_SENDER_IDENTITY_ID,
    displayName: MARKETING_PHASE1_FROM_NAME,
    fromAddress: MARKETING_PHASE1_FROM_EMAIL,
    replyTo: MARKETING_PHASE1_REPLY_TO,
    channel: "EMAIL" as const,
    active: true,
    isDefault: true,
    simulated: false,
    approvalStatus: "APPROVED" as const,
    verificationStatus: "PENDING" as const,
    permittedCampaignCategories: ["Unspecified"],
    providerType: "smtp" as const,
    providerProfileId: "hostinger-smtp-phase1",
  };
}
