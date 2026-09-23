import { cloneAssessmentFact, emptyOpportunityAssessmentFacts, missingAssessmentFact } from "@/lib/opportunity-assessment";
import { rejectEmploymentAsPropertyCategory } from "@/constants/product-journey/property-category";
import type {
  AssessmentCibilKind,
  AssessmentContributionDecision,
  AssessmentExpectedCibilBand,
  AssessmentFact,
  AssessmentProductCode,
  OpportunityAssessmentFactsV1,
} from "@/types/opportunity-assessment";

export function c1CapturedFact<T>(
  value: T,
  field: string,
  extra: Partial<AssessmentFact<T>> = {},
): AssessmentFact<T> {
  return {
    value,
    state: "known",
    sourceChannel: "C1",
    sourceEntityType: "EnterpriseOpportunityAssessment",
    sourceEntityId: extra.sourceEntityId ?? "opportunity-assessment-capture",
    sourceFieldKey: field,
    sourceUpdatedAt: extra.sourceUpdatedAt ?? null,
    capturedByUserId: extra.capturedByUserId ?? null,
    capturedAt: extra.capturedAt ?? null,
    effectiveAt: extra.effectiveAt ?? extra.capturedAt ?? null,
    confirmedByUserId: extra.confirmedByUserId ?? null,
    confirmedAt: extra.confirmedAt ?? null,
    certainty: extra.certainty ?? "exact",
    knownZeroDeclared: extra.knownZeroDeclared,
    evidenceRef: extra.evidenceRef ?? null,
  };
}

export function setCaptureFact<
  Section extends keyof OpportunityAssessmentFactsV1,
  Key extends keyof OpportunityAssessmentFactsV1[Section],
>(
  facts: OpportunityAssessmentFactsV1,
  section: Section,
  key: Key,
  patch: Partial<AssessmentFact<unknown>>,
): OpportunityAssessmentFactsV1 {
  const next = structuredClone(facts);
  const current = next[section][key] as AssessmentFact<unknown>;
  (next[section] as Record<string, unknown>)[key as string] = cloneAssessmentFact(current, patch);
  return next;
}

export function captureKnownValue<
  Section extends keyof OpportunityAssessmentFactsV1,
  Key extends keyof OpportunityAssessmentFactsV1[Section],
>(
  facts: OpportunityAssessmentFactsV1,
  section: Section,
  key: Key,
  value: OpportunityAssessmentFactsV1[Section][Key] extends AssessmentFact<infer T> ? T : never,
  extra: Partial<AssessmentFact<unknown>> = {},
): OpportunityAssessmentFactsV1 {
  const field = `${String(section)}.${String(key)}`;
  return setCaptureFact(facts, section, key, c1CapturedFact(value, field, extra));
}

export function clearCaptureFact<
  Section extends keyof OpportunityAssessmentFactsV1,
  Key extends keyof OpportunityAssessmentFactsV1[Section],
>(facts: OpportunityAssessmentFactsV1, section: Section, key: Key): OpportunityAssessmentFactsV1 {
  return setCaptureFact(facts, section, key, missingAssessmentFact());
}

export function declareKnownZeroObligations(facts: OpportunityAssessmentFactsV1): OpportunityAssessmentFactsV1 {
  return captureKnownValue(facts, "incomeAndObligations", "existingMonthlyObligations", "0.00", {
    knownZeroDeclared: true,
  });
}

export function setCapturedCibilKind(facts: OpportunityAssessmentFactsV1, kind: AssessmentCibilKind | "missing") {
  let next = facts;
  if (kind === "missing") {
    next = clearCaptureFact(next, "cibil", "kind");
    next = clearCaptureFact(next, "cibil", "exactScore");
    next = clearCaptureFact(next, "cibil", "expectedBand");
    return next;
  }
  if (kind === "exact") {
    next = captureKnownValue(next, "cibil", "kind", "exact");
    next = clearCaptureFact(next, "cibil", "expectedBand");
    return next;
  }
  if (kind === "expected_band") {
    next = captureKnownValue(next, "cibil", "kind", "expected_band");
    next = clearCaptureFact(next, "cibil", "exactScore");
    return next;
  }
  next = captureKnownValue(next, "cibil", "kind", "explicitly_unknown");
  next = clearCaptureFact(next, "cibil", "exactScore");
  next = clearCaptureFact(next, "cibil", "expectedBand");
  return next;
}

export function setCapturedCibilExact(facts: OpportunityAssessmentFactsV1, score: number) {
  let next = setCapturedCibilKind(facts, "exact");
  next = captureKnownValue(next, "cibil", "exactScore", score);
  return next;
}

export function setCapturedCibilBand(facts: OpportunityAssessmentFactsV1, band: AssessmentExpectedCibilBand) {
  let next = setCapturedCibilKind(facts, "expected_band");
  next = captureKnownValue(next, "cibil", "expectedBand", band);
  return next;
}

export function setCapturedProduct(facts: OpportunityAssessmentFactsV1, product: AssessmentProductCode) {
  let next = captureKnownValue(facts, "loanRequirement", "productCode", product);
  if (product === "HOME_LOAN_BT") {
    next = captureKnownValue(next, "loanRequirement", "transactionType", "balance_transfer");
  } else if (next.loanRequirement.transactionType.value === "balance_transfer") {
    next = clearCaptureFact(next, "loanRequirement", "transactionType");
  }
  return next;
}

export function setCapturedEmploymentFamily(
  facts: OpportunityAssessmentFactsV1,
  family: "salaried" | "self_employed" | "unknown",
) {
  let next = captureKnownValue(facts, "borrower", "employmentFamily", family);
  if (family === "self_employed") {
    next = captureKnownValue(next, "selfEmployedEvidence", "methodologyStatus", "unsupported");
    if (next.incomeAndObligations.monthlyIncome.state === "known") {
      next = clearCaptureFact(next, "incomeAndObligations", "monthlyIncome");
    }
  } else if (next.selfEmployedEvidence.methodologyStatus.state !== "missing") {
    next = clearCaptureFact(next, "selfEmployedEvidence", "methodologyStatus");
  }
  return next;
}

export function setCapturedContribution(
  facts: OpportunityAssessmentFactsV1,
  decision: AssessmentContributionDecision,
) {
  return captureKnownValue(facts, "coApplicant", "contributionDecision", decision);
}

export function setCapturedPropertyCategory(facts: OpportunityAssessmentFactsV1, raw: string) {
  const governed = rejectEmploymentAsPropertyCategory(raw);
  if (!governed) return clearCaptureFact(facts, "property", "propertyCategory");
  return captureKnownValue(facts, "property", "propertyCategory", governed);
}

export function emptyCapturedAssessmentFacts(): OpportunityAssessmentFactsV1 {
  return emptyOpportunityAssessmentFacts();
}
