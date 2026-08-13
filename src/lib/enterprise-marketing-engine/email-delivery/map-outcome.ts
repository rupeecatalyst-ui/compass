/**
 * CO-MARKETING-MKT-07 — Map delivery outcomes to execution ledger statuses.
 */

import type { MarketingEmailDeliveryOutcome } from "@/types/enterprise-marketing-email-delivery";
import type { MarketingRecipientLedgerStatus } from "@/types/enterprise-marketing-execution";

export function mapDeliveryOutcomeToLedgerStatus(
  outcome: MarketingEmailDeliveryOutcome,
): MarketingRecipientLedgerStatus {
  switch (outcome) {
    case "SENT":
    case "ACCEPTED":
      return "delivered";
    case "RETRYABLE_FAILURE":
    case "RATE_LIMITED":
      return "failed";
    case "PERMANENT_FAILURE":
    case "FAILED":
    case "BLOCKED":
    case "CANCELLED":
      return "failed";
    default:
      return "failed";
  }
}

export function isDeliveryOutcomeRetryable(outcome: MarketingEmailDeliveryOutcome): boolean {
  return outcome === "RETRYABLE_FAILURE" || outcome === "RATE_LIMITED";
}
