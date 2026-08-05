/**
 * CO-WP-LENDER-SSOT-001 / CO-WP-LENDER-API-002 — Partner Gateway lender master.
 * Reads Enterprise Lender Registry via Prisma service (server-side only).
 *
 * Architectural rule: Partner Gateway must NEVER call relative employee lender-registry
 * HTTP endpoints via browser auth clients. Use Prisma lenderRegistryService only.
 */

import { lenderRegistryService } from "@server/services/lender-registry/lender-registry.service";
import type { PublishedLenderOption } from "@/lib/enterprise-lender-registry/published-directory";
import type { EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";

export type PartnerLenderMasterHit = {
  id: string;
  displayName: string;
  code: string | null;
};

function isPartnerVisibleLender(
  lender: Pick<
    EnterpriseLenderRecord,
    "status" | "enabled" | "lifecycleStatus" | "operationalStatus" | "isDeleted"
  >,
): boolean {
  if (lender.isDeleted) return false;
  if (lender.status !== "active") return false;
  if (!lender.enabled) return false;
  if (lender.lifecycleStatus !== "active") return false;
  if (lender.operationalStatus && lender.operationalStatus !== "active") return false;
  return true;
}

function displayNameOf(lender: EnterpriseLenderRecord): string {
  return (lender.displayName || lender.label || lender.legalName || lender.code || "").trim();
}

function matchesNeedle(lender: EnterpriseLenderRecord, needle: string): boolean {
  const n = needle.toLowerCase();
  const fields = [
    lender.displayName,
    lender.label,
    lender.legalName,
    lender.shortName,
    lender.code,
    ...(lender.aliases ?? []),
  ];
  return fields.some((f) => (f ?? "").toLowerCase().includes(n));
}

function toHit(lender: EnterpriseLenderRecord): PartnerLenderMasterHit {
  return {
    id: lender.id,
    displayName: displayNameOf(lender),
    code: lender.code ?? null,
  };
}

function toPublishedOption(lender: EnterpriseLenderRecord): PublishedLenderOption {
  const displayName = displayNameOf(lender);
  return {
    id: lender.id,
    code: lender.code,
    displayName,
    legalName: (lender.legalName || displayName).trim(),
    shortName: lender.shortName,
    classification: lender.classification,
    institutionCategory: lender.institutionCategory,
    website: lender.website,
    logoUrl: lender.logoUrl,
    brandName: displayName,
    headquartersLabel: lender.headquartersLabel,
    customerCarePhone: lender.customerCarePhone,
    customerCareEmail: lender.customerCareEmail,
    aliases: lender.aliases ?? [],
    source: "api",
    published: true,
    active: true,
  };
}

async function queryActiveLenders(search?: string) {
  return lenderRegistryService.queryLenders({
    page: 1,
    pageSize: 5000,
    status: "active",
    enabled: true,
    lifecycleStatus: "active",
    operationalStatus: "active",
    search: search?.trim() || undefined,
  });
}

/**
 * Case-insensitive partial (contains) search over active Enterprise lenders.
 * Returns Registry primary keys — WP must store `id`, not display name alone.
 * CO-LENDER-SSOT-REMEDIATE-001 — returns all matches (no 12-row cap).
 */
export async function searchPartnerEnterpriseLenders(
  q: string,
  limit = 5000,
): Promise<PartnerLenderMasterHit[]> {
  const needle = q.trim();
  if (!needle) {
    const all = await queryActiveLenders();
    return all.items
      .filter(isPartnerVisibleLender)
      .sort((a, b) => displayNameOf(a).localeCompare(displayNameOf(b)))
      .slice(0, Math.min(limit, 5000))
      .map(toHit);
  }

  const textHits = await queryActiveLenders(needle);
  const byId = new Map<string, EnterpriseLenderRecord>();
  for (const row of textHits.items) {
    if (isPartnerVisibleLender(row)) byId.set(row.id, row);
  }

  // Alias enrichment — Prisma text OR does not cover Json aliases.
  if (byId.size < limit) {
    const broad = await queryActiveLenders();
    for (const row of broad.items) {
      if (!isPartnerVisibleLender(row)) continue;
      if (!matchesNeedle(row, needle)) continue;
      byId.set(row.id, row);
    }
  }

  return [...byId.values()]
    .sort((a, b) => displayNameOf(a).localeCompare(displayNameOf(b)))
    .slice(0, Math.min(limit, 5000))
    .map(toHit);
}

/**
 * Full active published option set for Partner recommendation ranking.
 * Prisma only — no HTTP loopback to /api/lender-registry.
 */
export async function listPublishedOptionsForPartner(): Promise<PublishedLenderOption[]> {
  const result = await queryActiveLenders();
  return result.items
    .filter(isPartnerVisibleLender)
    .map(toPublishedOption)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export const partnerLenderMasterService = {
  searchPartnerEnterpriseLenders,
  listPublishedOptionsForPartner,
};
