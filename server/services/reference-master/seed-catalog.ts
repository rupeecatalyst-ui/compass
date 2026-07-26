/**
 * CO-ARCH-001-I3 — Reference Master seed catalog (Infrastructure SSOT).
 * Derives Tier 1 rows from existing TypeScript constants — no runtime behaviour change.
 */
import type { ReferenceMasterDomain } from "@prisma/client";
import { REFERENCE_MASTER_DOMAINS } from "@/constants/enterprise-master-data";
import {
  ECM_MASTER_CATALOGS,
  type EcmMasterDomain,
  type EcmMasterOption,
} from "@/constants/enterprise-contact-master/masters";
import { PROPERTY_TYPES } from "@/constants/loan-stage-master";
import {
  DEFAULT_OCCUPANCY_MASTER,
  OCCUPANCY_CATEGORIES,
} from "@/data/catalyst-one/occupancy-master-seed";
import { normalizeReferenceMasterCode } from "@server/repositories/reference-master/mappers";

export interface ReferenceMasterSeedOption {
  code: string;
  label: string;
  parentCode?: string;
  parentDomain?: ReferenceMasterDomain;
  sortOrder?: number;
  meta?: Record<string, unknown>;
  enabled?: boolean;
}

/** Priority seed order per CO-ARCH-001 Wave 1 Track A. */
export const REFERENCE_MASTER_SEED_ORDER: ReferenceMasterDomain[] = [
  "country",
  "state",
  "city",
  "employment_type",
  "occupation",
  "industry",
  "property_type",
  "nature_of_business",
  "constitution",
  "loan_purpose",
  "occupancy",
  "department",
  "designation",
  "channel_type",
  "partner_category",
  "resident_status",
  "risk_appetite",
  "investment_horizon",
  "specialization",
];

const ECM_DOMAIN_MAP: Partial<Record<EcmMasterDomain, ReferenceMasterDomain>> = {
  country: "country",
  state: "state",
  city: "city",
  industry: "industry",
  nature_of_business: "nature_of_business",
  constitution: "constitution",
  employment_type: "employment_type",
  occupation: "occupation",
  loan_purpose: "loan_purpose",
  department: "department",
  designation: "designation",
  channel_type: "channel_type",
  partner_category: "partner_category",
  resident_status: "resident_status",
  risk_appetite: "risk_appetite",
  investment_horizon: "investment_horizon",
  specialization: "specialization",
};

function mapEcmOption(
  domain: ReferenceMasterDomain,
  option: EcmMasterOption,
): ReferenceMasterSeedOption {
  let parentDomain: ReferenceMasterDomain | undefined;
  if (option.parentId) {
    if (domain === "state") parentDomain = "country";
    else if (domain === "city") parentDomain = "state";
    else if (domain === "occupation") parentDomain = "employment_type";
  }

  return {
    code: normalizeReferenceMasterCode(option.id),
    label: option.label.trim(),
    parentCode: option.parentId
      ? normalizeReferenceMasterCode(option.parentId)
      : undefined,
    parentDomain,
    sortOrder: option.sortOrder ?? 0,
    meta: option.meta,
    enabled: option.enabled !== false,
  };
}

function catalogOptionsForDomain(domain: ReferenceMasterDomain): ReferenceMasterSeedOption[] {
  const ecmDomain = (Object.entries(ECM_DOMAIN_MAP) as [EcmMasterDomain, ReferenceMasterDomain][])
    .find(([, refDomain]) => refDomain === domain)?.[0];

  if (ecmDomain) {
    return (ECM_MASTER_CATALOGS[ecmDomain] ?? []).map((option) =>
      mapEcmOption(domain, option),
    );
  }

  if (domain === "property_type") {
    return PROPERTY_TYPES.map((label, index) => ({
      code: normalizeReferenceMasterCode(label),
      label,
      sortOrder: index + 1,
      enabled: true,
    }));
  }

  if (domain === "occupancy") {
    const categories = OCCUPANCY_CATEGORIES.filter((c) => c.enabled).map((category) => ({
      code: normalizeReferenceMasterCode(category.id),
      label: category.label,
      sortOrder: category.sortOrder,
      meta: { kind: "occupancy_category" },
      enabled: true,
    }));

    const entries = DEFAULT_OCCUPANCY_MASTER.filter((entry) => entry.enabled).map(
      (entry) => ({
        code: normalizeReferenceMasterCode(entry.id),
        label: entry.label,
        parentCode: normalizeReferenceMasterCode(entry.categoryId),
        parentDomain: "occupancy" as const,
        sortOrder: entry.sortOrder,
        meta: {
          kind: "occupancy_entry",
          applicableProducts: entry.applicableProducts,
        },
        enabled: true,
      }),
    );

    return [...categories, ...entries];
  }

  return [];
}

export function getReferenceMasterSeedOptions(
  domain: ReferenceMasterDomain,
): ReferenceMasterSeedOption[] {
  return catalogOptionsForDomain(domain);
}

export function getAllReferenceMasterSeedDomains(): ReferenceMasterDomain[] {
  return REFERENCE_MASTER_SEED_ORDER.filter((domain) =>
    REFERENCE_MASTER_DOMAINS.includes(domain),
  );
}

export function countExpectedReferenceMasterSeeds(): number {
  return getAllReferenceMasterSeedDomains().reduce(
    (sum, domain) => sum + getReferenceMasterSeedOptions(domain).length,
    0,
  );
}
