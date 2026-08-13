/**
 * CO-MARKETING-MKT-09 — Dry-run WhatsApp delivery provider.
 * Validates + records intent — never contacts WhatsApp infrastructure.
 */

import {
  validateWhatsAppDeliveryRequest,
} from "@/lib/enterprise-marketing-engine/whatsapp-delivery/template-render";
import type { MarketingWhatsAppDeliveryPort } from "@/lib/enterprise-marketing-engine/ports/whatsapp-delivery.port";
import type {
  MarketingWhatsAppDeliveryRequest,
  MarketingWhatsAppDeliveryResult,
} from "@/types/enterprise-marketing-whatsapp-delivery";

function simulateOutcome(
  request: MarketingWhatsAppDeliveryRequest,
): MarketingWhatsAppDeliveryResult["outcome"] {
  const phone = request.recipientPhone.replace(/\D+/g, "");
  const fp = (request.recipientFingerprint ?? "").toUpperCase();
  if (phone.endsWith("0000") || fp.includes("INVALID")) return "FAILED";
  if (fp.includes("RATE-LIMIT") || phone.endsWith("1111")) return "RATE_LIMITED";
  if (fp.includes("PERMANENT") || phone.endsWith("2222")) return "PERMANENT_FAILURE";
  if (fp.includes("RETRY") || phone.endsWith("3333")) return "RETRYABLE_FAILURE";
  if (fp.includes("BLOCKED") || phone.endsWith("4444")) return "BLOCKED";
  if (fp.includes("CANCEL") || phone.endsWith("5555")) return "CANCELLED";
  if (fp.includes("FAIL") || phone.endsWith("9999")) return "FAILED";
  return "SENT";
}

export function createDryRunWhatsAppDeliveryPort(): MarketingWhatsAppDeliveryPort {
  return {
    providerType: "dry_run",

    async deliver(
      request: MarketingWhatsAppDeliveryRequest,
    ): Promise<MarketingWhatsAppDeliveryResult> {
      const validationError = validateWhatsAppDeliveryRequest(request);
      if (validationError) {
        return {
          idempotencyKey: request.idempotencyKey,
          outcome: validationError.code === "INVALID_RECIPIENT" ? "BLOCKED" : "FAILED",
          errorCode: validationError.code,
          errorMessage: validationError.message,
          providerMessageId: null,
          dryRun: true,
          renderedBody: request.renderedBody,
          variables: request.variables,
        };
      }

      const outcome = simulateOutcome(request);
      const success = outcome === "SENT" || outcome === "ACCEPTED";
      return {
        idempotencyKey: request.idempotencyKey,
        outcome,
        providerMessageId: success
          ? `wa-dry-run-${request.idempotencyKey.slice(0, 40)}`
          : null,
        errorCode: success ? null : outcome,
        errorMessage: success ? null : `Dry-run simulated ${outcome}`,
        dryRun: true,
        renderedBody: request.renderedBody,
        variables: request.variables,
      };
    },
  };
}
