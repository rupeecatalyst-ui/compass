/**
 * Boundary between discovery slider visuals and facts an applicant can declare.
 *
 * Slider defaults may initialise a control. They are not customer answers until
 * that control is confirmed. Review, answer persistence, and submit must use
 * collected answers and published field answers only.
 */

export const DISCOVERY_VISUAL_DEFAULTS = {
  loanAmount: 50_00_000,
  propertyValue: 75_00_000,
  monthlyIncome: 1_50_000,
  existingEmi: 0,
  outstandingLoanAmount: 40_00_000,
  annualTurnover: 2_00_00_000,
  projectCost: 10_00_00_000,
} as const;

export type DeclarableNumericKey = keyof typeof DISCOVERY_VISUAL_DEFAULTS;

const DECLARABLE_NUMERIC_KEYS = new Set<string>(Object.keys(DISCOVERY_VISUAL_DEFAULTS));

const LEGACY_FIELD_ALIAS: Record<DeclarableNumericKey, string> = {
  loanAmount: "requestedAmountLabel",
  propertyValue: "propertyValueLabel",
  monthlyIncome: "monthlyIncomeLabel",
  existingEmi: "existingEmiLabel",
  outstandingLoanAmount: "outstandingLoanAmountLabel",
  annualTurnover: "annualTurnoverLabel",
  projectCost: "projectCostLabel",
};

const LEGACY_LABEL: Record<DeclarableNumericKey, string> = {
  loanAmount: "Loan amount",
  propertyValue: "Property value",
  monthlyIncome: "Monthly income",
  existingEmi: "Existing EMI",
  outstandingLoanAmount: "Outstanding balance",
  annualTurnover: "Annual turnover",
  projectCost: "Project cost",
};

const MONEY_FIELD_IDS = new Set<string>([
  ...Object.keys(LEGACY_FIELD_ALIAS),
  ...Object.values(LEGACY_FIELD_ALIAS),
]);

export type DeclarableAnswerState = {
  displayName?: string;
  mobile?: string;
  personalEmail?: string;
  loanAmount?: number;
  propertyValue?: number;
  monthlyIncome?: number;
  existingEmi?: number;
  outstandingLoanAmount?: number;
  annualTurnover?: number;
  projectCost?: number;
  incomeType?: string;
  approxCibilScore?: string;
  companyName?: string;
  facilityType?: string;
  currentLender?: string;
  propertyType?: string;
  propertyUsage?: string;
  otpVerified?: boolean;
  city?: string;
  loanPurpose?: string;
  constitution?: string;
  fieldAnswers?: Record<string, string>;
  fieldLabels?: Record<string, string>;
  collectedFacts?: Partial<Record<DeclarableNumericKey, true>>;
};

export type ReviewFieldDef = {
  fieldId: string;
  label: string;
  fieldType?: string;
  options?: { value: string; label: string }[];
  sequence?: number;
};

export type ReviewDeclarationRow = {
  id: string;
  label: string;
  value: string;
};

export function isDeclarableNumericKey(key: string): key is DeclarableNumericKey {
  return DECLARABLE_NUMERIC_KEYS.has(key);
}

export function isAuthoritativeNumeric(
  key: DeclarableNumericKey,
  value: number | null | undefined,
  collectedFacts: DeclarableAnswerState["collectedFacts"],
): boolean {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (collectedFacts?.[key] === true) return true;
  return Math.round(value) !== DISCOVERY_VISUAL_DEFAULTS[key];
}

