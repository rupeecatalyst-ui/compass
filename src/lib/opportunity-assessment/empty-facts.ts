import type { AssessmentFact, OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import { OPPORTUNITY_ASSESSMENT_FACTS_SCHEMA_VERSION } from "@/types/opportunity-assessment";

export function missingAssessmentFact<T>(): AssessmentFact<T> {
  return {
    value: null,
    state: "missing",
    sourceChannel: null,
    sourceEntityType: null,
    sourceEntityId: null,
    sourceFieldKey: null,
    sourceUpdatedAt: null,
    capturedByUserId: null,
    capturedAt: null,
    effectiveAt: null,
    confirmedByUserId: null,
    confirmedAt: null,
    certainty: null,
    evidenceRef: null,
  };
}

/** Empty durable facts. Every business value is missing — never defaulted. */
export function emptyOpportunityAssessmentFacts(): OpportunityAssessmentFactsV1 {
  return {
    schemaVersion: OPPORTUNITY_ASSESSMENT_FACTS_SCHEMA_VERSION,
    borrower: {
      residency: missingAssessmentFact(),
      dateOfBirth: missingAssessmentFact(),
      employmentTypeCode: missingAssessmentFact(),
      employmentFamily: missingAssessmentFact(),
      constitution: missingAssessmentFact(),
      journeyCity: missingAssessmentFact(),
      journeyState: missingAssessmentFact(),
    },
    incomeAndObligations: {
      monthlyIncome: missingAssessmentFact(),
      incomeBasis: missingAssessmentFact(),
      incomeEffectiveAt: missingAssessmentFact(),
      existingMonthlyObligations: missingAssessmentFact(),
      obligationScope: missingAssessmentFact(),
      requestedTenureMonths: missingAssessmentFact(),
    },
    loanRequirement: {
      productCode: missingAssessmentFact(),
      transactionType: missingAssessmentFact(),
      requestedAmount: missingAssessmentFact(),
    },
    property: {
      propertyValue: missingAssessmentFact(),
      valueDeclaration: missingAssessmentFact(),
      valueEffectiveAt: missingAssessmentFact(),
      propertyCategory: missingAssessmentFact(),
      propertyKind: missingAssessmentFact(),
      constructionStatus: missingAssessmentFact(),
      occupancy: missingAssessmentFact(),
      possessionStatus: missingAssessmentFact(),
      registrationStatus: missingAssessmentFact(),
      propertyCity: missingAssessmentFact(),
      propertyState: missingAssessmentFact(),
      pincode: missingAssessmentFact(),
      address: missingAssessmentFact(),
    },
    cibil: {
      kind: missingAssessmentFact(),
      exactScore: missingAssessmentFact(),
      expectedBand: missingAssessmentFact(),
      observationDate: missingAssessmentFact(),
    },
    balanceTransfer: {
      outstandingPrincipal: missingAssessmentFact(),
      outstandingCertainty: missingAssessmentFact(),
      outstandingObservationDate: missingAssessmentFact(),
      loanStartDate: missingAssessmentFact(),
      loanStartDateCertainty: missingAssessmentFact(),
      repaymentTrack: missingAssessmentFact(),
      delayedEmiCount: missingAssessmentFact(),
      delayedEmiCertainty: missingAssessmentFact(),
      existingLenderInstitution: missingAssessmentFact(),
      currentRoiPercent: missingAssessmentFact(),
      currentRoiCertainty: missingAssessmentFact(),
      currentHomeLoanEmi: missingAssessmentFact(),
      currentHomeLoanEmiCertainty: missingAssessmentFact(),
      remainingTenureMonths: missingAssessmentFact(),
      remainingTenureCertainty: missingAssessmentFact(),
      originalSanctionedAmount: missingAssessmentFact(),
      originalTenureMonths: missingAssessmentFact(),
      rateType: missingAssessmentFact(),
    },
    coApplicant: {
      participantRef: missingAssessmentFact(),
      contributionDecision: missingAssessmentFact(),
      relationship: missingAssessmentFact(),
      dateOfBirth: missingAssessmentFact(),
      employmentType: missingAssessmentFact(),
      contributedIncome: missingAssessmentFact(),
      obligations: missingAssessmentFact(),
    },
    selfEmployedEvidence: {
      turnover: missingAssessmentFact(),
      profit: missingAssessmentFact(),
      vintage: missingAssessmentFact(),
      constitution: missingAssessmentFact(),
      methodologyStatus: missingAssessmentFact(),
    },
  };
}
