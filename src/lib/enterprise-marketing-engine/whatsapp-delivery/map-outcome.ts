/**
 * CO-MARKETING-MKT-09 — Map WhatsApp outcomes → execution ledger statuses.
 */

import type { MarketingWhatsAppDeliveryOutcome } from "@/types/enterprise-marketing-whatsapp-delivery";
import type { MarketingRecipientLedgerStatus } from "@/types/enterprise-marketing-execution";

export function mapWhatsAppOutcomeToLedgerStatus(
  outcome: MarketingWhatsAppDeliveryOutcome,
): MarketingRecipientLedgerStatus {
  switch (outcome) {
    case "SENT":
    case "ACCEPTED":
      return "delivered";
    case "RETRYABLE_FAILURE":
    case "RATE_LIMITED":
    case "PERMANENT_FAILURE":
    case "FAILED":
    case "BLOCKED":
    case "CANCELLED":
      return "failed";
    default:
      return "failed";
  }
}
