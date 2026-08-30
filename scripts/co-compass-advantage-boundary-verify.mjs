#!/usr/bin/env node
/** COMPASS Advantage — C1 engine, HL/HLBT only, no retired mock formula. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const banned = /0\.0045|0\.0055|ltvFactor|incomeFactor|baseRate/;
for (const rel of [
  "server/services/compass-customer-gateway/compass-advantage.service.ts",
  "src/lib/compass-advantage/compute.ts",
  "src/constants/compass-advantage/schedule.ts",
]) {
  assert.doesNotMatch(readFileSync(join(root, rel), "utf8"), banned);
}

assert.match(
  readFileSync(join(root, "server/services/compass-customer-gateway/compass-advantage.service.ts"), "utf8"),
  /computeEnterpriseCompassAdvantage/,
);

const { computeCompassAdvantage } = await import(
  "../server/services/compass-customer-gateway/compass-advantage.service.ts"
);
const { COMPASS_ADVANTAGE_RULE_ID } = await import("../src/constants/compass-advantage/schedule.ts");

const eligibleInput = {
  loanAmount: 50_00_000,
  monthlyIncome: 2_00_000,
  propertyValue: 80_00_000,
  propertyType: "ready",
};

process.env.COMPASS_ADVANTAGE_COMMERCIAL_ENABLED = "true";
const hl = computeCompassAdvantage({ productCode: "home-loan", ...eligibleInput });
const hlbt = computeCompassAdvantage({
  productCode: "home-loan-balance-transfer",
  ...eligibleInput,
});
assert.equal(hl.status, "ready");
assert.equal(hl.eligible, true);
assert.ok((hl.amount ?? 0) > 0, "HL indicative amount");
assert.equal(hl.ruleId, COMPASS_ADVANTAGE_RULE_ID);
assert.equal(hlbt.status, "ready");
assert.ok((hlbt.amount ?? 0) > 0, "HLBT indicative amount");

const missingIncome = computeCompassAdvantage({
  productCode: "home-loan",
  loanAmount: 50_00_000,
  propertyValue: 80_00_000,
  monthlyIncome: 0,
});
assert.equal(missingIncome.eligible, false);
assert.equal(missingIncome.status, "ineligible");
assert.equal(missingIncome.reason, "monthly_income_required");

process.env.COMPASS_ADVANTAGE_COMMERCIAL_ENABLED = "false";
const disabled = computeCompassAdvantage({ productCode: "home-loan", ...eligibleInput });
assert.equal(disabled.eligible, false);
assert.equal(disabled.status, "not_available");
assert.equal(disabled.reason, "commercial_schedule_not_effective");
delete process.env.COMPASS_ADVANTAGE_COMMERCIAL_ENABLED;

for (const productCode of [
  "personal-loan",
  "loan-against-property",
  "business-loan",
  "working-capital",
  "construction-finance",
]) {
  const result = computeCompassAdvantage({ productCode, ...eligibleInput });
  assert.equal(result.eligible, false, productCode);
  assert.equal(result.amount, null, productCode);
  assert.equal(result.reason, "product_not_applicable", productCode);
}

console.log("CO-COMPASS-ADVANTAGE-BOUNDARY verify: PASS");
