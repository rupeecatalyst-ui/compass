export type EligibilityMatchState =
  | "exact_match"
  | "standard_match"
  | "conditional_match"
  | "deviation_match"
  | "closest_feasible_option"
  | "more_information_required"
  | "assisted_assessment";

export type HlBtJourneyKind = "home_loan" | "home_loan_balance_transfer" | "home_loan_balance_transfer_topup";

export type CustomerAssessmentInput = {
  journeyKind: HlBtJourneyKind;
  requiredAmountRupees: number | null;
  topUpAmountRupees?: number | null;
  propertyValueRupees: number | null;
  propertyValueIsCustomerDeclared?: boolean;
  city?: string | null;
  pincode?: string | null;
  propertyType?: string | null;
  occupancy?: string | null;
  constructionStatus?: string | null;
  loanPurpose?: string | null;
  builderSource?: string | null;
  dateOfBirth?: string | null;
  employmentFamily: "salaried" | "self_employed" | "unknown";
  constitution?: string | null;
  residency?: string | null;
  cibilBand?: string | number | null;
  monthlyIncomeRupees?: number | null;
  existingMonthlyEmiRupees?: number | null;
  currentHomeLoanEmiRupees?: number | null;
  currentOutstandingRupees?: number | null;
  currentRoiPercent?: number | null;
  remainingTenureMonths?: number | null;
  repaymentTrack?: "yes" | "no" | "not_sure" | null;
  delayedEmiCount?: number | null;
  customerSelectedTenureMonths?: number | null;
  coApplicant?: {
    relationship?: string | null;
    dateOfBirth?: string | null;
    employmentType?: string | null;
    monthlyIncomeRupees?: number | null;
    existingMonthlyEmiRupees?: number | null;
  } | null;
  coApplicantDecision?: "yes" | "no" | "not_decided" | null;
};

export const ASSISTED_HOME_LOAN_COPY = {
  headline: "Assisted Home Loan Offer",
  body: "Based on the information provided, your requested loan does not currently fit the available standard programme criteria. We will review alternate lenders, co-applicant options, income assessment and permissible policy structures to identify the best possible offer.",
} as const;

export const ASSISTED_BALANCE_TRANSFER_COPY = {
  headline: "Assisted Balance Transfer Offer",
  body: "Your Balance Transfer requirement needs a specialist review. We will assess alternate lenders, outstanding balance, repayment track, top-up options and permissible policy structures to identify the best possible offer.",
} as const;
