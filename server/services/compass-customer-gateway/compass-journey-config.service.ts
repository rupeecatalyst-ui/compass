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
import {
  COMPASS_PRODUCT_REGISTRY,
  getCompassProductDefinition,
  parseActiveCompassProductCode,
} from "@/constants/compass-customer-gateway/product-registry";
import {
  getApprovedMaxRequestedAmountRupees,
  getApprovedRequestedAmountMaxLabel,
} from "@/constants/enterprise-product-master";
import { bootstrapProductJourneyFields } from "@/constants/product-journey/bootstrap";
import { resolveJourneyFieldsSafe } from "@server/services/product-journey/product-journey-definition.service";
import { journeyFieldMatchesIdcKey, resolveProductJourneyFieldLabel } from "@/lib/product-journey";
import type { ProductJourneyFieldRow } from "@/types/product-journey-definition";
import { buildPartnerOpportunityJourneyConfig } from "@server/services/partner-gateway/partner-opportunity-journey-config.service";
import { readCompassOtpConfig } from "@/lib/compass-otp/adapter";
import {
  classifyPublicField,
  journeyRoleSource,
} from "@/lib/compass-customer-gateway/public-question-plan";
import {
  buildJourneyDraftFromProjection,
  governedPublicStages,
  journeyPublicationState,
  normalizeMobileCapture,
  normalizeOtpVerification,
  resolvePublishedJourney,
  type JourneyDraft,
} from "@/lib/product-journey/publication";

const IDENTITY_KEYS = new Set(["mobile", "mobilePrimary", "displayName"]);

function compassOtpEnabled(): boolean {
  return readCompassOtpConfig().deliveryEnabled;
}

function equalsCondition(condition: { op?: string; fieldId?: string; value?: string | number | boolean } | undefined): {
  field?: string;
  values?: string[];
} {
  if (!condition || condition.op !== "equals" || !condition.fieldId || condition.value == null) return {};
  return { field: condition.fieldId, values: [String(condition.value)] };
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
    purpose: classifyPublicField({ fieldId: field.key }),
    purposeSource: journeyRoleSource({}),
  };
}

