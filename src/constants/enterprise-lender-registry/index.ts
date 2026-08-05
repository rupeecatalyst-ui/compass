/**
 * CO-ARCH-004 — Enterprise Lender Registry master catalog exports.
 * CO-LM-004 — commercial product catalogue re-exported for discoverability.
 */
export {
  CO_ARCH_004_MASTER_SEED_VERSION,
  CO_LR_006_CATALOG_VERSION,
  CO_LR_008_CATALOG_VERSION,
  CO_LM_003_FOREIGN_BANK_SEED_KEYS,
  LENDER_MASTER_SEED_CATALOG,
  countLenderMasterSeedByClassification,
  listDefaultForeignBankSeeds,
  type LenderMasterSeedEntry,
} from "@/constants/enterprise-lender-registry/master-seed-catalog";

export {
  CO_LW_005_LENDER_BRANDING_VERSION,
  LENDER_BRANDING_CATALOG,
  countVerifiedLenderBrandLogos,
  getLenderBrandingBySeedKey,
  listVerifiedLenderBrandLogos,
  type LenderBrandAssetSource,
  type LenderBrandVerificationStatus,
  type LenderBrandingEntry,
} from "@/constants/enterprise-lender-registry/branding-catalog";

export {
  CO_LR_008_MASTER_SEED_VERSION,
  buildCoLr008LenderMasterEntries,
  countCoLr008CompactRows,
  listCoLr008RequiredGapLabels,
} from "@/constants/enterprise-lender-registry/master-seed-catalog-co-lr-008";

export {
  CO_LM_004_LENDER_PRODUCT_CATALOGUE_VERSION,
  LENDERS_BY_PRODUCT,
  LENDER_PRODUCT_CATALOGUE_ELIGIBILITY_SLUGS,
  LENDER_PRODUCT_CATALOGUE_PRODUCT_SLUGS,
  hasLenderProductCatalogue,
  lenderOffersForProductSlug,
} from "@/constants/enterprise-lender-product-catalogue";

export {
  ELR_SELECTION_PAGE_SIZE_MAX,
  ELR_SELECTION_PAGE_SIZE_DEFAULT,
  ELR_SELECTION_DROPDOWN_LIST_CLASS,
} from "@/constants/enterprise-lender-registry/selection";
