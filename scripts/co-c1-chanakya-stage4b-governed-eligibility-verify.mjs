import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, { get() { databaseAttempts++; throw new Error("DATABASE_FORBIDDEN"); } });
const { recommendLendersCanonical } = await import("../server/services/lender-recommendation/canonical-lender-recommendation.service.ts");
const { parseCanonicalPolicyRules } = await import("../server/services/lender-recommendation/policy-rule-parser.ts");
const { calculateReducingBalanceEmi } = await import("../src/lib/home-loan-recommendation/tenure.ts");
const now = new Date("2026-09-21T12:00:00Z");
function programme(id = "base", product = "HOME_LOAN", patch = {}) {
  return {
    id, organizationId: "synthetic-org", lenderId: `lender-${id}`, productCode: product, code: id, label: id,
    versionNumber: 1, transactionTypes: product === "HOME_LOAN" ? null : ["balance_transfer"],
    policyVersionId: `version-${id}`, policyVersion: { id: `version-${id}`, organizationId: "synthetic-org", policyId: `policy-${id}`,
      versionNumber: 1, status: "published", eligibilityRules: {}, creditRules: {}, effectiveFrom: null, effectiveUntil: null,
      policy: { id: `policy-${id}`, organizationId: "synthetic-org", lenderId: `lender-${id}`, productCode: product,
        status: "published", currentPublishedVersionId: `version-${id}`, isDeleted: false } },
    lender: { displayName: `Synthetic ${id}`, label: id, code: id, organizationId: "synthetic-org", enabled: true,
      isDeleted: false, lifecycleStatus: "active", operationalStatus: "active", effectiveFrom: null, effectiveUntil: null },
    isDeleted: false, enabled: true, isLivePublished: true, publicationState: "published", completenessState: "complete",
    lifecycleStatus: "active", status: "active", approvalStatus: "approved", effectiveFrom: null, effectiveUntil: null,
    residencyEligibility: ["resident"], minIncomeExact: "30000", maxIncomeExact: null,
    minLoanAmountExact: "100000", maxLoanAmountExact: "10000000", minFoirExact: null, maxFoirExact: "60",
    minDbrExact: null, maxDbrExact: null, minRoiExact: "8.5", maxRoiExact: "9", minLtvExact: null, maxLtvExact: "80",
    minCibil: 750, maxCibil: 900, minAge: 21, maxAge: 65, minTenureMonths: 60, maxTenureMonths: 240,
    ...patch,
  };
}
const customer = { journeyKind: "home_loan", requiredAmountRupees: 1000000, propertyValueRupees: 4000000,
  employmentFamily: "salaried", employmentType: "salaried", monthlyIncomeRupees: 200000, existingMonthlyEmiRupees: 5000,
  residency: "resident", cibilBand: 780, dateOfBirth: "1990-01-01", customerSelectedTenureMonths: 240,
  coApplicantDecision: "no", propertyType: "residential", constructionStatus: "ready", state: "test-state", city: "test-city" };