export async function buildCompassJourneyConfig(
  organizationId: string,
  productCode: CompassProductCode,
  pinnedVersion?: number | null,
): Promise<CompassJourneyConfigDto> {
  const definition = getCompassProductDefinition(productCode);
  let journeyFields: ProductJourneyFieldRow[] = [];
  try {
    journeyFields = await resolveJourneyFieldsSafe({
      organizationId,
      productCode: definition.enterpriseProductCode,
    });
  } catch {
    journeyFields = bootstrapProductJourneyFields(definition.enterpriseProductCode);
  }
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
  const base = {
    productCode,
    enterpriseProductCode: definition.enterpriseProductCode,
    productLabel: definition.productLabel,
    transactionType: definition.transactionType,
    isSecured: definition.isSecured,
    borrowerKind: definition.borrowerKind,
    otpEnabled: false,
    mobileCapture: "required" as const,
    otpVerification: "off" as const,
    requestedAmountMax: getApprovedMaxRequestedAmountRupees(definition.enterpriseProductCode),
    requestedAmountMaxLabel: getApprovedRequestedAmountMaxLabel(definition.enterpriseProductCode),
  };
  const journeyCode = definition.enterpriseProductCode;
  const pinned = pinnedVersion != null ? await resolvePublishedJourney(organizationId, journeyCode, pinnedVersion) : null;
  const publicationState = await journeyPublicationState(organizationId, journeyCode);
  const published =
    pinnedVersion != null
      ? pinned
      : publicationState === "unavailable"
        ? null
        : await resolvePublishedJourney(organizationId, journeyCode, null);
  if (pinnedVersion != null && !published) {
    return {
      ...base,
      configVersion: partnerConfig.version || ENTERPRISE_IDC_VERSION,
      fields,
      stages: [],
      journeyUnavailable: true,
      dtoSource: "enterprise_initial_data_collection",
    };
  }
  if (pinnedVersion == null && publicationState === "unavailable") {
    return {
      ...base,
      configVersion: partnerConfig.version || ENTERPRISE_IDC_VERSION,
      fields: [],
      stages: [],
      journeyUnavailable: true,
      dtoSource: "published_product_journey",
    };
  }
  if (!published) {
    return {
      ...base,
      configVersion: partnerConfig.version || ENTERPRISE_IDC_VERSION,
      fields,
      stages: [],
      dtoSource: "enterprise_initial_data_collection",
    };
  }
  const mobileCapture = normalizeMobileCapture(published.mobileCapture);
  const otpVerification = normalizeOtpVerification(published.otpVerification);
  const orderedStages = governedPublicStages(
    [...published.stages].sort((a, b) => a.sequence - b.sequence),
    mobileCapture,
    otpVerification,
  );
  return {
    ...base,
    productLabel: published.productLabel,
    configVersion: `journey-v${published.journeyVersion}`,
    fields: published.fields.map((field) => ({
      fieldId: field.fieldId,
      label: field.label,
      helpText: field.helpText,
      fieldType: rendererFieldType(field.fieldType),
      required: field.required,
      options: field.options,
      min: field.min,
      max: field.max,
      sequence: field.sequence,
      groupId: field.stageId,
      purpose: field.purpose || "application",
      purposeSource: "configured" as const,
      stageId: field.stageId,
      visibleWhenField: equalsCondition(field.visibleWhen).field,
      visibleWhenValues: equalsCondition(field.visibleWhen).values,
      requiredWhenField: equalsCondition(field.requiredWhen).field,
      requiredWhenValues: equalsCondition(field.requiredWhen).values,
    })),
    mobileCapture,
    otpVerification,
    otpEnabled: otpVerification === "on" && compassOtpEnabled(),
    stages: orderedStages.map((stage) => stage.stageId),
    journeyVersion: published.journeyVersion,
    journeyStages: orderedStages.map((stage) => ({
      stageId: stage.stageId,
      kind: stage.kind,
      label: stage.label,
      sequence: stage.sequence,
    })),
    advantageEnabled: published.advantageEnabled,
    consentVersion: published.consentVersion,
    confirmation: published.confirmation,
    dtoSource: "published_product_journey",
  };
}

function rendererFieldType(fieldType: string): CompassJourneyFieldType {
  if (fieldType === "mobile") return "tel";
  if (fieldType === "currency" || fieldType === "number" || fieldType === "percentage") {
    return fieldType === "currency" ? "currency" : "number";
  }
  if (fieldType === "single_select" || fieldType === "yes_no" || fieldType === "radio" || fieldType === "multi_select") {
    return "select";
  }
  if (fieldType === "location") return "city";
  return "text";
}

/** Public DTO for a product that exists only as a published journey. No enterprise record is read. */
export async function buildPublishedProductJourneyConfig(
  organizationId: string,
  productCode: string,
  pinnedVersion?: number | null,
): Promise<CompassJourneyConfigDto | null> {
  const published = await resolvePublishedJourney(organizationId, productCode, pinnedVersion ?? null);
  if (!published) return null;
  const mobileCapture = normalizeMobileCapture(published.mobileCapture);
  const otpVerification = normalizeOtpVerification(published.otpVerification);
  const orderedStages = governedPublicStages(
    [...published.stages].sort((a, b) => a.sequence - b.sequence),
    mobileCapture,
    otpVerification,
  );
  return {
    productCode: published.productCode,
    enterpriseProductCode: published.productCode,
    productLabel: published.productLabel,
    transactionType: "fresh",
    isSecured: true,
    borrowerKind: "individual",
    configVersion: `journey-v${published.journeyVersion}`,
    fields: published.fields.map((field) => ({
      fieldId: field.fieldId,
      label: field.label,
      helpText: field.helpText,
      fieldType: rendererFieldType(field.fieldType),
      required: field.required,
      options: field.options,
      min: field.min,
      max: field.max,
      sequence: field.sequence,
      groupId: field.stageId,
      purpose: field.purpose === "" ? undefined : field.purpose,
      purposeSource: "configured" as const,
      stageId: field.stageId,
      visibleWhenField: equalsCondition(field.visibleWhen).field,
      visibleWhenValues: equalsCondition(field.visibleWhen).values,
      requiredWhenField: equalsCondition(field.requiredWhen).field,
      requiredWhenValues: equalsCondition(field.requiredWhen).values,
    })),
    mobileCapture,
    otpVerification,
    stages: orderedStages.map((stage) => stage.stageId),
    journeyVersion: published.journeyVersion,
    journeyStages: orderedStages.map((stage) => ({
      stageId: stage.stageId,
      kind: stage.kind,
      label: stage.label,
      sequence: stage.sequence,
    })),
    advantageEnabled: published.advantageEnabled,
    consentVersion: published.consentVersion,
    confirmation: published.confirmation,
    otpEnabled: otpVerification === "on" && compassOtpEnabled(),
    requestedAmountMax: null,
    requestedAmountMaxLabel: null,
    dtoSource: "published_product_journey",
  };
}

