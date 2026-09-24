import assert from "node:assert/strict";

let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, { get() { databaseAttempts++; throw new Error("DATABASE_FORBIDDEN"); } });

const { recommendLendersCanonical } = await import("../server/services/lender-recommendation/canonical-lender-recommendation.service.ts");
const { runHomeLoanRecommendationEngine } = await import("../src/lib/home-loan-recommendation/engine.ts");
const { createCriterionEvaluatorRegistry } = await import("../src/lib/product-recommendation/registry.ts");
const { overlayDefinedCreateInput } = await import("../server/repositories/lender-registry/structured-program-data.ts");

const now = new Date("2026-09-21T12:00:00Z");
const CONSTRUCTION_FIELD = "assessment:property.constructionStatus";

function readyEqualsFilter() {
  return {
    version: 1,
    root: {
      kind: "group",
      id: "g-construction-ready",
      combinator: "AND",
      children: [{
        kind: "predicate",
        id: "p-construction-ready",
        fieldId: CONSTRUCTION_FIELD,
        operator: "EQUALS",
        value: "ready",
      }],
    },
  };
}

function invalidOperatorFilter() {
  return {
    version: 1,
    root: {
      kind: "group",
      id: "g-invalid",
      combinator: "AND",
      children: [{
        kind: "predicate",
        id: "p-invalid",
        fieldId: CONSTRUCTION_FIELD,
        operator: "GREATER_THAN",
        value: 10,
      }],
    },
  };
}

function programme(id, patch = {}) {
  return {
    id,
    organizationId: "synthetic-org",
    lenderId: `lender-${id}`,
    productCode: "HOME_LOAN",
    code: id,
    label: id,
    versionNumber: 1,
    transactionTypes: null,
    policyVersionId: `version-${id}`,
    policyVersion: {
      id: `version-${id}`,
      organizationId: "synthetic-org",
      policyId: `policy-${id}`,
      versionNumber: 1,
      status: "published",
      eligibilityRules: {},
      creditRules: {},
      effectiveFrom: null,
      effectiveUntil: null,
      policy: {
        id: `policy-${id}`,
        organizationId: "synthetic-org",
        lenderId: `lender-${id}`,
        productCode: "HOME_LOAN",
        status: "published",
        currentPublishedVersionId: `version-${id}`,
        isDeleted: false,
      },
    },
    lender: {
      displayName: `Synthetic ${id}`,
      label: id,
      code: id,
      organizationId: "synthetic-org",
      enabled: true,
      isDeleted: false,
      lifecycleStatus: "active",
      operationalStatus: "active",
      effectiveFrom: null,
      effectiveUntil: null,
    },
    isDeleted: false,
    enabled: true,
    isLivePublished: true,
    publicationState: "published",
    completenessState: "complete",
    lifecycleStatus: "active",
    status: "active",
    approvalStatus: "approved",
    effectiveFrom: null,
    effectiveUntil: null,
    residencyEligibility: ["resident"],
    minIncomeExact: "30000",
    maxIncomeExact: null,
    minLoanAmountExact: "100000",
    maxLoanAmountExact: "10000000",
    minFoirExact: null,
    maxFoirExact: "60",
    minDbrExact: null,
    maxDbrExact: null,
    minRoiExact: "8.5",
    maxRoiExact: "9",
    minLtvExact: null,
    maxLtvExact: "80",
    minCibil: 750,
    maxCibil: 900,
    minAge: 21,
    maxAge: 65,
    minTenureMonths: 60,
    maxTenureMonths: 240,
    ...patch,
  };
}

const customer = {
  journeyKind: "home_loan",
  requiredAmountRupees: 1000000,
  propertyValueRupees: 4000000,
  employmentFamily: "salaried",
  employmentType: "salaried",
  monthlyIncomeRupees: 200000,
  existingMonthlyEmiRupees: 5000,
  residency: "resident",
  cibilBand: 780,
  dateOfBirth: "1990-01-01",
  customerSelectedTenureMonths: 240,
  coApplicantDecision: "no",
  propertyType: "residential",
  constructionStatus: "under_construction",
  state: "test-state",
  city: "test-city",
};

const proofScoring = {
  resolveActiveRuleSet: async () => ({
    id: "proof-rule",
    organizationId: "synthetic-org",
    productCode: "HOME_LOAN",
    lineageId: "proof-lineage",
    versionNumber: 1,
    labelledUnapproved: false,
    simulationOnly: false,
    lifecycleStatus: "active",
    weights: { selected: { proofEqual: 100 }, total: 100 },
  }),
  criterionRegistry: createCriterionEvaluatorRegistry({
    proofEqual: ({ weightPercent }) => ({
      criterionKey: "proofEqual",
      status: "scored",
      criterionScore: 100,
      weightPercent,
      weightedContribution: 100,
    }),
  }),
};

async function orchestrate(inputCustomer, rows) {
  const seenByEngine = [];
  const result = await recommendLendersCanonical(
    { organizationId: "synthetic-org", product: "HOME_LOAN", customer: inputCustomer, asOf: now },
    {
      loadInventory: async () => ({
        programmes: rows,
        lenderCategories: new Map(rows.map((row) => [row.lenderId, "A"])),
      }),
      runEngine: (engineInput) => {
        seenByEngine.push(...engineInput.programmes.map((row) => row.id));
        return runHomeLoanRecommendationEngine(engineInput);
      },
      ...proofScoring,
    },
  );
  return { result, seenByEngine };
}

