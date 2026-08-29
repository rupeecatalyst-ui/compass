#!/usr/bin/env node
/** Advantage must not compute gateway-local commercial amounts. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const advantageService = readFileSync(
  join(root, "server/services/compass-customer-gateway/compass-advantage.service.ts"),
  "utf8",
);

assert.doesNotMatch(advantageService, /0\.0045|0\.0055|150000|ltvFactor|incomeFactor|baseRate/);

const { computeCompassAdvantage } = await import(
  "../server/services/compass-customer-gateway/compass-advantage.service.ts"
);

const products = [
  "home-loan",
  "home-loan-balance-transfer",
  "personal-loan",
  "business-loan",
] ;

for (const productCode of products) {
  const result = computeCompassAdvantage({
    productCode,
    loanAmount: 5000000,
    monthlyIncome: 200000,
    propertyValue: 8000000,
    propertyType: "ready",
  });
  if (productCode === "home-loan" || productCode === "home-loan-balance-transfer") {
    assert.equal(result.status, "not_available");
    assert.equal(result.eligible, false);
    assert.equal(result.amount, null);
  } else {
    assert.equal(result.eligible, false);
    assert.equal(result.amount, null);
  }
}

console.log("CO-COMPASS-ADVANTAGE-BOUNDARY verify: PASS");
