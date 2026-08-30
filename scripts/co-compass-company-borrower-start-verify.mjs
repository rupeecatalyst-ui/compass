#!/usr/bin/env node
/**
 * COMPASS company-borrower start sequencing — draft may begin without companyId;
 * answers link the real ECM Company; submit requires companyId.
 * Non-COMPASS company creates remain blocked. Individual products unchanged.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const {
  decideOpportunityBorrowerCreate,
  allowsCompassPendingCompanyResolution,
  compassSubmitMissingCompany,
  COMPASS_WEBSITE_SOURCE_CODE,
} = await import("../src/constants/enterprise-opportunity/company-borrower-create.ts");
const { getCompassProductDefinition } = await import(
  "../src/constants/compass-customer-gateway/product-registry.ts"
);

const COMPANY_PRODUCTS = [
  "business-loan",
  "working-capital",
  "construction-finance",
  "project-finance",
];
const INDIVIDUAL_PRODUCTS = [
  "home-loan",
  "home-loan-balance-transfer",
  "personal-loan",
  "loan-against-property",
];

function compassDraftCreate(kind, extra = {}) {
  return {
    primaryBorrowerKind: kind,
    companyId: null,
    primaryContactId: "contact-1",
    sourceCode: COMPASS_WEBSITE_SOURCE_CODE,
    lifecycleStatus: "dialogue",
    requirementStage: "lead_creation",
    ...extra,
  };
}

// --- A–F: business products start / link / submit predicates ---
for (const code of COMPANY_PRODUCTS) {
  const definition = getCompassProductDefinition(code);
  assert.equal(definition.borrowerKind, "company", `${code} borrowerKind`);
  assert.equal(definition.hasBusinessFields, true, `${code} hasBusinessFields`);

  const start = decideOpportunityBorrowerCreate(compassDraftCreate("company"));
  assert.equal(start.ok, true, `${code} start ok`);
  assert.equal(start.mode, "compass_pending_company", `${code} start pending company`);
  assert.equal(
    allowsCompassPendingCompanyResolution(compassDraftCreate("company")),
    true,
    `${code} pending allowed at draft start`,
  );
  assert.equal(
    compassSubmitMissingCompany({ primaryBorrowerKind: "company", companyId: null }),
    true,
    `${code} submit rejects missing companyId`,
  );
  assert.equal(
    compassSubmitMissingCompany({
      primaryBorrowerKind: "company",
      companyId: "company-1",
    }),
    false,
    `${code} submit allows linked companyId`,
  );
}

assert.equal(getCompassProductDefinition("business-loan").enterpriseProductCode, "BUSINESS_LOAN_UNSECURED");
assert.equal(getCompassProductDefinition("working-capital").enterpriseProductCode, "WORKING_CAPITAL_SECURED");
assert.equal(getCompassProductDefinition("construction-finance").enterpriseProductCode, "CONSTRUCTION_FINANCE");
assert.equal(getCompassProductDefinition("project-finance").enterpriseProductCode, "PROJECT_FINANCE");

// --- G: individual products unchanged ---
for (const code of INDIVIDUAL_PRODUCTS) {
  const definition = getCompassProductDefinition(code);
  assert.equal(definition.borrowerKind, "individual", `${code} borrowerKind`);
  const start = decideOpportunityBorrowerCreate(compassDraftCreate("individual"));
  assert.equal(start.ok, true, `${code} start ok`);
  assert.equal(start.mode, "individual", `${code} start individual`);
  assert.equal(
    allowsCompassPendingCompanyResolution(compassDraftCreate("individual")),
    false,
    `${code} pending company exception not used`,
  );
  assert.equal(
    compassSubmitMissingCompany({ primaryBorrowerKind: "individual", companyId: null }),
    false,
    `${code} submit does not require companyId`,
  );
}

assert.equal(getCompassProductDefinition("home-loan").enterpriseProductCode, "HOME_LOAN");
assert.equal(getCompassProductDefinition("home-loan-balance-transfer").enterpriseProductCode, "HOME_LOAN_BT");
assert.equal(getCompassProductDefinition("personal-loan").enterpriseProductCode, "PERSONAL_LOAN");
assert.equal(getCompassProductDefinition("loan-against-property").enterpriseProductCode, "LAP");

// --- H: domain boundary — non-COMPASS / non-draft cannot use the exception ---
const rejected = [
  compassDraftCreate("company", { sourceCode: "walk_in" }),
  compassDraftCreate("company", { sourceCode: "employee" }),
  compassDraftCreate("company", { sourceCode: null }),
  compassDraftCreate("company", { lifecycleStatus: "active" }),
  compassDraftCreate("company", { lifecycleStatus: "requirement_captured" }),
  compassDraftCreate("company", { requirementStage: "requirement_captured" }),
  compassDraftCreate("company", { primaryContactId: null }),
  {
    primaryBorrowerKind: "company",
    companyId: null,
    primaryContactId: "contact-1",
  },
];
for (const input of rejected) {
  const decision = decideOpportunityBorrowerCreate(input);
  assert.equal(decision.ok, false, `must reject ${JSON.stringify(input)}`);
  assert.match(decision.message, /companyId is required/);
}

const linked = decideOpportunityBorrowerCreate({
  primaryBorrowerKind: "company",
  companyId: "company-1",
  primaryContactId: null,
  sourceCode: "employee",
  lifecycleStatus: "active",
  requirementStage: "lead_creation",
});
assert.equal(linked.ok, true);
assert.equal(linked.mode, "company_linked");

assert.equal(
  compassSubmitMissingCompany({ primaryBorrowerKind: "company", companyId: "   " }),
  true,
  "blank companyId is still missing at submit",
);

// --- Source inspect: start / answers / submit / employee / repository ---
const journey = read("server/services/compass-customer-gateway/compass-journey.service.ts");
const startFn = journey.slice(journey.indexOf("async startJourney"), journey.indexOf("async patchAnswers"));
const patchFn = journey.slice(journey.indexOf("async patchAnswers"), journey.indexOf("async analyze"));
const submitFn = journey.slice(journey.indexOf("async submit("));
const repo = read("server/repositories/enterprise-opportunity/enterprise-opportunity.repository.ts");
const employee = read("server/services/enterprise-opportunity/index.ts");

assert.match(startFn, /primaryBorrowerKind:\s*definition\.borrowerKind/);
assert.match(startFn, /sourceCode:\s*COMPASS_WEBSITE_SOURCE_CODE/);
assert.match(startFn, /lifecycleStatus:\s*"dialogue"/);
assert.match(startFn, /requirementStage:\s*"lead_creation"/);
assert.match(startFn, /primaryContactId:\s*contact\.id/);
assert.doesNotMatch(startFn, /companyId:/);
assert.doesNotMatch(startFn, /resolveRelatedCompany/);
assert.doesNotMatch(startFn, /ecmCompanyRepository\.create/);
assert.match(startFn, /compassPendingCompanyResolution:\s*true/);

assert.match(patchFn, /resolveRelatedCompany/);
assert.match(patchFn, /companyId,\s*companyName/);
assert.match(patchFn, /primaryBorrowerKind:\s*definition\.borrowerKind/);
assert.match(patchFn, /compassPendingCompanyResolution:\s*false/);
assert.match(patchFn, /contactId:\s*row\.primaryContactId/);

assert.match(submitFn, /COMPANY_REQUIRED/);
assert.match(submitFn, /compassSubmitMissingCompany/);
assert.match(submitFn, /Please provide your business name before submitting/);
assert.match(submitFn, /definition\.borrowerKind/);

assert.match(employee, /companyId is required when primary borrower is a Company/);
assert.doesNotMatch(
  employee.slice(employee.indexOf("async createOpportunity"), employee.indexOf("async createOpportunity") + 1800),
  /compass_pending_company|allowsCompassPendingCompanyResolution/,
);

assert.match(repo, /decideOpportunityBorrowerCreate/);
assert.match(repo, /compass_pending_company/);
assert.match(repo, /keepPrimaryContact/);
assert.match(repo, /pendingCompassCompany \? null : input\.companyId/);

console.log("CO-COMPASS-COMPANY-BORROWER-START verify: PASS");
console.log(
  JSON.stringify(
    {
      companyProducts: COMPANY_PRODUCTS,
      individualProducts: INDIVIDUAL_PRODUCTS,
      startPendingCompany: true,
      submitRequiresCompanyId: true,
      employeeApiStillRequiresCompanyId: true,
    },
    null,
    2,
  ),
);
