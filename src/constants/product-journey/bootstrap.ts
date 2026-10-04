/**
 * Bootstrap Product Journey rows — derived from the approved lean COMPASS/customer capture.
 * Not the Assessment hardcoded readiness list. Not the bloated local COMPASS HL_STEPS.
 * Product Owner may replace this by activating a Product Journey Definition.
 *
 * Seeded Home Loan capture:
 * employment, monthly income (salaried), requested amount, property value,
 * existing EMI, CIBIL kind, requested tenure, journey city, construction/property type.
 *
 * Seeded Home Loan mandatory-for-recommendation:
 * employment, monthly income (salaried), requested amount, property value,
 * existing EMI, CIBIL kind, requested tenure.
 *
 * Tenure is seeded because the existing FOIR proposed-EMI calculator already requires it.
 * It is not invented as a new question family.
 *
 * Explicitly NOT seeded (PO Home Loan principles):
 * DOB, residency, property category, property city, occupancy, co-applicant.
 */

import type { ProductJourneyFieldRow } from "@/types/product-journey-definition";

const HL_CAPTURE: ProductJourneyFieldRow[] = [
  {
    fieldId: "assessment:borrower.ageYears",
    label: "Age",
    applicability: "all",
    capture: true,
    mandatoryForRecommendation: false,
    displayOrder: 15,
    captureStepId: "ageYears",
    idcKeys: ["ageYears"],
  },
  {
    fieldId: "assessment:borrower.employmentFamily",
    label: "Employment Type",
    applicability: "all",
    capture: true,
    mandatoryForRecommendation: true,
    displayOrder: 10,
    captureStepId: "incomeType",
    idcKeys: ["employmentTypeCode"],
    seedReason: "Current COMPASS/C1 employment capture.",
  },
  {
    fieldId: "assessment:incomeAndObligations.monthlyIncome",
    label: "Monthly Income",
    applicability: "salaried",
    capture: true,
    mandatoryForRecommendation: true,
    displayOrder: 20,
    captureStepId: "monthlyIncome",
    idcKeys: ["monthlyIncome", "monthlyIncomeLabel"],
    seedReason: "Current COMPASS salaried income capture. Self-employed not applicable.",
  },
  {
    fieldId: "assessment:loanRequirement.requestedAmount",
    label: "Required Loan Amount",
    applicability: "all",
    capture: true,
    mandatoryForRecommendation: true,
    displayOrder: 30,
    captureStepId: "loanAmount",
    idcKeys: ["loanAmount", "requestedAmountLabel"],
    seedReason: "Current COMPASS/C1 requested amount capture.",
  },
  {
    fieldId: "assessment:property.propertyValue",
    label: "Property Value",
    applicability: "all",
    capture: true,
    mandatoryForRecommendation: true,
    displayOrder: 40,
    captureStepId: "propertyValue",
    idcKeys: ["propertyValueLabel"],
    seedReason: "Current COMPASS property value capture.",
  },
  {
    fieldId: "assessment:incomeAndObligations.existingMonthlyObligations",
    label: "Existing Monthly Obligations",
    applicability: "all",
    capture: true,
    mandatoryForRecommendation: true,
    displayOrder: 50,
    captureStepId: "existingEmi",
    seedReason: "Current COMPASS EMI capture. FOIR input; not automatically a Match % criterion.",
  },
  {
    fieldId: "assessment:cibil.kind",
    label: "Expected CIBIL / Not Known",
    applicability: "all",
    capture: true,
    mandatoryForRecommendation: true,
    displayOrder: 60,
    captureStepId: "approxCibilScore",
    idcKeys: ["approxCibilScore"],
    seedReason: "Current COMPASS CIBIL capture. Not Known is valid. Exact score is not fabricated.",
  },
  {
    fieldId: "assessment:incomeAndObligations.requestedTenureMonths",
    label: "Requested Tenure",
    applicability: "all",
    capture: true,
    mandatoryForRecommendation: true,
    displayOrder: 70,
    captureStepId: null,
    seedReason:
      "Existing FOIR proposed-EMI calculation already requires requested tenure. Not a new invented question family. COMPASS has no tenure step today; C1 Assessment captures it until Product Owner changes this row.",
  },
  {
    fieldId: "assessment:borrower.journeyCity",
    label: "City",
    applicability: "all",
    capture: true,
    mandatoryForRecommendation: false,
    displayOrder: 80,
    captureStepId: "city",
    idcKeys: ["city"],
    seedReason: "Current COMPASS city capture. Not a Home Loan recommendation gate.",
  },
  {
    fieldId: "assessment:property.constructionStatus",
    label: "Property Type / Construction",
    applicability: "all",
    capture: true,
    mandatoryForRecommendation: false,
    displayOrder: 90,
    captureStepId: "propertyType",
    idcKeys: ["propertyType"],
    seedReason: "Current COMPASS ready/construction capture. Not a recommendation gate.",
  },
];

const HLBT_EXTRA: ProductJourneyFieldRow[] = [
  {
    fieldId: "assessment:balanceTransfer.outstandingPrincipal",
    label: "Outstanding Loan Amount",
    applicability: "all",
    capture: true,
    mandatoryForRecommendation: true,
    displayOrder: 35,
    captureStepId: "outstandingLoanAmount",
    seedReason: "Current COMPASS HLBT outstanding capture.",
  },
  {
    fieldId: "assessment:balanceTransfer.existingLenderInstitution",
    label: "Current Lender",
    applicability: "all",
    capture: true,
    mandatoryForRecommendation: false,
    displayOrder: 34,
    captureStepId: "currentLender",
    seedReason: "Current COMPASS HLBT current-lender capture.",
  },
];

export const PRODUCT_JOURNEY_BOOTSTRAP: Record<string, ProductJourneyFieldRow[]> = {
  HOME_LOAN: HL_CAPTURE,
  HOME_LOAN_BT: [...HL_CAPTURE, ...HLBT_EXTRA].sort((a, b) => a.displayOrder - b.displayOrder),
};

export function bootstrapProductJourneyFields(productCode: string | null | undefined): ProductJourneyFieldRow[] {
  const code = (productCode ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (code === "HOME_LOAN_BT" || code === "HOME_LOAN_BALANCE_TRANSFER") {
    return PRODUCT_JOURNEY_BOOTSTRAP.HOME_LOAN_BT.map((row) => ({ ...row }));
  }
  if (code === "HOME_LOAN" || code === "HL") {
    return PRODUCT_JOURNEY_BOOTSTRAP.HOME_LOAN.map((row) => ({ ...row }));
  }
  return [];
}
