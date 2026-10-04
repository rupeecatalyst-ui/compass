/**
 * Stage 5C4 — Opportunity Assessment capture UX contract.
 * Readiness copy only. Never describes lender eligibility.
 */

export const OW_OPPORTUNITY_ASSESSMENT_NAV = {
  id: "opportunity_assessment" as const,
  label: "Opportunity Assessment",
};

export const OPPORTUNITY_ASSESSMENT_CAPTURE_SECTIONS = [
  { id: "borrower", title: "Borrower" },
  { id: "income", title: "Income & Obligations" },
  { id: "loan", title: "Loan Requirement" },
  { id: "property", title: "Property" },
  { id: "balance_transfer", title: "Home Loan Balance Transfer" },
  { id: "co_applicant", title: "Co-applicant" },
  { id: "self_employed", title: "Self-employed evidence" },
] as const;

export const OPPORTUNITY_ASSESSMENT_READINESS_COPY = {
  incomplete: "Assessment is missing required facts. This is not a lender decision.",
  conflicted: "Assessment has conflicting facts. Resolve the conflict before finalizing.",
  unsupported: "Canonical recommendation methodology is not available for this assessment.",
  ready: "Assessment facts are complete enough to finalize. This is not a lender approval.",
  stale: "Source records changed after this assessment. Review facts before finalizing.",
} as const;

export const OPPORTUNITY_ASSESSMENT_UNSUPPORTED_COPY: Record<string, string> = {
  SELF_EMPLOYED_INCOME_METHODOLOGY_UNSUPPORTED:
    "Canonical self-employed recommendation methodology is not available. Captured facts are stored; income is not converted into eligibility.",
  HLBT_TRANSACTION_TYPE_UNSUPPORTED:
    "Home Loan Balance Transfer supports balance transfer only.",
};

export const OPPORTUNITY_ASSESSMENT_CAPTURE_FIELD_LABELS: Record<string, string> = {
  "borrower.residency": "Residency",
  "borrower.dateOfBirth": "Date of birth",
  "borrower.employmentFamily": "Employment",
  "borrower.employmentTypeCode": "Occupation type",
  "incomeAndObligations.monthlyIncome": "Monthly income",
  "incomeAndObligations.existingMonthlyObligations": "Existing monthly obligations",
  "incomeAndObligations.requestedTenureMonths": "Requested tenure",
  "loanRequirement.productCode": "Product",
  "loanRequirement.requestedAmount": "Requested amount",
  "loanRequirement.transactionType": "Transaction type",
  "property.propertyValue": "Property value",
  "property.propertyCategory": "Property category",
  "property.constructionStatus": "Construction status",
  "property.propertyCity": "Property city",
  "cibil.kind": "CIBIL status",
  "balanceTransfer.outstandingPrincipal": "Current outstanding",
  "coApplicant.contributionDecision": "Financial contribution",
};

export const OPPORTUNITY_ASSESSMENT_PRISMA_ACTIVATION =
  "Prisma Opportunity Assessment runtime stays inactive until approved Hostinger migrate and prisma generate expose EnterpriseOpportunityAssessment delegates. Memory repository is injection/test only and is never a production fallback.";
