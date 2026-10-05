/**
 * HOME_LOAN v2 draft builder.
 * Copies a published definition and adds the approved recommendation facts.
 * It does not publish, and it does not mutate the published object.
 */

import {
  HOME_LOAN_AGE_ENTRY_MAX,
  HOME_LOAN_AGE_ENTRY_MIN,
  HOME_LOAN_AGE_FIELD_ID,
  HOME_LOAN_PROPERTY_CITY_FIELD_ID,
  HOME_LOAN_RESIDENCY_FIELD_ID,
  HOME_LOAN_RESIDENCY_OPTIONS,
} from "@/lib/compass-customer-gateway/public-programme-match";
import type {
  JourneyDraft,
  JourneyFieldDraft,
  PublishedJourneyDefinition,
} from "@/lib/product-journey/publication";

export const HOME_LOAN_V2_RECOMMENDATION_ORDER = [
  "employmentTypeCode",
  "employerName",
  "occupation",
  HOME_LOAN_AGE_FIELD_ID,
  HOME_LOAN_RESIDENCY_FIELD_ID,
  "propertyCategory",
  "constructionStatus",
  HOME_LOAN_PROPERTY_CITY_FIELD_ID,
  "monthlyIncomeLabel",
  "annualTurnoverLabel",
  "approxCibilScore",
  "requestedAmountLabel",
] as const;

function recommendationField(
  stageId: string,
  field: Omit<JourneyFieldDraft, "stageId" | "sequence" | "purpose" | "includeOnReview">,
): JourneyFieldDraft {
  return {
    ...field,
    stageId,
    sequence: 0,
    purpose: "recommendation",
    includeOnReview: true,
  };
}

function v2Additions(stageId: string): JourneyFieldDraft[] {
  return [
    recommendationField(stageId, {
      fieldId: HOME_LOAN_AGE_FIELD_ID,
      label: "Your age",
      helpText: "Your age in years. Lender programmes apply their own age limits.",
      fieldType: "number",
      required: true,
      min: HOME_LOAN_AGE_ENTRY_MIN,
      max: HOME_LOAN_AGE_ENTRY_MAX,
    }),
    recommendationField(stageId, {
      fieldId: HOME_LOAN_RESIDENCY_FIELD_ID,
      label: "Residency status",
      helpText: "Select the residency status that applies to you.",
      fieldType: "single_select",
      required: true,
      options: HOME_LOAN_RESIDENCY_OPTIONS.map((item) => ({ value: item.value, label: item.label })),
    }),
    recommendationField(stageId, {
      fieldId: HOME_LOAN_PROPERTY_CITY_FIELD_ID,
      label: "Property city",
      helpText: "City where the property is located.",
      fieldType: "location",
      required: true,
    }),
  ];
}

export function buildHomeLoanV2Draft(published: PublishedJourneyDefinition): JourneyDraft {
  const source = structuredClone(published);
  const stageId =
    source.fields.find((field) => field.fieldId === "employmentTypeCode")?.stageId ??
    source.stages.find((stage) => stage.stageId === "recommendation")?.stageId ??
    "recommendation";
  const byId = new Map(source.fields.map((field) => [field.fieldId, structuredClone(field)]));
  for (const field of v2Additions(stageId)) {
    if (!byId.has(field.fieldId)) byId.set(field.fieldId, field);
  }
  const propertyValue = byId.get("propertyValueLabel");
  if (propertyValue) {
    propertyValue.required = false;
    propertyValue.requiredWhen = undefined;
  }
  const orderedIds = [
    ...HOME_LOAN_V2_RECOMMENDATION_ORDER,
    ...(propertyValue ? ["propertyValueLabel"] : []),
  ];
  const used = new Set<string>();
  const fields: JourneyFieldDraft[] = [];
  for (const fieldId of orderedIds) {
    const field = byId.get(fieldId);
    if (!field) continue;
    used.add(fieldId);
    fields.push({ ...field, stageId, sequence: fields.length + 1 });
  }
  for (const field of source.fields) {
    if (used.has(field.fieldId)) continue;
    fields.push(structuredClone(field));
  }
  return {
    productCode: source.productCode,
    productLabel: source.productLabel,
    lifecycle: "draft",
    previewed: false,
    publiclyEnabled: source.publiclyEnabled,
    advantageEnabled: source.advantageEnabled,
    recommendationBinding: source.recommendationBinding,
    consentVersion: source.consentVersion,
    lodSource: source.lodSource,
    mobileCapture: source.mobileCapture,
    otpVerification: source.otpVerification,
    sourceReference: source.sourceReference,
    confirmation: structuredClone(source.confirmation),
    stages: structuredClone(source.stages),
    fields,
  };
}