const hl = programme();
let cases = 0;
async function assess(input = customer, rows = [hl], product = "HOME_LOAN", category = "A") {
  const result = await recommendLendersCanonical({ organizationId: "synthetic-org", product, customer: input, asOf: now }, {
    // Intentionally unfiltered: the real service must defend against invalid inventory itself.
    loadInventory: async () => ({ programmes: rows, lenderCategories: new Map(rows.map(row => [row.lenderId, category])) }),
  });
  assert.ok(result.recommendations.every(card => card.lenderScore === null));
  assert.equal(result.versions.lenderScoreVersion, null);
  return result;
}
async function check(name, expected, input = customer, rows = [hl], product = "HOME_LOAN", category = "A", missing) {
  const result = await assess(input, rows, product, category);
  assert.equal(result.recommendations.length, expected, name);
  if (missing) assert.ok(result.missingInputs.includes(missing), `${name}: missing ${missing}`);
  cases++;
  console.log(`${name}: PASS`);
  return result;
}
await check("RESIDENT_MATCH", 1);
await check("MISSING_RESIDENCY", 0, { ...customer, residency: null }, [hl], "HOME_LOAN", "A", "residency");
await check("INCOMPATIBLE_RESIDENCY", 0, { ...customer, residency: "nri" });
await check("ABOVE_CIBIL_THRESHOLD", 1, { ...customer, cibilBand: 800 });
await check("BELOW_CIBIL_THRESHOLD", 0, { ...customer, cibilBand: 740 });
const unknownRow = programme("unknown", "HOME_LOAN", { minCibil: null, maxCibil: null });
const unknown = await check("EXPLICIT_UNKNOWN_ALLOWED_CATEGORY", 1, { ...customer, cibilBand: "not_known" }, [unknownRow]);
assert.equal(unknown.cibilNotKnownDisclaimer, true);
await check("UNKNOWN_DISALLOWED_CATEGORY", 0, { ...customer, cibilBand: "not_known" }, [unknownRow], "HOME_LOAN", "B");
await check("UNKNOWN_WITH_NUMERIC_RULE", 0, { ...customer, cibilBand: "not_known" }, [hl], "HOME_LOAN", "A", "cibil");
await check("MISSING_REQUIRED_CIBIL", 0, { ...customer, cibilBand: null }, [hl], "HOME_LOAN", "A", "cibil");
await check("BAND_FULLY_WITHIN_RULE", 1, { ...customer, cibilBand: "750_799" });
await check("BAND_STRADDLES_THRESHOLD", 0, { ...customer, cibilBand: "750_799" }, [{ ...hl, minCibil: 780 }], "HOME_LOAN", "A", "cibil");
await check("OPEN_BAND_NOT_FABRICATED_SCORE", 0, { ...customer, cibilBand: "800_plus" }, [hl], "HOME_LOAN", "A", "cibil");
const policyRange = programme("policy");
policyRange.policyVersion.creditRules = { rules: [{ type: "cibil_range", minimum: 800, maximum: 850 }] };
await check("PARSED_POLICY_RANGE_ENFORCED", 0, customer, [policyRange]);
await check("PARSED_POLICY_RANGE_SATISFIED", 1, { ...customer, cibilBand: 820 }, [policyRange]);
await check("AGE_WITHIN_POLICY", 1);
await check("AGE_TOO_YOUNG", 0, { ...customer, dateOfBirth: "2010-01-01" });
await check("AGE_AT_MATURITY_EXCEEDED", 0, { ...customer, dateOfBirth: "1970-01-01" });
await check("MISSING_DOB", 0, { ...customer, dateOfBirth: null }, [hl], "HOME_LOAN", "A", "dateOfBirth");
await check("INVALID_CALENDAR_DOB", 0, { ...customer, dateOfBirth: "1990-02-30" }, [hl], "HOME_LOAN", "A", "dateOfBirth");
await check("TENURE_WITHIN_MAXIMUM", 1, { ...customer, customerSelectedTenureMonths: 180 });
await check("TENURE_ABOVE_MAXIMUM", 0, { ...customer, customerSelectedTenureMonths: 241 });
await check("TENURE_BELOW_MINIMUM", 0, { ...customer, customerSelectedTenureMonths: 12 });
await check("MISSING_TENURE_NO_MAXIMUM_SUBSTITUTION", 0, { ...customer, customerSelectedTenureMonths: null }, [hl], "HOME_LOAN", "A", "requestedTenure");
await check("FOIR_WITHIN_LIMIT", 1);
await check("FOIR_ABOVE_LIMIT", 0, { ...customer, existingMonthlyEmiRupees: 119000 });
await check("MISSING_INCOME", 0, { ...customer, monthlyIncomeRupees: null }, [hl], "HOME_LOAN", "A", "monthlyIncome");
await check("MISSING_OBLIGATIONS", 0, { ...customer, existingMonthlyEmiRupees: null }, [hl], "HOME_LOAN", "A", "obligations");
await check("EXPLICIT_ZERO_OBLIGATIONS", 1, { ...customer, existingMonthlyEmiRupees: 0 });
await check("LTV_WITHIN_LIMIT", 1);
await check("LTV_ABOVE_LIMIT", 0, { ...customer, requiredAmountRupees: 3500000 });
await check("MISSING_PROPERTY_VALUE", 0, { ...customer, propertyValueRupees: null }, [hl], "HOME_LOAN", "A", "propertyValue");
const se = await check("SELF_EMPLOYED_UNSUPPORTED", 0, { ...customer, employmentFamily: "self_employed" });
assert.equal(se.rejectedProgrammes[0].reason, "UNSUPPORTED_GOVERNED_RULE");
await check("DBR_UNSUPPORTED", 0, customer, [{ ...hl, maxDbrExact: "40" }]);
await check("METHODOLOGY_BOOLEAN_NOT_IMPLEMENTATION", 0, customer, [{ ...hl, policyAssessmentJson: { selfEmployedMethodologyPresent: true } }]);
const bt = programme("bt", "HOME_LOAN_BT", { policyAssessmentJson: { requiredSeasoningMonths: 12, repaymentCleanRequired: true, maxDelayedEmis: 0 } });
const btCustomer = { ...customer, journeyKind: "home_loan_balance_transfer", currentOutstandingRupees: 1200000,
  currentOutstandingCertainty: "exact", loanStartDate: "2020-01-01", loanStartDateCertainty: "exact",
  repaymentTrack: "yes", delayedEmiCount: 0, currentHomeLoanEmiRupees: 16000, currentHomeLoanEmiCertainty: "exact",
  currentRoiPercent: 10, currentRoiCertainty: "exact", remainingTenureMonths: 120, remainingTenureCertainty: "exact" };
