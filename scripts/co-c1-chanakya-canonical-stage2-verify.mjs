import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Reject any accidental database access before importing application modules.
let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, { get() { databaseAttempts++; throw new Error("DATABASE_FORBIDDEN_IN_TEST"); } });
const { recommendForChanakyaOpportunity, chanakyaAssessmentDraftSchema, mapChanakyaOpportunityInputs } = await import("../server/services/enterprise-opportunity/chanakya-recommendations.ts");
const money = await import("../src/lib/enterprise-financial-input/index.ts");
const { recommendLendersCanonical } = await import("../server/services/lender-recommendation/canonical-lender-recommendation.service.ts");
const { isCanonicalProgrammeAvailable } = await import("../server/services/lender-recommendation/programme-availability.ts");

const now = new Date();
function programme(id, product = "HOME_LOAN") {
  return {
    id, organizationId: "org-test", lenderId: `lender-${id}`, productCode: product,
    code: id, label: id, versionNumber: 1,
    transactionTypes: product === "HOME_LOAN" ? null : ["balance_transfer"],
    policyVersionId: `version-${id}`,
    policyVersion: {
      id: `version-${id}`, organizationId: "org-test", policyId: `policy-${id}`, versionNumber: 1,
      status: "published", eligibilityRules: {}, creditRules: {}, effectiveFrom: null, effectiveUntil: null,
      policy: { id: `policy-${id}`, organizationId: "org-test", lenderId: `lender-${id}`, productCode: product,
        status: "published", currentPublishedVersionId: `version-${id}`, isDeleted: false },
    },
    lender: { displayName: `Configured ${id}`, label: id, code: id, organizationId: "org-test",
      enabled: true, isDeleted: false, lifecycleStatus: "active", operationalStatus: "active" },
    isDeleted: false, enabled: true, isLivePublished: true, publicationState: "published", completenessState: "complete",
    lifecycleStatus: "active", status: "active", approvalStatus: "approved", effectiveFrom: null, effectiveUntil: null,
    minIncomeExact: null, maxIncomeExact: null, minLoanAmountExact: null, maxLoanAmountExact: "10000000",
    minFoirExact: null, maxFoirExact: "60", minDbrExact: null, maxDbrExact: null,
    minRoiExact: "8.5", maxRoiExact: "9", minLtvExact: null, maxLtvExact: "80",
    minCibil: null, maxCibil: null, minAge: null, maxAge: null, minTenureMonths: null, maxTenureMonths: 240,
  };
}
const opportunity = { organizationId: "org-test", productCode: "HOME_LOAN", transactionType: null,
  requestedAmount: 1000000, employmentTypeCode: "salaried", cityLabel: "Test City", lendingExtension: { approxCibilScore: "780" } };
const draft = { monthlyIncomeRupees: 100000, existingMonthlyEmiRupees: 0, propertyValueRupees: 4000000,
  propertyType: null, constitution: null };
let rows = [programme("z-first"), programme("a-second"), programme("bt", "HOME_LOAN_BT")];
let requests = [];
const recommend = request => {
  requests.push(request);
  return recommendLendersCanonical({ ...request, asOf: now }, { loadInventory: async query => ({
    programmes: rows.filter(row => isCanonicalProgrammeAvailable({ programme: row, ...query })),
    lenderCategories: new Map(rows.map(row => [row.lenderId, "A"])),
  }) });
};
// Stage 4A deliberately blocks local-only financial declarations. Test that boundary,
// then retain the Stage 2 engine/order/lifecycle fixtures with explicit synthetic inputs.
await assert.rejects(recommendForChanakyaOpportunity(opportunity, draft, recommend), /DURABLE_ASSESSMENT_INPUT_REQUIRED/);
assert.equal(requests.length, 0);
const evaluate = async (opp = opportunity) => {
  const mapped = mapChanakyaOpportunityInputs(opp);
  return recommend({ organizationId: opp.organizationId, product: mapped.product,
    customer: { ...mapped.customer, ...draft, customerSelectedTenureMonths: 240,
      ...(mapped.product === "HOME_LOAN_BT" ? { currentOutstandingRupees: 1200000, currentOutstandingCertainty: "exact" } : {}) } });
};
let result = await evaluate();
assert.equal(requests.length, 1);
assert.equal(result.recommendations.length, 2, "real canonical engine returns configured eligible programmes");
assert.deepEqual(result.recommendations.map(row => row.programmeId), ["z-first", "a-second"], "no new alphabetical ranking");
assert.ok(result.recommendations.every(row => row.lenderScore === null));
const bt = await evaluate({ ...opportunity, productCode: "HOME_LOAN_BT", transactionType: "balance_transfer" });
assert.deepEqual(bt.recommendations.map(row => row.programmeId), ["bt"]);
assert.equal(requests.at(-1).customer.journeyKind, "home_loan_balance_transfer");
await assert.rejects(evaluate({ ...opportunity, productCode: "HOME_LOAN_BT", transactionType: "bt_top_up" }));
await assert.rejects(evaluate({ ...opportunity, transactionType: "bt_top_up" }));
await assert.rejects(evaluate({ ...opportunity, productCode: "UNSUPPORTED" }));
await assert.rejects(recommendForChanakyaOpportunity(opportunity, { ...draft, existingMonthlyEmiRupees: null }, recommend));
await assert.rejects(recommendForChanakyaOpportunity(opportunity, { ...draft, propertyValueRupees: 0 }, recommend));
assert.equal(chanakyaAssessmentDraftSchema.safeParse({ ...draft, organizationId: "forged" }).success, false);
assert.equal(chanakyaAssessmentDraftSchema.safeParse({ ...draft, monthlyIncomeRupees: -1 }).success, false);

