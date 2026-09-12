/**
 * CO-MARKETING-REDESIGN-008 — Controlled test-send safety.
 * Allowlisted internal recipients only. Adapter remains dry-run. actuallySent is always false.
 */

import {
  MARKETING_TEST_SEND_ALLOWED_ADDRESSES,
  MARKETING_TEST_SEND_ALLOWED_DOMAINS,
  MARKETING_TEST_SEND_CONFIRMATION_PHRASE,
  MARKETING_TEST_SEND_DRY_RUN_NOTICE,
} from "@/constants/enterprise-marketing-engine/personalisation";
import { ENTERPRISE_MARKETING_EXECUTION_ENABLED } from "@/constants/enterprise-marketing-engine/safety";
import { ENTERPRISE_MARKETING_EMAIL_MODE } from "@/constants/enterprise-marketing-engine/email-delivery";
import {
  assertMarketingLiveTestRecipientAllowlisted,
  isMarketingLiveTestRecipientAllowlisted,
} from "@/lib/enterprise-marketing-engine/test-recipient-allowlist";

export type MarketingTestSendHistoryEntry = {
  id: string;
  campaignId: string;
  campaignVersionId: string;
  campaignVersionNumber: number;
  requesterUserId: string | null;
  recipientEmail: string;
  timestamp: string;
  adapterResult: string;
  actuallySent: false;
  dryRun: true;
  failureReason: string | null;
  notice: string;
};

const history: MarketingTestSendHistoryEntry[] = [];

export function isMarketingInternalTestRecipient(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return false;
  if ((MARKETING_TEST_SEND_ALLOWED_ADDRESSES as readonly string[]).includes(normalized)) return true;
  const domain = normalized.split("@")[1] ?? "";
  return (MARKETING_TEST_SEND_ALLOWED_DOMAINS as readonly string[]).includes(domain);
}

export function assertMarketingInternalTestRecipient(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!isMarketingInternalTestRecipient(normalized)) {
    throw Object.assign(
      new Error("Test recipient is not on the internal allowlist. Production mailboxes cannot be used."),
      { statusCode: 400, code: "TEST_RECIPIENT_NOT_ALLOWLISTED" },
    );
  }
  return normalized;
}

export function assertMarketingTestSendConfirmed(input: {
  confirmed?: boolean;
  confirmationPhrase?: string;
}): void {
  if (!input.confirmed) {
    throw Object.assign(new Error("Confirm the dry-run test send before continuing."), {
      statusCode: 400,
      code: "TEST_SEND_CONFIRMATION_REQUIRED",
    });
  }
  const phrase = (input.confirmationPhrase ?? "").trim().toUpperCase();
  if (phrase && phrase !== MARKETING_TEST_SEND_CONFIRMATION_PHRASE) {
    throw Object.assign(new Error(`Type ${MARKETING_TEST_SEND_CONFIRMATION_PHRASE} to confirm the dry-run.`), {
      statusCode: 400,
      code: "TEST_SEND_CONFIRMATION_REQUIRED",
    });
  }
}

/**
 * Live test-send extra barrier. Dry-run keeps the internal 008 allowlist.
 * Campaign audiences never read this env list.
 */
export function assertMarketingLiveTestSendAllowlistIfLive(email: string): string {
  if (ENTERPRISE_MARKETING_EMAIL_MODE !== "live") return email.trim().toLowerCase();
  return assertMarketingLiveTestRecipientAllowlisted(email);
}

export function assertMarketingTestSendDryRunOnly(input: { dryRun?: boolean }): void {
  if (ENTERPRISE_MARKETING_EXECUTION_ENABLED) {
    throw Object.assign(new Error("Live send is disabled in TEST MODE."), {
      statusCode: 403,
      code: "TEST_SEND_LIVE_FORBIDDEN",
    });
  }
  if (ENTERPRISE_MARKETING_EMAIL_MODE === "live") {
    throw Object.assign(new Error("Live email mode is not authorised for test send."), {
      statusCode: 403,
      code: "TEST_SEND_LIVE_FORBIDDEN",
    });
  }
  if (input.dryRun === false) {
    throw Object.assign(new Error("Test send adapter must remain dry-run. No provider call is authorised."), {
      statusCode: 403,
      code: "TEST_SEND_PROVIDER_FORBIDDEN",
    });
  }
}

/**
 * Future controlled live test-send remains allowlist-only.
 * Does not add operator addresses. Does not authorise live send while flags are off.
 */
export function assessMarketingControlledTestSendSafety(input: { recipientEmail: string }): {
  allowlisted: boolean;
  liveAllowlisted: boolean;
  liveSendAuthorized: false;
  actuallySent: false;
  dryRunRequired: true;
} {
  return {
    allowlisted: isMarketingInternalTestRecipient(input.recipientEmail),
    liveAllowlisted: isMarketingLiveTestRecipientAllowlisted(input.recipientEmail),
    liveSendAuthorized: false,
    actuallySent: false,
    dryRunRequired: true,
  };
}

export function forceMarketingTestSendNotActuallySent(): false {
  return false;
}

export function recordMarketingTestSendHistory(
  entry: Omit<MarketingTestSendHistoryEntry, "actuallySent" | "dryRun" | "notice"> & {
    actuallySent?: boolean;
    dryRun?: boolean;
    notice?: string;
  },
): MarketingTestSendHistoryEntry {
  const stored: MarketingTestSendHistoryEntry = {
    id: entry.id,
    campaignId: entry.campaignId,
    campaignVersionId: entry.campaignVersionId,
    campaignVersionNumber: entry.campaignVersionNumber,
    requesterUserId: entry.requesterUserId,
    recipientEmail: entry.recipientEmail,
    timestamp: entry.timestamp,
    adapterResult: entry.adapterResult,
    actuallySent: false,
    dryRun: true,
    failureReason: entry.failureReason,
    notice: MARKETING_TEST_SEND_DRY_RUN_NOTICE,
  };
  history.unshift(stored);
  return stored;
}

export function listMarketingTestSendHistory(campaignId: string): MarketingTestSendHistoryEntry[] {
  return history.filter((row) => row.campaignId === campaignId);
}

export function resetMarketingTestSendHistory(): void {
  history.splice(0, history.length);
}
