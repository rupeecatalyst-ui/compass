import type { AssessmentFact, AssessmentSourceChannel, OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import { OpportunityAssessmentError } from "./errors";
import type { OpportunityAssessmentActorContext } from "./types";

const BORROWER_DECLARED_FIELDS = new Set([
  "borrower.residency",
  "incomeAndObligations.monthlyIncome",
  "incomeAndObligations.existingMonthlyObligations",
  "loanRequirement.requestedAmount",
  "cibil.exactScore",
  "cibil.expectedBand",
  "property.propertyValue",
  "balanceTransfer.outstandingPrincipal",
  "coApplicant.contributionDecision",
]);

function collectNamedFacts(facts: OpportunityAssessmentFactsV1): Array<{ path: string; fact: AssessmentFact<unknown> }> {
  const named: Array<{ path: string; fact: AssessmentFact<unknown> }> = [];
  const walk = (section: string, value: Record<string, AssessmentFact<unknown>>) => {
    for (const [key, fact] of Object.entries(value)) named.push({ path: `${section}.${key}`, fact });
  };
  walk("borrower", facts.borrower);
  walk("incomeAndObligations", facts.incomeAndObligations);
  walk("loanRequirement", facts.loanRequirement);
  walk("property", facts.property);
  walk("cibil", facts.cibil);
  walk("balanceTransfer", facts.balanceTransfer);
  walk("coApplicant", facts.coApplicant);
  walk("selfEmployedEvidence", facts.selfEmployedEvidence);
  return named;
}

function requireSourceId(channel: AssessmentSourceChannel, fact: AssessmentFact<unknown>, path: string) {
  if (fact.sourceChannel !== channel || fact.state === "missing") return;
  if (!fact.sourceEntityId) {
    throw new OpportunityAssessmentError("INVALID_PROVENANCE", `${path} ${channel} source must identify the source entity.`);
  }
}

export function validateOpportunityAssessmentProvenance(facts: OpportunityAssessmentFactsV1) {
  for (const { path, fact } of collectNamedFacts(facts)) {
    requireSourceId("CONTACT", fact, path);
    requireSourceId("COMPANY", fact, path);
    requireSourceId("COMPASS", fact, path);
    if (
      fact.sourceChannel === "SYSTEM_DERIVED" &&
      BORROWER_DECLARED_FIELDS.has(path) &&
      (fact.state === "known" || fact.state === "unconfirmed")
    ) {
      throw new OpportunityAssessmentError("INVALID_PROVENANCE", `${path} cannot be system-derived as a borrower declaration.`);
    }
  }

  const emi = facts.balanceTransfer.currentHomeLoanEmi;
  const obligations = facts.incomeAndObligations.existingMonthlyObligations;
  if (obligations.state === "missing" && emi.value != null && obligations.value === emi.value) {
    throw new OpportunityAssessmentError("INVALID_ASSESSMENT_FACTS", "Transferred home-loan EMI must not be stored as other obligations.");
  }
}

export function applyTrustedActorToFacts(
  facts: OpportunityAssessmentFactsV1,
  actor: OpportunityAssessmentActorContext,
  capturedAt: string,
): OpportunityAssessmentFactsV1 {
  const next = structuredClone(facts);
  for (const { fact } of collectNamedFacts(next)) {
    if (fact.state === "missing") {
      fact.capturedByUserId = null;
      fact.confirmedByUserId = null;
      continue;
    }
    if (fact.sourceChannel === "C1") {
      fact.capturedByUserId = actor.actorUserId;
      fact.capturedAt = capturedAt;
    } else {
      fact.capturedByUserId = actor.actorUserId;
    }
  }
  return next;
}
