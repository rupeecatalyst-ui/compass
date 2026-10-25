/**
 * Controlled five-recipient send.
 * Uses the existing frozen snapshot, ledger, and controlled-test SMTP gate.
 * Organisation-wide execution, provider-connect, and pacing cron stay off.
 */

import { MARKETING_PHASE1_FROM_EMAIL } from "@/constants/enterprise-marketing-engine/hostinger-smtp";
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

export const MARKETING_CONTROLLED_FIVE_SEND_BLOCK = {
  notAuthorized: "CONTROLLED_FIVE_SEND_NOT_AUTHORIZED",
  executionEnabled: "CONTROLLED_FIVE_SEND_EXECUTION_ENABLED",
  providerConnectEnabled: "CONTROLLED_FIVE_SEND_PROVIDER_CONNECT_ENABLED",
  cronRegistered: "CONTROLLED_FIVE_SEND_CRON_REGISTERED",
  recipientCount: "CONTROLLED_FIVE_RECIPIENT_COUNT",
  campaignNotApproved: "CONTROLLED_FIVE_CAMPAIGN_NOT_APPROVED",
  channel: "CONTROLLED_FIVE_CHANNEL",
  sender: "CONTROLLED_FIVE_SENDER",
} as const;

export type MarketingControlledFiveGateInput = {
  executionEnabled: boolean;
  providerConnectEnabled: boolean;
  controlledTestSendEnabled: boolean;
  emailMode: string;
  pacingCronRegistered: boolean;
};

export type MarketingControlledFiveAudienceInput = {
  campaignStatus?: string | null;
  approvedAt?: string | null;
  channel?: string | null;
  eligibleCount?: number | null;
  recipientCount: number;
  fromAddress?: string | null;
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
  if (input.emailMode !== "live" || !input.controlledTestSendEnabled) {
    return {
      ok: false,
      code: MARKETING_CONTROLLED_FIVE_SEND_BLOCK.notAuthorized,
      message:
        "Controlled five-recipient send requires live email mode and the existing controlled test-send flag. Neither flag enables organisation-wide sending.",
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
  if (campaignFrom !== MARKETING_PHASE1_FROM_EMAIL || identityFrom !== MARKETING_PHASE1_FROM_EMAIL) {
    return {
      ok: false,
      code: MARKETING_CONTROLLED_FIVE_SEND_BLOCK.sender,
      message: `Controlled send requires the linked sender ${MARKETING_PHASE1_FROM_EMAIL}.`,
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
