// Synthetic inputs only. No server, network, credentials, Prisma calls or certification.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, { get() { databaseAttempts++; throw new Error("DATABASE_FORBIDDEN"); } });
const mapper = await import("../server/services/enterprise-opportunity/chanakya-recommendations.ts");
const money = await import("../src/lib/enterprise-financial-input/index.ts");
const { ageInMonthsFromDateOfBirth } = await import("../src/lib/home-loan-recommendation/tenure.ts");
const source = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const now = new Date("2026-09-21T12:00:00Z");
const opportunity = { organizationId: "fixture-org", productCode: "HOME_LOAN", transactionType: null,
  primaryBorrowerKind: "individual", primaryContactId: "fixture-contact", companyId: null,
  requestedAmount: 1000000, employmentTypeCode: "salaried", cityLabel: "Fixture City", stateLabel: "Fixture State",
  lendingExtension: { approxCibilScore: "750_799", participants: [{ entityId: "fixture-co", role: "co_applicant" }] } };
const contact = { id: "fixture-contact", organizationId: "fixture-org", dateOfBirth: "1990-01-01",
  roleProfiles: { customer: { occupation: "fixture-occupation", residentStatus: "resident_indian",
    annualTurnover: "12000000", yearsInBusiness: "8" } } };
const sources = { contact, company: null };
const draft = { monthlyIncomeRupees: 200000, existingMonthlyEmiRupees: 0, propertyValueRupees: 4000000,
  propertyType: "residential", constitution: "individual" };
const map = (opp = opportunity, facts = sources) => mapper.mapChanakyaOpportunityInputs(opp, facts, now);

// Real hook transport + editor parser, without React rendering, storage or HTTP.
function browserDraft(stated, file = {}) {
  let body;
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source("src/hooks/use-chanakya-canonical-recommendations.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, AbortController, require(name) {
    if (name === "react") return { useState: initial => [initial, () => {}], useEffect: run => run() };
    if (name.endsWith("enterprise-financial-input")) return money;
    if (name.endsWith("api-client")) return { authenticatedJsonFetch: async (_url, options) => {
      body = JSON.parse(options.body);
      return { ok: true, json: async () => ({ success: true, data: { recommendations: [] } }) };
    } };
    throw new Error("UNEXPECTED_IMPORT");
  } });
  exports.useChanakyaCanonicalRecommendations("fixture-opportunity", file, stated);
  return mapper.chanakyaAssessmentDraftSchema.parse(body);
}
assert.equal(browserDraft({ statedIncomeMonthly: "override:200000" }).monthlyIncomeRupees, 200000);
assert.equal(browserDraft({ statedIncomeMonthly: money.absoluteRupeesToStoredString(200000, { overridePrefix: true }) }).monthlyIncomeRupees, 200000);
for (const invalid of ["", "override:", "override:garbage", "-1", "Infinity", "2e5", "0xFF", "200000junk", "override:override:200000"]) {
  assert.equal(browserDraft({ statedIncomeMonthly: invalid }, { businessDetails: { monthlySalary: 200000 } }).monthlyIncomeRupees, null, invalid);
}
assert.equal(browserDraft({ statedObligations: "0" }).existingMonthlyEmiRupees, 0);
assert.equal(browserDraft({}).existingMonthlyEmiRupees, null);
assert.equal(browserDraft({ statedPropertyValue: "" }, { approxPropertyValue: 4000000 }).propertyValueRupees, null);
console.log("SALARY_FORMAT / MALFORMED / EXPLICIT_ZERO: PASS");

