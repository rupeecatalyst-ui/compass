/**
 * Side-effect-free projection of an already persisted Opportunity assessment.
 * Copies stored fact values. Does not rebuild a snapshot or call recommendation.
 */
import type { AssessmentFact } from "@/types/opportunity-assessment";
import type {
  OpportunityAssessmentRecord,
  OpportunityAssessmentRecommendationRunRecord,
  OpportunityAssessmentRevisionRecord,
} from "./types";

export type PersistedFactValue = {
  value: unknown;
  state: string | null;
};

export type PersistedAssessmentRevisionInspection = {
  revisionId: string;
  revisionNumber: number;
  revisionKind: string;
  readinessStatus: string;
  contentHash: string;
  commandHash: string;
  finalizedAt: string | null;
  supersededAt: string | null;
  facts: {
    productCode: PersistedFactValue;
    requestedAmount: PersistedFactValue;
    requestedTenureMonths: PersistedFactValue;
    employmentFamily: PersistedFactValue;
    employmentTypeCode: PersistedFactValue;
    monthlyIncome: PersistedFactValue;
    existingMonthlyObligations: PersistedFactValue;
    borrowerAge: PersistedFactValue;
    legalConstitution: PersistedFactValue;
    residency: PersistedFactValue;
    cibilKind: PersistedFactValue;
    cibilExactScore: PersistedFactValue;
    cibilExpectedBand: PersistedFactValue;
    propertyValue: PersistedFactValue;
    propertyCategory: PersistedFactValue;
    constructionStatus: PersistedFactValue;
    propertyCity: PersistedFactValue;
    propertyState: PersistedFactValue;
    journeyCity: PersistedFactValue;
    journeyState: PersistedFactValue;
  };
  /** Immutable facts JSON exactly as stored on the revision. */
  factsJson: OpportunityAssessmentRevisionRecord["factsJson"];
};

export type PersistedRecommendationRunInspection = {
  runId: string;
  revisionId: string;
  assessedAt: string;
  asOf: string;
  resultStatus: string;
  failureCode: string | null;
  missingInputCodes: OpportunityAssessmentRecommendationRunRecord["missingInputCodes"];
  rejectedProgrammeCodesJson: OpportunityAssessmentRecommendationRunRecord["rejectedProgrammeCodesJson"];
  acceptedProgrammeIdsJson: OpportunityAssessmentRecommendationRunRecord["acceptedProgrammeIdsJson"];
  cibilNotKnownDisclaimer: boolean;
};

export type PersistedAssessmentInspection = {
  opportunityId: string;
  assessment: {
    assessmentId: string;
    currentRevisionId: string | null;
    readinessStatus: string;
    createdAt: string;
    updatedAt: string;
    rowVersion: number;
  };
  /** Proven order. Not an implicit "latest" label. */
  revisionOrder: "revisionNumber asc, id asc";
  revisions: PersistedAssessmentRevisionInspection[];
  /** Proven order. Not an implicit "latest" label. */
  runOrder: "assessedAt asc, id asc";
  recommendationRuns: PersistedRecommendationRunInspection[];
};

function storedFact(fact: Pick<AssessmentFact<unknown>, "value" | "state"> | null | undefined): PersistedFactValue {
  if (!fact) return { value: null, state: null };
  return { value: fact.value ?? null, state: fact.state ?? null };
}

function projectRevision(revision: OpportunityAssessmentRevisionRecord): PersistedAssessmentRevisionInspection {
  const facts = revision.factsJson;
  return {
    revisionId: revision.id,
    revisionNumber: revision.revisionNumber,
    revisionKind: revision.revisionKind,
    readinessStatus: revision.readinessStatus,
    contentHash: revision.contentHash,
    commandHash: revision.commandHash,
    finalizedAt: revision.finalizedAt,
    supersededAt: revision.supersededAt,
    facts: {
      productCode: storedFact(facts.loanRequirement.productCode),
      requestedAmount: storedFact(facts.loanRequirement.requestedAmount),
      requestedTenureMonths: storedFact(facts.incomeAndObligations.requestedTenureMonths),
      employmentFamily: storedFact(facts.borrower.employmentFamily),
      employmentTypeCode: storedFact(facts.borrower.employmentTypeCode),
      monthlyIncome: storedFact(facts.incomeAndObligations.monthlyIncome),
      existingMonthlyObligations: storedFact(facts.incomeAndObligations.existingMonthlyObligations),
      borrowerAge: storedFact(facts.borrower.ageYears),
      legalConstitution: storedFact(facts.borrower.constitution),
      residency: storedFact(facts.borrower.residency),
      cibilKind: storedFact(facts.cibil.kind),
      cibilExactScore: storedFact(facts.cibil.exactScore),
      cibilExpectedBand: storedFact(facts.cibil.expectedBand),
      propertyValue: storedFact(facts.property.propertyValue),
      propertyCategory: storedFact(facts.property.propertyCategory),
      constructionStatus: storedFact(facts.property.constructionStatus),
      propertyCity: storedFact(facts.property.propertyCity),
      propertyState: storedFact(facts.property.propertyState),
      journeyCity: storedFact(facts.borrower.journeyCity),
      journeyState: storedFact(facts.borrower.journeyState),
    },
    factsJson: structuredClone(facts),
  };
}

function projectRun(run: OpportunityAssessmentRecommendationRunRecord): PersistedRecommendationRunInspection {
  return {
    runId: run.id,
    revisionId: run.revisionId,
    assessedAt: run.assessedAt,
    asOf: run.asOf,
    resultStatus: run.resultStatus,
    failureCode: run.failureCode,
    missingInputCodes: structuredClone(run.missingInputCodes),
    rejectedProgrammeCodesJson: structuredClone(run.rejectedProgrammeCodesJson),
    acceptedProgrammeIdsJson: structuredClone(run.acceptedProgrammeIdsJson),
    cibilNotKnownDisclaimer: run.cibilNotKnownDisclaimer,
  };
}

export function projectPersistedAssessmentInspection(input: {
  opportunityId: string;
  assessment: OpportunityAssessmentRecord;
  revisions: readonly OpportunityAssessmentRevisionRecord[];
  runs: readonly OpportunityAssessmentRecommendationRunRecord[];
}): PersistedAssessmentInspection {
  const revisions = [...input.revisions].sort((left, right) => {
    if (left.revisionNumber !== right.revisionNumber) return left.revisionNumber - right.revisionNumber;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
  const runs = [...input.runs].sort((left, right) => {
    const byTime = left.assessedAt.localeCompare(right.assessedAt);
    if (byTime !== 0) return byTime;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
  return {
    opportunityId: input.opportunityId,
    assessment: {
      assessmentId: input.assessment.id,
      currentRevisionId: input.assessment.currentRevisionId,
      readinessStatus: input.assessment.readinessStatus,
      createdAt: input.assessment.createdAt,
      updatedAt: input.assessment.updatedAt,
      rowVersion: input.assessment.rowVersion,
    },
    revisionOrder: "revisionNumber asc, id asc",
    revisions: revisions.map(projectRevision),
    runOrder: "assessedAt asc, id asc",
    recommendationRuns: runs.map(projectRun),
  };
}
