import type { AssessmentFact, AssessmentReadinessStatus, OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import { OpportunityAssessmentError } from "./errors";

function collectFacts(facts: OpportunityAssessmentFactsV1): AssessmentFact<unknown>[] {
  return [
    ...Object.values(facts.borrower),
    ...Object.values(facts.incomeAndObligations),
    ...Object.values(facts.loanRequirement),
    ...Object.values(facts.property),
    ...Object.values(facts.cibil),
    ...Object.values(facts.balanceTransfer),
    ...Object.values(facts.coApplicant),
    ...Object.values(facts.selfEmployedEvidence),
  ];
}

export function deriveOpportunityAssessmentReadiness(facts: OpportunityAssessmentFactsV1): {
  readinessStatus: AssessmentReadinessStatus;
  unsupportedReasonCode: string | null;
} {
  if (collectFacts(facts).some((fact) => fact.state === "conflicting")) {
    return { readinessStatus: "conflicted", unsupportedReasonCode: null };
  }

  if (facts.borrower.employmentFamily.value === "self_employed") {
    return {
      readinessStatus: "unsupported",
      unsupportedReasonCode: "SELF_EMPLOYED_INCOME_METHODOLOGY_UNSUPPORTED",
    };
  }

  const product = facts.loanRequirement.productCode;
  if (product.value === "HOME_LOAN_BT") {
    const tx = facts.loanRequirement.transactionType;
    if (tx.value && tx.value !== "balance_transfer") {
      return { readinessStatus: "unsupported", unsupportedReasonCode: "HLBT_TRANSACTION_TYPE_UNSUPPORTED" };
    }
    if (facts.balanceTransfer.outstandingPrincipal.state === "missing") {
      return { readinessStatus: "incomplete", unsupportedReasonCode: null };
    }
  }

  const required: Array<AssessmentFact<unknown>> = [
    facts.borrower.residency,
    facts.borrower.employmentFamily,
    facts.borrower.dateOfBirth,
    facts.incomeAndObligations.existingMonthlyObligations,
    facts.incomeAndObligations.requestedTenureMonths,
    facts.loanRequirement.productCode,
    facts.loanRequirement.requestedAmount,
    facts.property.propertyValue,
    facts.property.propertyCategory,
    facts.property.constructionStatus,
    facts.property.propertyCity,
  ];

  if (facts.borrower.employmentFamily.value === "salaried") {
    required.push(facts.incomeAndObligations.monthlyIncome);
  }

  if (required.some((fact) => fact.state === "missing" || fact.state === "unconfirmed" || fact.value == null)) {
    return { readinessStatus: "incomplete", unsupportedReasonCode: null };
  }

  const cibilKind = facts.cibil.kind;
  if (cibilKind.state === "missing" || cibilKind.value === "missing") {
    return { readinessStatus: "incomplete", unsupportedReasonCode: null };
  }

  return { readinessStatus: "ready", unsupportedReasonCode: null };
}

export function assertFinalizationReadiness(facts: OpportunityAssessmentFactsV1, readinessStatus: AssessmentReadinessStatus) {
  if (collectFacts(facts).some((fact) => fact.state === "unconfirmed")) {
    throw new OpportunityAssessmentError("ASSESSMENT_UNCONFIRMED");
  }
  if (readinessStatus === "conflicted") throw new OpportunityAssessmentError("ASSESSMENT_CONFLICTING");
  if (readinessStatus === "unsupported") throw new OpportunityAssessmentError("ASSESSMENT_UNSUPPORTED");
  if (readinessStatus === "incomplete" || readinessStatus === "stale") {
    throw new OpportunityAssessmentError("ASSESSMENT_INCOMPLETE");
  }
  if (readinessStatus !== "ready") throw new OpportunityAssessmentError("INVALID_FINALIZATION");
}
