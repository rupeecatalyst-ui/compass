import type { AssessmentFact, AssessmentReadinessStatus, OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import type { ProductJourneyFieldRow } from "@/types/product-journey-definition";
import { bootstrapProductJourneyFields } from "@/constants/product-journey/bootstrap";
import { mandatoryRecommendationFields } from "@/lib/product-journey/applicability";
import { journeyFieldIsSatisfied } from "@/lib/product-journey/readiness-fields";
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

function productCodeOf(facts: OpportunityAssessmentFactsV1): string | null {
  const value = facts.loanRequirement.productCode.value;
  return typeof value === "string" && value.trim() ? value : null;
}

export function resolveJourneyFieldsForFacts(
  facts: OpportunityAssessmentFactsV1,
  persistedFields?: readonly ProductJourneyFieldRow[] | null,
): ProductJourneyFieldRow[] {
  if (persistedFields && persistedFields.length > 0) return [...persistedFields];
  return bootstrapProductJourneyFields(productCodeOf(facts));
}

export function deriveOpportunityAssessmentReadiness(
  facts: OpportunityAssessmentFactsV1,
  journeyFields?: readonly ProductJourneyFieldRow[] | null,
): {
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
  }

  const rows = resolveJourneyFieldsForFacts(facts, journeyFields);
  const required = mandatoryRecommendationFields(rows, facts.borrower.employmentFamily.value ?? "unknown");
  if (required.some((row) => !journeyFieldIsSatisfied(facts, row))) {
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
