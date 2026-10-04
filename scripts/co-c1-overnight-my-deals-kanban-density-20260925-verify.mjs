/**
 * Item M — My Deals Kanban density (presentation only, no DB).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MY_DEALS_WORKSPACE_VIEWS } from "../src/constants/my-deals.ts";
import {
  MY_DEALS_KANBAN_OPERATIONAL_DENSITY,
  MY_DEALS_KANBAN_DEFAULT_FIELD_IDS,
} from "../src/constants/my-deals-kanban.ts";
import { MY_DEALS_KANBAN_LENDER_CTA } from "../src/lib/my-deals/kanban-cta.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function expect(name, condition) {
  if (condition) console.log(`PASS  ${name}`);
  else {
    failures.push(name);
    console.log(`FAIL  ${name}`);
  }
}

const workspace = "src/components/catalyst-one/my-deals/my-deals-workspace.tsx";
const toolbar = "src/components/catalyst-one/my-deals/my-deals-registry-toolbar.tsx";
const board = "src/components/catalyst-one/my-deals/my-deals-kanban-board.tsx";
const card = "src/components/catalyst-one/my-deals/my-deals-kanban-card.tsx";
const stages = "src/components/catalyst-one/my-deals/my-deals-kanban-stage-filter.tsx";
const fields = "src/components/catalyst-one/my-deals/my-deals-kanban-fields-control.tsx";
const grouping = "src/lib/my-deals/kanban-board.ts";
const filtersLib = "src/lib/my-deals/deal-registry.ts";
const cta = "src/lib/my-deals/kanban-cta.ts";

expect("official views remain Deals / Kanban", MY_DEALS_WORKSPACE_VIEWS.length === 2);
expect("density token is presentation-only", MY_DEALS_KANBAN_OPERATIONAL_DENSITY === "operational-compact");
expect("Kanban Fields defaults unchanged", MY_DEALS_KANBAN_DEFAULT_FIELD_IDS.includes("assignedRcEmployee"));
expect("lender CTA copy unchanged", MY_DEALS_KANBAN_LENDER_CTA === "Open Lender Workflow");

expect("workspace still filters via Deal Registry helper", read(workspace).includes("filterDealRegistryRows"));
expect("workspace still renders Deals / Kanban switch", read(workspace).includes("MY_DEALS_WORKSPACE_VIEWS"));
expect("workspace still uses Kanban prefs persist", read(workspace).includes("persistKanban"));
expect("toolbar still exposes Filters", read(toolbar).includes("Filters"));
expect("toolbar still exposes Clear", read(toolbar).includes("Clear"));
expect("toolbar still exposes Search", read(toolbar).includes("Search customer, opportunity, lender"));
expect("toolbar still exposes Product / Lender / Source", read(toolbar).includes("All Products") && read(toolbar).includes("All Lenders") && read(toolbar).includes("All Sources"));

expect("board keeps horizontal overflow-x-auto", read(board).includes("overflow-x-auto"));
expect("board keeps independent overflow-y-auto", read(board).includes("overflow-y-auto"));
expect("board remains viewport flex-1", read(board).includes("flex min-h-0 flex-1"));
expect("board uses operational density token", read(board).includes("MY_DEALS_KANBAN_OPERATIONAL_DENSITY"));
expect("stage Select All / Clear All / Restore Default remain", read(stages).includes("Select All") && read(stages).includes("Clear All") && read(stages).includes("Restore Default"));
expect("Kanban Fields control remains", read(fields).includes("Kanban Fields"));

expect("card keeps borrower / lender / product / amount", read(card).includes("borrowerName") && read(card).includes("LenderLogo") && read(card).includes("row.product") && read(card).includes("loanAmountLabel"));
expect("card keeps Advantage", read(card).includes("advantage-committed"));
expect("card keeps Call / Email / WhatsApp / Activity / Follow-up", ["Call", "Email", "WhatsApp", "Activity", "Follow-up"].every((label) => read(card).includes(label)));
expect("card still uses stage-sensitive CTA helper", read(card).includes("resolveMyDealsKanbanCta"));

expect("grouping SSOT file has no presentation density rewrite", !read(grouping).includes("operational-compact"));
expect("filter semantics file untouched by density work", !read(filtersLib).includes("operational-compact"));
expect("CTA helper file untouched by density work", !read(cta).includes("operational-compact"));

if (failures.length) {
  console.error(`\nItem M verify FAIL (${failures.length})\n${failures.map((f) => ` - ${f}`).join("\n")}`);
  process.exit(1);
}
console.log("\nItem M verify PASS — presentation/layout only.");
