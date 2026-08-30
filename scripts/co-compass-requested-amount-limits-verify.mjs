#!/usr/bin/env node
/**
 * Product-wise maximum requested amounts — Catalyst One Product Library SSOT.
 * COMPASS must consume journey-config projection; it must not invent a competing table.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const {
  getApprovedMaxRequestedAmountRupees,
  getApprovedRequestedAmountMaxLabel,
  getCanonicalProductByCode,
  assertRequestedAmountWithinProductLimit,
  integerRangeReachesExactMax,
  formatIndianRupees,
  formatRequestedAmountUpToLabel,
  toIntegerRupees,
  CANONICAL_PRODUCT_MASTER_SEED,
} = await import("../src/constants/enterprise-product-master/index.ts");
const { buildCompassJourneyConfig } = await import(
  "../server/services/compass-customer-gateway/compass-journey-config.service.ts"
);
const { getCompassProductDefinition } = await import(
  "../src/constants/compass-customer-gateway/product-registry.ts"
);
const { answersToSnapshotFields } = await import(
  "../server/services/compass-customer-gateway/compass-opportunity-projection.ts"
);
const { resolveRequestedAmountBounds, formatJourneyInrLabel } = await import(
  "../compass/src/lib/journey-config.ts"
);
const {
  persistDiscoveryLoanAmount,
  restoreDiscoveryLoanAmount,
} = await import("../compass/src/lib/discovery-session.ts");

const APPROVED = [
  { compass: "home-loan", enterprise: "HOME_LOAN", max: 10_00_00_000, kind: "loan", label: "Loan amount up to ₹10 crore" },
  { compass: "home-loan-balance-transfer", enterprise: "HOME_LOAN_BT", max: 10_00_00_000, kind: "loan", label: "Loan amount up to ₹10 crore" },
  { compass: "loan-against-property", enterprise: "LAP", max: 25_00_00_000, kind: "funding", label: "Funding up to ₹25 crore" },
  { compass: "business-loan", enterprise: "BUSINESS_LOAN_UNSECURED", max: 5_00_00_000, kind: "loan", label: "Loan amount up to ₹5 crore" },
  { compass: "working-capital", enterprise: "WORKING_CAPITAL_SECURED", max: 50_00_00_000, kind: "funding", label: "Funding up to ₹50 crore" },
  { compass: "personal-loan", enterprise: "PERSONAL_LOAN", max: 1_00_00_000, kind: "loan", label: "Loan amount up to ₹1 crore" },
  { compass: "construction-finance", enterprise: "CONSTRUCTION_FINANCE", max: 1_00_00_00_000, kind: "funding", label: "Funding up to ₹100 crore" },
];

const UNAPPROVED = ["PROJECT_FINANCE", "WORKING_CAPITAL_UNSECURED", "VEHICLE_LOAN", "LRD"];

for (const row of APPROVED) {
  assert.equal(getCompassProductDefinition(row.compass).enterpriseProductCode, row.enterprise);
  assert.equal(getApprovedMaxRequestedAmountRupees(row.enterprise), row.max, `${row.enterprise} catalog max`);
  assert.equal(getCanonicalProductByCode(row.enterprise)?.maxRequestedAmountRupees, row.max);
  assert.equal(getApprovedRequestedAmountMaxLabel(row.enterprise), row.label, `${row.enterprise} up-to label`);
  assert.equal(formatRequestedAmountUpToLabel(row.max, row.kind), row.label);

  const config = buildCompassJourneyConfig(row.compass);
  assert.equal(config.enterpriseProductCode, row.enterprise);
  assert.equal(config.requestedAmountMax, row.max, `${row.compass} config max`);
  assert.equal(config.requestedAmountMaxLabel, row.label);
  const amountField = config.fields.find((f) => f.fieldId === "requestedAmountLabel" || f.fieldId === "loanAmount");
  assert.ok(amountField, `${row.compass} must project requested amount`);
  assert.equal(amountField.max, row.max, `${row.compass} field max`);

  const bounds = resolveRequestedAmountBounds(config, { min: 10_00_000, max: 5_00_00_000 });
  assert.equal(bounds.max, row.max, `${row.compass} COMPASS slider must reach C1 ceiling`);
  assert.equal(bounds.hasApprovedMax, true);
  assert.equal(integerRangeReachesExactMax(bounds.min, bounds.max, 1), true);

  const accepted = assertRequestedAmountWithinProductLimit({
    enterpriseProductCode: row.enterprise,
    amountRupees: row.max,
  });
  assert.equal(accepted.ok, true, `${row.enterprise} exact max must be accepted`);
  if (accepted.ok) assert.equal(accepted.amount, row.max);

  const rejected = assertRequestedAmountWithinProductLimit({
    enterpriseProductCode: row.enterprise,
    amountRupees: row.max + 1,
  });
  assert.equal(rejected.ok, false, `${row.enterprise} max+1 must be rejected`);
  if (!rejected.ok) {
    assert.equal(rejected.code, "AMOUNT_EXCEEDS_PRODUCT_LIMIT");
    assert.match(rejected.message, /up to/i);
    assert.doesNotMatch(rejected.message, /guaranteed|approval|sanction|disburs/i);
  }

  const snapshot = answersToSnapshotFields({ loanAmount: row.max });
  assert.equal(snapshot.requestedAmount, row.max);
  assert.equal(snapshot.productFields.requestedAmountLabel, String(row.max));
  assert.equal(`₹${formatIndianRupees(snapshot.requestedAmount)}`, `₹${row.max.toLocaleString("en-IN")}`);
}

const hl = buildCompassJourneyConfig("home-loan");
const hlbt = buildCompassJourneyConfig("home-loan-balance-transfer");
assert.equal(hl.enterpriseProductCode, "HOME_LOAN");
assert.equal(hlbt.enterpriseProductCode, "HOME_LOAN_BT");
assert.notEqual(hl.enterpriseProductCode, hlbt.enterpriseProductCode);
assert.equal(hl.requestedAmountMax, hlbt.requestedAmountMax);
assert.equal(hl.transactionType, "fresh");
assert.equal(hlbt.transactionType, "balance_transfer");

const pf = buildCompassJourneyConfig("project-finance");
assert.equal(pf.enterpriseProductCode, "PROJECT_FINANCE");
assert.equal(pf.requestedAmountMax, null);
assert.equal(pf.requestedAmountMaxLabel, null);

for (const code of UNAPPROVED) {
  assert.equal(getApprovedMaxRequestedAmountRupees(code), null, `${code} must not invent a max`);
  const product = getCanonicalProductByCode(code);
  assert.equal(product?.maxRequestedAmountRupees, undefined);
}

const approvedCodes = new Set(APPROVED.map((r) => r.enterprise));
for (const product of CANONICAL_PRODUCT_MASTER_SEED) {
  if (approvedCodes.has(product.code)) continue;
  assert.equal(
    product.maxRequestedAmountRupees,
    undefined,
    `${product.code} must not have an unapproved ceiling`,
  );
}

assert.equal(toIntegerRupees("10,00,00,000"), 10_00_00_000);
assert.equal(toIntegerRupees(10_00_00_000.4), 10_00_00_000);
assert.equal(formatIndianRupees(10_00_00_000), "10,00,00,000");
assert.equal(formatIndianRupees(1_00_00_00_000), "1,00,00,00,000");
assert.equal(formatJourneyInrLabel(10_00_00_000), "₹10 Crore");
assert.equal(formatJourneyInrLabel(1_00_00_00_000), "₹100 Crore");
assert.equal(formatJourneyInrLabel(1_00_00_000), "₹1 Crore");

const memory = new Map();
const storage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => {
    memory.set(key, value);
  },
  removeItem: (key) => {
    memory.delete(key);
  },
};
persistDiscoveryLoanAmount(storage, "home-loan", 10_00_00_000);
assert.equal(restoreDiscoveryLoanAmount(storage, "home-loan"), 10_00_00_000);
assert.equal(restoreDiscoveryLoanAmount(storage, "home-loan-balance-transfer"), null);

const compassLending = readFileSync(join(root, "compass/src/config/compass-lending-products.ts"), "utf8");
assert.doesNotMatch(compassLending, /maxRequestedAmount|10_00_00_000|HOME_LOAN_BT.*10_00_00_000/);
const compassJourneyConfig = readFileSync(join(root, "compass/src/lib/journey-config.ts"), "utf8");
assert.match(compassJourneyConfig, /requestedAmountMax/);
assert.doesNotMatch(compassJourneyConfig, /HOME_LOAN:\s*10_00_00_000/);
const productsPage = readFileSync(
  join(root, "compass/src/components/pages/loan-products-page-content.tsx"),
  "utf8",
);
assert.match(productsPage, /requestedAmountMaxLabel/);
assert.doesNotMatch(productsPage, /Loan amount up to ₹10 crore/);
assert.doesNotMatch(productsPage, /Funding up to ₹25 crore/);
const discoveryJourney = readFileSync(
  join(root, "compass/src/components/home-loan-experience/discovery/discovery-journey.tsx"),
  "utf8",
);
assert.match(discoveryJourney, /resolveRequestedAmountBounds/);
assert.doesNotMatch(discoveryJourney, /discoveryCopy\.loanAmount\.max/);

const c1Config = readFileSync(
  join(root, "server/services/compass-customer-gateway/compass-journey-config.service.ts"),
  "utf8",
);
assert.match(c1Config, /getApprovedMaxRequestedAmountRupees/);
assert.match(c1Config, /requestedAmountMax/);

console.log(
  "CO-COMPASS-REQUESTED-AMOUNT-LIMITS verify: PASS",
  JSON.stringify(
    APPROVED.map((r) => ({
      product: r.compass,
      enterprise: r.enterprise,
      max: r.max,
      label: r.label,
    })),
  ),
);
