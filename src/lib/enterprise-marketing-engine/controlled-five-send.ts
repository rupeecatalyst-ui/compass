/**
 * Controlled five-recipient send.
 * Uses the existing frozen snapshot, ledger, and controlled-test SMTP gate.
 * Organisation-wide execution, provider-connect, and pacing cron stay off.
 */

import {
  MARKETING_SENDER_AWAITING_PROVIDER_VERIFICATION,
  MARKETING_SENDER_NOT_APPROVED,
} from "@/constants/enterprise-marketing-engine/sender-deliverability";
import {
  assessMarketingSenderLiveReadiness,
  type MarketingSenderLiveReadiness,
} from "@/lib/enterprise-marketing-engine/sender-eligibility";
import type { MarketingSenderIdentity } from "@/types/enterprise-marketing-email-delivery";

export const MARKETING_CONTROLLED_FIVE_RECIPIENT_COUNT = 5 as const;

/** The only campaign authorised for the initial production five-recipient test. */
export const MARKETING_CONTROLLED_FIVE_AUTHORISED_CAMPAIGN_ID =
  "mkt-camp-cmrtlilr60001weys1xv2uu5t-1792906011799" as const;

export const MARKETING_CONTROLLED_FIVE_SEND_BLOCK = {
  notAuthorized: "CONTROLLED_FIVE_SEND_NOT_AUTHORIZED",
  campaignNotAuthorised: "CONTROLLED_FIVE_CAMPAIGN_NOT_AUTHORISED",
  executionEnabled: "CONTROLLED_FIVE_SEND_EXECUTION_ENABLED",
  providerConnectEnabled: "CONTROLLED_FIVE_SEND_PROVIDER_CONNECT_ENABLED",
  cronRegistered: "CONTROLLED_FIVE_SEND_CRON_REGISTERED",
  recipientCount: "CONTROLLED_FIVE_RECIPIENT_COUNT",
  campaignNotApproved: "CONTROLLED_FIVE_CAMPAIGN_NOT_APPROVED",
  channel: "CONTROLLED_FIVE_CHANNEL",
  sender: "CONTROLLED_FIVE_SENDER",
  senderIdentityRequired: "SENDER_IDENTITY_REQUIRED",
} as const;

export type MarketingControlledFiveGateInput = {
  campaignId?: string | null;
  executionEnabled: boolean;
  providerConnectEnabled: boolean;
  controlledTestSendEnabled: boolean;
  /** Durable production operating mode. Allows this bounded send without the isolated env flag. */
  productionLiveEnabled?: boolean;
  emailMode: string;
  pacingCronRegistered: boolean;
};

export type MarketingControlledFiveAudienceInput = {
  campaignStatus?: string | null;
  approvedAt?: string | null;
  channel?: string | null;
  eligibleCount?: number | null;
  recipientCount: number;
  senderIdentityId?: string | null;
  fromAddress?: string | null;
  fromName?: string | null;
  sender: MarketingSenderIdentity | null;
};

export function assessMarketingControlledFiveGates(
  input: MarketingControlledFiveGateInput,
): { ok: true } | { ok: false; code: string; message: string } {
  if (input.executionEnabled) {
    return {
      ok: false,
      code: MARKETING_CONTROLLED_FIVE_SEND_BLOCK.executionEnabled,
      message: "Controlled five-recipient send stays unavailable while organisation-wide execution is enabled.",
    };
  }
  if (input.providerConnectEnabled) {
    return {
      ok: false,
      code: MARKETING_CONTROLLED_FIVE_SEND_BLOCK.providerConnectEnabled,
      message: "Controlled five-recipient send stays unavailable while organisation-wide provider connect is enabled.",
    };
  }
  if (input.pacingCronRegistered) {
    return {
      ok: false,
      code: MARKETING_CONTROLLED_FIVE_SEND_BLOCK.cronRegistered,
      message: "Controlled five-recipient send stays unavailable while the pacing cron is registered.",
    };
  }
  if (input.emailMode !== "live" || (!input.controlledTestSendEnabled && !input.productionLiveEnabled)) {
    return {
      ok: false,
      code: MARKETING_CONTROLLED_FIVE_SEND_BLOCK.notAuthorized,
      message:
        "Controlled five-recipient send requires live email mode and production Marketing or the isolated test-send flag.",
    };
  }
  return { ok: true };
}

export function assessMarketingControlledFiveAudience(
  input: MarketingControlledFiveAudienceInput,
):
  | { ok: true; senderReadiness: MarketingSenderLiveReadiness }
  | { ok: false; code: string; message: string } {
  const approved =
    Boolean(input.approvedAt?.trim()) &&
    (input.campaignStatus === "APPROVED" ||
      input.campaignStatus === "SCHEDULED" ||
      input.campaignStatus === "RUNNING");
  if (!approved) {
    return {
      ok: false,
      code: MARKETING_CONTROLLED_FIVE_SEND_BLOCK.campaignNotApproved,
      message: "Approve the campaign before the controlled five-recipient send.",
    };
  }
  if ((input.channel ?? "EMAIL") !== "EMAIL") {
    return {
      ok: false,
      code: MARKETING_CONTROLLED_FIVE_SEND_BLOCK.channel,
      message: "Controlled five-recipient send is email only.",
    };
  }
  if (
    input.recipientCount !== MARKETING_CONTROLLED_FIVE_RECIPIENT_COUNT ||
    input.eligibleCount !== MARKETING_CONTROLLED_FIVE_RECIPIENT_COUNT
  ) {
    return {
      ok: false,
      code: MARKETING_CONTROLLED_FIVE_SEND_BLOCK.recipientCount,
      message: "Controlled send requires a frozen snapshot of exactly five recipients.",
    };
  }
  const campaignFrom = (input.fromAddress ?? "").trim().toLowerCase();
  const identityFrom = (input.sender?.fromAddress ?? "").trim().toLowerCase();
  const campaignName = (input.fromName ?? "").trim();
  const identityName = (input.sender?.displayName ?? "").trim();
  if (
    !input.senderIdentityId?.trim() ||
    !input.sender ||
    input.sender.id !== input.senderIdentityId ||
    !identityFrom ||
    campaignFrom !== identityFrom ||
    (campaignName && campaignName !== identityName)
  ) {
    return {
      ok: false,
      code: MARKETING_CONTROLLED_FIVE_SEND_BLOCK.sender,
      message: "Controlled send requires the campaign to use its linked sender identity.",
    };
  }
  const senderReadiness = assessMarketingSenderLiveReadiness(input.sender);
  if (!senderReadiness.eligible) {
    return {
      ok: false,
      code: senderReadiness.reasons.includes(MARKETING_SENDER_AWAITING_PROVIDER_VERIFICATION)
        ? MARKETING_SENDER_AWAITING_PROVIDER_VERIFICATION
        : senderReadiness.reasons[0] ?? MARKETING_SENDER_NOT_APPROVED,
      message: "The linked sender must be approved, active, non-simulated, and verified.",
    };
  }
  return { ok: true, senderReadiness };
}

/** Live delivery requires an explicit linked identity. An omitted id leaves the draft unchanged. */
export function assessMarketingLiveSenderLink(
  senderIdentityId: string | null | undefined,
): { ok: true } | { ok: false; code: string; message: string } {
  if (!senderIdentityId?.trim()) {
    return {
      ok: false,
      code: MARKETING_CONTROLLED_FIVE_SEND_BLOCK.senderIdentityRequired,
      message: "Live sending requires the campaign's linked sender identity.",
    };
  }
  return { ok: true };
}
