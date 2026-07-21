/**
 * CO-ARCH-001 — Enterprise Master Data constants (Infrastructure SSOT).
 */

/** Program identifier — Infrastructure Office. */
export const CO_ARCH_001_PROGRAM_ID = "CO-ARCH-001" as const;

export const CO_ARCH_001_I1_PHASE_ID = "CO-ARCH-001-I1" as const;

/** Registry tier labels for governance and documentation. */
export const ENTERPRISE_MASTER_DATA_TIERS = {
  tier0: "Registry Metadata",
  tier1: "Reference Master",
  tier2: "Business Registry",
  tier3: "Operational Registry",
} as const;

export type EnterpriseMasterDataTier = keyof typeof ENTERPRISE_MASTER_DATA_TIERS;

/** Modules using Tier 0 shared infrastructure. */
export const ENTERPRISE_REGISTRY_MODULES = [
  "reference_master",
  "product",
  "lender",
  "document",
] as const;

export type EnterpriseRegistryModuleCode = (typeof ENTERPRISE_REGISTRY_MODULES)[number];

/** Default status for new registry rows (Tier 1 & 2 — used by I2+). */
export const ENTERPRISE_REGISTRY_DEFAULT_STATUS = "draft" as const;

/** Default enabled flag for new registry rows. */
export const ENTERPRISE_REGISTRY_DEFAULT_ENABLED = true;

/** Initial version number for versioned registry entities. */
export const ENTERPRISE_REGISTRY_INITIAL_VERSION = 1;

/**
 * Tier 1 Reference Master domains (I2) — documented here for classification SSOT.
 * Not persisted until CO-ARCH-001-I2.
 */
export const REFERENCE_MASTER_DOMAINS = [
  "country",
  "state",
  "city",
  "industry",
  "nature_of_business",
  "constitution",
  "employment_type",
  "occupation",
  "loan_purpose",
  "property_type",
  "occupancy",
  "department",
  "designation",
  "channel_type",
  "partner_category",
  "resident_status",
  "risk_appetite",
  "investment_horizon",
  "specialization",
] as const;

export type ReferenceMasterDomainCode = (typeof REFERENCE_MASTER_DOMAINS)[number];
