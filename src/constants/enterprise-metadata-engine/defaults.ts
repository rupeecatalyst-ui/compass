/**
 * EME platform defaults and seed metadata definitions.
 */

import type { EmeMetadataDefinition } from "@/types/enterprise-metadata-engine";

export const EME_FRAMEWORK_VERSION = "2.0.0";

/** Future domain asset type codes — metadata schemas only, no domain implementation. */
export const EME_DOMAIN_ASSET_TYPE_CODES = {
  CUSTOMER: "customer",
  LOAN: "loan",
  PRODUCT: "product",
  LENDER: "lender",
  BUSINESS_UNIT: "business_unit",
  WEALTH_PARTNER: "wealth_partner",
  POLICY: "policy",
  DOCUMENT: "document",
} as const;

function seedDefinition(input: {
  id: string;
  assetTypeCode: string;
  schemaCode: string;
  displayName: string;
  description: string;
}): EmeMetadataDefinition {
  const now = new Date().toISOString();
  return {
    id: input.id,
    assetTypeCode: input.assetTypeCode,
    schemaCode: input.schemaCode,
    displayName: input.displayName,
    description: input.description,
    version: "1.0.0",
    categoryCodes: [],
    fieldDefinitionIds: [],
    enabled: true,
    createdBy: "system",
    createdOn: now,
    modifiedBy: "system",
    modifiedOn: now,
  };
}

export const EME_DEFAULT_METADATA_DEFINITIONS: EmeMetadataDefinition[] = [
  seedDefinition({
    id: "eme-schema-generic-entity",
    assetTypeCode: "generic_entity",
    schemaCode: "generic_entity_v1",
    displayName: "Generic Entity Metadata",
    description: "Default metadata schema for generic enterprise entities.",
  }),
  seedDefinition({
    id: "eme-schema-configurable-template",
    assetTypeCode: "configurable_template",
    schemaCode: "configurable_template_v1",
    displayName: "Configurable Template Metadata",
    description: "Metadata schema for configurable template assets.",
  }),
  seedDefinition({
    id: "eme-schema-customer",
    assetTypeCode: EME_DOMAIN_ASSET_TYPE_CODES.CUSTOMER,
    schemaCode: "customer_v1",
    displayName: "Customer Metadata",
    description: "Metadata schema placeholder for Customer assets.",
  }),
  seedDefinition({
    id: "eme-schema-loan",
    assetTypeCode: EME_DOMAIN_ASSET_TYPE_CODES.LOAN,
    schemaCode: "loan_v1",
    displayName: "Loan Metadata",
    description: "Metadata schema placeholder for Loan assets.",
  }),
  seedDefinition({
    id: "eme-schema-product",
    assetTypeCode: EME_DOMAIN_ASSET_TYPE_CODES.PRODUCT,
    schemaCode: "product_v1",
    displayName: "Product Metadata",
    description: "Metadata schema placeholder for Product assets.",
  }),
  seedDefinition({
    id: "eme-schema-lender",
    assetTypeCode: EME_DOMAIN_ASSET_TYPE_CODES.LENDER,
    schemaCode: "lender_v1",
    displayName: "Lender Metadata",
    description: "Metadata schema placeholder for Lender assets.",
  }),
  seedDefinition({
    id: "eme-schema-business-unit",
    assetTypeCode: EME_DOMAIN_ASSET_TYPE_CODES.BUSINESS_UNIT,
    schemaCode: "business_unit_v1",
    displayName: "Business Unit Metadata",
    description: "Metadata schema placeholder for Business Unit assets.",
  }),
  seedDefinition({
    id: "eme-schema-wealth-partner",
    assetTypeCode: EME_DOMAIN_ASSET_TYPE_CODES.WEALTH_PARTNER,
    schemaCode: "wealth_partner_v1",
    displayName: "Wealth Partner Metadata",
    description: "Metadata schema placeholder for Wealth Partner assets.",
  }),
  seedDefinition({
    id: "eme-schema-policy",
    assetTypeCode: EME_DOMAIN_ASSET_TYPE_CODES.POLICY,
    schemaCode: "policy_v1",
    displayName: "Policy Metadata",
    description: "Metadata schema placeholder for Policy assets.",
  }),
  seedDefinition({
    id: "eme-schema-document",
    assetTypeCode: EME_DOMAIN_ASSET_TYPE_CODES.DOCUMENT,
    schemaCode: "document_v1",
    displayName: "Document Metadata",
    description: "Metadata schema placeholder for Document assets.",
  }),
];
