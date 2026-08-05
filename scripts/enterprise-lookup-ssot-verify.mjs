/**
 * Enterprise Lookup SSOT — verification (LSC + live ECM + fixed surfaces).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const live = read("src/lib/enterprise-registry/live-search.ts");
assert.match(live, /liveSearchOperationalEcmContacts/);
assert.match(live, /syncContactsToCache/);

const lib = read("src/lib/lender-sales-contact/index.ts");
assert.match(lib, /searchLenderSalesContactsLive/);
assert.match(lib, /liveSearchOperationalEcmContacts/);
assert.match(lib, /findLenderSalesContactDuplicatesLive/);
assert.match(lib, /contactBelongsToLender/);
assert.match(lib, /lenderBias|aliases/);

const ui = read("src/components/catalyst-one/execution/lender-sales-contact-capture.tsx");
assert.match(ui, /searchLenderSalesContactsLive/);
assert.match(ui, /Enterprise Contact Registry unavailable/);
assert.match(ui, /searchError/);
assert.match(ui, /findLenderSalesContactDuplicatesLive/);

const reporting = read("src/components/catalyst-one/contacts/reporting-manager-picker.tsx");
assert.match(reporting, /liveSearchOperationalEcmContacts/);
assert.match(reporting, /persistRegisterEcmContact/);

const company = read("src/components/catalyst-one/companies/company-workspace-modal.tsx");
assert.match(company, /liveSearchOperationalEcmContacts/);

const policy = read(
  "src/components/catalyst-one/credit-risk-engine/policy-library/policy-builder-form.tsx",
);
assert.match(policy, /searchActiveLenders/);
assert.doesNotMatch(policy, /getActiveLenders/);

const tasks = read("src/components/catalyst-one/tasks/task-engine-workspace.tsx");
assert.match(tasks, /searchAssignableUsers/);
assert.doesNotMatch(tasks, /Rahul Sharma/);

const qt = read("src/components/catalyst-one/tasks/quick-task-create-modal.tsx");
assert.match(qt, /LiveEntityMasterSearch/);
assert.match(qt, /enterpriseOpportunityApiClient/);
assert.match(qt, /enterpriseDealApiClient/);

assert.ok(
  fs.existsSync(
    path.join(root, "docs/enterprise-lookup-ssot/ENTERPRISE-LOOKUP-SSOT-AUDIT-REPORT.md"),
  ),
);

console.log("enterprise-lookup-ssot verify: PASS");
