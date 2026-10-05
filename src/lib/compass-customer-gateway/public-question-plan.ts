/**
 * Public COMPASS question plan.
 * Field identity, order, options, and visibility come from the Catalyst One
 * Initial Data Collection projection. This module classifies that projection.
 * It does not own a second field catalogue.
 */

export type PublicFieldPurpose =
  | "identity"
  | "recommendation"
  | "application"
  | "document"
  | "enrichment";

export type PublicQuestionField = {
  fieldId: string;
  label: string;
  sequence: number;
  required?: boolean;
  purpose?: PublicFieldPurpose;
  journeyRole?: PublicFieldPurpose | null;
  visibleWhenField?: string;
  visibleWhenValues?: string[];
  requiredWhenField?: string;
  requiredWhenValues?: string[];
  notRequiredWhenFilled?: string[];
};

export type PublicAnswerValue = string | number | boolean | null | undefined;

/** Compatibility only. A published field must carry an explicit journeyRole. */
export const LEGACY_JOURNEY_ROLE_FALLBACK = {
  compatibilityOnly: true,
  identity: ["mobile", "mobilePrimary", "displayName", "fullName", "personalEmail", "email"],
  recommendation: [
    "employmentTypeCode",
    "monthlyIncomeLabel",
    "monthlyIncome",
    "approxCibilScore",
    "requestedAmountLabel",
    "loanAmount",
    "propertyValueLabel",
    "propertyValue",
    "propertyType",
    "propertyCity",
    "city",
    "currentLendingInstitution",
    "outstandingLoanAmountLabel",
    "annualTurnoverLabel",
    "existingEmi",
    "existingEmiLabel",
    "employerName",
    "propertyCategory",
    "constructionStatus",
    "assessment:borrower.ageYears",
    "ageYears",
    "assessment:borrower.residency",
    "residency",
  ],
  enrichment: ["remarks"],
  documentPrefix: "document",
  otherwise: "application",
} as const;

const IDENTITY_KEYS = new Set([
  "mobile",
  "mobilePrimary",
  "displayName",
  "fullName",
  "personalEmail",
  "email",
]);

const RECOMMENDATION_KEYS = new Set([
  "employmentTypeCode",
  "monthlyIncomeLabel",
  "monthlyIncome",
  "approxCibilScore",
  "requestedAmountLabel",
  "loanAmount",
  "propertyValueLabel",
  "propertyValue",
  "propertyType",
  "propertyCity",
  "city",
  "currentLendingInstitution",
  "outstandingLoanAmountLabel",
  "annualTurnoverLabel",
  "existingEmi",
  "existingEmiLabel",
  "employerName",
  "propertyCategory",
  "constructionStatus",
  "assessment:borrower.ageYears",
  "ageYears",
  "assessment:borrower.residency",
  "residency",
]);

const ENRICHMENT_KEYS = new Set(["remarks"]);

/**
 * COMPASS customer recommendations execute the published-programme matcher.
 * The stored journey stamp `governed_chanakya` means that matcher.
 * It does not mean canonical Opportunity Assessment eligibility.
 */
export const PUBLIC_CUSTOMER_RECOMMENDATION_EXECUTOR = "published_programme_matcher" as const;

export function journeyRoleSource(field: {
  journeyRole?: PublicFieldPurpose | null;
}): "configured" | "legacy_key" {
  if (
    field.journeyRole === "identity" ||
    field.journeyRole === "recommendation" ||
    field.journeyRole === "application" ||
    field.journeyRole === "document" ||
    field.journeyRole === "enrichment"
  ) {
    return "configured";
  }
  return "legacy_key";
}

export function classifyPublicField(field: {
  fieldId?: string;
  key?: string;
  journeyRole?: PublicFieldPurpose | null;
}): PublicFieldPurpose {
  if (journeyRoleSource(field) === "configured" && field.journeyRole) {
    return field.journeyRole;
  }
  const key = field.fieldId || field.key || "";
  if (IDENTITY_KEYS.has(key)) return "identity";
  if (key.startsWith("document")) return "document";
  if (ENRICHMENT_KEYS.has(key)) return "enrichment";
  if (RECOMMENDATION_KEYS.has(key)) return "recommendation";
  return "application";
}

export function answerText(value: PublicAnswerValue): string {
  if (value == null) return "";
  return String(value).trim();
}

export function isPublicFieldVisible(
  field: PublicQuestionField,
  answers: Record<string, PublicAnswerValue>,
): boolean {
  if (!field.visibleWhenField) return true;
  const current = answerText(answers[field.visibleWhenField]);
  if (!current) return false;
  return (field.visibleWhenValues ?? []).includes(current);
}

