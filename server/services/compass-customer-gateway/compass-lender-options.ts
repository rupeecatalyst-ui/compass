import type { PublishedLenderOption } from "@/lib/enterprise-lender-registry/published-directory";
import type { EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";
import { lenderRegistryRepository } from "@server/repositories/lender-registry/lender-registry.repository";

function isVisible(
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

/** COMPASS gateway lender directory — scoped to the resolved gateway organization. */
export async function listCompassGatewayPublishedLenderOptions(
  organizationId: string,
): Promise<PublishedLenderOption[]> {
  const result = await lenderRegistryRepository.queryLenders(organizationId, {
    page: 1,
    pageSize: 5000,
    status: "active",
    enabled: true,
    lifecycleStatus: "active",
    operationalStatus: "active",
  });
  return result.items
    .filter(isVisible)
    .map(toPublishedOption)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
