/**
 * EDIE product families — inheritance without duplicate rule packs.
 */

import type { EdieProductRef } from "@/types/edie-certified-rules";

export type EdieProductFamily = "credit_assessment" | "asset_security";

/** All retail products in EDIE Phase 1 (excludes Working Capital & Construction Funding). */
export const EDIE_PHASE1_PRODUCTS: EdieProductRef[] = [
  "product:home-loan",
  "product:home-loan-bt",
  "product:lap",
  "product:personal-loan",
  "product:education-loan",
  "product:car-loan",
  "product:unsecured-business-loan",
  "product:loan-against-securities",
  "product:gold-loan",
];

export const EDIE_PRODUCT_FAMILY: Record<EdieProductRef, EdieProductFamily> = {
  "product:home-loan": "credit_assessment",
  "product:home-loan-bt": "credit_assessment",
  "product:lap": "credit_assessment",
  "product:personal-loan": "credit_assessment",
  "product:education-loan": "credit_assessment",
  "product:car-loan": "credit_assessment",
  "product:unsecured-business-loan": "credit_assessment",
  "product:loan-against-securities": "asset_security",
  "product:gold-loan": "asset_security",
};

/** Property folder only for these secured credit products. */
export const EDIE_PROPERTY_PRODUCTS = new Set<EdieProductRef>([
  "product:home-loan",
  "product:home-loan-bt",
  "product:lap",
]);

export function resolveEdieProductFamily(productRef: EdieProductRef): EdieProductFamily {
  return EDIE_PRODUCT_FAMILY[productRef];
}
