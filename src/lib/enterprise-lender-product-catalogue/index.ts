/**
 * CO-LM-004 — Enterprise Lender Product Catalogue access layer.
 * SSOT: `src/constants/enterprise-lender-product-catalogue`.
 * Consumers must import from here (or constants) — never from `@/lib/site`.
 */

export type {
  EnterpriseLenderProductCatalogue,
  EnterpriseLenderProductOffer,
  LenderOffer,
} from "@/types/enterprise-lender-product-catalogue";

export {
  CO_LM_004_LENDER_PRODUCT_CATALOGUE_VERSION,
  ELIGIBILITY_GATE_SLUGS,
  LENDERS_BY_PRODUCT,
  LENDER_PRODUCT_CATALOGUE_ELIGIBILITY_SLUGS,
  LENDER_PRODUCT_CATALOGUE_PRODUCT_SLUGS,
  hasLenderProductCatalogue,
  lenderOffersForProductSlug,
  type LenderProductCatalogueSlug,
} from "@/constants/enterprise-lender-product-catalogue";
