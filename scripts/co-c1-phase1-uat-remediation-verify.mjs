import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

// Isolated fixtures only: never load dotenv or connect to a database.
if (process.env.DATABASE_URL) throw new Error("DATABASE_URL_FORBIDDEN");
process.env.JWT_SECRET = randomBytes(48).toString("hex");
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString("hex");
process.env.NODE_ENV = "test";
let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, { get() { databaseAttempts++; throw new Error("DATABASE_FORBIDDEN"); } });

const { requireAccessToken } = await import("../src/lib/api/auth-route-utils.ts");
const { signAccessToken } = await import("../server/services/token.service.ts");
const { default: jwt } = await import("jsonwebtoken");
const employee = { userId: "fixture-employee", email: "fixture@example.invalid", role: "ADMIN" };
const valid = signAccessToken(employee);
const request = (token) => new Request("https://fixture.invalid/api/product-registry/products", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
assert.equal(requireAccessToken(request(valid)).userId, employee.userId);
for (const token of [null, "invalid", jwt.sign(employee, process.env.JWT_SECRET, { expiresIn: -1 }), jwt.sign({ ...employee, typ: "partner_access" }, process.env.JWT_SECRET)]) {
  assert.throws(() => requireAccessToken(request(token)), (error) => error.status === 401);
}
console.log("AUTH_GUARD: valid employee accepted; missing, invalid, expired and partner tokens rejected");

const { listProductMaster, listProductCategories, listProductGroups } = await import("../src/lib/enterprise-product-master/admin-client.ts");
const storage = new Map([["compass:access-token", "expired-fixture"], ["compass:refresh-token", "fixture-refresh"]]);
globalThis.window = { location: { pathname: "/products", href: "" } };
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
globalThis.document = { cookie: "" };
let refreshes = 0;
let denied = false;
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  const path = String(url);
  calls.push({ url: path, method: init.method ?? "GET", authorization: new Headers(init.headers).get("Authorization") });
  if (path.endsWith("/api/auth/refresh")) {
    refreshes++;
    assert.equal(JSON.parse(init.body).refreshToken, "fixture-refresh");
    await new Promise((resolve) => setTimeout(resolve, 5));
    return Response.json({ success: true, data: { accessToken: valid, refreshToken: "fixture-refreshed" } });
  }
  assert.equal(init.method ?? "GET", "GET", "Product loading cannot write data");
  if (denied) return Response.json({ success: false, error: { message: "Forbidden" } }, { status: 403 });
  if (new Headers(init.headers).get("Authorization") !== `Bearer ${valid}`) {
    return Response.json({ success: false, error: { message: "Invalid or expired token" } }, { status: 401 });
  }
  return Response.json({ success: true, data: { items: [{ id: "existing-product" }], total: 1 } });
};
const lists = await Promise.all([listProductMaster(), listProductCategories(), listProductGroups()]);
assert.equal(refreshes, 1, "Concurrent registry requests share the canonical refresh");
assert.ok(lists.every((value) => value.items[0].id === "existing-product"));
assert.ok(calls.some((call) => call.url.startsWith("/api/product-registry/products?pageSize=200")));
assert.ok(calls.filter((call) => call.url.includes("product-registry")).every((call) => call.method === "GET"));
denied = true;
await assert.rejects(listProductMaster(), /Forbidden/);
assert.equal(refreshes, 1, "403 is not refreshed or bypassed");
delete globalThis.window;
delete globalThis.document;
delete globalThis.localStorage;
console.log("PRODUCT_MASTER: canonical bearer, single shared refresh, authenticated retry, no data writes, no 403 bypass");

