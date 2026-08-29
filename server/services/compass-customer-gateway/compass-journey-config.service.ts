/**
 * COMPASS journey configuration — projection of Enterprise Initial Data Collection (IDC).
 * Catalyst One owns field definitions; this module transforms IDC into a public COMPASS DTO.
 */
import {
  ENTERPRISE_IDC_VERSION,
} from "@/constants/enterprise-initial-data-collection";
import { resolveVisibleIdcSections } from "@/lib/enterprise-initial-data-collection";
import type { IdcFieldDef } from "@/types/enterprise-initial-data-collection";
import type {
  CompassJourneyConfigDto,
  CompassJourneyFieldDef,
  CompassJourneyFieldType,
  CompassProductCode,
} from "@/types/compass-customer-gateway";
import { COMPASS_PRODUCT_TO_ENTERPRISE } from "@/types/compass-customer-gateway";
import { buildPartnerOpportunityJourneyConfig } from "@server/services/partner-gateway/partner-opportunity-journey-config.service";

function compassOtpEnabled(): boolean {
  return process.env.COMPASS_OTP_ENABLED === "true";
}

function mapControlType(field: IdcFieldDef): CompassJourneyFieldType {
  if (field.control === "city_search") return "city";
  if (field.control === "select" || field.control === "lender_search") return "select";
  if (field.inputMode === "tel") return "tel";
  if (field.control === "number") {
    return /amount|income|emi|value|turnover|outstanding/i.test(field.key) ? "currency" : "number";
  }
  return "text";
}

function mapIdcField(
  field: IdcFieldDef,
  optionSets: ReturnType<typeof buildPartnerOpportunityJourneyConfig>["optionSets"],
  groupId: string,
): CompassJourneyFieldDef {
  const options = field.optionSet
    ? optionSets[field.optionSet as keyof typeof optionSets]?.map((o) => ({
        value: o.value,
        label: o.label,
      }))
    : undefined;

  return {
    fieldId: field.key,
    label: field.label,
    helpText: field.helpText,
    fieldType: mapControlType(field),
    required: Boolean(field.required),
    sequence: field.displayOrder,
    groupId,
    options,
    min: field.validation?.min,
    max: field.validation?.max,
    visibleWhenField: field.visibleWhenField,
    visibleWhenValues: field.visibleWhenValues,
  };
}

export function buildCompassJourneyConfig(productCode: CompassProductCode): CompassJourneyConfigDto {
  const enterprise = COMPASS_PRODUCT_TO_ENTERPRISE[productCode];
  const partnerConfig = buildPartnerOpportunityJourneyConfig();
  const transactionType = enterprise.transactionType;

  const visibleSections = resolveVisibleIdcSections(partnerConfig.detailSections, {
    primaryBorrowerKind: "individual",
    productCode: enterprise.productCode,
    values: { transactionType },
  });

  const fields: CompassJourneyFieldDef[] = [];
  for (const section of visibleSections) {
    for (const field of section.fields) {
      fields.push(mapIdcField(field, partnerConfig.optionSets, section.sectionId));
    }
  }

  const hasMobile = fields.some((f) => f.fieldId === "mobilePrimary" || f.fieldId === "mobile");
  if (!hasMobile) {
    const mobileCapture = partnerConfig.customerCapture.fields.find(
      (f) => f.key === "mobilePrimary" || f.inputMode === "tel",
    );
    if (mobileCapture) {
      fields.unshift(mapIdcField(mobileCapture, partnerConfig.optionSets, "identity"));
    }
  }

  fields.sort((a, b) => a.sequence - b.sequence);

  return {
    productCode,
    enterpriseProductCode: enterprise.productCode,
    productLabel: enterprise.productLabel,
    configVersion: partnerConfig.version || ENTERPRISE_IDC_VERSION,
    fields,
    otpEnabled: compassOtpEnabled(),
    dtoSource: "enterprise_initial_data_collection",
  };
}
