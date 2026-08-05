/**
 * CO-LR-013 — Mandatory Lender Sales Contact Capture & Disbursal Enrichment (static gates).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const required = [
  "src/constants/lender-sales-contact.ts",
  "src/lib/lender-sales-contact/index.ts",
  "src/components/catalyst-one/execution/lender-sales-contact-capture.tsx",
  "docs/co-lr-013/CO-LR-013-LENDER-SALES-CONTACT-READINESS-REPORT.md",
];

for (const rel of required) {
  assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
}

const constants = read("src/constants/lender-sales-contact.ts");
assert.match(constants, /LENDER_SALES_DESIGNATION_SELECT_OPTIONS/);
assert.match(constants, /Sales Executive/);
assert.match(constants, /Relationship Manager/);
assert.match(constants, /Area Sales Manager/);
assert.match(constants, /Regional Sales Manager/);
assert.match(constants, /National Sales Manager/);
assert.match(constants, /Sales Head/);
assert.match(
  constants,
  /Official Email Address for this lender contact is required before completing Disbursal/,
);
assert.ok(
  !/credit.?ops|legal.?technical|processing team/i.test(constants) ||
    /NOT part|out of scope|Credit \/ Ops/i.test(constants),
  "Sales-only scope must be documented",
);

const helpers = read("src/lib/lender-sales-contact/index.ts");
assert.match(helpers, /validateLenderSalesContactCreate/);
assert.match(helpers, /findLenderSalesContactDuplicates/);
assert.match(helpers, /createLenderSalesContact/);
assert.match(helpers, /enrichLenderSalesContactOfficialEmail/);
assert.match(helpers, /lender_employee/);
assert.match(helpers, /institution: draft\.lenderId/);
assert.match(helpers, /Use Existing Contact/);
assert.match(helpers, /persistRegisterEcmContact/);
assert.match(helpers, /persistUpdateEcmContact/);

const ui = read("src/components/catalyst-one/execution/lender-sales-contact-capture.tsx");
assert.match(ui, /LenderSalesContactCapture/);
assert.match(ui, /Create New Sales Contact/);
assert.match(ui, /Use Existing Contact/);
assert.match(ui, /Email Address \(optional\)/);
assert.match(ui, /Sales Designation/);

const board = read("src/components/catalyst-one/execution/lender-pipeline-board.tsx");
assert.match(board, /LenderSalesContactCapture/);
assert.match(board, /pendingSalesContact/);
assert.match(board, /lenderSalesContact/);
assert.match(board, /enrichLenderSalesContactOfficialEmail/);
assert.match(board, /LENDER_SALES_CONTACT_DISBURSAL_EMAIL_MESSAGE/);
assert.match(board, /Select or create a Lender Sales Contact/);

const host = read("src/components/catalyst-one/deal-workspace/deal-workspace-host.tsx");
assert.match(host, /lenderSalesContact/);
assert.match(host, /Lender Sales Contact is mandatory/);

const runtime = read("src/lib/enterprise-deal/deal-pipeline-runtime.ts");
assert.match(runtime, /lenderSalesContact/);
assert.match(runtime, /Lender Sales Contact is mandatory/);
assert.match(runtime, /lenderSalesContactId/);

const create = read("src/lib/enterprise-deal/deal-create-from-opportunity.ts");
assert.match(create, /lenderSalesContactId/);

const api = read("src/app/api/ecm/contacts/route.ts");
assert.match(api, /roleProfiles: body\.roleProfiles/);

const types = read("src/types/catalyst-one.ts");
assert.match(types, /lenderSalesContactId\?:/);

console.log("CO-LR-013 verify: PASS");
