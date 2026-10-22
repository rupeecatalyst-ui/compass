/**
 * Customer application summary for the existing transactional email path.
 * Built only from the submitted snapshot. It does not recalculate Advantage
 * or include documents, credit scores, or identity secrets.
 */

export const COMPASS_ADVANTAGE_ELIGIBILITY_NOTE =
  "You will be eligible for this COMPASS Advantage amount after successful disbursal of this transaction.";

export type ApplicationConfirmationStatus = "queued" | "sent" | "pending" | "failed";

export type ApplicationConfirmationRecord = {
  submissionAt: string;
  status: ApplicationConfirmationStatus;
};

export type ApplicationConfirmationInput = {
  customerName: string;
  reference: string;
  productLabel: string;
  requestedAmount: string | null;
  submittedAt: string;
  assessment: Record<string, string>;
  lenderName: string | null;
  commercials: {
    eligibleOffer: string | null;
    interestRate: string | null;
    emi: string | null;
    tenure: string | null;
    processingTime: string | null;
  };
  advantageAmount: string | null;
  documents: Array<{ label: string; status: string }>;
  documentCompletionPercent: number | null;
  nextSteps: string;
};

const ASSESSMENT_LABELS: Record<string, string> = {
  incomeType: "Employment",
  employmentTypeCode: "Employment",
  city: "City",
  propertyCity: "Property city",
  propertyType: "Property",
  propertyUsage: "Property use",
  loanPurpose: "Purpose",
  currentLender: "Current lender",
};

const HIDDEN_ANSWER_KEYS = new Set([
  "mobile",
  "otp",
  "otpVerified",
  "personalEmail",
  "email",
  "displayName",
  "approxCibilScore",
  "cibil",
  "pan",
  "aadhaar",
  "aadhaarNumber",
  "monthlyIncome",
  "monthlyIncomeLabel",
  "existingEmi",
  "annualTurnover",
  "annualTurnoverLabel",
  "outstandingLoanAmount",
  "loanAmount",
  "requestedAmountLabel",
  "selectedLenderRef",
  "selectedLenderName",
  "selectedProgrammeRef",
  "fieldAnswers",
]);

export function customerAssessmentLines(answers: Record<string, unknown> | null | undefined): Record<string, string> {
  const lines: Record<string, string> = {};
  if (!answers) return lines;
  for (const [key, label] of Object.entries(ASSESSMENT_LABELS)) {
    if (HIDDEN_ANSWER_KEYS.has(key)) continue;
    const value = answers[key];
    if (typeof value !== "string" && typeof value !== "number") continue;
    const text = String(value).trim();
    if (!text || text.includes("@")) continue;
    lines[label] = text;
  }
  return lines;
}

export function readApplicationConfirmation(snapshot: unknown): ApplicationConfirmationRecord | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  const raw = (snapshot as Record<string, unknown>).compassApplicationConfirmation;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const submissionAt = typeof row.submissionAt === "string" ? row.submissionAt : "";
  const status = row.status;
  if (!submissionAt) return null;
  if (status !== "queued" && status !== "sent" && status !== "pending" && status !== "failed") return null;
  return { submissionAt, status };
}

/** One confirmation claim per successful submission. A later retry does not queue another. */
export function confirmationAttempt(
  existing: ApplicationConfirmationRecord | null,
  submissionAt: string,
): "send" | "skip" {
  if (!submissionAt.trim()) return "skip";
  if (!existing) return "send";
  if (existing.submissionAt !== submissionAt) return "send";
  return "skip";
}

export function applicationConfirmationSubject(input: Pick<ApplicationConfirmationInput, "productLabel" | "reference">): string {
  return `Your ${input.productLabel} application ${input.reference}`;
}

export function applicationConfirmationBody(input: ApplicationConfirmationInput): string {
  const lines = [
    `Hello ${input.customerName.trim() || "there"},`,
    "",
    "Your application has been received by Rupee Catalyst.",
    `Reference: ${input.reference}`,
    `Product: ${input.productLabel}`,
    `Requested loan amount: ${input.requestedAmount || "Not available"}`,
    `Submitted: ${input.submittedAt}`,
  ];
  const assessment = Object.entries(input.assessment);
  if (assessment.length) {
    lines.push("", "Details you submitted:");
    for (const [label, value] of assessment) lines.push(`- ${label}: ${value}`);
  }
  lines.push("", `Selected lender: ${input.lenderName || "Not selected"}`);
  if (input.lenderName) {
    lines.push(`Eligible offer: ${input.commercials.eligibleOffer || "Not available"}`);
    lines.push(`ROI: ${input.commercials.interestRate || "Not available"}`);
    lines.push(`EMI: ${input.commercials.emi || "Not available"}`);
    lines.push(`Tenure: ${input.commercials.tenure || "Not available"}`);
    lines.push(`Processing time: ${input.commercials.processingTime || "Not available"}`);
  }
  if (input.advantageAmount) {
    lines.push("", `COMPASS Advantage: ${input.advantageAmount}`);
    lines.push(COMPASS_ADVANTAGE_ELIGIBILITY_NOTE);
  }
  lines.push("", "Documents:");
  if (!input.documents.length) {
    lines.push("- Checklist not available yet");
  } else {
    for (const item of input.documents) lines.push(`- ${item.label}: ${item.status}`);
  }
  if (input.documentCompletionPercent != null) {
    lines.push(`Document completion: ${input.documentCompletionPercent}%`);
  }
  lines.push("", input.nextSteps);
  return lines.join("\n");
}

export function confirmationSourceEventId(opportunityId: string, submissionAt: string): string {
  return `compass-application-confirmation:${opportunityId}:${submissionAt}`;
}