await check("VALID_BALANCE_TRANSFER", 1, btCustomer, [bt], "HOME_LOAN_BT");
await check("BT_MISSING_OUTSTANDING", 0, { ...btCustomer, currentOutstandingRupees: null }, [bt], "HOME_LOAN_BT", "A", "btOutstanding");
await check("BT_NO_UNREQUESTED_TOPUP", 0, { ...btCustomer, currentOutstandingRupees: 500000 }, [bt], "HOME_LOAN_BT");
await check("BT_MISSING_SEASONING", 0, { ...btCustomer, loanStartDate: null }, [bt], "HOME_LOAN_BT", "A", "loanStartDate");
await check("BT_INSUFFICIENT_SEASONING", 0, { ...btCustomer, loanStartDate: "2026-08-01" }, [bt], "HOME_LOAN_BT");
await check("BT_UNKNOWN_REPAYMENT", 0, { ...btCustomer, repaymentTrack: "not_sure" }, [bt], "HOME_LOAN_BT", "A", "repaymentTrack");
await check("BT_MISSING_DELAY_COUNT", 0, { ...btCustomer, delayedEmiCount: null }, [bt], "HOME_LOAN_BT", "A", "delayedEmis");
const noSavings = await check("BT_MISSING_OPTIONAL_COMPARISON_FACTS", 1, { ...btCustomer, currentRoiPercent: null }, [bt], "HOME_LOAN_BT");
assert.equal(noSavings.recommendations[0].savingSuppressed, true);
assert.equal(noSavings.recommendations[0].indicativeSavingRupees, null);
await check("UNSUPPORTED_REQUIRED_BT_RULE", 0, btCustomer, [{ ...bt, policyAssessmentJson: { requiresCurrentRoi: true } }], "HOME_LOAN_BT");
assert.deepEqual((await assess(customer, [bt, hl])).recommendations.map(card => card.programmeId), ["base"]);
assert.deepEqual((await assess(btCustomer, [hl, bt], "HOME_LOAN_BT")).recommendations.map(card => card.programmeId), ["bt"]);
await check("JOURNEY_PRODUCT_MISMATCH", 0, customer, [bt], "HOME_LOAN_BT");
await check("TOPUP_NOT_INTRODUCED", 0, { ...btCustomer, journeyKind: "home_loan_balance_transfer_topup" }, [bt], "HOME_LOAN_BT");
for (const patch of [{ publicationState: "draft" }, { enabled: false }, { effectiveUntil: new Date("2020-01-01") },
  { effectiveFrom: new Date("2030-01-01") }, { effectiveFrom: "invalid-date" }, { organizationId: "other-org" },
  { lifecycleStatus: "inactive" }, { approvalStatus: "pending" }]) await check("PROGRAMME_AVAILABILITY", 0, customer, [{ ...hl, ...patch }]);
