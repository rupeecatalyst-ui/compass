/**
 * CO-ARCH-002 — Strategy Workbench max-2 shortlist (engineering gate).
 * Run: node scripts/co-arch-002-strategy-shortlist-verify.mjs
 *
 * Does not replace BAT scenarios 1–4 in the browser.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const constants = read("src/constants/strategic-lender-shortlist.ts");
assert.match(constants, /STRATEGY_SHORTLIST_MAX_LENDERS\s*=\s*2/);
assert.match(
  constants,
  /Only two lenders can be shortlisted during Strategy/,
);

const sync = read("src/lib/strategic-lender-pipeline/sync.ts");
assert.match(sync, /StrategicShortlistLimitError/);
assert.match(sync, /STRATEGY_SHORTLIST_MAX_LENDERS/);
assert.match(sync, /takeStrategyShortlistForMoveToDeal/);
assert.match(sync, /enforceStrategicShortlistMax/);

const move = read("src/lib/strategic-lender-pipeline/move-to-deal.ts");
assert.match(move, /takeStrategyShortlistForMoveToDeal/);
assert.match(move, /enforceStrategicShortlistMax/);

const board = read(
  "src/components/catalyst-one/opportunity-workspace/workspace-life-strategy-board.tsx",
);
assert.match(board, /isStrategicShortlistAtLimit/);
assert.match(board, /STRATEGY_SHORTLIST_LIMIT_GUIDANCE/);
assert.match(board, /strategyShortlistChoiceLabel/);
assert.match(board, /Shortlist full/);

const pipeline = read("src/lib/enterprise-deal/deal-pipeline-runtime.ts");
assert.match(pipeline, /identifyLenderAsEnterpriseDeal/);
assert.doesNotMatch(
  pipeline,
  /STRATEGY_SHORTLIST_MAX_LENDERS/,
  "Deal Workspace must remain uncapped",
);

console.log("CO-ARCH-002 strategy shortlist verify PASS (engineering gate only — run BAT 1–4 on live app).");
