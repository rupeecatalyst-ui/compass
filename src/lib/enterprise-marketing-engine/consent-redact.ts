/**
 * CO-MARKETING-REDESIGN-012 — Mask suppressed identities for unauthorised viewers.
 */

import { redactMarketingFingerprint } from "@/lib/enterprise-marketing-engine/analytics/redact-fingerprint";
import type { MarketingConsentSuppressionRecord } from "@/types/enterprise-marketing-consent";

export function maskMarketingConsentIdentity(
  record: Pick<MarketingConsentSuppressionRecord, "fingerprint" | "normalizedEmail" | "normalizedIdentity">,
  canViewPii: boolean,
): string {
  if (canViewPii) {
    return record.normalizedEmail || record.normalizedIdentity || record.fingerprint;
  }
  const source = record.normalizedEmail
    ? `email:${record.normalizedEmail}`
    : record.normalizedIdentity || record.fingerprint;
  return redactMarketingFingerprint(source);
}
