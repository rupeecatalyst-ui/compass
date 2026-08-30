#!/usr/bin/env node
/**
 * COMPASS Products page — launched-only visibility, order, routing, Advantage copy.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const {
  COMPASS_ACTIVE_PRODUCT_CODES,
  COMPASS_FUTURE_PRODUCT_CODES,
  getCompassProductDefinition,
} = await import("../src/constants/compass-customer-gateway/product-registry.ts");

const {
  COMPASS_FUTURE_PRODUCTS,
  COMPASS_GATEWAY_PRODUCTS,
  COMPASS_PRODUCT_HREFS,
  COMPASS_PRODUCT_LABELS,
  COMPASS_PRODUCT_PAGE_COPY,
  COMPASS_PRODUCTS_PAGE_ORDER,
  getCompassProductExploreHref,
  listVisibleCompassProducts,
  productShowsAdvantage,
} = await import("../compass/src/config/compass-lending-products.ts");

const pageSrc = readFileSync(
  join(root, "compass/src/components/pages/loan-products-page-content.tsx"),
  "utf8",
);
const contentSrc = readFileSync(join(root, "compass/src/config/content.ts"), "utf8");

assert.deepEqual([...COMPASS_GATEWAY_PRODUCTS].sort(), [...COMPASS_ACTIVE_PRODUCT_CODES].sort());
assert.deepEqual([...COMPASS_FUTURE_PRODUCTS].sort(), [...COMPASS_FUTURE_PRODUCT_CODES].sort());

const visible = listVisibleCompassProducts();
assert.deepEqual(visible, [
  "home-loan",
  "home-loan-balance-transfer",
  "loan-against-property",
  "business-loan",
  "working-capital",
  "construction-finance",
  "project-finance",
  "personal-loan",
]);

for (const future of COMPASS_FUTURE_PRODUCTS) {
  assert.equal(visible.includes(future), false, `${future} must stay hidden`);
  assert.doesNotMatch(pageSrc, new RegExp(future.replaceAll("-", "\\-")));
}

assert.match(pageSrc, /requestedAmountMaxLabel/);
assert.doesNotMatch(pageSrc, /Loan amount up to ₹10 crore|Funding up to ₹25 crore/);
assert.doesNotMatch(pageSrc, /vehicle-loan|Vehicle Loan/);
assert.doesNotMatch(contentSrc, /export const loanProducts/);

assert.equal(COMPASS_PRODUCT_HREFS["home-loan"], "/home-loan");
assert.equal(
  COMPASS_PRODUCT_HREFS["home-loan-balance-transfer"],
  "/home-loan?product=home-loan-balance-transfer",
);
assert.equal(COMPASS_PRODUCT_HREFS["personal-loan"], "/personal-loan");
assert.notEqual(COMPASS_PRODUCT_HREFS["personal-loan"], COMPASS_PRODUCT_HREFS["home-loan"]);

assert.match(getCompassProductExploreHref("home-loan"), /discovery=launch/);
assert.match(
  getCompassProductExploreHref("home-loan-balance-transfer"),
  /product=home-loan-balance-transfer/,
);
assert.match(getCompassProductExploreHref("home-loan-balance-transfer"), /discovery=launch/);
assert.doesNotMatch(
  getCompassProductExploreHref("home-loan-balance-transfer"),
  /\?product=home-loan-balance-transfer\?/,
);
assert.match(
  getCompassProductExploreHref("project-finance"),
  /product=project-finance/,
);

assert.equal(COMPASS_PRODUCT_LABELS["home-loan"], "New Home Loan");
assert.equal(COMPASS_PRODUCT_LABELS["business-loan"], "Unsecured Business Loan");
assert.equal(COMPASS_PRODUCT_LABELS["construction-finance"], "Construction Funding");
assert.equal(getCompassProductDefinition("business-loan").enterpriseProductCode, "BUSINESS_LOAN_UNSECURED");
assert.equal(getCompassProductDefinition("business-loan").productLabel, "Unsecured Business Loan");
assert.equal(getCompassProductDefinition("construction-finance").enterpriseProductCode, "CONSTRUCTION_FINANCE");
assert.equal(getCompassProductDefinition("construction-finance").productLabel, "Construction Funding");
assert.equal(productShowsAdvantage("home-loan"), true);
assert.equal(productShowsAdvantage("home-loan-balance-transfer"), true);
assert.equal(productShowsAdvantage("personal-loan"), false);
assert.equal(productShowsAdvantage("business-loan"), false);

for (const code of visible) {
  const copy = COMPASS_PRODUCT_PAGE_COPY[code];
  const mentionsAdvantage = copy.benefits.some((b) => /advantage/i.test(b));
  if (productShowsAdvantage(code)) {
    assert.equal(mentionsAdvantage, true, `${code} should mention Advantage`);
  } else {
    assert.equal(mentionsAdvantage, false, `${code} must not mention Advantage`);
  }
  assert.ok(copy.benefits.length >= 2 && copy.benefits.length <= 3);
}

assert.equal(new Set(COMPASS_PRODUCTS_PAGE_ORDER).size, COMPASS_GATEWAY_PRODUCTS.length);

const launchSrc = readFileSync(
  join(root, "compass/src/discovery-template/launch-discovery.ts"),
  "utf8",
);
assert.match(launchSrc, /searchParams\.set\("discovery", "launch"\)/);

console.log(
  "CO-COMPASS-PRODUCTS-PAGE verify: PASS",
  JSON.stringify({ visible, hidden: [...COMPASS_FUTURE_PRODUCTS] }),
);