const { parseProductJourneyFields, resolveEffectiveJourneyFields, captureJourneyFields, mandatoryRecommendationFields, journeyFieldIsSatisfied } = await import("../src/lib/product-journey/index.ts");
const { bootstrapProductJourneyFields } = await import("../src/constants/product-journey/bootstrap.ts");
const { listProjectedRecommendationFields, parseCriterionWeights, assertActivateableWeights, validateWeightPublish, createCriterionEvaluatorRegistry } = await import("../src/lib/product-recommendation/index.ts");
const { emptyCapturedAssessmentFacts, captureKnownValue, setCapturedProduct, setCapturedPropertyCategory } = await import("../src/lib/opportunity-assessment/capture-facts.ts");
const { deriveOpportunityAssessmentReadiness } = await import("../server/services/opportunity-assessment/readiness.ts");
const { applyMissingOnlyOpportunityReuse } = await import("../src/lib/opportunity-assessment/reuse-opportunity-facts.ts");
const { safeParseOpportunityAssessmentFacts } = await import("../src/lib/opportunity-assessment/facts-schema.ts");
const { mapFinalizedAssessmentFactsToCanonical } = await import("../server/services/opportunity-assessment/map-to-canonical.ts");
const { buildCompassJourneyConfig } = await import("../server/services/compass-customer-gateway/compass-journey-config.service.ts");
const { sanitizeCompassJourneyAnswers } = await import("../src/constants/compass-customer-gateway/snapshot-answers.ts");
const { customerInputFromCompassAnswers } = await import("../src/lib/home-loan-recommendation/compass-answers.ts");
const catalog = listProjectedRecommendationFields({ productCode: "HOME_LOAN" });
assert.ok(catalog.some((field) => field.id === "assessment:borrower.ageYears"));
assert.ok(catalog.some((field) => field.id === "assessment:borrower.dateOfBirth"));
let facts = setCapturedProduct(emptyCapturedAssessmentFacts(), "HOME_LOAN");
// Discovery sees new canonical fact leaves without adding a picker registry entry.
facts.borrower.fixtureCanonicalFact = { ...facts.borrower.residency };
assert.ok(listProjectedRecommendationFields({ productCode: "HOME_LOAN", assessmentFacts: facts }).some((field) => field.id === "assessment:borrower.fixtureCanonicalFact"));
delete facts.borrower.fixtureCanonicalFact;
const row = { fieldId: "assessment:borrower.ageYears", applicability: "salaried", capture: false, mandatoryForRecommendation: true, displayOrder: 10, idcKeys: ["ageYears"], captureStepId: "ageYears" };
const rows = parseProductJourneyFields([row, { ...row, applicability: "self_employed", capture: true, mandatoryForRecommendation: false }]);
assert.equal(rows.length, 2, "Same field supports distinct category configuration");
assert.deepEqual(rows[0].idcKeys, ["ageYears"]);
assert.equal(captureJourneyFields(rows, "salaried").length, 0);
assert.equal(mandatoryRecommendationFields(rows, "salaried").length, 1);
assert.equal(captureJourneyFields(rows, "self_employed").length, 1);
assert.equal(mandatoryRecommendationFields(rows, "self_employed").length, 0);
const hl = bootstrapProductJourneyFields("HOME_LOAN");
assert.ok(!hl.some((field) => field.fieldId.includes("dateOfBirth")));
assert.equal(bootstrapProductJourneyFields("PERSONAL_LOAN").length, 0);
assert.deepEqual(resolveEffectiveJourneyFields({ productCode: "HOME_LOAN", persistedFields: [] }), []);
assert.equal(
  deriveOpportunityAssessmentReadiness(emptyCapturedAssessmentFacts(), []).readinessStatus,
  "incomplete",
  "Unknown product cannot become recommendation-ready",
);
assert.equal(deriveOpportunityAssessmentReadiness(facts, []).readinessStatus, "ready");
assert.equal(deriveOpportunityAssessmentReadiness(facts, [{ ...row, applicability: "all" }]).readinessStatus, "incomplete");
facts = captureKnownValue(facts, "borrower", "ageYears", 35);
assert.equal(deriveOpportunityAssessmentReadiness(facts, [{ ...row, applicability: "all" }]).readinessStatus, "ready");
assert.equal(journeyFieldIsSatisfied(facts, { ...row, fieldId: "idc:unmapped" }), false);
assert.equal(journeyFieldIsSatisfied(facts, { ...row, fieldId: "derived:unmapped" }), false);
assert.equal(setCapturedPropertyCategory(facts, "SALARIED").property.propertyCategory.state, "missing");
const config = buildCompassJourneyConfig("home-loan", hl);
assert.ok(config.fields.some((field) => field.captureStepId === "ageYears"));
assert.ok(!config.fields.some((field) => field.captureStepId === "dateOfBirth"));
assert.ok(buildCompassJourneyConfig("home-loan", []).fields.every((field) => field.groupId === "identity"));
const answers = sanitizeCompassJourneyAnswers("home-loan", { ageYears: 35 });
assert.equal(customerInputFromCompassAnswers("home-loan", answers).ageYears, 35);
assert.equal(customerInputFromCompassAnswers("home-loan", answers).dateOfBirth, null);
assert.deepEqual(sanitizeCompassJourneyAnswers("home-loan", { ageYears: -1 }), {});
let reused = applyMissingOnlyOpportunityReuse(emptyCapturedAssessmentFacts(), { ageYears: 35 });
assert.equal(reused.borrower.ageYears.value, 35);
assert.equal(reused.borrower.dateOfBirth.state, "missing");
reused = setCapturedProduct(reused, "HOME_LOAN");
assert.equal(mapFinalizedAssessmentFactsToCanonical(reused).customer.ageYears, 35);
const historical = emptyCapturedAssessmentFacts();
delete historical.borrower.ageYears;
assert.equal(safeParseOpportunityAssessmentFacts(historical).success, true);
assert.deepEqual(applyMissingOnlyOpportunityReuse(historical, { ageYears: 35 }, { revisionKind: "FINALIZED" }), historical);
console.log("JOURNEY: dynamic discovery, category independence, metadata, Age capture, DOB independence, governed readiness, immutable history, property category PASS");