function formatInr(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function formatAnswerValue(fieldId: string, raw: string, field?: ReviewFieldDef): string {
  const option = field?.options?.find((item) => item.value === raw);
  if (option) return option.label;
  const numeric = Number(String(raw).replace(/,/g, ""));
  const money = field?.fieldType === "currency" || MONEY_FIELD_IDS.has(fieldId);
  if (money && Number.isFinite(numeric) && numeric > 0) return formatInr(numeric);
  return raw;
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function buildReviewDeclarationRows(
  answers: DeclarableAnswerState,
  fields: readonly ReviewFieldDef[] = [],
): ReviewDeclarationRow[] {
  const rows: ReviewDeclarationRow[] = [];
  const seen = new Set<string>();
  const bag = answers.fieldAnswers ?? {};

  const push = (id: string, label: string, value: string) => {
    if (seen.has(id) || !value.trim()) return;
    seen.add(id);
    rows.push({ id, label, value });
  };

  if (hasText(answers.displayName)) push("displayName", "Full name", answers.displayName.trim());
  else if (hasText(bag.displayName)) push("displayName", "Full name", bag.displayName.trim());

  if (hasText(answers.mobile)) push("mobile", "Mobile", answers.mobile.trim());
  if (hasText(answers.personalEmail)) push("personalEmail", "Email", answers.personalEmail.trim());
  else if (hasText(bag.personalEmail)) push("personalEmail", "Email", bag.personalEmail.trim());

  const ordered = [...fields].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  for (const field of ordered) {
    if (field.fieldId === "displayName" || field.fieldId === "personalEmail" || field.fieldId === "mobile") {
      continue;
    }
    const raw = bag[field.fieldId];
    if (!hasText(raw)) continue;
    const label = answers.fieldLabels?.[field.fieldId];
    push(
      field.fieldId,
      field.label,
      label?.trim() || formatAnswerValue(field.fieldId, raw.trim(), field),
    );
  }

  for (const key of Object.keys(DISCOVERY_VISUAL_DEFAULTS) as DeclarableNumericKey[]) {
    const alias = LEGACY_FIELD_ALIAS[key];
    if (seen.has(alias) || seen.has(key)) continue;
    const value = answers[key];
    if (!isAuthoritativeNumeric(key, value, answers.collectedFacts)) continue;
    push(key, LEGACY_LABEL[key], formatInr(value as number));
  }

  if (!seen.has("currentLender") && !seen.has("currentLendingInstitution") && hasText(answers.currentLender)) {
    push("currentLender", "Current lender", answers.currentLender.trim());
  }
  if (!seen.has("companyName") && hasText(answers.companyName)) {
    push("companyName", "Business", answers.companyName.trim());
  }
  if (!seen.has("facilityType") && hasText(answers.facilityType)) {
    push("facilityType", "Facility", answers.facilityType.replace(/_/g, " "));
  }
  if (!seen.has("employmentTypeCode") && hasText(answers.incomeType)) {
    const field = ordered.find((item) => item.fieldId === "employmentTypeCode");
    push(
      "employmentTypeCode",
      field?.label || "Employment",
      formatAnswerValue("employmentTypeCode", answers.incomeType.trim(), field),
    );
  }

  if (!seen.has("approxCibilScore") && hasText(answers.approxCibilScore)) {
    const field = ordered.find((item) => item.fieldId === "approxCibilScore");
    push(
      "approxCibilScore",
      field?.label || "Expected CIBIL Score",
      formatAnswerValue("approxCibilScore", answers.approxCibilScore.trim(), field),
    );
  }

  return rows;
}

export function authoritativeRequestedAmountRupees(answers: DeclarableAnswerState): number | null {
  const labeled = Number(String(answers.fieldAnswers?.requestedAmountLabel ?? "").replace(/,/g, ""));
  if (Number.isFinite(labeled) && labeled > 0) return Math.round(labeled);
  if (isAuthoritativeNumeric("loanAmount", answers.loanAmount, answers.collectedFacts)) {
    return Math.round(answers.loanAmount as number);
  }
  return null;
}

export function buildCompassAnswersPayload(
  answers: DeclarableAnswerState,
  allowedKeys: ReadonlySet<string>,
): Record<string, string | number | boolean> {
  const raw: Record<string, string | number | boolean | undefined> = {
    propertyType: answers.propertyType,
    propertyUsage: answers.propertyUsage,
    loanAmount: answers.loanAmount,
    propertyValue: answers.propertyValue,
    mobile: answers.mobile,
    otpVerified: answers.otpVerified,
    incomeType: answers.incomeType,
    employmentTypeCode: answers.fieldAnswers?.employmentTypeCode || answers.incomeType,
    monthlyIncome: answers.monthlyIncome,
    existingEmi: answers.existingEmi,
    city: answers.city,
    loanPurpose: answers.loanPurpose,
    companyName: answers.companyName,
    constitution: answers.constitution,
    annualTurnover: answers.annualTurnover,
    facilityType: answers.facilityType,
    projectCost: answers.projectCost,
    currentLender: answers.currentLender,
    outstandingLoanAmount: answers.outstandingLoanAmount,
    approxCibilScore: answers.approxCibilScore,
    displayName: answers.displayName,
    personalEmail: answers.personalEmail,
    ...answers.fieldAnswers,
  };
  const payload: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!allowedKeys.has(key) || value == null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    if (
      isDeclarableNumericKey(key) &&
      !isAuthoritativeNumeric(key, value as number, answers.collectedFacts)
    ) {
      continue;
    }
    payload[key] = value;
  }
  return payload;
}

/** Mirrors the Catalyst One property-value projection: label, else legacy number, else absent. */
export function propertyValueRupeesFromPayload(
  payload: Record<string, string | number | boolean>,
): number | null {
  const raw = payload.propertyValueLabel ?? payload.propertyValue;
  if (raw == null || raw === "") return null;
  const numeric = Number(String(raw).replace(/,/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.round(numeric);
}

export function compassSubmitDeclarationBody(input: {
  consentAccepted: boolean;
  lenderShareAccepted: boolean;
  declarationsAccepted: boolean;
}): {
  consentAccepted: boolean;
  lenderShareAccepted: boolean;
  declarationsAccepted: boolean;
} {
  return {
    consentAccepted: input.consentAccepted === true,
    lenderShareAccepted: input.lenderShareAccepted === true,
    declarationsAccepted: input.declarationsAccepted === true,
  };
}
