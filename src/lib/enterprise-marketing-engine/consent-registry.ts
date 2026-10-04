/**
 * CO-MARKETING-REDESIGN-012 — Search/filter for the Consent and Suppression Centre.
 * Fixture identities only. Never a prospect ingest.
 */

import type { MarketingConsentRecordKind } from "@/constants/enterprise-marketing-engine/consent-suppression";
import type { MarketingConsentSource } from "@/constants/enterprise-marketing-engine/consent-suppression";
import type { MarketingConsentSuppressionRecord } from "@/types/enterprise-marketing-consent";

export function filterMarketingConsentRegistry(
  rows: MarketingConsentSuppressionRecord[],
  query?: {
    search?: string | null;
    kind?: MarketingConsentRecordKind | "all" | null;
    source?: MarketingConsentSource | "all" | null;
    campaignId?: string | null;
    status?: string | null;
  },
): MarketingConsentSuppressionRecord[] {
  const search = (query?.search ?? "").trim().toLowerCase();
  const kind = query?.kind && query.kind !== "all" ? query.kind : null;
  const source = query?.source && query.source !== "all" ? query.source : null;
  const status = (query?.status ?? "").trim().toUpperCase();
  const campaignId = (query?.campaignId ?? "").trim();
  return rows.filter((row) => {
    if (kind && row.kind !== kind) return false;
    if (source && row.source !== source) return false;
    if (status && status !== "ALL" && row.status !== status) return false;
    if (campaignId && row.campaignId !== campaignId) return false;
    if (!search) return true;
    const haystack = [
      row.fingerprint,
      row.normalizedIdentity,
      row.normalizedEmail ?? "",
      row.kind,
      String(row.reason),
      row.source,
      row.note ?? "",
      row.campaignId ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(search);
  });
}
