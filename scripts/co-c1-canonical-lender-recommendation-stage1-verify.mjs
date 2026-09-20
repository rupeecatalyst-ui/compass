import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mapCanonicalProgramme, validateCanonicalPolicyLink } from "../server/services/lender-recommendation/programme-assessment-adapter.ts";
import { parseCanonicalPolicyRules, UnsupportedEligibilityPolicyRuleError } from "../server/services/lender-recommendation/policy-rule-parser.ts";
import { recommendLendersCanonical } from "../server/services/lender-recommendation/canonical-lender-recommendation.service.ts";
import { isCanonicalProgrammeAvailable } from "../server/services/lender-recommendation/programme-availability.ts";

const now = new Date("2026-09-20T12:00:00.000Z");
const policy = (overrides = {}) => ({
  id: "policy-version-1", organizationId: "org-1", policyId: "policy-1", versionNumber: 1,
  status: "published", eligibilityRules: {}, creditRules: {}, effectiveFrom: null, effectiveUntil: null,
  policy: { id: "policy-1", organizationId: "org-1", lenderId: "lender-1", productCode: "HOME_LOAN", status: "published", currentPublishedVersionId: "policy-version-1", isDeleted: false },
  ...overrides,
});
const row = (overrides = {}) => ({
  id: "programme-1", organizationId: "org-1", lenderId: "lender-1", productCode: "HOME_LOAN",
  code: "BASE_TEST_HL", label: "Test HL", versionNumber: 1, transactionTypes: null,
  policyVersionId: "policy-version-1", policyVersion: policy(),
  lender: { displayName: "Test Lender", label: "Test Lender", code: "TEST" },
  isDeleted: false, enabled: true, isLivePublished: true, publicationState: "published", completenessState: "complete",
  lifecycleStatus: "published", status: "active", approvalStatus: "approved", effectiveFrom: null, effectiveUntil: null,
  minIncomeExact: null, maxIncomeExact: null, minLoanAmountExact: null, maxLoanAmountExact: null,
  minFoirExact: null, maxFoirExact: null, minDbrExact: null, maxDbrExact: null,
  minRoiExact: "8.500000", maxRoiExact: "9.000000", minLtvExact: null, maxLtvExact: "80.000000",
  minCibil: 700, maxCibil: 900, minAge: null, maxAge: 65, minTenureMonths: null, maxTenureMonths: 240,
  ...overrides,
});

// Exact product isolation and HOME_LOAN blank transaction semantics.
const hl = mapCanonicalProgramme({ row: row(), product: "HOME_LOAN", lenderCategory: "A", asOf: now });
assert.equal(hl.canonicalProduct, "HOME_LOAN");
assert.equal(hl.canonicalConstraints.transactionTypes, null);
assert.equal(hl.canonicalConstraints.minIncomeRupees, null);
assert.equal(hl.minIncomeExact, null);
assert.equal(hl.lenderScore, null);
assert.equal(hl.lenderScoreVersion, null);
assert.throws(() => mapCanonicalProgramme({ row: row(), product: "HOME_LOAN_BT", lenderCategory: "A", asOf: now }), /PROGRAMME_PRODUCT_MISMATCH/);

const btPolicy = policy({ policy: { ...policy().policy, productCode: "HOME_LOAN_BT" } });
const bt = row({ productCode: "HOME_LOAN_BT", code: "BASE_TEST_HLBT", transactionTypes: ["balance_transfer"], policyVersion: btPolicy });
assert.equal(mapCanonicalProgramme({ row: bt, product: "HOME_LOAN_BT", lenderCategory: "A", asOf: now }).canonicalProduct, "HOME_LOAN_BT");
assert.throws(() => mapCanonicalProgramme({ row: { ...bt, transactionTypes: null }, product: "HOME_LOAN_BT", lenderCategory: "A", asOf: now }), /HLBT_TRANSACTION_TYPE_MISMATCH/);

// Structural policy failures.
assert.equal(validateCanonicalPolicyLink(row({ policyVersion: policy({ organizationId: "org-2" }) }), "HOME_LOAN", now), "POLICY_ORGANIZATION_MISMATCH");
assert.equal(validateCanonicalPolicyLink(row({ policyVersion: policy({ policy: { ...policy().policy, lenderId: "lender-2" } }) }), "HOME_LOAN", now), "POLICY_LENDER_MISMATCH");
assert.equal(validateCanonicalPolicyLink(row({ policyVersion: policy({ policy: { ...policy().policy, productCode: "HOME_LOAN_BT" } }) }), "HOME_LOAN", now), "POLICY_PRODUCT_MISMATCH");
assert.equal(validateCanonicalPolicyLink(row({ policyVersion: null }), "HOME_LOAN", now), "POLICY_VERSION_MISSING");
assert.equal(validateCanonicalPolicyLink(row({ policyVersion: policy({ status: "draft" }) }), "HOME_LOAN", now), "POLICY_NOT_PUBLISHED");