const mapped = map();
assert.equal(mapped.customer.dateOfBirth, contact.dateOfBirth);
assert.equal(ageInMonthsFromDateOfBirth(mapped.customer.dateOfBirth, now), 440);
assert.equal(mapped.customer.employmentFamily, "salaried");
assert.equal(mapped.customer.city, opportunity.cityLabel);
assert.equal(mapped.customer.cibilBand, "750_799");
assert.equal(mapped.context.applicantKind, "individual");
assert.equal(mapped.context.state, opportunity.stateLabel);
assert.equal(mapped.context.occupation, "fixture-occupation");
assert.deepEqual(mapped.context.participants, opportunity.lendingExtension.participants);
for (const dob of [null, "", "1990-02-30", "2023-02-29", "2030-01-01", "01/01/1990", "1990-01-01T00:00:00Z"]) {
  assert.equal(map(opportunity, { ...sources, contact: { ...contact, dateOfBirth: dob } }).customer.dateOfBirth, null);
}
assert.equal(map(opportunity, { ...sources, contact: { ...contact, dateOfBirth: "2000-02-29" } }).customer.dateOfBirth, "2000-02-29");
for (const changed of [{ id: "other-contact" }, { organizationId: "other-org" }]) {
  assert.equal(map(opportunity, { ...sources, contact: { ...contact, ...changed } }).customer.dateOfBirth, null);
}
for (const employment of [null, "", "nri", "unknown", "salaried-made-up"]) {
  assert.equal(map({ ...opportunity, employmentTypeCode: employment }).customer.employmentFamily, "unknown");
}
for (const kind of [null, "company"]) assert.equal(map({ ...opportunity, primaryBorrowerKind: kind }).customer.dateOfBirth, null);
console.log("DURABLE_BORROWER / DOB / CROSS_TENANT_REJECTION / NO_EMPLOYMENT_DEFAULT: PASS");

for (const key of ["residency", "monthlyIncomeRupees", "existingMonthlyEmiRupees", "propertyValueRupees", "propertyType",
  "constructionStatus", "currentHomeLoanEmiRupees", "currentRoiPercent", "remainingTenureMonths", "coApplicant", "coApplicantDecision"]) {
  assert.equal(mapped.customer[key], null, key);
}
assert.equal(mapped.customer.propertyValueIsCustomerDeclared, undefined);
assert.equal(mapped.customer.pincode, undefined);
assert.equal(map({ ...opportunity, cityLabel: null, stateLabel: null }).customer.city, null);
assert.equal(map({ ...opportunity, cityLabel: null, stateLabel: null }).context.state, null);
assert.equal(map(opportunity, { contact: null, company: null }).customer.residency, null);
assert.equal(mapped.context.annualTurnoverRupees, 12000000);
assert.equal(mapped.context.yearsInBusiness, 8);
assert.equal(mapped.customer.turnover, undefined, "context does not invent an engine input");
const companyOpp = { ...opportunity, primaryBorrowerKind: "company", companyId: "fixture-company", employmentTypeCode: "self-employed-business" };
const company = { id: "fixture-company", organizationId: "fixture-org", constitution: "private_limited",
  annualTurnover: "24000000", yearsInBusiness: "9.5" };
const companyMapped = map(companyOpp, { contact, company });
assert.equal(companyMapped.customer.constitution, "private_limited");
assert.equal(companyMapped.customer.dateOfBirth, null);
assert.equal(companyMapped.context.annualTurnoverRupees, 24000000);
assert.equal(companyMapped.context.yearsInBusiness, 9.5);
assert.equal(companyMapped.customer.monthlyIncomeRupees, null);
for (const changed of [{ id: "other-company" }, { organizationId: "other-org" }]) {
  assert.equal(map(companyOpp, { contact, company: { ...company, ...changed } }).customer.constitution, null);
}
assert.equal(map(companyOpp, { contact: null, company: { ...company, annualTurnover: "12 Cr", yearsInBusiness: "unknown" } }).context.annualTurnoverRupees, null);
console.log("PROPERTY / RESIDENCY / COAPPLICANT_MISSING / TURNOVER_NOT_INCOME: PASS");

const bt = { ...opportunity, productCode: "HOME_LOAN_BT", transactionType: "balance_transfer",
  lendingExtension: { ...opportunity.lendingExtension, btAmount: 800000 },
  snapshot: { compassAnswers: { currentEmi: 16000, currentRoi: 10, remainingTenureMonths: 120, propertyValue: 4000000 } } };
assert.equal(map(bt).customer.currentOutstandingRupees, 800000);
assert.equal(map(bt).customer.requiredAmountRupees, 1000000);
assert.equal(map(bt).customer.currentOutstandingCertainty, null);
assert.equal(map(bt).customer.currentRoiPercent, null, "COMPASS answers are not silently promoted");
assert.equal(map(bt).customer.currentHomeLoanEmiRupees, null);
assert.equal(map(bt).customer.remainingTenureMonths, null);
assert.equal(map(bt).customer.propertyValueRupees, null);
for (const outstanding of [undefined, null, 0, -1, "800000", NaN, Infinity]) {
  assert.equal(map({ ...bt, lendingExtension: { btAmount: outstanding } }).customer.currentOutstandingRupees, null);
}
assert.equal(map({ ...opportunity, lendingExtension: { btAmount: 800000 } }).customer.currentOutstandingRupees, null);
for (const opp of [{ ...bt, transactionType: null }, { ...bt, transactionType: "fresh" },
  { ...bt, transactionType: "bt_top_up" }, { ...opportunity, transactionType: "balance_transfer" },
  { ...opportunity, productCode: "UNSUPPORTED" }]) assert.throws(() => map(opp), /UNSUPPORTED_RECOMMENDATION/);
