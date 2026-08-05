/**
 * CO-CHANAKYA-RADAR-003 — Enterprise Deal Radar (static verify).
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function mustExist(rel) {
  assert.ok(existsSync(join(root, rel)), `Missing: ${rel}`);
}

mustExist("src/lib/chanakya-radar/classify-operational-deal.ts");
mustExist("src/components/catalyst-one/chanakya-radar/radar-status-scroll-card.tsx");
mustExist("docs/co-chanakya-radar-003/CO-CHANAKYA-RADAR-003-READINESS-REPORT.md");

const constants = read("src/constants/chanakya-radar.ts");
assert.match(constants, /CHANAKYA_RADAR_CLASSIFICATION_THRESHOLDS/);
assert.match(constants, /CHANAKYA_RADAR_STATUS_CARD_META/);
assert.match(constants, /CHANAKYA_RADAR_EXCLUDED_DEAL_STAGES/);

const classify = read("src/lib/chanakya-radar/classify-operational-deal.ts");
assert.match(classify, /classifyOperationalDeal/);
assert.match(classify, /CHANAKYA_RADAR_CLASSIFICATION_THRESHOLDS/);
assert.match(classify, /classificationReason/);
assert.match(classify, /recommendation/);

const live = read("src/lib/chanakya-live-intelligence/live-ssot.ts");
assert.match(live, /isLiveActiveLoanFile/);
assert.match(live, /isTerminalLenderBook/);
assert.match(live, /CO-CHANAKYA-RADAR-003/);

const compose = read(
  "server/services/enterprise-metrics-engine/compose-mission-control-snapshot.ts",
);
assert.match(compose, /listActiveRadarDealFiles/);

const visual = read("src/components/catalyst-one/chanakya-radar/chanakya-radar-visual.tsx");
assert.match(visual, /RadarStatusScrollCard/);
assert.match(visual, /AVG DEAL HEALTH/);
assert.match(visual, /onDealOpen/);
assert.ok(!/OperationalMovementFeed/.test(visual), "visual must not use movement feeds");

const cards = read(
  "src/components/catalyst-one/chanakya-radar/radar-status-scroll-card.tsx",
);
assert.match(cards, /co-radar-003-status-rise/);
assert.match(cards, /CHANAKYA_RADAR_STATUS_CARD_META/);

const workspace = read(
  "src/components/catalyst-one/chanakya-radar/chanakya-radar-workspace.tsx",
);
assert.match(workspace, /openDealWorkspace/);
assert.match(workspace, /buildDealWorkspaceHref/);
assert.match(workspace, /Active Deal/);

const dashboard = read("src/lib/chanakya-radar/derive-dashboard.ts");
assert.match(dashboard, /dealHealthScore/);
assert.match(dashboard, /avgDealHealth|Average Deal Health/);

const rule = read(".cursor/rules/chanakya-radar.mdc");
assert.match(rule, /CO-CHANAKYA-RADAR-003/);

console.log("CO-CHANAKYA-RADAR-003 verify: OK");
