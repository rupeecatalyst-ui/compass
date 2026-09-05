/**
 * CO-MARKETING-REDESIGN-012 — Organisation consent policy.
 * Missing consent is never positive consent.
 */

import { MARKETING_DEFAULT_CONSENT_GRANTED_VALUES } from "@/constants/enterprise-marketing-engine/consent-suppression";
import type { MarketingConsentPolicy } from "@/types/enterprise-marketing-consent";

export function defaultMarketingConsentPolicy(organizationId: string): MarketingConsentPolicy {
  return {
    organizationId,
    requireExplicitConsent: false,
    grantedValues: [...MARKETING_DEFAULT_CONSENT_GRANTED_VALUES],
    withdrawnBlocksDelivery: true,
    hardBounceBlocksEmail: true,
    complaintBlocksEmail: true,
    unsubscribeBlocksDelivery: true,
    temporaryExpiryRequired: true,
    updatedAt: new Date(0).toISOString(),
    updatedByUserId: null,
  };
}

export function interpretMarketingConsentValue(
  raw: string | null | undefined,
  policy: MarketingConsentPolicy,
): "granted" | "withdrawn" | "missing" | "unknown" {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) return "missing";
  if (policy.grantedValues.some((item) => item.toLowerCase() === value)) return "granted";
  if (["no", "n", "false", "0", "withdrawn", "opt-out", "optout", "unsubscribed"].includes(value)) {
    return "withdrawn";
  }
  return "unknown";
}

export function marketingMissingConsentIsGranted(): false {
  return false;
}

export function lacksRequiredMarketingConsent(
  raw: string | null | undefined,
  policy: MarketingConsentPolicy,
): boolean {
  if (!policy.requireExplicitConsent) return false;
  return interpretMarketingConsentValue(raw, policy) !== "granted";
}