for (const patch of [{ enabled: false }, { isDeleted: true }, { operationalStatus: "restricted" },
  { lifecycleStatus: "suspended" }, { organizationId: "other-org" }, { effectiveUntil: new Date("2020-01-01") }]) {
  await check("LENDER_AVAILABILITY", 0, customer, [{ ...hl, lender: { ...hl.lender, ...patch } }]);
}
await check("MISSING_POLICY_LINK", 0, customer, [{ ...hl, policyVersion: null }]);
await check("STALE_POLICY_VERSION", 0, customer, [{ ...hl, policyVersion: { ...hl.policyVersion,
  policy: { ...hl.policyVersion.policy, currentPublishedVersionId: "different" } } }]);
await check("EXPIRED_POLICY", 0, customer, [{ ...hl, policyVersion: { ...hl.policyVersion, effectiveUntil: new Date("2020-01-01") } }]);
await check("ADDITIONAL_CONFIGURED_LENDERS", 14, customer, Array.from({ length: 14 }, (_, i) => programme(`configured-${i}`)));
const explanation = await assess({ ...customer, residency: null, monthlyIncomeRupees: null });
assert.ok(explanation.missingInputs.includes("residency") && explanation.missingInputs.includes("monthlyIncome"));
assert.equal(explanation.rejectedProgrammes[0].reason, "ASSESSMENT_INPUT_REQUIRED");
assert.doesNotMatch(JSON.stringify(explanation), /confidence|stars|eligibilityRules|creditRules/);
for (const field of ["propertyCategories", "constructionStatuses", "employmentTypes", "eligibleStates", "eligibleCities", "legalConstitutions"]) {
  await check(`MISMATCH_${field}`, 0, customer, [{ ...hl, [field]: ["incompatible-value"] }]);
}
for (const field of ["applicantTypes", "customerSegments", "requiredDocumentTypeIds", "incomeAssessmentMethods"]) {
  await check(`UNSUPPORTED_${field}`, 0, customer, [{ ...hl, [field]: ["unimplemented"] }]);
}
await check("VALID_PROPERTY_AND_GEOGRAPHY", 1, customer, [{ ...hl, propertyCategories: ["residential"],
  constructionStatuses: ["ready"], employmentTypes: ["salaried"], eligibleStates: ["test-state"], eligibleCities: ["test-city"] }]);
await check("MISSING_GEOGRAPHY", 0, { ...customer, state: null }, [{ ...hl, eligibleStates: ["test-state"] }], "HOME_LOAN", "A", "state");
await check("JSON_PROPERTY_SETTINGS", 0, customer, [{ ...hl, policyAssessmentJson: { allowedOccupancy: ["self_occupied"] } }], "HOME_LOAN", "A", "occupancy");
await check("COAPPLICANT_MISSING_EMI", 0, { ...customer, coApplicantDecision: "yes", coApplicant: { monthlyIncomeRupees: 50000 } },
  [{ ...hl, policyAssessmentJson: { acceptsCoApplicantIncome: true } }], "HOME_LOAN", "A", "coApplicant");
await check("COAPPLICANT_COMPLETE", 1, { ...customer, coApplicantDecision: "yes", coApplicant: { employmentType: "salaried", monthlyIncomeRupees: 50000, existingMonthlyEmiRupees: 0 } },
  [{ ...hl, policyAssessmentJson: { acceptsCoApplicantIncome: true } }]);
