import {
  OPPORTUNITY_ASSESSMENT_CAPTURE_FIELD_LABELS,
} from "@/constants/opportunity-assessment-capture";
import type { AssessmentFact, OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import { deriveOpportunityAssessmentReadiness } from "./readiness";

export function collectOpportunityAssessmentMissingLabels(facts: OpportunityAssessmentFactsV1): string[] {
  const derived = deriveOpportunityAssessmentReadiness(facts);
  if (derived.readinessStatus !== "incomplete") return [];
  const required: Array<{ path: string; fact: AssessmentFact<unknown> }> = [
    { path: "borrower.residency", fact: facts.borrower.residency },
    { path: "borrower.employmentFamily", fact: facts.borrower.employmentFamily },
    { path: "borrower.dateOfBirth", fact: facts.borrower.dateOfBirth },
    { path: "incomeAndObligations.existingMonthlyObligations", fact: facts.incomeAndObligations.existingMonthlyObligations },
    { path: "incomeAndObligations.requestedTenureMonths", fact: facts.incomeAndObligations.requestedTenureMonths },
    { path: "loanRequirement.productCode", fact: facts.loanRequirement.productCode },
    { path: "loanRequirement.requestedAmount", fact: facts.loanRequirement.requestedAmount },
    { path: "property.propertyValue", fact: facts.property.propertyValue },
    { path: "property.propertyCategory", fact: facts.property.propertyCategory },
    { path: "property.constructionStatus", fact: facts.property.constructionStatus },
    { path: "property.propertyCity", fact: facts.property.propertyCity },
    { path: "cibil.kind", fact: facts.cibil.kind },
  ];
  if (facts.borrower.employmentFamily.value === "salaried") {
    required.push({ path: "incomeAndObligations.monthlyIncome", fact: facts.incomeAndObligations.monthlyIncome });
  }
  if (facts.loanRequirement.productCode.value === "HOME_LOAN_BT") {
    required.push({
      path: "balanceTransfer.outstandingPrincipal",
      fact: facts.balanceTransfer.outstandingPrincipal,
    });
  }
  return required
    .filter((item) => item.fact.state === "missing" || item.fact.state === "unconfirmed" || item.fact.value == null || item.fact.value === "missing")
    .map((item) => OPPORTUNITY_ASSESSMENT_CAPTURE_FIELD_LABELS[item.path] ?? item.path)
    .filter((label, index, all) => all.indexOf(label) === index);
}