assert.deepEqual(parseCanonicalPolicyRules({}), { cibilRanges: [] });
assert.throws(() => parseCanonicalPolicyRules({ rules: [{ type: "unapproved_income_rule" }] }), UnsupportedEligibilityPolicyRuleError);

// Service dependency injection proves read-only orchestration and existing engine reuse.
let engineCalls = 0;
const result = await recommendLendersCanonical({
  organizationId: "org-1", product: "HOME_LOAN", asOf: now,
  customer: { journeyKind: "home_loan", requiredAmountRupees: null, propertyValueRupees: null, employmentFamily: "salaried" },
}, {
  loadInventory: async () => ({ programmes: [row()], lenderCategories: new Map([["lender-1", "A"]]) }),
  runEngine: ({ programmes }) => {
    engineCalls += 1;
    assert.equal(programmes.length, 1);
    return { outcome: "assisted_offer", journeyKind: "home_loan", cards: [], needsCoApplicantPrompt: false, assisted: null,
      versions: { calculationVersion: "test", ruleSetVersion: null, categoryRuleVersion: null, lenderScoreVersion: null, ltvMasterVersion: null },
      cibilNotKnownDisclaimer: true, analyzedAt: now.toISOString() };
  },
});
assert.equal(engineCalls, 1);
assert.equal(result.readOnly, true);
assert.equal(result.versions.lenderScoreVersion, null);

// Configuration-driven candidate universe: no lender/programme identity is encoded.
const availability = (candidate) => isCanonicalProgrammeAvailable({
  programme: candidate, organizationId: "org-1", product: "HOME_LOAN", asOf: now,
});
const newlyPublished = row({ id: "programme-new", lenderId: "lender-new", code: "CONFIGURED_NEW_PROGRAMME" });
assert.equal(availability(newlyPublished), true, "newly published programme appears from data alone");
assert.equal(availability({ ...newlyPublished, publicationState: "draft", isLivePublished: false }), false, "unpublished programme disappears");
assert.equal(availability({ ...newlyPublished, enabled: false }), false, "disabled programme disappears");
assert.equal(availability({ ...newlyPublished, effectiveUntil: new Date("2026-09-19T23:59:59Z") }), false, "expired programme disappears");

const anotherLender = row({
  id: "programme-another-lender", lenderId: "lender-configured-at-runtime", code: "ANOTHER_CONFIGURED_PROGRAMME",
  policyVersion: policy({ policy: { ...policy().policy, lenderId: "lender-configured-at-runtime" } }),
});
assert.doesNotThrow(() => mapCanonicalProgramme({ row: anotherLender, product: "HOME_LOAN", lenderCategory: "B", asOf: now }));
assert.equal(validateCanonicalPolicyLink(row({ policyVersion: policy({ status: "draft" }) }), "HOME_LOAN", now), "POLICY_NOT_PUBLISHED");

// Static safety assertions: bounded +1 detection, no writes, exact database product predicate.
const repository = readFileSync(new URL("../server/services/lender-recommendation/recommendation-programme.repository.ts", import.meta.url), "utf8");
assert.match(repository, /productCode: input\.product/);
assert.match(repository, /PROGRAMME_SAFETY_LIMIT \+ 1/);
assert.match(repository, /programmes\.length > PROGRAMME_SAFETY_LIMIT/);
assert.doesNotMatch(repository, /\.(create|update|upsert|delete|deleteMany|updateMany)\s*\(/);
const service = readFileSync(new URL("../server/services/lender-recommendation/canonical-lender-recommendation.service.ts", import.meta.url), "utf8");
assert.match(service, /runHomeLoanRecommendationEngine/);
assert.doesNotMatch(service, /score:\s*88|lenderScore:\s*88/);
const allCanonicalSource = [repository, service,
  readFileSync(new URL("../server/services/lender-recommendation/programme-assessment-adapter.ts", import.meta.url), "utf8"),
  readFileSync(new URL("../server/services/lender-recommendation/programme-availability.ts", import.meta.url), "utf8")].join("\n");
assert.doesNotMatch(allCanonicalSource, /Central Bank|HDFC|HSBC|Axis Bank|ICICI|Saraswat/);

console.log("Canonical lender recommendation Stage 1 verification: PASS");
