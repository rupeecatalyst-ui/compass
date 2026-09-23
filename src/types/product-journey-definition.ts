/**
 * Product Journey & Recommendation Master — product-generic capture/mandatory config.
 * Match % weights remain on the existing product recommendation rule-set SSOT.
 */

export const PRODUCT_JOURNEY_APPLICABILITIES = ["all", "salaried", "self_employed"] as const;
export type ProductJourneyApplicability = (typeof PRODUCT_JOURNEY_APPLICABILITIES)[number];

export const PRODUCT_JOURNEY_LIFECYCLE_STATUSES = [
  "draft",
  "checker_review",
  "approved",
  "active",
  "superseded",
  "expired",
  "rejected",
] as const;
export type ProductJourneyLifecycleStatus = (typeof PRODUCT_JOURNEY_LIFECYCLE_STATUSES)[number];

export type ProductJourneyFieldRow = {
  fieldId: string;
  label?: string;
  applicability: ProductJourneyApplicability;
  capture: boolean;
  mandatoryForRecommendation: boolean;
  displayOrder: number;
  /** COMPASS presentation step id only. Never a second business SSOT. */
  captureStepId?: string | null;
  idcKeys?: readonly string[];
  seedReason?: string;
};

export type ProductJourneyDefinitionView = {
  id: string | null;
  organizationId: string | null;
  productCode: string;
  lineageId: string | null;
  versionNumber: number | null;
  lifecycleStatus: ProductJourneyLifecycleStatus | "bootstrap";
  fields: ProductJourneyFieldRow[];
  source: "active" | "draft" | "bootstrap";
};
