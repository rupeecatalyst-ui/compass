import type { CustomerAssessmentInput, HlBtJourneyKind } from "./assisted-offer";
import {
  parseCertaintyAmount,
  parseCertaintyDate,
  parseCertaintyMonths,
  parseCertaintyPercent,
  parseRateType,
} from "./bt-journey";

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  return null;
}

export function journeyKindFromProduct(
  productCode: string,
  answers: Record<string, unknown>,
): HlBtJourneyKind {
  if (productCode !== "home-loan-balance-transfer") return "home_loan";
  if (answers.topUpChoice === "with_topup") return "home_loan_balance_transfer_topup";
  return "home_loan_balance_transfer";
}

export function customerInputFromCompassAnswers(
  productCode: string,
  answers: Record<string, unknown>,
): CustomerAssessmentInput {
  const incomeType = String(answers.incomeType || answers.employmentTypeCode || "");
  const employmentFamily: CustomerAssessmentInput["employmentFamily"] = incomeType.startsWith("self-employed")
    ? "self_employed"
    : incomeType === "salaried"
      ? "salaried"
      : "unknown";
  const outstanding = parseCertaintyAmount(answers.outstandingLoanAmount, answers.outstandingCertainty);
  const topUp = parseCertaintyAmount(answers.topUpAmount, answers.topUpAmountCertainty);
  const propertyValue = parseCertaintyAmount(answers.propertyValue, answers.propertyValueCertainty);
  const roi = parseCertaintyPercent(answers.currentRoi, answers.currentRoiCertainty);
  const emi = parseCertaintyAmount(answers.currentEmi, answers.currentEmiCertainty);
  const remaining = parseCertaintyMonths(answers.remainingTenureMonths, answers.remainingTenureCertainty);
  const originalTenure = parseCertaintyMonths(answers.originalTenureMonths, answers.originalTenureCertainty);
  const sanctioned = parseCertaintyAmount(answers.originalSanctionedAmount, answers.originalSanctionedCertainty);
  const start = parseCertaintyDate(answers.loanStartDate, answers.loanStartDateCertainty);
  const required =
    productCode === "home-loan-balance-transfer" ? outstanding.valueRupees : num(answers.loanAmount);
  return {
    journeyKind: journeyKindFromProduct(productCode, answers),
    requiredAmountRupees: required,
    topUpAmountRupees: answers.topUpChoice === "with_topup" ? topUp.valueRupees : null,
    propertyValueRupees: propertyValue.valueRupees,
    propertyValueIsCustomerDeclared: propertyValue.certainty !== "not_known",
    city: typeof answers.city === "string" ? answers.city : null,
    pincode: typeof answers.pincode === "string" ? answers.pincode : null,
    propertyType: typeof answers.propertyKind === "string" ? answers.propertyKind : typeof answers.propertyType === "string" ? answers.propertyType : null,
    occupancy: typeof answers.occupancy === "string" ? answers.occupancy : typeof answers.propertyUsage === "string" ? answers.propertyUsage : null,
    constructionStatus: typeof answers.constructionStatus === "string" ? answers.constructionStatus : null,
    loanPurpose: typeof answers.loanPurpose === "string" ? answers.loanPurpose : null,
    builderSource: typeof answers.builderSource === "string" ? answers.builderSource : null,
    dateOfBirth: typeof answers.dateOfBirth === "string" ? answers.dateOfBirth : null,
    employmentFamily,
    constitution: typeof answers.constitution === "string" ? answers.constitution : null,
    residency: typeof answers.residency === "string" ? answers.residency : null,
    cibilBand: (answers.approxCibilScore as string | number | null) ?? null,
    monthlyIncomeRupees: num(answers.monthlyIncome),
    existingMonthlyEmiRupees: num(answers.existingEmi),
    currentHomeLoanEmiRupees: emi.valueRupees,
    currentHomeLoanEmiCertainty: emi.certainty,
    currentOutstandingRupees: outstanding.valueRupees,
    currentOutstandingCertainty: outstanding.certainty,
    originalSanctionedRupees: sanctioned.valueRupees,
    loanStartDate: start.isoDate,
    loanStartDateCertainty: start.certainty,
    currentRoiPercent: roi.valuePercent,
    currentRoiCertainty: roi.certainty,
    rateType: parseRateType(answers.rateType),
    remainingTenureMonths: remaining.months,
    remainingTenureCertainty: remaining.certainty,
    originalTenureMonths: originalTenure.months,
    repaymentTrack:
      answers.repaymentTrack === "yes" || answers.repaymentTrack === "no" || answers.repaymentTrack === "not_sure"
        ? answers.repaymentTrack
        : null,
    delayedEmiCount: num(answers.delayedEmiCount),
    propertyKind: typeof answers.propertyKind === "string" ? answers.propertyKind : null,
    possessionStatus: typeof answers.possessionStatus === "string" ? answers.possessionStatus : null,
    registrationStatus: typeof answers.registrationStatus === "string" ? answers.registrationStatus : null,
    topUpPurpose: typeof answers.topUpPurpose === "string" ? answers.topUpPurpose : null,
    coApplicantDecision:
      answers.coApplicantDecision === "yes" ||
      answers.coApplicantDecision === "no" ||
      answers.coApplicantDecision === "not_decided"
        ? answers.coApplicantDecision
        : null,
    coApplicant:
      answers.coApplicantDecision === "yes"
        ? {
            relationship: typeof answers.coApplicantRelationship === "string" ? answers.coApplicantRelationship : null,
            dateOfBirth: typeof answers.coApplicantDob === "string" ? answers.coApplicantDob : null,
            employmentType: typeof answers.coApplicantEmployment === "string" ? answers.coApplicantEmployment : null,
            monthlyIncomeRupees: num(answers.coApplicantIncome),
            existingMonthlyEmiRupees: num(answers.coApplicantExistingEmi),
          }
        : null,
  };
}