assert.equal(map().product, "HOME_LOAN");
assert.equal(map(bt).product, "HOME_LOAN_BT");
console.log("BT_OUTSTANDING / NO_REQUESTED_AMOUNT_SUBSTITUTION / PRODUCT_ISOLATION: PASS");

let canonicalCalls = 0;
const forbiddenRecommendation = async () => { canonicalCalls++; throw new Error("CANONICAL_SHOULD_NOT_RUN"); };
await assert.rejects(mapper.recommendForChanakyaOpportunity(opportunity, draft, forbiddenRecommendation, async () => sources), /DURABLE_ASSESSMENT_INPUT_REQUIRED/);
await assert.rejects(mapper.recommendForChanakyaOpportunity(bt, draft, forbiddenRecommendation, async () => sources), /DURABLE_ASSESSMENT_INPUT_REQUIRED/);
await assert.rejects(mapper.recommendForChanakyaOpportunity({ ...bt, lendingExtension: {} }, draft, forbiddenRecommendation, async () => sources), /BT_OUTSTANDING_REQUIRED/);
await assert.rejects(mapper.recommendForChanakyaOpportunity(companyOpp, draft, forbiddenRecommendation, async () => ({ contact: null, company })), /SELF_EMPLOYED_ASSESSMENT_UNSUPPORTED/);
assert.equal(canonicalCalls, 0, "no cards or fabricated ranking from unsaved financial data");
console.log("BROWSER_LOCAL_REJECTION / SELF_EMPLOYED_FAIL_CLOSED / NO_FABRICATED_CARDS: PASS");

// Execute the actual loader against explicit memory-only repository doubles. The real
// Prisma sentinel above is never touched. Assert both query scope and projected columns.
const queries = [];
const loaderExports = {};
const imports = {
  "server-only": {}, zod: await import("zod"),
  "@/lib/product-programme-operations/product-aliases": await import("../src/lib/product-programme-operations/product-aliases.ts"),
  "@/constants/enterprise-contact-master/masters": await import("../src/constants/enterprise-contact-master/masters.ts"),
  "@/lib/enterprise-financial-input": money,
  "@server/services/lender-recommendation/canonical-lender-recommendation.service": { recommendLendersCanonical: forbiddenRecommendation },
  "@server/lib/prisma": { prisma: {
    ecmContact: { findFirst: async query => { queries.push(["contact", query]); return contact; } },
    ecmCompany: { findFirst: async query => { queries.push(["company", query]); return company; } },
  } },
};
vm.runInNewContext(ts.transpileModule(source("server/services/enterprise-opportunity/chanakya-recommendations.ts"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: loaderExports, require: name => {
  if (!(name in imports)) throw new Error("UNEXPECTED_LOADER_IMPORT");
  return imports[name];
} });
await loaderExports.loadChanakyaBorrowerSources(opportunity);
await loaderExports.loadChanakyaBorrowerSources(companyOpp);
assert.deepEqual(JSON.parse(JSON.stringify(queries.map(([, q]) => q.where))), [
  { id: "fixture-contact", organizationId: "fixture-org", isDeleted: false },
  { id: "fixture-company", organizationId: "fixture-org", isDeleted: false },
]);
assert.deepEqual(Object.keys(queries[0][1].select).sort(), ["dateOfBirth", "id", "organizationId", "roleProfiles"]);
assert.deepEqual(Object.keys(queries[1][1].select).sort(), ["annualTurnover", "constitution", "id", "organizationId", "yearsInBusiness"]);
await loaderExports.loadChanakyaBorrowerSources({ ...opportunity, primaryBorrowerKind: null });
assert.equal(queries.length, 2);
console.log("SCOPED_SOURCE_LOADER: PASS (memory-only doubles)");
assert.equal(databaseAttempts, 0);
console.log("STAGE4A_FIXTURES: PASS; DATABASE_ACCESSED: NO; PRODUCTION_CERTIFICATION: PENDING");
