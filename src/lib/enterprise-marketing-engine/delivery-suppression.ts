/**
 * CO-MARKETING-LIVE-EMAIL-FOUNDATION-001 — Defence-in-depth suppression at the send boundary.
 * Authoritative decision remains evaluateMarketingDeliveryBlock. Delivery must fail closed.
 */

import type { MarketingConsentDeliveryDecision } from "@/types/enterprise-marketing-consent";
import type { MarketingEmailDeliveryRequest } from "@/types/enterprise-marketing-email-delivery";

export const MARKETING_DELIVERY_SUPPRESSION_MISSING_FINGERPRINT = "missing_recipient_fingerprint" as const;
export const MARKETING_DELIVERY_SUPPRESSION_BLOCKED = "suppression_match" as const;

export type MarketingDeliverySuppressionGate = {
  blocked: boolean;
  code: string;
  decision: MarketingConsentDeliveryDecision | null;
};

export function marketingDeliveryFingerprints(request: Pick<
  MarketingEmailDeliveryRequest,
  "recipientFingerprint" | "recipientEmail"
>): string[] {
  const fingerprints: string[] = [];
  const fp = request.recipientFingerprint?.trim().toLowerCase();
  if (fp) fingerprints.push(fp);
  const email = request.recipientEmail?.trim().toLowerCase();
  if (email) fingerprints.push(`email:${email}`);
  return fingerprints;
}

export function failClosedMarketingDeliverySuppression(input: {
  fingerprints: string[];
  decision?: MarketingConsentDeliveryDecision | null;
}): MarketingDeliverySuppressionGate {
  if (!input.fingerprints.length) {
    return {
      blocked: true,
      code: MARKETING_DELIVERY_SUPPRESSION_MISSING_FINGERPRINT,
      decision: null,
    };
  }
  if (input.decision?.blocked) {
    return {
      blocked: true,
      code: input.decision.code || MARKETING_DELIVERY_SUPPRESSION_BLOCKED,
      decision: input.decision,
    };
  }
  return {
    blocked: false,
    code: "not_blocked",
    decision: input.decision ?? null,
  };
}