function assertAbsentFromCards(name, result, programmeId) {
  assert.equal(result.recommendations.some((card) => card.programmeId === programmeId), false, `${name}: card`);
  assert.equal(result.presentation.primaryProgrammeIds.includes(programmeId), false, `${name}: primary`);
  assert.equal(result.presentation.additionalProgrammeIds.includes(programmeId), false, `${name}: additional`);
}

{
  const failed = programme("programme-a-ready-filter", { additionalEligibilityFilters: readyEqualsFilter() });
  const valid = Array.from({ length: 7 }, (_, index) => programme(`programme-b-${index + 1}`));
  const { result, seenByEngine } = await orchestrate(customer, [failed, ...valid]);
  const rejected = result.rejectedProgrammes.find((row) => row.programmeId === failed.id);
  assert.ok(rejected, "A1 rejected record present");
  assert.equal(rejected.reason, "ELIGIBILITY_NOT_MET");
  assert.equal(seenByEngine.includes(failed.id), false, "A1 must not enter Home Loan engine");
  for (const row of valid) assert.ok(seenByEngine.includes(row.id), `A1 ${row.id} continues to engine`);
  assert.equal(result.recommendations.length, 7);
  assert.equal(result.recommendations.some((card) => card.programmeId === failed.id), false);
  assert.ok(result.recommendations.every((card) => card.matchPercent === 100 && card.matchRank >= 1));
  assert.equal(result.presentation.primaryProgrammeIds.length, 5);
  assert.equal(result.presentation.additionalProgrammeIds.length, 2);
  assertAbsentFromCards("A1", result, failed.id);
  console.log("A1 control Ready-filter vs Under Construction: PASS");
}

{
  const missingRow = programme("programme-missing-construction", { additionalEligibilityFilters: readyEqualsFilter() });
  const { constructionStatus: _omit, ...withoutConstruction } = customer;
  const { result, seenByEngine } = await orchestrate(withoutConstruction, [missingRow]);
  assert.equal(seenByEngine.includes(missingRow.id), false, "A2 must not enter engine / Match %");
  assert.equal(result.recommendations.length, 0);
  assert.deepEqual(result.presentation, { primaryProgrammeIds: [], additionalProgrammeIds: [] });
  assert.equal(result.rejectedProgrammes[0]?.programmeId, missingRow.id);
  assert.equal(result.rejectedProgrammes[0]?.reason, "ASSESSMENT_INPUT_REQUIRED");
  assert.ok(result.missingInputs.includes("constructionStatus"));
  assertAbsentFromCards("A2", result, missingRow.id);
  console.log("A2 missing constructionStatus => ASSESSMENT_INPUT_REQUIRED: PASS");
}

{
  const invalidRow = programme("programme-invalid-filter", { additionalEligibilityFilters: invalidOperatorFilter() });
  const { result, seenByEngine } = await orchestrate({ ...customer, constructionStatus: "ready" }, [invalidRow]);
  assert.equal(seenByEngine.includes(invalidRow.id), false, "A3 must not enter engine / Match %");
  assert.equal(result.recommendations.length, 0);
  assert.deepEqual(result.presentation, { primaryProgrammeIds: [], additionalProgrammeIds: [] });
  assert.equal(result.rejectedProgrammes[0]?.programmeId, invalidRow.id);
  assert.equal(result.rejectedProgrammes[0]?.reason, "PROGRAMME_CONFIGURATION_INVALID");
  assertAbsentFromCards("A3", result, invalidRow.id);
  console.log("A3 invalid Additional Filter => PROGRAMME_CONFIGURATION_INVALID: PASS");
}

{
  const published = {
    lenderId: "lender-overlay",
    code: "overlay-proof",
    label: "Overlay proof",
    createdBy: "publisher",
    propertyTypes: ["apartment"],
    propertyCategories: ["residential"],
    constructionStatuses: ["ready"],
  };
  const overlaid = overlayDefinedCreateInput(published, {
    modifiedBy: "editor",
    propertyCategories: ["residential", "plot"],
    constructionStatuses: ["ready", "under_construction"],
  });
  assert.deepEqual(overlaid.propertyCategories, ["residential", "plot"]);
  assert.deepEqual(overlaid.constructionStatuses, ["ready", "under_construction"]);
  assert.deepEqual(overlaid.propertyTypes, ["apartment"]);

  const preserved = overlayDefinedCreateInput(published, { modifiedBy: "editor" });
  assert.deepEqual(preserved.propertyCategories, ["residential"]);
  assert.deepEqual(preserved.constructionStatuses, ["ready"]);

  const nullPreserved = overlayDefinedCreateInput(published, {
    modifiedBy: "editor",
    propertyCategories: null,
    constructionStatuses: null,
  });
  assert.deepEqual(nullPreserved.propertyCategories, ["residential"]);
  assert.deepEqual(nullPreserved.constructionStatuses, ["ready"]);

  const blankPublished = overlayDefinedCreateInput(
    { lenderId: "lender-overlay", code: "overlay-proof", label: "Overlay proof", createdBy: "publisher" },
    { modifiedBy: "editor" },
  );
  assert.equal(blankPublished.propertyCategories, undefined);
  assert.equal(blankPublished.constructionStatuses, undefined);
  console.log("B overlay propertyCategories/constructionStatuses: PASS");
}

assert.equal(databaseAttempts, 0);
console.log("DATABASE_ACCESSED: NO");
console.log("CO_C1_ADDITIONAL_FILTER_ORCHESTRATION_VERIFY: PASS");
