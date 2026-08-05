/**
 * CO-BUG-TASK-ENTITY-LINK — Task Link To registry lookups.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const picker = read("src/components/catalyst-one/tasks/task-entity-link-picker.tsx");
assert.match(picker, /LiveEntityMasterSearch/);
assert.match(picker, /enterpriseOpportunityApiClient/);
assert.match(picker, /enterpriseDealApiClient/);
assert.match(picker, /searchOpportunities/);
assert.match(picker, /searchDeals/);
assert.match(picker, /Enterprise Contact Registry/);
assert.match(picker, /Enterprise Opportunity Registry/);
assert.match(picker, /Enterprise Deal Registry/);

const modal = read("src/components/catalyst-one/tasks/quick-task-create-modal.tsx");
assert.match(modal, /TaskEntityLinkPicker/);
assert.match(modal, /Link To is required/);
assert.match(modal, /linkedEntity\.id|linkedEntity\?\.kind/);
assert.match(modal, /entityId/);
assert.doesNotMatch(modal, /future search wiring/);

const dealClient = read("src/lib/enterprise-deal/deal-api-client.ts");
assert.match(dealClient, /if \(query\.q\?\.trim\(\)\) params\.set\("q"/);

const workspace = read("src/components/catalyst-one/tasks/enterprise-tasks-workspace.tsx");
assert.match(workspace, /allowEntityPicker/);

console.log("CO-BUG-TASK-ENTITY-LINK verify: PASS");
