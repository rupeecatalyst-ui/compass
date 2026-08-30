#!/usr/bin/env node
/** Income ceilings and turnover conditionality — Catalyst One SSOT projected to COMPASS. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const {
  MONTHLY_INCOME_MIN,
  SALARIED_MONTHLY_INCOME_MAX,
  SELF_EMPLOYED_MONTHLY_INCOME_MAX,
  isMonthlyIncomeRequired,
  resolveMonthlyIncomeMax,
} = await import("../src/constants/enterprise-initial-data-collection/income-rules.ts");
const { buildCompassJourneyConfig } = await import(
  "../server/services/compass-customer-gateway/compass-journey-config.service.ts"
);
const { getCompassProductDefinition } = await import(
  "../src/constants/compass-customer-gateway/product-registry.ts"
);

assert.equal(MONTHLY_INCOME_MIN, 25_000);
assert.equal(SALARIED_MONTHLY_INCOME_MAX, 7_50_000);
assert.equal(SELF_EMPLOYED_MONTHLY_INCOME_MAX, 10_00_000);
assert.equal(resolveMonthlyIncomeMax("salaried"), 7_50_000);
assert.equal(resolveMonthlyIncomeMax("self-employed-business"), 10_00_000);
assert.equal(resolveMonthlyIncomeMax("self-employed-professional"), 10_00_000);

assert.equal(
  isMonthlyIncomeRequired({
    fieldVisible: true,
    employmentType: "salaried",
    turnoverFieldApplicable: false,
    values: {},
  }),
  true,
);
assert.equal(
  isMonthlyIncomeRequired({
    fieldVisible: true,
    employmentType: "self-employed-business",
    turnoverFieldApplicable: true,
    values: { annualTurnoverLabel: "18000000" },
  }),
  false,
);
assert.equal(
  isMonthlyIncomeRequired({
    fieldVisible: true,
    employmentType: "self-employed-professional",
    turnoverFieldApplicable: false,
    values: {},
  }),
  true,
);
assert.equal(
  isMonthlyIncomeRequired({
    fieldVisible: false,
    employmentType: "salaried",
    turnoverFieldApplicable: false,
    values: {},
  }),
  false,
);

const individual = ["home-loan", "home-loan-balance-transfer", "personal-loan", "loan-against-property"];
const companyTurnover = ["business-loan", "working-capital"];
const companyProject = ["construction-finance", "project-finance"];

for (const code of individual) {
  const config = buildCompassJourneyConfig(code);
  const income = config.fields.find((f) => f.fieldId === "monthlyIncomeLabel" || f.fieldId === "monthlyIncome");
  assert.ok(income, `${code} must project monthly income`);
  assert.equal(income.min, 25_000, `${code} income min`);
  assert.equal(income.max, 10_00_000, `${code} income absolute max`);
  assert.equal(income.maxWhenMap?.salaried, 7_50_000, `${code} salaried max`);
  assert.equal(income.maxWhenMap?.["self-employed-business"], 10_00_000, `${code} SE max`);
  assert.equal(getCompassProductDefinition(code).borrowerKind, "individual");
}

for (const code of [...companyTurnover, ...companyProject]) {
  const config = buildCompassJourneyConfig(code);
  const income = config.fields.find((f) => f.fieldId === "monthlyIncomeLabel" || f.fieldId === "monthlyIncome");
  assert.equal(income, undefined, `${code} must not require individual monthly income`);
}

for (const code of companyTurnover) {
  const config = buildCompassJourneyConfig(code);
  assert.ok(
    config.fields.some((f) => f.fieldId === "annualTurnoverLabel" || f.fieldId === "annualTurnover"),
    `${code} must expose turnover as financial-capacity input`,
  );
}

const compassSlider = readFileSync(join(root, "compass/src/config/home-loan-discovery.ts"), "utf8");
assert.match(compassSlider, /monthlyIncome:\s*\{[\s\S]*?max:\s*10_00_000/);

console.log("CO-COMPASS-INCOME-CONDITIONALITY verify: PASS");
