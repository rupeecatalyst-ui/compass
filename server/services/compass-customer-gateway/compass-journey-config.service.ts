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
import { getCompassProductDefinition } from "@/constants/compass-customer-gateway/product-registry";
import {
  getApprovedMaxRequestedAmountRupees,
  getApprovedRequestedAmountMaxLabel,
} from "@/constants/enterprise-product-master";
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
  enterpriseProductCode: string,
): CompassJourneyFieldDef {
  const options = field.optionSet
    ? optionSets[field.optionSet as keyof typeof optionSets]?.map((o) => ({
        value: o.value,
        label: o.label,
      }))
    : undefined;

  const isRequestedAmount = field.key === "requestedAmountLabel" || field.key === "loanAmount";
  const requestedMax = isRequestedAmount
    ? getApprovedMaxRequestedAmountRupees(enterpriseProductCode)
    : null;

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
    max: isRequestedAmount ? requestedMax ?? undefined : field.validation?.max,
    visibleWhenField: field.visibleWhenField,
    visibleWhenValues: field.visibleWhenValues,
  };
}

export function buildCompassJourneyConfig(productCode: CompassProductCode): CompassJourneyConfigDto {
  const definition = getCompassProductDefinition(productCode);
  const partnerConfig = buildPartnerOpportunityJourneyConfig();
  const transactionType = definition.transactionType;
  const values = {
    transactionType,
    lendingType: definition.isSecured ? "secured" : "unsecured",
  };

  const visibleSections = resolveVisibleIdcSections(partnerConfig.detailSections, {
    primaryBorrowerKind: definition.borrowerKind,
    productCode: definition.enterpriseProductCode,
    values,
  });

  const fields: CompassJourneyFieldDef[] = [];
  for (const section of visibleSections) {
    for (const field of section.fields) {
      fields.push(
        mapIdcField(
          field,
          partnerConfig.optionSets,
          section.sectionId,
          definition.enterpriseProductCode,
        ),
      );
    }
  }

  const hasMobile = fields.some((f) => f.fieldId === "mobilePrimary" || f.fieldId === "mobile");
  if (!hasMobile) {
    const mobileCapture = partnerConfig.customerCapture.fields.find(
      (f) => f.key === "mobilePrimary" || f.inputMode === "tel",
    );
    if (mobileCapture) {
      fields.unshift(
        mapIdcField(
          mobileCapture,
          partnerConfig.optionSets,
          "identity",
          definition.enterpriseProductCode,
        ),
      );
    }
  }

  fields.sort((a, b) => a.sequence - b.sequence);

  return {
    productCode,
    enterpriseProductCode: definition.enterpriseProductCode,
    productLabel: definition.productLabel,
    transactionType: definition.transactionType,
    isSecured: definition.isSecured,
    borrowerKind: definition.borrowerKind,
    configVersion: partnerConfig.version || ENTERPRISE_IDC_VERSION,
    fields,
    otpEnabled: compassOtpEnabled(),
    requestedAmountMax: getApprovedMaxRequestedAmountRupees(definition.enterpriseProductCode),
    requestedAmountMaxLabel: getApprovedRequestedAmountMaxLabel(definition.enterpriseProductCode),
    dtoSource: "enterprise_initial_data_collection",
  };
}