await check("COAPPLICANT_UNKNOWN_INCOME_METHOD", 0, { ...customer, coApplicantDecision: "yes", coApplicant: { monthlyIncomeRupees: 50000, existingMonthlyEmiRupees: 0 } },
  [{ ...hl, policyAssessmentJson: { acceptsCoApplicantIncome: true } }], "HOME_LOAN", "A", "coApplicant");
await check("COAPPLICANT_UNSUPPORTED_INCOME_METHOD", 0, { ...customer, coApplicantDecision: "yes", coApplicant: { employmentType: "self-employed-business", monthlyIncomeRupees: 50000, existingMonthlyEmiRupees: 0 } },
  [{ ...hl, policyAssessmentJson: { acceptsCoApplicantIncome: true } }]);
await check("MATURITY_POLICY_JSON", 0, customer, [{ ...hl, policyAssessmentJson: { maxAgeAtMaturityYears: 50 } }]);
for (const bad of [[], "garbage", { rules: [], ignoredConstraint: true }, { rules: [null] },
  { rules: [{ type: "cibil_range", minimum: 750, ignoredConstraint: true }] }]) assert.throws(() => parseCanonicalPolicyRules(bad));
for (const patch of [{ minCibil: "750" }, { minCibil: 900, maxCibil: 750 }, { residencyEligibility: "resident" },
  { maxFoirExact: "bad" }, { policyAssessmentJson: { requiredSeasoningMonths: "12" } }]) {
  await check("MALFORMED_RULE_FAILS_CLOSED", 0, customer, [{ ...hl, ...patch }]);
}
const secretLikeRule = { ...hl, policyVersion: { ...hl.policyVersion, eligibilityRules: { rules: [{ type: "DO_NOT_ECHO_SENTINEL" }] } } };
assert.doesNotMatch(JSON.stringify(await assess(customer, [secretLikeRule])), /DO_NOT_ECHO_SENTINEL/);
await check("ACTIVE_OVERRIDE_BLOCKS", 0, customer, [{ ...hl, suspendedByOverride: true }]);
await check("MATURITY_ONE_DAY_OVER_LIMIT", 0, { ...customer, dateOfBirth: "1981-09-20" });
await check("MATURITY_EXACT_BOUNDARY", 1, { ...customer, dateOfBirth: "1981-09-21" });
const proposedEmi = calculateReducingBalanceEmi({ principalRupees: customer.requiredAmountRupees, annualRoiPercent: 8.5, tenureMonths: 240 });
await check("FOIR_ROUNDING_CANNOT_HIDE_EXCESS", 0, { ...customer, existingMonthlyEmiRupees: customer.monthlyIncomeRupees * 0.6 - proposedEmi + 0.01 });
await check("FOIR_EXACT_BOUNDARY", 1, { ...customer, existingMonthlyEmiRupees: customer.monthlyIncomeRupees * 0.6 - proposedEmi });
await check("INCOME_MINIMUM", 0, { ...customer, monthlyIncomeRupees: 29000 });
await check("INCOME_MAXIMUM", 0, customer, [{ ...hl, maxIncomeExact: "150000" }]);
await check("LEGACY_DBR_STILL_BLOCKS", 0, customer, [{ ...hl, maxDbrPercent: 40 }]);
await check("LEGACY_LTV_STRICTER_CAP", 0, customer, [{ ...hl, maxLtvPercent: 20 }]);
await check("LEGACY_FOIR_STRICTER_CAP", 0, customer, [{ ...hl, maxFoirPercent: 1 }]);
await check("MISSING_REQUESTED_AMOUNT", 0, { ...customer, requiredAmountRupees: null }, [hl], "HOME_LOAN", "A", "requestedAmount");
await check("MISSING_EMPLOYMENT_NOT_SALARIED", 0, { ...customer, employmentFamily: "unknown" }, [hl], "HOME_LOAN", "A", "employment");
await check("MISSING_CONSTRUCTION", 0, { ...customer, constructionStatus: null }, [{ ...hl, constructionStatuses: ["ready"] }], "HOME_LOAN", "A", "constructionStatus");
await check("BT_LATE_EMI_LIMIT", 0, { ...btCustomer, delayedEmiCount: 1 }, [bt], "HOME_LOAN_BT");
await check("COAPPLICANT_AGE_CANNOT_FALLBACK", 0, customer, [{ ...hl, policyAssessmentJson: { ageGoverningParty: "younger" } }], "HOME_LOAN", "A", "coApplicant");
const accepted = await assess();
for (const patch of [{ tenureMonths: 999 }, { foirPercent: 99 }, { propertyValueConsideredRupees: 9000000 }, { lenderId: "wrong" }]) {
  const defended = await recommendLendersCanonical({ organizationId: "synthetic-org", product: "HOME_LOAN", customer, asOf: now }, {
    loadInventory: async () => ({ programmes: [hl], lenderCategories: new Map([[hl.lenderId, "A"]]) }),
    runEngine: () => ({ cards: [{ ...accepted.recommendations[0], ...patch }], versions: accepted.versions,
      analyzedAt: now.toISOString(), cibilNotKnownDisclaimer: false }),
  });
  assert.equal(defended.recommendations.length, 0, "post-calculation defence");
}

