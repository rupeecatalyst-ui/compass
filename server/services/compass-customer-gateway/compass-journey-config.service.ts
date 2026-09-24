/**
 * COMPASS journey configuration — projection of Enterprise Initial Data Collection (IDC).
 * Catalyst One owns field definitions; this module transforms IDC into a public COMPASS DTO.
 */
import {
  ENTERPRISE_IDC_VERSION,
  EMPLOYMENT_TYPE_FIELD_KEY,
  MONTHLY_INCOME_FIELD_KEY,
  SALARIED_EMPLOYMENT_TYPE_CODES,
  SALARIED_MONTHLY_INCOME_MAX,
  SELF_EMPLOYED_EMPLOYMENT_TYPE_CODES,
  SELF_EMPLOYED_MONTHLY_INCOME_MAX,
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
import { bootstrapProductJourneyFields } from "@/constants/product-journey/bootstrap";
import { journeyFieldMatchesIdcKey, resolveProductJourneyFieldLabel } from "@/lib/product-journey";
import type { ProductJourneyFieldRow } from "@/types/product-journey-definition";
import { buildPartnerOpportunityJourneyConfig } from "@server/services/partner-gateway/partner-opportunity-journey-config.service";

const IDENTITY_KEYS = new Set(["mobile", "mobilePrimary", "displayName"]);

function compassOtpEnabled(): boolean {
  return process.env.COMPASS_OTP_ENABLED === "true";
}

function monthlyIncomeMaxWhenMap(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const code of SALARIED_EMPLOYMENT_TYPE_CODES) {
    map[code] = SALARIED_MONTHLY_INCOME_MAX;
  }
  for (const code of SELF_EMPLOYED_EMPLOYMENT_TYPE_CODES) {
    map[code] = SELF_EMPLOYED_MONTHLY_INCOME_MAX;
  }
  return map;
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
  const isMonthlyIncome = field.key === MONTHLY_INCOME_FIELD_KEY || field.key === "monthlyIncome";
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
    requiredWhenField: field.requiredWhenField,
    requiredWhenValues: field.requiredWhenValues,
    notRequiredWhenFilled: field.notRequiredWhenFilled,
    maxWhenField: isMonthlyIncome ? field.requiredWhenField || EMPLOYMENT_TYPE_FIELD_KEY : undefined,
    maxWhenMap: isMonthlyIncome ? monthlyIncomeMaxWhenMap() : undefined,
  };
}

export function buildCompassJourneyConfig(
  productCode: CompassProductCode,
  journeyFields?: ProductJourneyFieldRow[] | null,
): CompassJourneyConfigDto {
  const definition = getCompassProductDefinition(productCode);
  const partnerConfig = buildPartnerOpportunityJourneyConfig();
  const transactionType = definition.transactionType;
  const values = {
    transactionType,
    lendingType: definition.isSecured ? "secured" : "unsecured",
  };
  const effectiveJourney =
    journeyFields && journeyFields.length > 0
      ? [...journeyFields]
      : bootstrapProductJourneyFields(definition.enterpriseProductCode);
  const captureRows = [...effectiveJourney]
    .filter((row) => row.capture)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const visibleSections = resolveVisibleIdcSections(partnerConfig.detailSections, {
    primaryBorrowerKind: definition.borrowerKind,
    productCode: definition.enterpriseProductCode,
    values,
    journeyFields: captureRows,
  });

  const fields: CompassJourneyFieldDef[] = [];
  for (const section of visibleSections) {
    for (const field of section.fields) {
      if (captureRows.length > 0 && !IDENTITY_KEYS.has(field.key) && !captureRows.some((row) => journeyFieldMatchesIdcKey(row, field.key))) {
        continue;
      }
      const match = captureRows.find((row) => journeyFieldMatchesIdcKey(row, field.key));
      fields.push({
        ...mapIdcField(
          field,
          partnerConfig.optionSets,
          section.sectionId,
          definition.enterpriseProductCode,
        ),
        required: match ? match.mandatoryForRecommendation : Boolean(field.required),
        capture: true,
        mandatoryForRecommendation: match?.mandatoryForRecommendation,
        applicability: match?.applicability,
        captureStepId: match?.captureStepId ?? null,
        sequence: match?.displayOrder ?? field.displayOrder,
      });
    }
  }

  const hasMobile = fields.some((f) => f.fieldId === "mobilePrimary" || f.fieldId === "mobile");
  if (!hasMobile) {
    const mobileCapture = partnerConfig.customerCapture.fields.find(
      (f) => f.key === "mobilePrimary" || f.inputMode === "tel",
    );
    if (mobileCapture) {
      fields.unshift({
        ...mapIdcField(
          mobileCapture,
          partnerConfig.optionSets,
          "identity",
          definition.enterpriseProductCode,
        ),
        capture: true,
        captureStepId: "mobile",
      });
    }
  }

  for (const row of captureRows) {
    const already = fields.some((field) => field.fieldId === row.fieldId || (row.idcKeys ?? []).includes(field.fieldId));
    if (already) continue;
    if (!row.captureStepId) continue;
    fields.push({
      fieldId: row.fieldId,
      label: resolveProductJourneyFieldLabel(row.fieldId, row.label),
      fieldType: "text",
      required: row.mandatoryForRecommendation,
      sequence: row.displayOrder,
      groupId: "product_journey",
      capture: true,
      mandatoryForRecommendation: row.mandatoryForRecommendation,
      applicability: row.applicability,
      captureStepId: row.captureStepId,
    });
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
