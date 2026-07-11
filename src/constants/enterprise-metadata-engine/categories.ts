/**
 * EME metadata category constants.
 */

import type { EmeMetadataCategory } from "@/types/enterprise-metadata-engine";

export const EME_CATEGORY_CODES = {
  PERSONAL_INFORMATION: "personal_information",
  FINANCIAL_INFORMATION: "financial_information",
  EMPLOYMENT: "employment",
  PROPERTY: "property",
  COMPLIANCE: "compliance",
  SYSTEM: "system",
  CUSTOM: "custom",
} as const;

export const EME_DEFAULT_METADATA_CATEGORIES: EmeMetadataCategory[] = [
  {
    id: "eme-cat-personal",
    categoryCode: EME_CATEGORY_CODES.PERSONAL_INFORMATION,
    label: "Personal Information",
    description: "Identity and personal details.",
    displayOrder: 1,
    isSystem: true,
    enabled: true,
  },
  {
    id: "eme-cat-financial",
    categoryCode: EME_CATEGORY_CODES.FINANCIAL_INFORMATION,
    label: "Financial Information",
    description: "Financial and income-related metadata.",
    displayOrder: 2,
    isSystem: true,
    enabled: true,
  },
  {
    id: "eme-cat-employment",
    categoryCode: EME_CATEGORY_CODES.EMPLOYMENT,
    label: "Employment",
    description: "Employment and occupation metadata.",
    displayOrder: 3,
    isSystem: true,
    enabled: true,
  },
  {
    id: "eme-cat-property",
    categoryCode: EME_CATEGORY_CODES.PROPERTY,
    label: "Property",
    description: "Property and collateral metadata.",
    displayOrder: 4,
    isSystem: true,
    enabled: true,
  },
  {
    id: "eme-cat-compliance",
    categoryCode: EME_CATEGORY_CODES.COMPLIANCE,
    label: "Compliance",
    description: "Regulatory and compliance metadata.",
    displayOrder: 5,
    isSystem: true,
    enabled: true,
  },
  {
    id: "eme-cat-system",
    categoryCode: EME_CATEGORY_CODES.SYSTEM,
    label: "System",
    description: "Platform-managed system metadata.",
    displayOrder: 6,
    isSystem: true,
    enabled: true,
  },
  {
    id: "eme-cat-custom",
    categoryCode: EME_CATEGORY_CODES.CUSTOM,
    label: "Custom",
    description: "Administrator-defined custom categories.",
    displayOrder: 7,
    isSystem: false,
    enabled: true,
  },
];
