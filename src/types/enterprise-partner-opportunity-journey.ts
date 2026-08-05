/**
 * CO-WP-IDC-001 / JOURNEY-001D — Partner Opportunity Journey + Initial Data Collection DTO.
 *
 * Catalyst One owns Initial Data Collection (IDC) masters, section definitions,
 * labels, order, mandatory flags, validation, help text, defaults, visibility.
 * Wealth Partner App renders this projection — presentation only.
 */

import type {
  IdcCustomerCaptureDef,
  IdcFieldDef,
  IdcOption,
  IdcSectionDef,
} from "@/types/enterprise-initial-data-collection";
import type { PartnerRecommendationPresentationDto } from "@/types/enterprise-partner-recommendations";

export type PartnerJourneyControl = IdcFieldDef["control"];

export type PartnerJourneyOption = IdcOption;

/** Partner field def = Enterprise IDC field (full metadata). */
export type PartnerJourneyFieldDef = IdcFieldDef;

export type PartnerJourneySectionDef = IdcSectionDef;

export type PartnerJourneyCustomerCapture = IdcCustomerCaptureDef;

export type PartnerJourneyBorrowerTypeCard = {
  value: "individual" | "company";
  label: string;
  description: string;
  icon: string;
};

export type PartnerJourneyProductCard = {
  productCode: string;
  productLabel: string;
  description: string;
  icon: string;
  displayOrder: number;
};

export type PartnerJourneyStepDef = {
  id: string;
  label: string;
};

export type PartnerOpportunityJourneyConfigDto = {
  /** IDC programme version (e.g. CO-WP-IDC-001). */
  version: string;
  dtoSource: "enterprise_opportunity_journey_config";
  dtoNotice: string;
  /** Explicit Initial Data Collection identity for Connect consumers. */
  initialDataCollection: {
    version: string;
    title: string;
    description: string;
  };
  terminology: Record<string, string>;
  journeySteps: PartnerJourneyStepDef[];
  borrowerTypes: PartnerJourneyBorrowerTypeCard[];
  products: PartnerJourneyProductCard[];
  optionSets: Record<string, PartnerJourneyOption[]>;
  /** Progressive Contact customer capture — from Enterprise IDC. */
  customerCapture: PartnerJourneyCustomerCapture;
  /**
   * Primary SSOT for Opportunity Details / IDC form.
   * WP must render these sections (filtered by Enterprise visibility rules).
   */
  detailSections: PartnerJourneySectionDef[];
  /** CO-WP-REC-001 — Recommendation step presentation (cards remain C1-configurable). */
  recommendationPresentation: PartnerRecommendationPresentationDto;
  /**
   * @deprecated Prefer detailSections — retained as derived projection for 001C consumers.
   */
  borrowerFields: {
    individual: PartnerJourneyFieldDef[];
    company: PartnerJourneyFieldDef[];
  };
  /** @deprecated Prefer detailSections */
  requirementFields: PartnerJourneyFieldDef[];
  /** @deprecated Prefer detailSections */
  productFieldsByFamily: Record<string, PartnerJourneyFieldDef[]>;
  submissionPipeline: string[];
  enterpriseEventsOnSubmit: string[];
};
