#!/usr/bin/env node
/** Journey config must project Enterprise IDC — not static COMPASS questionnaire. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const configService = readFileSync(
  join(root, "server/services/compass-customer-gateway/compass-journey-config.service.ts"),
  "utf8",
);
const catalog = readFileSync(
  join(root, "src/constants/enterprise-initial-data-collection/catalog.ts"),
  "utf8",
);

assert.doesNotMatch(configService, /HOME_LOAN_FIELDS/);
assert.match(configService, /buildPartnerOpportunityJourneyConfig|getEnterpriseIdcCatalog/);
assert.match(configService, /resolveVisibleIdcSections/);
assert.match(configService, /enterprise_initial_data_collection/);
assert.match(configService, /ENTERPRISE_IDC_VERSION|partnerConfig\.version/);

// Changing IDC version marker in catalog must be reflected via partner projection (no COMPASS edit).
assert.match(catalog, /ENTERPRISE_IDC_VERSION\s*=\s*"/);

const { buildCompassJourneyConfig } = await import(
  "../server/services/compass-customer-gateway/compass-journey-config.service.ts"
);
const hl = buildCompassJourneyConfig("home-loan");
const hlbt = buildCompassJourneyConfig("home-loan-balance-transfer");
const pl = buildCompassJourneyConfig("personal-loan");
const bl = buildCompassJourneyConfig("business-loan");
const lap = buildCompassJourneyConfig("loan-against-property");
const wc = buildCompassJourneyConfig("working-capital");
const cf = buildCompassJourneyConfig("construction-finance");
assert.equal(hl.dtoSource, "enterprise_initial_data_collection");
assert.equal(hlbt.dtoSource, "enterprise_initial_data_collection");
assert.equal(hl.enterpriseProductCode, "HOME_LOAN");
assert.equal(hlbt.enterpriseProductCode, "HOME_LOAN_BT");
assert.equal(pl.enterpriseProductCode, "PERSONAL_LOAN");
assert.equal(bl.enterpriseProductCode, "BUSINESS_LOAN_UNSECURED");
assert.equal(lap.enterpriseProductCode, "LAP");
assert.equal(wc.enterpriseProductCode, "WORKING_CAPITAL_SECURED");
assert.equal(cf.enterpriseProductCode, "CONSTRUCTION_FINANCE");
assert.equal(pl.borrowerKind, "individual");
assert.equal(bl.borrowerKind, "company");
assert.equal(pl.isSecured, false);
assert.equal(lap.isSecured, true);
assert.ok(hl.fields.length > 0, "HL config must expose IDC fields");
assert.ok(hlbt.fields.length > 0, "HLBT config must expose IDC fields");
assert.ok(pl.fields.length > 0, "PL config must expose IDC fields");
assert.ok(
  wc.fields.some((f) => f.fieldId === "facilityType"),
  "WC must expose facility type",
);
assert.ok(
  cf.fields.some((f) => f.fieldId === "projectCostLabel" || f.fieldId === "projectLocation"),
  "Construction Finance must expose project fields",
);
const btField = hlbt.fields.find(
  (f) =>
    f.fieldId === "currentLendingInstitution" ||
    f.fieldId === "outstandingLoanAmountLabel" ||
    f.visibleWhenField === "transactionType",
);
assert.ok(btField, "HLBT must expose BT-related IDC fields");

console.log("CO-COMPASS-JOURNEY-CONFIG-AUTHORITY verify: PASS");