for (let i = 0; i < 12; i++) rows.push(programme(`configured-${i}`));
assert.equal((await evaluate()).recommendations.length, 14, "no fixed lender universe or presentation limit");
const candidate = programme("lifecycle");
for (const patch of [{ publicationState: "draft", isLivePublished: false }, { enabled: false },
  { effectiveUntil: new Date(now.getTime() - 1000) }]) {
  rows = [{ ...candidate, ...patch }];
  assert.equal((await evaluate()).recommendations.length, 0);
}
rows = [{ ...candidate, policyVersion: null }];
assert.equal((await evaluate()).recommendations.length, 0);
rows = [{ ...candidate, policyVersion: { ...candidate.policyVersion, eligibilityRules: { rules: [{ type: "unapproved_income_rule" }] } } }];
assert.equal((await evaluate()).recommendations.length, 0);
const failedInventory = await recommendLendersCanonical({ organizationId: opportunity.organizationId,
  ...mapChanakyaOpportunityInputs(opportunity), customer: { ...mapChanakyaOpportunityInputs(opportunity).customer, ...draft } },
  { loadInventory: async () => { throw new Error("synthetic"); } });
assert.equal(failedInventory.status, "configuration_error");

// Execute the real route body with explicit auth/storage doubles; never start an HTTP server.
const source = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const routeSource = source("src/app/api/enterprise-opportunities/[opportunityId]/chanakya-recommendations/route.ts");
let authenticated = false, enabled = true, reads = 0, serviceCalls = 0;
const exports = {};
vm.runInNewContext(ts.transpileModule(routeSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
  exports,
  require(name) {
    if (name === "next/server") return { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } };
    if (name.includes("auth-route-utils")) return { requireAccessToken: () => { if (!authenticated) throw { status: 401 }; } };
    if (name.endsWith("_lib/route-utils")) return { enterpriseOpportunityApiGuard: () => { if (!enabled) throw { status: 503 }; } };
    if (name.endsWith("chanakya-recommendations")) return { chanakyaAssessmentDraftSchema,
      recommendForChanakyaOpportunity: async (opp, input) => { serviceCalls++; assert.equal(opp, opportunity); return recommendForChanakyaOpportunity(opp, input, recommend); } };
    if (name.endsWith("enterprise-opportunity")) return { enterpriseOpportunityService: { getOpportunity: async id => { reads++; if (id !== "authorized-id") throw { status: 404 }; return opportunity; } } };
    throw new Error("Unexpected test import");
  },
});
const invoke = (id = "authorized-id", body = draft) => exports.POST({ json: async () => body }, { params: Promise.resolve({ opportunityId: id }) });
assert.equal((await invoke()).status, 401); assert.equal(reads, 0); assert.equal(serviceCalls, 0);
authenticated = true; enabled = false;
assert.equal((await invoke()).status, 503); assert.equal(reads, 0);
enabled = true;
assert.equal((await invoke("outside-org")).status, 404); assert.equal(serviceCalls, 0);
assert.equal((await invoke("authorized-id", { ...draft, product: "HOME_LOAN_BT" })).status, 400);
assert.equal(serviceCalls, 0);
rows = [programme("route")];
assert.equal((await invoke()).status, 400, "local declarations cannot satisfy durable capture");
assert.equal(serviceCalls, 1);
const missingResponse = await invoke();
assert.equal(missingResponse.body.error.code, "ASSESSMENT_INPUT_REQUIRED");
assert.deepEqual(Array.from(missingResponse.body.error.missingInputs), ["monthlyIncome", "obligations", "propertyValue"]);

