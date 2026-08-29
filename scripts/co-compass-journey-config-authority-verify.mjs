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
assert.equal(hl.dtoSource, "enterprise_initial_data_collection");
assert.equal(hlbt.dtoSource, "enterprise_initial_data_collection");
assert.equal(hl.enterpriseProductCode, "HOME_LOAN");
assert.equal(hlbt.enterpriseProductCode, "HOME_LOAN_BT");
assert.ok(hl.fields.length > 0, "HL config must expose IDC fields");
assert.ok(hlbt.fields.length > 0, "HLBT config must expose IDC fields");
const btField = hlbt.fields.find(
  (f) =>
    f.fieldId === "currentLendingInstitution" ||
    f.fieldId === "outstandingLoanAmountLabel" ||
    f.visibleWhenField === "transactionType",
);
assert.ok(btField, "HLBT must expose BT-related IDC fields");

console.log("CO-COMPASS-JOURNEY-CONFIG-AUTHORITY verify: PASS");
