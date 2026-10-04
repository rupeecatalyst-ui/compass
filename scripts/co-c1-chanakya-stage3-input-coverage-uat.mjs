// Database-free characterization only. Reproducing a defect is NOT a UAT acceptance pass.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, { get() { databaseAttempts++; throw new Error("DATABASE_FORBIDDEN"); } });
// Preserve the original Stage 3 characterization against its frozen Stage 2 source.
// Current Stage 4A is tested separately below; these historical failures are NOT current acceptance tests.
const baseline = "53a2c20ada2384b969ca22b90814a44d92511153";
const baselineSource = path => execFileSync("git", ["show", `${baseline}:${path}`], {
  cwd: fileURLToPath(new URL("..", import.meta.url)), encoding: "utf8",
});
// Stage 4B now fixes the historical service/adapter defects. Freeze those too so
// this artifact remains an honest reproduction, not a test expecting today's engine to be unsafe.
function loadFrozen(path, imports) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(baselineSource(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => {
    if (!(name in imports)) throw new Error("UNEXPECTED_FROZEN_IMPORT");
    return imports[name];
  } });
  return exports;
}
const frozenParser = loadFrozen("server/services/lender-recommendation/policy-rule-parser.ts", {});
const frozenAdapter = loadFrozen("server/services/lender-recommendation/programme-assessment-adapter.ts", { "./policy-rule-parser": frozenParser });
const { mapCanonicalProgramme } = frozenAdapter;
const { recommendLendersCanonical } = loadFrozen("server/services/lender-recommendation/canonical-lender-recommendation.service.ts", {
  "server-only": {}, "./programme-assessment-adapter": frozenAdapter,
  "./recommendation-programme.repository": { loadCanonicalProgrammeInventory: () => { throw new Error("DATABASE_FORBIDDEN"); } },
  "@/lib/home-loan-recommendation/engine": await import("../src/lib/home-loan-recommendation/engine.ts"),
});
const baselineImports = {
  "server-only": {},
  zod: await import("zod"),
  "@/lib/product-programme-operations/product-aliases": await import("../src/lib/product-programme-operations/product-aliases.ts"),
  "@/lib/context-aware-data-collection": await import("../src/lib/context-aware-data-collection/index.ts"),
  "@server/services/lender-recommendation/canonical-lender-recommendation.service": { recommendLendersCanonical },
};
const baselineExports = {};
vm.runInNewContext(ts.transpileModule(baselineSource("server/services/enterprise-opportunity/chanakya-recommendations.ts"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: baselineExports, require: name => {
  if (!(name in baselineImports)) throw new Error("UNEXPECTED_BASELINE_IMPORT");
  return baselineImports[name];
} });
const { recommendForChanakyaOpportunity, chanakyaAssessmentDraftSchema } = baselineExports;
console.log(`HISTORICAL_STAGE3_BASE: ${baseline}; current Stage 4A fixtures follow separately.`);
const { isCanonicalProgrammeAvailable } = await import("../server/services/lender-recommendation/programme-availability.ts");
const { absoluteRupeesToStoredString } = await import("../src/lib/enterprise-financial-input/index.ts");
const now = new Date("2026-09-21T12:00:00Z");

function programme(id, product = "HOME_LOAN", extra = {}) {
  return {
    id, organizationId: "synthetic-org", lenderId: `synthetic-lender-${id}`, productCode: product,
    code: id, label: id, versionNumber: 1, transactionTypes: product === "HOME_LOAN" ? null : ["balance_transfer"],
    policyVersionId: `synthetic-version-${id}`,
    policyVersion: {
      id: `synthetic-version-${id}`, organizationId: "synthetic-org", policyId: `synthetic-policy-${id}`, versionNumber: 1,
      status: "published", eligibilityRules: {}, creditRules: {}, effectiveFrom: null, effectiveUntil: null,
      policy: { id: `synthetic-policy-${id}`, organizationId: "synthetic-org", lenderId: `synthetic-lender-${id}`, productCode: product,
        status: "published", currentPublishedVersionId: `synthetic-version-${id}`, isDeleted: false },
    },
    lender: { displayName: `Synthetic ${id}`, label: id, code: id },
    isDeleted: false, enabled: true, isLivePublished: true, publicationState: "published", completenessState: "complete",
    lifecycleStatus: "published", status: "active", approvalStatus: "approved", effectiveFrom: null, effectiveUntil: null,
    minIncomeExact: "30000", maxIncomeExact: null, minLoanAmountExact: "100000", maxLoanAmountExact: "10000000",
    minFoirExact: null, maxFoirExact: "60", minDbrExact: null, maxDbrExact: null,
    minRoiExact: "8.5", maxRoiExact: "9", minLtvExact: null, maxLtvExact: "80",
    minCibil: 750, maxCibil: 900, minAge: 21, maxAge: 65, minTenureMonths: 60, maxTenureMonths: 240,
    ...extra,
  };
}
const opportunity = {
  organizationId: "synthetic-org", productCode: "HOME_LOAN", transactionType: null,
  requestedAmount: 1000000, employmentTypeCode: "salaried", cityLabel: "Synthetic City",
  primaryBorrowerKind: "individual", stateLabel: "Synthetic State",
  lendingExtension: { approxCibilScore: "750_799" },
};
const file = { loanProduct: "HOME_LOAN", loanAmount: 1000000, city: "Synthetic City" };
const completeStated = {
  statedIncomeMonthly: absoluteRupeesToStoredString(100000, { overridePrefix: true }),
  statedObligations: "5000", statedPropertyValue: absoluteRupeesToStoredString(4000000),
  statedPropertyType: "residential", statedConstitution: "individual",
};
// Execute the real browser transport mapping with a fake HTTP function and no real React/HTTP.
const hookSource = baselineSource("src/hooks/use-chanakya-canonical-recommendations.ts");
function browserDraft(stated) {
  let body;
  const exports = {};
  vm.runInNewContext(ts.transpileModule(hookSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, AbortController,
    require(name) {
      if (name === "react") return { useState: initial => [initial, () => {}], useEffect: run => run() };
      if (name.endsWith("api-client")) return { authenticatedJsonFetch: async (_url, options) => {
        body = JSON.parse(options.body);
        return { ok: true, json: async () => ({ success: true, data: { recommendations: [] } }) };
      } };
      throw new Error("UNEXPECTED_IMPORT");
    },
  });
  exports.useChanakyaCanonicalRecommendations("synthetic-opportunity", file, stated);
  return chanakyaAssessmentDraftSchema.parse(body);
}
let lastRequest;
async function assess(opp, draft, rows) {
  lastRequest = undefined;
  return recommendForChanakyaOpportunity(opp, draft, request => {
    lastRequest = request;
    return recommendLendersCanonical({ ...request, asOf: now }, {
      loadInventory: async query => ({
        programmes: rows.filter(row => isCanonicalProgrammeAvailable({ programme: row, ...query })),
        lenderCategories: new Map(rows.map(row => [row.lenderId, "A"])),
      }),
    });
  });
}
const log = (name, outcome, detail) => console.log(`${name}: ${outcome} — ${detail}`);
const hl = programme("hl");
const uiDraft = browserDraft(completeStated);
assert.equal(uiDraft.monthlyIncomeRupees, null);
assert.equal((await assess(opportunity, uiDraft, [hl])).recommendations.length, 0);
log("SALARIED_HL", "BLOCKED", "Actual UI override-prefixed income becomes null; no recommendation.");

// This plain-numeric stated value is a diagnostic control, not an application fix/default.
const plainDraft = browserDraft({ ...completeStated, statedIncomeMonthly: "100000" });
assert.equal((await assess(opportunity, plainDraft, [hl])).recommendations.length, 1);
log("PLAIN_NUMERIC_HL_CONTROL", "PASS", "Eligible synthetic programme; exposes downstream checks independently of UI parsing.");

const selfEmployed = { ...opportunity, employmentTypeCode: "self-employed-business" };
const selfDraft = browserDraft({ ...completeStated, statedIncomeMonthly: "", statedTurnover: "12000000", statedConstitution: "sole_proprietorship" });
const seProgramme = programme("self", "HOME_LOAN", { policyAssessmentJson: { selfEmployedMethodologyPresent: true } });
assert.equal((await assess(selfEmployed, selfDraft, [seProgramme])).recommendations.length, 0);
assert.equal(lastRequest.customer.turnover, undefined);
assert.equal(mapCanonicalProgramme({ row: seProgramme, product: "HOME_LOAN", lenderCategory: "A", asOf: now }).selfEmployedMethodologyPresent, undefined);
log("SELF_EMPLOYED_HL", "BLOCKED", "Turnover not mapped; policyAssessmentJson methodology flag not projected; no self-employed income calculation.");

const bt = programme("bt", "HOME_LOAN_BT", { policyAssessmentJson: { requiredSeasoningMonths: 12, repaymentCleanRequired: true } });
const btOpportunity = { ...opportunity, productCode: "HOME_LOAN_BT", transactionType: "balance_transfer",
  lendingExtension: { ...opportunity.lendingExtension, btAmount: 800000 },
  snapshot: { compassAnswers: { loanStartDate: "2020-01-01", loanStartDateCertainty: "exact", currentEmi: 16000,
    currentEmiCertainty: "exact", currentRoi: 10, currentRoiCertainty: "exact", remainingTenureMonths: 120,
    remainingTenureCertainty: "exact", outstandingLoanAmount: 800000, residency: "resident", dateOfBirth: "1990-01-01" } },
};
assert.equal((await assess(btOpportunity, uiDraft, [bt])).recommendations.length, 0);
const btControl = await assess(btOpportunity, plainDraft, [bt]);
assert.equal(btControl.recommendations.length, 1);
for (const field of ["currentOutstandingRupees", "currentHomeLoanEmiRupees", "currentRoiPercent", "loanStartDate", "remainingTenureMonths", "residency", "dateOfBirth"]) assert.equal(lastRequest.customer[field], undefined);
assert.equal(btControl.recommendations[0].savingSuppressed, true);
assert.equal(btControl.recommendations[0].transferComponentRupees, 1000000);
log("SALARIED_HLBT", "BLOCKED/UNSAFE_CONTROL", "UI income blocks; plain-income control ignores saved BT outstanding/technical facts, returns full offer as transfer; savings suppressed.");

assert.equal((await assess(opportunity, { ...plainDraft, monthlyIncomeRupees: null }, [hl])).recommendations.length, 0);
log("MISSING_INCOME", "PASS", "No salaried recommendation.");
await assert.rejects(assess(opportunity, { ...plainDraft, propertyValueRupees: null }, [hl]), /ASSESSMENT_INPUT_REQUIRED/);
log("MISSING_PROPERTY_VALUE", "PASS", "Mapper rejects before service.");

const residencyProgramme = programme("resident-only", "HOME_LOAN", { residencyEligibility: ["resident"] });
assert.equal((await assess(opportunity, plainDraft, [residencyProgramme])).recommendations.length, 1);
assert.equal(lastRequest.customer.residency, undefined);
log("MISSING_RESIDENCY", "FAIL", "Recommendation returned despite missing required resident-only eligibility input.");

const unknown = { ...opportunity, lendingExtension: { approxCibilScore: "not_known" } };
const unknownResult = await assess(unknown, plainDraft, [programme("unknown-ok", "HOME_LOAN", { minCibil: null, maxCibil: null })]);
assert.equal(unknownResult.recommendations.length, 1);
assert.equal(lastRequest.customer.cibilBand, "not_known");
assert.equal(unknownResult.cibilNotKnownDisclaimer, undefined);
log("UNKNOWN_CIBIL", "CATEGORY_GATE_PASS", "Unknown retained; category A allowed; engine unknown-score disclaimer absent from canonical response.");

const below = { ...opportunity, lendingExtension: { approxCibilScore: "700_749" } };
assert.equal((await assess(below, plainDraft, [hl])).recommendations.length, 1);
const policyThreshold = programme("policy-threshold");
policyThreshold.policyVersion.eligibilityRules = { rules: [{ type: "cibil_range", minimum: 800, maximum: 900 }] };
assert.equal((await assess(below, plainDraft, [policyThreshold])).recommendations.length, 1);
log("BELOW_THRESHOLD_CIBIL", "FAIL", "Programme minCibil 750 and parsed policy minimum 800 are not enforced against 700_749.");

const expanded = Array.from({ length: 14 }, (_, index) => programme(`additional-${index}`));
assert.equal((await assess(opportunity, plainDraft, expanded)).recommendations.length, expanded.length);
log("ADDITIONAL_LENDER", "PASS", "All 14 synthetic configured lenders returned without identity-specific code.");
assert.deepEqual((await assess(opportunity, plainDraft, [hl, bt])).recommendations.map(row => row.programmeId), ["hl"]);
assert.deepEqual((await assess(btOpportunity, plainDraft, [hl, bt])).recommendations.map(row => row.programmeId), ["bt"]);
log("PRODUCT_ISOLATION", "PASS", "Exact HOME_LOAN / HOME_LOAN_BT products; HL blank transaction list preserved.");

const ageResult = await assess(opportunity, plainDraft, [hl]);
assert.equal(lastRequest.customer.dateOfBirth, undefined);
assert.equal(ageResult.recommendations[0].tenureMonths, 240);
log("MISSING_DOB", "FAIL", "Age-constrained programme still returns maximum tenure without applicant DOB.");
const mappedBt = mapCanonicalProgramme({ row: bt, product: "HOME_LOAN_BT", lenderCategory: "A", asOf: now });
assert.equal(mappedBt.requiredSeasoningMonths, undefined);
assert.equal(mappedBt.repaymentCleanRequired, undefined);
log("BT_POLICY_ASSESSMENT_MAPPING", "FAIL", "Stored policyAssessmentJson is not projected into engine seasoning/repayment fields.");

assert.equal(databaseAttempts, 0);
console.log("CHARACTERIZATION_ASSERTIONS: PASS; UAT_ACCEPTANCE: FAIL; DATABASE_ACCESSED: NO");
await import("./co-c1-chanakya-stage4a-input-pipeline-verify.mjs");
