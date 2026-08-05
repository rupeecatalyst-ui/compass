/**
 * CO-LM-004 — Enterprise Lender Product Catalogue extraction (static verify).
 * No migrate / no deploy / no transactional mutation.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

const REQUIRED_FILES = [
  "src/types/enterprise-lender-product-catalogue.ts",
  "src/constants/enterprise-lender-product-catalogue/catalogue.ts",
  "src/constants/enterprise-lender-product-catalogue/index.ts",
  "src/lib/enterprise-lender-product-catalogue/index.ts",
  "docs/co-lm-004/CO-LM-004-LENDER-PRODUCT-CATALOGUE-READINESS-REPORT.md",
  ".cursor/rules/enterprise-lender-product-catalogue.mdc",
];

for (const rel of REQUIRED_FILES) {
  assert.ok(exists(rel), `missing ${rel}`);
}

const catalogue = read("src/constants/enterprise-lender-product-catalogue/catalogue.ts");
assert.match(catalogue, /CO_LM_004_LENDER_PRODUCT_CATALOGUE_VERSION = 1/);
assert.match(catalogue, /export const LENDERS_BY_PRODUCT/);

const PRODUCT_SLUGS = [
  "home-loan",
  "home-loan-balance-transfer",
  "loan-against-property",
  "personal-loan",
  "unsecured-business-loan",
];
for (const slug of PRODUCT_SLUGS) {
  assert.ok(catalogue.includes(`"${slug}"`), `catalogue missing product slug ${slug}`);
}

const ANCHOR_OFFERS = [
  { slug: "home-loan", name: "Bajaj Housing Finance", rateNum: "7.1" },
  { slug: "home-loan-balance-transfer", name: "HDFC Bank", rate: "7.15%*" },
  { slug: "loan-against-property", name: "Piramal Capital", rateNum: "9.75" },
  { slug: "personal-loan", name: "IDFC First Bank", rateNum: "10.75" },
  { slug: "unsecured-business-loan", name: "Lendingkart", rateNum: "15" },
];
for (const row of ANCHOR_OFFERS) {
  assert.ok(catalogue.includes(`name: "${row.name}"`), `missing lender ${row.name}`);
}

const site = read("src/lib/site.ts");
assert.doesNotMatch(
  site,
  /export const LENDERS_BY_PRODUCT/,
  "site.ts must not own LENDERS_BY_PRODUCT",
);
assert.doesNotMatch(
  site,
  /export interface LenderOffer/,
  "site.ts must not define LenderOffer",
);
assert.doesNotMatch(
  site,
  /export const ELIGIBILITY_GATE_SLUGS/,
  "site.ts must not own ELIGIBILITY_GATE_SLUGS",
);

const forbiddenSiteImports = [
  "src/lib/enterprise-lender-directory/programs.ts",
  "src/lib/insights/lender-intelligence.ts",
  "src/components/site/EligibilityGate.tsx",
];
for (const rel of forbiddenSiteImports) {
  const src = read(rel);
  assert.doesNotMatch(src, /from ["']@\/lib\/site["']/, `${rel} must not import @/lib/site`);
  assert.match(
    src,
    /enterprise-lender-product-catalogue/,
    `${rel} must import enterprise-lender-product-catalogue`,
  );
}

const loansSlug = read("src/routes/loans.$slug.tsx");
assert.match(loansSlug, /enterprise-lender-product-catalogue/);
assert.doesNotMatch(loansSlug, /ELIGIBILITY_GATE_SLUGS.*from ["']@\/lib\/site["']/);

const productsConst = read("src/constants/enterprise-lender-directory/products.ts");
assert.match(productsConst, /Enterprise Lender Product Catalogue/);
assert.doesNotMatch(productsConst, /marketing LENDERS_BY_PRODUCT/);

console.log("CO-LM-004 verify: PASS");
console.log(
  JSON.stringify(
    {
      version: 1,
      productSlugs: PRODUCT_SLUGS.length,
      ssot: "src/constants/enterprise-lender-product-catalogue/catalogue.ts",
      siteOwnsCatalogue: false,
    },
    null,
    2,
  ),
);
