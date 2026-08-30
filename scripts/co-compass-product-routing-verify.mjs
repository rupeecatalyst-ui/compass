#!/usr/bin/env node
/**
 * COMPASS product routing — no product-code collisions, future products stay closed.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const {
  COMPASS_ACTIVE_PRODUCT_CODES,
  COMPASS_FUTURE_PRODUCT_CODES,
  COMPASS_PRODUCT_REGISTRY,
  COMPASS_PRODUCT_TO_ENTERPRISE,
  classifyCompassProductParam,
  parseActiveCompassProductCode,
} = await import("../src/constants/compass-customer-gateway/product-registry.ts");

const compassPresentation = readFileSync(
  join(root, "compass/src/config/compass-lending-products.ts"),
  "utf8",
);
const startRoute = readFileSync(join(root, "src/app/api/compass/journey/start/route.ts"), "utf8");
const discoveryContext = readFileSync(
  join(root, "compass/src/components/home-loan-experience/discovery/discovery-context.tsx"),
  "utf8",
);

assert.equal(COMPASS_ACTIVE_PRODUCT_CODES.length, COMPASS_PRODUCT_REGISTRY.length);

const compassCodes = COMPASS_PRODUCT_REGISTRY.map((p) => p.compassCode);
assert.equal(new Set(compassCodes).size, compassCodes.length, "duplicate COMPASS slugs");

const enterpriseCodes = COMPASS_PRODUCT_REGISTRY.map((p) => p.enterpriseProductCode);
assert.equal(new Set(enterpriseCodes).size, enterpriseCodes.length, "duplicate enterprise mappings");

assert.equal(COMPASS_PRODUCT_TO_ENTERPRISE["home-loan"].productCode, "HOME_LOAN");
assert.equal(COMPASS_PRODUCT_TO_ENTERPRISE["home-loan-balance-transfer"].productCode, "HOME_LOAN_BT");
assert.equal(COMPASS_PRODUCT_TO_ENTERPRISE["personal-loan"].productCode, "PERSONAL_LOAN");
assert.equal(COMPASS_PRODUCT_TO_ENTERPRISE["business-loan"].productCode, "BUSINESS_LOAN_UNSECURED");
assert.equal(COMPASS_PRODUCT_TO_ENTERPRISE["loan-against-property"].productCode, "LAP");
assert.equal(COMPASS_PRODUCT_TO_ENTERPRISE["working-capital"].productCode, "WORKING_CAPITAL_SECURED");
assert.equal(COMPASS_PRODUCT_TO_ENTERPRISE["construction-finance"].productCode, "CONSTRUCTION_FINANCE");
assert.equal(COMPASS_PRODUCT_TO_ENTERPRISE["project-finance"].productCode, "PROJECT_FINANCE");

assert.notEqual(COMPASS_PRODUCT_TO_ENTERPRISE["personal-loan"].productCode, "HOME_LOAN");
assert.notEqual(COMPASS_PRODUCT_TO_ENTERPRISE["business-loan"].productCode, "PERSONAL_LOAN");
assert.notEqual(COMPASS_PRODUCT_TO_ENTERPRISE["loan-against-property"].productCode, "HOME_LOAN");

assert.equal(parseActiveCompassProductCode("personal-loan"), "personal-loan");
assert.equal(parseActiveCompassProductCode("vehicle-loan"), null);
assert.equal(classifyCompassProductParam("vehicle-loan").kind, "future");
assert.equal(classifyCompassProductParam("not-a-product").kind, "invalid");
assert.equal(classifyCompassProductParam("").kind, "invalid");

for (const future of COMPASS_FUTURE_PRODUCT_CODES) {
  assert.equal(classifyCompassProductParam(future).kind, "future", future);
}

for (const code of COMPASS_ACTIVE_PRODUCT_CODES) {
  assert.match(compassPresentation, new RegExp(`"${code}"`));
}

assert.match(startRoute, /requireActiveCompassProduct/);
assert.match(discoveryContext, /readProductCodeFromPathname/);
assert.doesNotMatch(
  discoveryContext,
  /return product === "home-loan-balance-transfer" \? "home-loan-balance-transfer" : "home-loan"/,
);

const hl = COMPASS_PRODUCT_REGISTRY.find((p) => p.compassCode === "home-loan");
const pl = COMPASS_PRODUCT_REGISTRY.find((p) => p.compassCode === "personal-loan");
const bl = COMPASS_PRODUCT_REGISTRY.find((p) => p.compassCode === "business-loan");
const lap = COMPASS_PRODUCT_REGISTRY.find((p) => p.compassCode === "loan-against-property");
assert.equal(hl.isSecured, true);
assert.equal(pl.isSecured, false);
assert.equal(pl.borrowerKind, "individual");
assert.equal(bl.borrowerKind, "company");
assert.equal(bl.isSecured, false);
assert.equal(lap.isSecured, true);

const { getDiscoveryStepOrder } = await import("../compass/src/config/compass-lending-products.ts");
const hlSteps = getDiscoveryStepOrder("home-loan");
const hlbtSteps = getDiscoveryStepOrder("home-loan-balance-transfer");
assert.equal(hlSteps.includes("currentLender"), false);
assert.equal(hlSteps.includes("outstandingLoanAmount"), false);
assert.equal(hlbtSteps.includes("currentLender"), true);
assert.equal(hlbtSteps.includes("outstandingLoanAmount"), true);
assert.notDeepEqual(hlSteps, hlbtSteps);

console.log("CO-COMPASS-PRODUCT-ROUTING verify: PASS");