const panel = source("src/components/catalyst-one/credit-bench/chanakya-opportunity-recommendation-panel.tsx");
const board = source("src/components/catalyst-one/opportunity-workspace/workspace-life-strategy-board.tsx");
const hook = source("src/hooks/use-chanakya-canonical-recommendations.ts");
for (const text of [panel, board]) {
  assert.match(text, /useChanakyaCanonicalRecommendations/);
  assert.doesNotMatch(text, /deriveChanakyaOpportunityRecommendations/);
}
assert.match(hook, /controller\.abort\(\)/);
assert.match(hook, /state\.key === key/);
assert.doesNotMatch(hook + panel, /score:\s*88|Saraswat|HDFC|HSBC|ICICI/);
assert.doesNotMatch(hook, /runHomeLoanRecommendationEngine|matchPublishedProgramme|\.sort\(/);
assert.match(board, /Selected via Manual Recommendation/);

// Transport lifecycle: changed inputs hide old cards, aborted replies cannot restore them,
// and failed requests never fall back to the browser registry calculator.
let hookState, effect, cleanup, priorKey, pending = [];
const hookExports = {};
vm.runInNewContext(ts.transpileModule(hook, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
  exports: hookExports, AbortController,
  require(name) {
    if (name === "react") return {
      useState: initial => { hookState ??= initial; return [hookState, value => { hookState = value; }]; },
      useEffect: (run, [key]) => { if (key !== priorKey) { effect = run; priorKey = key; } },
    };
    if (name.endsWith("api-client")) return { authenticatedJsonFetch: (url, options) => new Promise((resolve, reject) => pending.push({ url, options, resolve, reject })) };
    if (name.endsWith("enterprise-financial-input")) return money;
    throw new Error("Unexpected hook import");
  },
});
const file = { loanProduct: "HOME_LOAN", loanAmount: 1000000, city: "Test City", businessDetails: { monthlySalary: 100000, existingEmi: 0 }, approxPropertyValue: 4000000 };
const render = id => hookExports.useChanakyaCanonicalRecommendations(id, file);
const flushEffect = () => { if (effect) { cleanup?.(); cleanup = effect(); effect = null; } };
assert.equal(render("one").loading, true); flushEffect();
pending[0].resolve({ ok: true, json: async () => ({ success: true, data: result }) });
await new Promise(resolve => setImmediate(resolve));
assert.equal(render("one").result, result);
assert.equal(render("two").result, null); flushEffect();
assert.equal(pending[0].options.signal.aborted, true);
assert.equal(render("three").result, null); flushEffect();
pending[1].resolve({ ok: true, json: async () => ({ success: true, data: result }) });
pending[2].reject(new Error("synthetic request failure"));
await new Promise(resolve => setImmediate(resolve));
assert.equal(render("three").result, null);
assert.equal(render("three").loading, false);
cleanup();
assert.equal(pending[2].options.signal.aborted, true);
assert.equal(render("missing-fields").result, null); flushEffect();
pending[3].resolve({ ok: false, json: async () => ({ success: false,
  error: { missingInputs: ["monthlyIncome", "obligations", "RAW_SENTINEL", "__proto__"] } }) });
await new Promise(resolve => setImmediate(resolve));
assert.match(render("missing-fields").guidance, /monthly income, existing obligations/);
assert.doesNotMatch(render("missing-fields").guidance, /RAW_SENTINEL|__proto__/);
cleanup();

// Exercise shortlist enrichment in isolation; preserve unrelated legacy behavior.
const sync = source("src/lib/strategic-lender-pipeline/sync.ts");
const start = sync.indexOf("function enrichStrategyFields(");
const end = sync.indexOf("\nfunction loadFile(", start);
const enrichment = {};
vm.runInNewContext(ts.transpileModule(`export ${sync.slice(start, end)}`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: enrichment });
const unscored = enrichment.enrichStrategyFields({ lenderRef: "lender:test", lenderName: "Configured", canonicalRecommendation: true }, 0);
assert.equal(unscored.lenderScore, null);
for (const key of ["strategicScore", "successProbability", "strategicRank", "expectedRoi", "foirAssessment", "cibilAssessment"]) assert.equal(unscored[key], undefined);
assert.equal(enrichment.enrichStrategyFields({ lenderRef: "manual", lenderName: "Manual", strategicScore: 71 }, 0).strategicScore, 71);
// Persist through the real shortlist functions using memory-only browser storage.
const stored = new Map();
const shortlist = {};
vm.runInNewContext(ts.transpileModule(sync, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
  exports: shortlist, window: {},
  localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) },
  require: name => name.endsWith("strategic-lender-shortlist") ? { STRATEGY_SHORTLIST_MAX_LENDERS: 2 } : {},
});
const selected = { lenderRef: "lender:configured", lenderName: "Configured", enterpriseLenderId: "configured" };
shortlist.upsertStrategicShortlistItem("test-opportunity", { ...selected, strategicScore: 71 });
shortlist.upsertStrategicShortlistItem("test-opportunity", { ...selected, canonicalRecommendation: true, lenderScore: null });
for (const entry of [shortlist.getStrategicShortlist("test-opportunity")[0], shortlist.getStrategicAnalysis("test-opportunity")[0]]) {
  assert.equal(entry.lenderScore, null);
  assert.equal(entry.strategicScore, undefined);
  assert.equal(entry.successProbability, undefined);
  assert.equal(entry.strategicRank, undefined);
  assert.equal(entry.expectedRoi, undefined);
}
shortlist.upsertStrategicShortlistItem("test-opportunity", { ...selected, strategicScore: 71 });
assert.equal(shortlist.getStrategicShortlist("test-opportunity")[0].canonicalRecommendation, undefined);
assert.equal(shortlist.getStrategicShortlist("test-opportunity")[0].strategicScore, 71);
assert.equal(databaseAttempts, 0);
console.log("Stage 2 canonical CHANAKYA integration: PASS (database-free service, route and shortlist fixtures)");
