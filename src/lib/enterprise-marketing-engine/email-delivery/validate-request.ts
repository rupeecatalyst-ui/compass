/**
 * CO-MARKETING-MKT-07 — Delivery request validation (provider-neutral).
 */

import { isValidMarketingEmail } from "@/lib/enterprise-marketing-engine/data-quality";
import type { MarketingEmailDeliveryRequest } from "@/types/enterprise-marketing-email-delivery";

export type MarketingEmailDeliveryValidationError = {
  code: string;
  message: string;
};

export function validateMarketingEmailDeliveryRequest(
  request: MarketingEmailDeliveryRequest,
): MarketingEmailDeliveryValidationError | null {
  if (!request.idempotencyKey?.trim()) {
    return { code: "MISSING_IDEMPOTENCY_KEY", message: "Idempotency key is required" };
  }
  if (!request.recipientEmail?.trim()) {
    return { code: "MISSING_RECIPIENT", message: "Recipient email is required" };
  }
  if (!isValidMarketingEmail(request.recipientEmail)) {
    return { code: "MALFORMED_EMAIL", message: "Recipient email format is invalid" };
  }
  if (!request.sender?.fromAddress?.trim()) {
    return { code: "MISSING_SENDER", message: "Sender from address is required" };
  }
  if (!isValidMarketingEmail(request.sender.fromAddress)) {
    return { code: "MALFORMED_SENDER", message: "Sender from address format is invalid" };
  }
  if (!request.sender.displayName?.trim()) {
    return { code: "MISSING_SENDER_NAME", message: "Sender display name is required" };
  }
  if (!request.subject?.trim()) {
    return { code: "MISSING_SUBJECT", message: "Subject is required" };
  }
  if (!request.htmlBody?.trim()) {
    return { code: "MISSING_HTML", message: "HTML body is required" };
  }
  if (!request.textBody?.trim()) {
    return { code: "MISSING_TEXT", message: "Plaintext body is required" };
  }
  if (!request.campaignId?.trim() || !request.batchId?.trim()) {
    return { code: "MISSING_CONTEXT", message: "Campaign and batch context are required" };
  }
  return null;
}