/** Explicit IDC import. Does not publish and is not called from a config read. */
function compassCodeForJourneyImport(productCode: string): CompassProductCode | null {
  const active = parseActiveCompassProductCode(productCode);
  if (active) return active;
  const enterpriseCode = productCode.trim().toUpperCase();
  return (
    COMPASS_PRODUCT_REGISTRY.find((entry) => entry.enterpriseProductCode === enterpriseCode)?.compassCode ??
    null
  );
}

export async function buildIdcJourneyDraft(
  productCode: string,
  organizationId?: string,
): Promise<JourneyDraft> {
  const active = compassCodeForJourneyImport(productCode);
  if (!active) {
    throw new Error("IDC_PRODUCT_UNKNOWN");
  }
  void organizationId;
  const definition = getCompassProductDefinition(active);
  const partnerConfig = buildPartnerOpportunityJourneyConfig();
  const sections = resolveVisibleIdcSections(partnerConfig.detailSections, {
    primaryBorrowerKind: definition.borrowerKind,
    productCode: definition.enterpriseProductCode,
    values: {
      transactionType: definition.transactionType,
      lendingType: definition.isSecured ? "secured" : "unsecured",
    },
  });
  const fields: CompassJourneyFieldDef[] = [];
  for (const section of sections) {
    for (const field of section.fields) {
      fields.push(mapIdcField(field, partnerConfig.optionSets, section.sectionId, definition.enterpriseProductCode));
    }
  }
  const projected = { fields };
  const stageIds = [
    "welcome",
    "mobile",
    "displayName",
    "recommendation",
    "analysing",
    "lenders",
    ...(definition.advantageEnabled ? ["advantage"] : []),
    "email",
    "application",
    "review",
    "documents",
    "confirmation",
  ];
  return buildJourneyDraftFromProjection({
    productCode: definition.enterpriseProductCode,
    productLabel: definition.productLabel,
    advantageEnabled: definition.advantageEnabled,
    stageIds,
    fields: projected.fields.map((field) => ({
      fieldId: field.fieldId,
      label: field.label,
      helpText: field.helpText,
      fieldType: field.fieldType,
      required: field.required,
      sequence: field.sequence ?? 0,
      options: field.options,
      purpose: field.purpose,
      visibleWhenField: field.visibleWhenField,
      visibleWhenValues: field.visibleWhenValues,
      requiredWhenField: field.requiredWhenField,
      requiredWhenValues: field.requiredWhenValues,
      min: field.min,
      max: field.max,
    })),
  });
}


export function buildCompassJourneyConfigFromRows(
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
    stages: [],
    otpEnabled: compassOtpEnabled(),
    requestedAmountMax: getApprovedMaxRequestedAmountRupees(definition.enterpriseProductCode),
    requestedAmountMaxLabel: getApprovedRequestedAmountMaxLabel(definition.enterpriseProductCode),
    dtoSource: "enterprise_initial_data_collection",
  };
}