export function isPublicFieldRequired(
  field: PublicQuestionField,
  answers: Record<string, PublicAnswerValue>,
): boolean {
  if (!isPublicFieldVisible(field, answers)) return false;
  if (field.notRequiredWhenFilled?.some((key) => answerText(answers[key]))) return false;
  if (field.requiredWhenField) {
    const current = answerText(answers[field.requiredWhenField]);
    return (field.requiredWhenValues ?? []).includes(current);
  }
  return Boolean(field.required);
}

export function quarantineInapplicableAnswers<T extends Record<string, PublicAnswerValue>>(
  fields: PublicQuestionField[],
  answers: T,
): { answers: T; removedKeys: string[] } {
  const removedKeys: string[] = [];
  const next = { ...answers };
  for (const field of fields) {
    if (isPublicFieldVisible(field, answers)) continue;
    if (answerText(next[field.fieldId])) {
      delete next[field.fieldId];
      removedKeys.push(field.fieldId);
    }
  }
  return { answers: next, removedKeys };
}

export function orderedPublicFields(
  fields: PublicQuestionField[],
  purpose?: PublicFieldPurpose,
): PublicQuestionField[] {
  return fields
    .map((field) => ({ ...field, purpose: field.purpose ?? classifyPublicField(field) }))
    .filter((field) => (purpose ? field.purpose === purpose : true))
    .sort((a, b) => a.sequence - b.sequence || a.fieldId.localeCompare(b.fieldId));
}

export function nextUnansweredField(
  fields: PublicQuestionField[],
  answers: Record<string, PublicAnswerValue>,
  purpose: PublicFieldPurpose,
): PublicQuestionField | null {
  const visibleAnswers = quarantineInapplicableAnswers(fields, answers).answers;
  for (const field of orderedPublicFields(fields, purpose)) {
    if (!isPublicFieldVisible(field, visibleAnswers)) continue;
    if (!isPublicFieldRequired(field, visibleAnswers) && !answerText(visibleAnswers[field.fieldId])) {
      if (purpose === "recommendation" && !isPublicFieldRequired(field, visibleAnswers)) continue;
    }
    if (answerText(visibleAnswers[field.fieldId])) continue;
    if (purpose === "recommendation" && !isPublicFieldRequired(field, visibleAnswers)) continue;
    return field;
  }
  return null;
}

export function recommendationReadiness(
  fields: PublicQuestionField[],
  answers: Record<string, PublicAnswerValue>,
): { ready: boolean; missingPublicFieldKeys: string[] } {
  const visibleAnswers = quarantineInapplicableAnswers(fields, answers).answers;
  const missingPublicFieldKeys: string[] = [];
  for (const field of orderedPublicFields(fields, "recommendation")) {
    if (!isPublicFieldRequired(field, visibleAnswers)) continue;
    if (!answerText(visibleAnswers[field.fieldId])) missingPublicFieldKeys.push(field.fieldId);
  }
  return { ready: missingPublicFieldKeys.length === 0, missingPublicFieldKeys };
}

export function publicJourneyStages(input: {
  advantageEnabled: boolean;
  otpVerification?: "on" | "off";
}): string[] {
  const stages = ["welcome", "mobile"];
  if (input.otpVerification === "on") stages.push("otp");
  stages.push(
    "displayName",
    "recommendation",
    "analysing",
    "lenders",
  );
  if (input.advantageEnabled) stages.push("advantage");
  stages.push("email", "application", "review", "documents", "confirmation");
  return stages;
}

export function stageIndex(stages: string[], stage: string): number {
  return stages.indexOf(stage);
}

const SENSITIVE_PUBLIC_KEYS = new Set([
  "lenderRef",
  "programmeId",
  "programId",
  "contactId",
  "opportunityId",
  "primaryContactId",
  "enterpriseLenderId",
  "scheduleId",
]);

export function sanitizePublicPayload<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => sanitizePublicPayload(item)) as T;
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_PUBLIC_KEYS.has(key)) continue;
    out[key] = sanitizePublicPayload(child);
  }
  return out as T;
}

export function stableDocumentIdempotencyKey(input: {
  opportunityId: string;
  typeRef: string;
  contentSha256: string;
}): string {
  const typeRef = input.typeRef.trim() || "doc:other:unclassified";
  return `compass-upload:${input.opportunityId}:${typeRef}:${input.contentSha256}`;
}

export function omitSensitiveResumeAnswers(
  answers: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...answers };
  delete next.mobile;
  delete next.otp;
  delete next.otpVerified;
  return next;
}

export function customerRateLimitDecision(input: {
  recentCount: number;
  limit: number;
}): { allowed: boolean } {
  return { allowed: input.recentCount < input.limit };
}
