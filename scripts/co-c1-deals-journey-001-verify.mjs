/**
 * CO-C1-DEALS-JOURNEY-001 — static structural verify (no deploy / no data mutation).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

for (const rel of [
  "src/components/catalyst-one/my-deals/deal-lender-journey-board.tsx",
  "src/components/catalyst-one/my-deals/opportunity-lender-journey-card.tsx",
  "src/components/catalyst-one/my-deals/lender-journey-railway.tsx",
  "src/lib/my-deals/lender-deal-contact.ts",
  "docs/co-c1-deals-journey-001/CO-C1-DEALS-JOURNEY-001-REPORT.md",
]) {
  assert.ok(exists(rel), `missing ${rel}`);
}

const workspace = read("src/components/catalyst-one/my-deals/my-deals-workspace.tsx");
assert.match(workspace, /DealLenderJourneyBoard/);
assert.match(workspace, /buildOpportunityWorkspaceEntryHref/);
assert.match(workspace, /openDealWorkspace/);
assert.ok(!workspace.includes("<OpportunityDealRegistry"));

const board = read(
  "src/components/catalyst-one/my-deals/deal-lender-journey-board.tsx",
);
assert.match(board, /groupDealRowsByOpportunity/);
assert.match(board, /filterDealRegistryRows/);
assert.match(board, /OpportunityLenderJourneyCard/);
assert.ok(!/create table|INSERT INTO|prisma\./i.test(board));

const card = read(
  "src/components/catalyst-one/my-deals/opportunity-lender-journey-card.tsx",
);
assert.match(card, /LenderJourneyRailway/);
assert.match(card, /resolveLenderDealContactName/);
assert.match(card, /Unassigned/);
assert.match(card, /Workspace/);

const railway = read(
  "src/components/catalyst-one/my-deals/lender-journey-railway.tsx",
);
assert.match(railway, /ENTERPRISE_JOURNEY_SEGMENTS/);
assert.match(railway, /deriveJourneyProgressSegments/);

const contact = read("src/lib/my-deals/lender-deal-contact.ts");
assert.match(contact, /Unassigned/);
assert.ok(!contact.includes("Demo"));

const nav = read("src/config/navigation.ts");
assert.match(nav, /MY_DEALS/);
assert.match(nav, /My Deals/);

console.log("CO-C1-DEALS-JOURNEY-001 verify: PASS");
console.log("My Deals → Lender Journey board; no new entity; OW + Deal workspace hrefs");
console.log("NOTE: No Vercel deploy / no Wealth Partner App / no production data mutation.");
