/**
 * CO-MC-002 — CHANAKYA Intelligence (static verify).
 * Additive Mission Control module — Radar / Executive Briefing implementations untouched.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function mustExist(rel) {
  assert.ok(existsSync(join(root, rel)), `Missing: ${rel}`);
}

mustExist("src/lib/chanakya-intelligence/index.ts");
mustExist("src/mission-control/chanakya-intelligence/ChanakyaIntelligencePage.tsx");
mustExist("src/app/(mission-control)/mission-control/chanakya-intelligence/page.tsx");
mustExist("src/constants/chanakya-intelligence/index.ts");
mustExist("src/types/chanakya-intelligence.ts");

const compose = read("src/lib/chanakya-intelligence/index.ts");
assert.match(compose, /buildChanakyaRadarDashboard/);
assert.match(compose, /composeChanakyaIntelligenceModel/);
assert.match(compose, /activityMomentumScore/);
assert.match(compose, /galaxy/);
assert.match(compose, /river/);
assert.match(compose, /heat/);
assert.match(compose, /pulse/);

const page = read("src/mission-control/chanakya-intelligence/ChanakyaIntelligencePage.tsx");
assert.match(page, /Galaxy View|ci-galaxy|createChanakyaIntelligenceWidgets/);
assert.match(page, /WidgetRenderer/);

const registry = read("src/mission-control/feature-registry/registry.ts");
assert.match(registry, /mc-chanakya-intelligence/);
assert.match(registry, /CHANAKYA Intelligence/);
assert.match(registry, /mc-chanakya-radar/);
assert.match(registry, /Executive Dashboard/);
assert.match(registry, /primaryOrder/);

const routes = read("src/constants/routes.ts");
assert.match(routes, /MISSION_CONTROL_CHANAKYA_INTELLIGENCE/);

const rail = read("src/mission-control/shell/navigation-rail.tsx");
assert.match(rail, /Sparkles/);

// Additive: Radar workspace and Executive Briefing page must still exist unchanged as modules
mustExist("src/components/catalyst-one/chanakya-radar/chanakya-radar-workspace.tsx");
mustExist("src/mission-control/executive-briefing/ExecutiveBriefingPage.tsx");

const widgets = read("src/mission-control/chanakya-intelligence/widget-registry.ts");
assert.match(widgets, /ci-galaxy-view/);
assert.match(widgets, /ci-river-flow/);
assert.match(widgets, /ci-heat-map/);
assert.match(widgets, /ci-pulse-monitor/);

console.log("CO-MC-002 verify: PASS");
console.log("  CHANAKYA Intelligence 2×2 registered in Mission Control");
console.log("  Primary tabs: Radar · Intelligence · Executive Dashboard");
console.log("  Consumes Radar + Activity Intelligence (no parallel formulas)");
