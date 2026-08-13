/**
 * CO-MARKETING-MKT-07 — Dry-run email delivery provider.
 * Validates requests, records intent — never contacts external ESP/SMTP.
 */

import { validateMarketingEmailDeliveryRequest } from "@/lib/enterprise-marketing-engine/email-delivery/validate-request";
import type { MarketingEmailDeliveryPort } from "@/lib/enterprise-marketing-engine/ports/email-delivery.port";
import type {
  MarketingEmailDeliveryRequest,
  MarketingEmailDeliveryResult,
} from "@/types/enterprise-marketing-email-delivery";

function simulateOutcome(
  request: MarketingEmailDeliveryRequest,
): MarketingEmailDeliveryResult["outcome"] {
  const email = request.recipientEmail.toLowerCase();
  const key = (request.tracking?.recipientFingerprint ?? email).toUpperCase();
  if (email.includes("not-an-email") || email.endsWith("@invalid")) return "FAILED";
  if (key.includes("RATE-LIMIT") || email.includes("rate-limit")) return "RATE_LIMITED";
  if (key.includes("PERMANENT") || email.includes("permanent-fail")) return "PERMANENT_FAILURE";
  if (key.includes("RETRY") || email.includes("retry-fail")) return "RETRYABLE_FAILURE";
  if (key.includes("BLOCKED") || email.includes("blocked@")) return "BLOCKED";
  if (key.includes("CANCEL") || email.includes("cancel@")) return "CANCELLED";
  if (key.includes("FAIL") || email.includes("fail@")) return "FAILED";
  return "SENT";
}

export function createDryRunEmailDeliveryPort(): MarketingEmailDeliveryPort {
  return {
    providerType: "dry_run",

    async deliver(request: MarketingEmailDeliveryRequest): Promise<MarketingEmailDeliveryResult> {
      const validationError = validateMarketingEmailDeliveryRequest(request);
      if (validationError) {
        return {
          idempotencyKey: request.idempotencyKey,
          outcome: validationError.code === "MALFORMED_EMAIL" ? "BLOCKED" : "FAILED",
          errorCode: validationError.code,
          errorMessage: validationError.message,
          providerMessageId: null,
          dryRun: true,
        };
      }

      if (!request.sender.senderIdentityId) {
        return {
          idempotencyKey: request.idempotencyKey,
          outcome: "FAILED",
          errorCode: "MISSING_SENDER_IDENTITY",
          errorMessage: "Sender identity reference is required",
          providerMessageId: null,
          dryRun: true,
        };
      }

      const outcome = simulateOutcome(request);
      const success = outcome === "SENT" || outcome === "ACCEPTED";
      return {
        idempotencyKey: request.idempotencyKey,
        outcome,
        providerMessageId: success
          ? `dry-run-${request.idempotencyKey.slice(0, 48)}`
          : null,
        errorCode: success ? null : outcome,
        errorMessage: success ? null : `Dry-run simulated ${outcome}`,
        dryRun: true,
      };
    },
  };
}
