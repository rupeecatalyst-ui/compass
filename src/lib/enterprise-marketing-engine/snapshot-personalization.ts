/**
 * Build the personalisation row for one frozen snapshot recipient.
 * Uses only the name and allowlisted mapped attributes stored at freeze.
 */

import { resolvePersonalizationValues } from "@/lib/enterprise-marketing-engine/personalization";
import type { MarketingPersonalizationToken } from "@/constants/enterprise-marketing-engine/content";

export type MarketingSnapshotPersonalizationSource = {
  normalizedEmail: string;
  displayName?: string | null;
  mappedAttributesJson?: Record<string, string> | null;
};

export function marketingPersonalizationRowFromRecipient(
  recipient: MarketingSnapshotPersonalizationSource,
): Record<string, string> {
  const attrs = recipient.mappedAttributesJson ?? {};
  const fullName =
    recipient.displayName?.trim() ||
    attrs.fullName?.trim() ||
    [attrs.firstName, attrs.lastName].filter((part) => part?.trim()).join(" ");
  const city = attrs.city?.trim() || attrs.location?.trim() || "";
  const product = attrs.product?.trim() || attrs.productInterest?.trim() || "";
  return {
    Email: recipient.normalizedEmail,
    email: recipient.normalizedEmail,
    "Full Name": fullName,
    Name: fullName,
    name: fullName,
    fullName,
    firstName: attrs.firstName?.trim() || "",
    lastName: attrs.lastName?.trim() || "",
    City: city,
    city,
    Location: city,
    Product: product,
    product,
  };
}

export function personalizationValuesFromSnapshotRecipient(
  recipient: MarketingSnapshotPersonalizationSource,
): Record<MarketingPersonalizationToken, string> {
  const row = marketingPersonalizationRowFromRecipient(recipient);
  return resolvePersonalizationValues({
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: row.fullName,
    city: row.city,
    product: row.product,
  });
}
