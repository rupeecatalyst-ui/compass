import type { CanonicalLenderRecommendationRequest } from "@/types/canonical-lender-recommendation";
import {
  ASSESSMENT_FORBIDDEN_TRANSACTION_TYPES,
  type AssessmentFact,
  type OpportunityAssessmentFactsV1,
} from "@/types/opportunity-assessment";
import { OpportunityAssessmentError } from "./errors";

export type CanonicalMappedRecommendationInput = {
  product: CanonicalLenderRecommendationRequest["product"];
  customer: CanonicalLenderRecommendationRequest["customer"];
  fieldProvenance: Record<string, string>;
};

function knownValue<T>(fact: AssessmentFact<T>): T | null {
  if (fact.state !== "known" || fact.value == null) return null;
  return fact.value;
}

function knownMoney(fact: AssessmentFact<string>): number | null {
  const value = knownValue(fact);
  if (value == null) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function knownInteger(fact: AssessmentFact<number>): number | null {
  const value = knownValue(fact);
  if (value == null || !Number.isInteger(value)) return null;
  return value;
}

function provenance(map: Record<string, string>, field: string, fact: AssessmentFact<unknown>, path: string) {
  if (fact.state === "known" && fact.value != null) map[field] = fact.sourceFieldKey ?? path;
}

/**
 * Explicit Stage 5C1 facts → Stage 4B canonical customer.
 * Missing stays missing. Unknown stays unknown. No borrower defaults.
 */
export function mapFinalizedAssessmentFactsToCanonical(
  facts: OpportunityAssessmentFactsV1,
): CanonicalMappedRecommendationInput {
  const product = knownValue(facts.loanRequirement.productCode);
  if (product !== "HOME_LOAN" && product !== "HOME_LOAN_BT") {
    throw new OpportunityAssessmentError("ASSESSMENT_UNSUPPORTED", "UNSUPPORTED_RECOMMENDATION_PRODUCT");
  }

  const transactionType = knownValue(facts.loanRequirement.transactionType);
  if (
    transactionType &&
    (ASSESSMENT_FORBIDDEN_TRANSACTION_TYPES as readonly string[]).includes(transactionType)
  ) {
    throw new OpportunityAssessmentError("ASSESSMENT_UNSUPPORTED", "UNSUPPORTED_RECOMMENDATION_TRANSACTION");
  }
  if (product === "HOME_LOAN_BT" && transactionType !== "balance_transfer") {
    throw new OpportunityAssessmentError("ASSESSMENT_UNSUPPORTED", "UNSUPPORTED_RECOMMENDATION_TRANSACTION");
  }
  if (product === "HOME_LOAN" && transactionType != null) {
    throw new OpportunityAssessmentError("ASSESSMENT_UNSUPPORTED", "UNSUPPORTED_RECOMMENDATION_TRANSACTION");
  }

  const employmentFamily = knownValue(facts.borrower.employmentFamily);
  if (employmentFamily === "self_employed") {
    throw new OpportunityAssessmentError("ASSESSMENT_UNSUPPORTED", "SELF_EMPLOYED_ASSESSMENT_UNSUPPORTED");
  }

  const fieldProvenance: Record<string, string> = {};
  const contribution = knownValue(facts.coApplicant.contributionDecision);
  const customer: CanonicalLenderRecommendationRequest["customer"] = {
    journeyKind: product === "HOME_LOAN" ? "home_loan" : "home_loan_balance_transfer",
    requiredAmountRupees: knownMoney(facts.loanRequirement.requestedAmount),
    propertyValueRupees: knownMoney(facts.property.propertyValue),
    employmentFamily: employmentFamily === "salaried" || employmentFamily === "unknown" ? employmentFamily : "unknown",
    employmentType: knownValue(facts.borrower.employmentTypeCode),
    residency: knownValue(facts.borrower.residency),
    dateOfBirth: knownValue(facts.borrower.dateOfBirth),
    constitution: knownValue(facts.borrower.constitution),
    city: knownValue(facts.property.propertyCity),
    state: knownValue(facts.property.propertyState),
    pincode: knownValue(facts.property.pincode),
    propertyType: knownValue(facts.property.propertyCategory),
    propertyKind: knownValue(facts.property.propertyKind),
    constructionStatus: knownValue(facts.property.constructionStatus),
    occupancy: knownValue(facts.property.occupancy),
    possessionStatus: knownValue(facts.property.possessionStatus),
    registrationStatus: knownValue(facts.property.registrationStatus),
    monthlyIncomeRupees: knownMoney(facts.incomeAndObligations.monthlyIncome),
    existingMonthlyEmiRupees: knownMoney(facts.incomeAndObligations.existingMonthlyObligations),
    customerSelectedTenureMonths: knownInteger(facts.incomeAndObligations.requestedTenureMonths),
    cibilBand: mapCibil(facts),
    coApplicantDecision: contribution,
    coApplicant: contribution === "yes" ? {
      relationship: knownValue(facts.coApplicant.relationship),
      dateOfBirth: knownValue(facts.coApplicant.dateOfBirth),
      employmentType: knownValue(facts.coApplicant.employmentType),
      monthlyIncomeRupees: knownMoney(facts.coApplicant.contributedIncome),
      existingMonthlyEmiRupees: knownMoney(facts.coApplicant.obligations),
    } : null,
    currentOutstandingRupees: null,
    currentOutstandingCertainty: null,
    currentHomeLoanEmiRupees: null,
    currentHomeLoanEmiCertainty: null,
    currentRoiPercent: null,
    currentRoiCertainty: null,
    remainingTenureMonths: null,
    remainingTenureCertainty: null,
    loanStartDate: null,
    loanStartDateCertainty: null,
    repaymentTrack: null,
    delayedEmiCount: null,
    originalSanctionedRupees: null,
    originalTenureMonths: null,
    rateType: null,
  };

  provenance(fieldProvenance, "requiredAmountRupees", facts.loanRequirement.requestedAmount, "loanRequirement.requestedAmount");
  provenance(fieldProvenance, "propertyValueRupees", facts.property.propertyValue, "property.propertyValue");
  provenance(fieldProvenance, "residency", facts.borrower.residency, "borrower.residency");
  provenance(fieldProvenance, "city", facts.property.propertyCity, "property.propertyCity");
  provenance(fieldProvenance, "monthlyIncomeRupees", facts.incomeAndObligations.monthlyIncome, "incomeAndObligations.monthlyIncome");
  provenance(fieldProvenance, "existingMonthlyEmiRupees", facts.incomeAndObligations.existingMonthlyObligations, "incomeAndObligations.existingMonthlyObligations");
  provenance(fieldProvenance, "customerSelectedTenureMonths", facts.incomeAndObligations.requestedTenureMonths, "incomeAndObligations.requestedTenureMonths");
  provenance(fieldProvenance, "cibilBand", facts.cibil.kind, "cibil.kind");

  if (product === "HOME_LOAN_BT") {
    customer.currentOutstandingRupees = knownMoney(facts.balanceTransfer.outstandingPrincipal);
    customer.currentOutstandingCertainty = knownValue(facts.balanceTransfer.outstandingCertainty);
    customer.currentHomeLoanEmiRupees = knownMoney(facts.balanceTransfer.currentHomeLoanEmi);
    customer.currentHomeLoanEmiCertainty = knownValue(facts.balanceTransfer.currentHomeLoanEmiCertainty);
    customer.currentRoiPercent = knownMoney(facts.balanceTransfer.currentRoiPercent);
    customer.currentRoiCertainty = knownValue(facts.balanceTransfer.currentRoiCertainty);
    customer.remainingTenureMonths = knownInteger(facts.balanceTransfer.remainingTenureMonths);
    customer.remainingTenureCertainty = knownValue(facts.balanceTransfer.remainingTenureCertainty);
    customer.loanStartDate = knownValue(facts.balanceTransfer.loanStartDate);
    customer.loanStartDateCertainty = knownValue(facts.balanceTransfer.loanStartDateCertainty);
    customer.repaymentTrack = knownValue(facts.balanceTransfer.repaymentTrack);
    customer.delayedEmiCount = knownInteger(facts.balanceTransfer.delayedEmiCount);
    customer.originalSanctionedRupees = knownMoney(facts.balanceTransfer.originalSanctionedAmount);
    customer.originalTenureMonths = knownInteger(facts.balanceTransfer.originalTenureMonths);
    customer.rateType = knownValue(facts.balanceTransfer.rateType);
    provenance(fieldProvenance, "currentOutstandingRupees", facts.balanceTransfer.outstandingPrincipal, "balanceTransfer.outstandingPrincipal");
    provenance(fieldProvenance, "currentHomeLoanEmiRupees", facts.balanceTransfer.currentHomeLoanEmi, "balanceTransfer.currentHomeLoanEmi");
    provenance(fieldProvenance, "loanStartDate", facts.balanceTransfer.loanStartDate, "balanceTransfer.loanStartDate");
    provenance(fieldProvenance, "repaymentTrack", facts.balanceTransfer.repaymentTrack, "balanceTransfer.repaymentTrack");
    provenance(fieldProvenance, "delayedEmiCount", facts.balanceTransfer.delayedEmiCount, "balanceTransfer.delayedEmiCount");
  }

  return { product, customer, fieldProvenance };
}

function mapCibil(facts: OpportunityAssessmentFactsV1): string | number | null {
  const kind = knownValue(facts.cibil.kind);
  if (kind === "exact") return knownInteger(facts.cibil.exactScore);
  if (kind === "expected_band") return knownValue(facts.cibil.expectedBand);
  if (kind === "explicitly_unknown") return "not_known";
  return null;
}