// Actual repository code, memory-only doubles. Verify scoped/dated override read,
// parent-lender projection, bounded retrieval, and global/targeted blocking.
let overrideRows = [{ lenderId: hl.lenderId, programmeId: null }];
const queries = [];
const repositoryExports = {};
const repositorySource = readFileSync(new URL("../server/services/lender-recommendation/recommendation-programme.repository.ts", import.meta.url), "utf8");
vm.runInNewContext(ts.transpileModule(repositorySource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
  exports: repositoryExports, require(name) {
    if (name === "server-only") return {};
    if (name === "@server/lib/prisma") return { prisma: {
      $transaction: operations => Promise.all(operations),
      enterpriseLenderProgram: { findMany: async query => { queries.push(["programmes", query]); return [hl]; } },
      hlRecommendationLenderCategoryAssignment: { findMany: async query => { queries.push(["categories", query]); return [{ lenderId: hl.lenderId, category: "A" }]; } },
      hlRecommendationOverride: { findMany: async query => { queries.push(["overrides", query]); return overrideRows; } },
    } };
    throw new Error("UNEXPECTED_REPOSITORY_IMPORT");
  },
});
const inventoryQuery = { organizationId: "synthetic-org", product: "HOME_LOAN", asOf: now };
assert.equal((await repositoryExports.loadCanonicalProgrammeInventory(inventoryQuery)).programmes[0].suspendedByOverride, true);
const overrideQuery = queries.find(([name]) => name === "overrides")[1];
assert.equal(overrideQuery.where.organizationId, "synthetic-org");
assert.equal(overrideQuery.where.lifecycleStatus, "active");
assert.equal(overrideQuery.where.isDeleted, false);
assert.equal(overrideQuery.where.startsAt.lte, now);
assert.equal(overrideQuery.where.OR[1].endsAt.gte, now);
assert.equal(overrideQuery.take, 101);
assert.equal(queries[0][1].include.lender.select.operationalStatus, true);
overrideRows = [{ lenderId: null, programmeId: null }];
assert.equal((await repositoryExports.loadCanonicalProgrammeInventory(inventoryQuery)).programmes[0].suspendedByOverride, true);
overrideRows = [{ lenderId: "different-lender", programmeId: "different-programme" }];
assert.equal((await repositoryExports.loadCanonicalProgrammeInventory(inventoryQuery)).programmes[0].suspendedByOverride, false);
overrideRows = Array.from({ length: 101 }, () => ({ lenderId: null, programmeId: null }));
await assert.rejects(repositoryExports.loadCanonicalProgrammeInventory(inventoryQuery), /safety boundary/);
console.log("REPOSITORY_AND_POST_CALCULATION_PROOFS: PASS (memory-only)");
assert.equal(databaseAttempts, 0);
console.log(`STAGE4B: PASS (${cases} scenario checks plus protocol assertions); DATABASE_ACCESSED: NO; CERTIFICATION: NOT EXECUTED`);
