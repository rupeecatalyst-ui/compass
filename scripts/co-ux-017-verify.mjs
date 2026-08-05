/**
 * CO-UX-017 — Enterprise Deal Control Panel (static gates).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const required = [
  "src/components/catalyst-one/execution/deal-control-panel.tsx",
  "docs/co-ux-017/CO-UX-017-DEAL-CONTROL-PANEL-READINESS-REPORT.md",
];
for (const rel of required) {
  assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
}

const panel = read("src/components/catalyst-one/execution/deal-control-panel.tsx");
assert.match(panel, /Deal Control/);
assert.match(panel, /Primary Deal Information/);
assert.match(panel, /Lender Sales Contact/);
assert.match(panel, /LenderSalesContactCapture/);
assert.match(panel, /Participants/);
assert.match(panel, /Quick Actions/);
assert.match(panel, /EnterpriseActivityComposer/);
assert.match(panel, /Recent Timeline/);
assert.match(panel, /Strategic Analysis/);
assert.match(panel, /listConversationActivities/);
assert.match(panel, /Save Deal Fields/);
assert.ok(!/Relationship Score/i.test(panel), "Must not invent Relationship Score");

const board = read("src/components/catalyst-one/execution/lender-pipeline-board.tsx");
assert.match(board, /DealControlPanel/);
assert.match(board, /Deal Control/);
assert.ok(!board.includes("View Strategy"), "Kanban CTA must be Deal Control");

const runtime = read("src/lib/enterprise-deal/deal-pipeline-runtime.ts");
assert.match(runtime, /lenderSalesContactId/);
assert.match(runtime, /loginDate/);
assert.match(runtime, /CO-UX-017/);

const legacy = read("src/components/catalyst-one/execution/lender-strategy-drawer.tsx");
assert.match(legacy, /DealControlPanel/);

console.log("CO-UX-017 verify: PASS");
