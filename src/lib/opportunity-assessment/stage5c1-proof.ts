import assert from "node:assert/strict";
import { parseExactMoney } from "@/lib/product-programme-operations/money";
import {
  cloneAssessmentFact,
  emptyOpportunityAssessmentFacts,
  buildOpportunityAssessmentSourceFingerprint,
  opportunityAssessmentSourceFingerprintsEqual,
  serializeOpportunityAssessmentSourceFingerprint,
  parseOpportunityAssessmentFacts,
  safeParseOpportunityAssessmentFacts,
} from "@/lib/opportunity-assessment/index";
import type { AssessmentFact, OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";

const CAPTURED_AT = "2026-09-22T12:00:00.000Z";

function knownFact<T>(value: T, field: string, extra: Partial<AssessmentFact<T>> = {}): AssessmentFact<T> {
  return {
    value,
    state: "known",
    sourceChannel: "C1",
    sourceEntityType: "EnterpriseOpportunityAssessment",
    sourceEntityId: "assessment-fixture",
    sourceFieldKey: field,
    sourceUpdatedAt: CAPTURED_AT,
    capturedByUserId: "user-fixture",
    capturedAt: CAPTURED_AT,
    effectiveAt: CAPTURED_AT,
    confirmedByUserId: null,
    confirmedAt: null,
    certainty: "exact",
    ...extra,
  };
}

function setFact<
  Section extends keyof OpportunityAssessmentFactsV1,
  Key extends keyof OpportunityAssessmentFactsV1[Section],
>(
  facts: OpportunityAssessmentFactsV1,
  section: Section,
  key: Key,
  patch: Partial<OpportunityAssessmentFactsV1[Section][Key]>,
): OpportunityAssessmentFactsV1 {
  const next = structuredClone(facts);
  const current = next[section][key] as AssessmentFact<unknown>;
  (next[section] as Record<string, unknown>)[key as string] = cloneAssessmentFact(current, patch);
  return next;
}

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

function reject(input: unknown, snippet: string) {
  const parsed = safeParseOpportunityAssessmentFacts(input);
  if (parsed.success) {
    throw new assert.AssertionError({ message: `expected rejection containing ${snippet}` });
  }
  const messages = parsed.error.issues.map((issue) => issue.message).join(" | ");
  assert.match(messages, new RegExp(snippet));
}

export function runStage5c1Proof(): void {
  const empty = emptyOpportunityAssessmentFacts();
  const parsedEmpty = parseOpportunityAssessmentFacts(JSON.parse(JSON.stringify(empty)));
  for (const fact of collectFacts(parsedEmpty)) {
    assert.equal(fact.state, "missing");
    assert.equal(fact.value, null);
    assert.notEqual(fact.state, "known");
  }
  const serializedEmpty = JSON.stringify(parsedEmpty);
  assert.equal(serializedEmpty.includes("foir"), false);
  assert.equal(serializedEmpty.includes("ltv"), false);
  assert.equal(serializedEmpty.includes("residential"), false);
  assert.equal(serializedEmpty.includes("\"ready\""), false);
  assert.equal(serializedEmpty.includes("completed"), false);
  assert.equal(serializedEmpty.includes("fresh"), false);
  assert.equal(serializedEmpty.includes("bt_top_up"), false);
  assert.equal(serializedEmpty.includes("with_topup"), false);
  assert.equal(parsedEmpty.property.propertyCategory.value, null);
  assert.equal(parsedEmpty.property.constructionStatus.value, null);
  assert.equal(parsedEmpty.incomeAndObligations.existingMonthlyObligations.value, null);
  console.log("1 EMPTY_ASSESSMENT_NO_BUSINESS_DEFAULTS: PASS");

  const missingObligations = parseOpportunityAssessmentFacts(empty);
  assert.equal(missingObligations.incomeAndObligations.existingMonthlyObligations.state, "missing");
  assert.notEqual(missingObligations.incomeAndObligations.existingMonthlyObligations.value, "0.00");
  reject(
    setFact(empty, "incomeAndObligations", "existingMonthlyObligations", {
      state: "missing",
      value: "0.00",
    }),
    "Missing obligations must not be stored as zero",
  );
  console.log("2 MISSING_OBLIGATIONS_NOT_ZERO: PASS");

  reject(
    setFact(empty, "incomeAndObligations", "existingMonthlyObligations", {
      ...knownFact("0.00", "incomeAndObligations.existingMonthlyObligations"),
    }),
    "Zero obligations require explicit knownZeroDeclared",
  );
  const zeroDeclared = parseOpportunityAssessmentFacts(
    setFact(empty, "incomeAndObligations", "existingMonthlyObligations", {
      ...knownFact("0.00", "incomeAndObligations.existingMonthlyObligations", { knownZeroDeclared: true }),
    }),
  );
  assert.equal(zeroDeclared.incomeAndObligations.existingMonthlyObligations.value, "0.00");
  assert.equal(zeroDeclared.incomeAndObligations.existingMonthlyObligations.knownZeroDeclared, true);
  console.log("3 ZERO_OBLIGATIONS_REQUIRE_KNOWN_ZERO_DECLARED: PASS");

  const missingCibil = parseOpportunityAssessmentFacts(empty);
  assert.equal(missingCibil.cibil.kind.state, "missing");
  assert.notEqual(missingCibil.cibil.kind.value, "explicitly_unknown");
  reject(
    {
      ...empty,
      cibil: {
        ...empty.cibil,
        kind: knownFact("not_known", "cibil.kind"),
      },
    },
    "Invalid enum value",
  );
  console.log("4 MISSING_CIBIL_NOT_NOT_KNOWN: PASS");

  const bandOnly = parseOpportunityAssessmentFacts({
    ...empty,
    cibil: {
      ...empty.cibil,
      kind: knownFact("expected_band", "cibil.kind"),
      expectedBand: knownFact("750_799", "cibil.expectedBand"),
    },
  });
  assert.equal(bandOnly.cibil.kind.value, "expected_band");
  assert.equal(bandOnly.cibil.exactScore.value, null);
  reject(
    {
      ...empty,
      cibil: {
        ...empty.cibil,
        kind: knownFact("expected_band", "cibil.kind"),
        expectedBand: knownFact("750_799", "cibil.expectedBand"),
        exactScore: knownFact(775, "cibil.exactScore"),
      },
    },
    "Expected CIBIL band cannot be converted into an exact score",
  );
  const exactOnly = parseOpportunityAssessmentFacts({
    ...empty,
    cibil: {
      ...empty.cibil,
      kind: knownFact("exact", "cibil.kind"),
      exactScore: knownFact(780, "cibil.exactScore"),
    },
  });
  assert.equal(exactOnly.cibil.exactScore.value, 780);
  assert.equal(exactOnly.cibil.expectedBand.value, null);
  console.log("5 EXPECTED_CIBIL_BAND_NOT_EXACT_SCORE: PASS");

  const requestedOnly = parseOpportunityAssessmentFacts(
    setFact(empty, "loanRequirement", "requestedAmount", knownFact("2500000.00", "loanRequirement.requestedAmount")),
  );
  assert.equal(requestedOnly.loanRequirement.requestedAmount.value, "2500000.00");
  assert.equal(requestedOnly.balanceTransfer.outstandingPrincipal.state, "missing");
  assert.notEqual(
    requestedOnly.balanceTransfer.outstandingPrincipal.value,
    requestedOnly.loanRequirement.requestedAmount.value,
  );
  reject(
    setFact(
      setFact(empty, "loanRequirement", "requestedAmount", knownFact("2500000.00", "loanRequirement.requestedAmount")),
      "balanceTransfer",
      "outstandingPrincipal",
      { state: "missing", value: "2500000.00" },
    ),
    "Requested amount must not be used as BT outstanding",
  );
  reject(
    setFact(empty, "loanRequirement", "transactionType", knownFact("fresh", "loanRequirement.transactionType")),
    "fresh, bt_top_up and with_topup",
  );
  console.log("6 REQUESTED_AMOUNT_NOT_BT_OUTSTANDING: PASS");

  const journeyOnly = parseOpportunityAssessmentFacts(
    setFact(empty, "borrower", "journeyCity", knownFact("Mumbai", "borrower.journeyCity")),
  );
  assert.equal(journeyOnly.borrower.journeyCity.value, "Mumbai");
  assert.equal(journeyOnly.property.propertyCity.state, "missing");
  assert.notEqual(journeyOnly.property.propertyCity.value, "Mumbai");
  reject(
    setFact(journeyOnly, "property", "propertyCity", { state: "missing", value: "Mumbai" }),
    "Journey city must not be copied onto missing property city",
  );
  console.log("7 JOURNEY_CITY_NOT_PROPERTY_CITY: PASS");

  const participantOnly = parseOpportunityAssessmentFacts(
    setFact(empty, "coApplicant", "participantRef", knownFact("participant-1", "coApplicant.participantRef")),
  );
  assert.equal(participantOnly.coApplicant.participantRef.value, "participant-1");
  assert.equal(participantOnly.coApplicant.contributionDecision.state, "missing");
  assert.notEqual(participantOnly.coApplicant.contributionDecision.value, "yes");
  reject(
    setFact(participantOnly, "coApplicant", "contributionDecision", { state: "missing", value: "yes" }),
    "A participant must not be inferred as a contributing co-applicant",
  );
  reject(
    setFact(empty, "coApplicant", "contributionDecision", knownFact("yes", "coApplicant.contributionDecision")),
    "Contributor selection requires an explicit participant reference",
  );
  console.log("8 PARTICIPANT_NOT_CONTRIBUTOR: PASS");

  assert.equal(parseExactMoney("250000", "monthlyIncome"), "250000.00");
  assert.throws(() => parseExactMoney(250000.5, "monthlyIncome"));
  const moneyFacts = parseOpportunityAssessmentFacts(
    setFact(empty, "incomeAndObligations", "monthlyIncome", knownFact("250000.00", "incomeAndObligations.monthlyIncome")),
  );
  const roundTrip = JSON.parse(JSON.stringify(moneyFacts)) as OpportunityAssessmentFactsV1;
  assert.equal(roundTrip.incomeAndObligations.monthlyIncome.value, "250000.00");
  assert.equal(typeof roundTrip.incomeAndObligations.monthlyIncome.value, "string");
  reject(
    setFact(empty, "incomeAndObligations", "monthlyIncome", {
      ...knownFact("250000.00", "incomeAndObligations.monthlyIncome"),
      value: 250000.5 as unknown as string,
    }),
    "Invalid input",
  );
  console.log("9 MONEY_SERIALIZATION_EXACT: PASS");

  const selfEmployed = parseOpportunityAssessmentFacts({
    ...empty,
    borrower: {
      ...empty.borrower,
      employmentFamily: knownFact("self_employed", "borrower.employmentFamily"),
    },
    selfEmployedEvidence: {
      ...empty.selfEmployedEvidence,
      turnover: knownFact("12000000.00", "selfEmployedEvidence.turnover"),
      methodologyStatus: knownFact("unsupported", "selfEmployedEvidence.methodologyStatus"),
    },
  });
  assert.equal(selfEmployed.borrower.employmentFamily.value, "self_employed");
  assert.equal(selfEmployed.incomeAndObligations.monthlyIncome.state, "missing");
  assert.equal(selfEmployed.selfEmployedEvidence.methodologyStatus.value, "unsupported");
  assert.equal(selfEmployed.selfEmployedEvidence.turnover.value, "12000000.00");
  reject(
    setFact(selfEmployed, "incomeAndObligations", "monthlyIncome", knownFact("180000.00", "incomeAndObligations.monthlyIncome")),
    "Self-employed assessments cannot invent eligible income",
  );
  console.log("10 SELF_EMPLOYED_UNSUPPORTED_WITHOUT_INVENTED_INCOME: PASS");

  const left = buildOpportunityAssessmentSourceFingerprint({
    opportunityRowVersion: 7,
    contactUpdatedAt: new Date("2026-09-21T08:00:00.000Z"),
    companyUpdatedAt: "2026-09-20T10:00:00.000Z",
    compassAssessmentUpdatedAt: "2026-09-19T15:30:00.000Z",
  });
  const right = buildOpportunityAssessmentSourceFingerprint({
    opportunityRowVersion: 7,
    contactUpdatedAt: "2026-09-21T08:00:00.000Z",
    companyUpdatedAt: new Date("2026-09-20T10:00:00.000Z"),
    compassAssessmentUpdatedAt: new Date("2026-09-19T15:30:00.000Z"),
  });
  assert.equal(serializeOpportunityAssessmentSourceFingerprint(left), serializeOpportunityAssessmentSourceFingerprint(right));
  assert.equal(opportunityAssessmentSourceFingerprintsEqual(left, right), true);
  const changed = buildOpportunityAssessmentSourceFingerprint({
    ...left,
    opportunityRowVersion: 8,
  });
  assert.equal(opportunityAssessmentSourceFingerprintsEqual(left, changed), false);
  const emptyFingerprint = buildOpportunityAssessmentSourceFingerprint();
  assert.deepEqual(emptyFingerprint, {
    opportunityRowVersion: null,
    contactUpdatedAt: null,
    companyUpdatedAt: null,
    compassAssessmentUpdatedAt: null,
  });
  console.log("11 SOURCE_FINGERPRINT_DETERMINISTIC: PASS");

  reject({ ...empty, foir: "40.00" }, "Unrecognized key");
  reject({ ...empty, property: { ...empty.property, ltv: "80" } }, "Unrecognized key");
  reject(
    setFact(empty, "incomeAndObligations", "monthlyIncome", knownFact("1e5", "incomeAndObligations.monthlyIncome")),
    "not a valid money decimal",
  );
  reject(
    setFact(empty, "cibil", "exactScore", knownFact(700, "cibil.exactScore")),
    "Missing CIBIL cannot carry a score, band, or not_known value",
  );
  console.log("12 FACTS_SCHEMA_REJECTS_UNSAFE_VALUES: PASS");
}

runStage5c1Proof();