for (const total of [0, 99, 101]) {
  assert.equal(assertActivateableWeights(parseCriterionWeights({ fixture: total })), "WEIGHTS_NOT_EXACTLY_100");
}
assert.equal(assertActivateableWeights(parseCriterionWeights({ fixture: 100 })), null);
// The only scored evaluator below is a test fixture; production pending contracts stay closed.
const registry = createCriterionEvaluatorRegistry({ fixture: () => ({ status: "scored" }) });
assert.equal(validateWeightPublish({ fixture: 100 }, registry, []), null);
assert.equal(validateWeightPublish({ "assessment:borrower.dateOfBirth": 100 }), "SCORING_CONTRACT_PENDING");
const serviceSource = readFileSync(new URL("../server/services/home-loan-recommendation/hl-recommendation-masters.service.ts", import.meta.url), "utf8");
assert.match(serviceSource, /input.action === "approve" \|\| input.action === "activate"/);
assert.match(serviceSource, /validateWeightPublish/);
const journeyServiceSource = readFileSync(
  new URL("../server/services/product-journey/product-journey-definition.service.ts", import.meta.url),
  "utf8",
);
const resolveSource = journeyServiceSource.slice(
  journeyServiceSource.indexOf("export async function resolveJourneyFieldsSafe"),
  journeyServiceSource.indexOf("export async function loadActiveOrBootstrapJourneyFields"),
);
const listSource = journeyServiceSource.slice(
  journeyServiceSource.indexOf("export async function listProductJourneyDefinitions"),
  journeyServiceSource.indexOf("export async function ensureProductJourneyDraft"),
);
assert.match(resolveSource, /return loadActiveOrBootstrapJourneyFields\(input\)/);
assert.doesNotMatch(resolveSource, /\bcatch\b/);
assert.doesNotMatch(listSource, /\bcatch\b/);
console.log("JOURNEY_READ: durable Product Journey failures fail closed; no bootstrap-on-error catch");
console.log("WEIGHTS: manual/incomplete drafts, exact-100 gate and pending-contract rejection PASS");
assert.equal(databaseAttempts, 0);
console.log("DATABASE_ACCESSED: NO");
