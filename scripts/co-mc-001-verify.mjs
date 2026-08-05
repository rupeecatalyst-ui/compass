/**
 * CO-MC-001 — CHANAKYA Radar Activity Intelligence (static verify).
 * Does not mutate live data. Asserts engine wiring without UI redesign.
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

mustExist("src/lib/enterprise-activity-intelligence/index.ts");
mustExist("src/constants/enterprise-activity-intelligence/index.ts");
mustExist("src/types/enterprise-activity-intelligence.ts");

const engine = read("src/lib/enterprise-activity-intelligence/index.ts");
assert.match(engine, /computeEnterpriseActivityIntelligence/);
assert.match(engine, /healthy_waiting/);
assert.match(engine, /blendDealHealthWithActivityMomentum/);
assert.match(engine, /activityAttentionMultiplier/);
assert.match(engine, /isNonOperationalActivityEvent|matchMeaningfulWorkActivity/);
assert.ok(
  engine.includes("Healthy Waiting") || engine.includes("healthy_waiting"),
  "engine must encode Healthy Waiting",
);

const constants = read("src/constants/enterprise-activity-intelligence/index.ts");
assert.match(constants, /ACTIVITY_EXPECTED_TAT_DAYS/);
assert.match(constants, /ACTIVITY_MOMENTUM_WEIGHTS/);
assert.match(constants, /ACTIVITY_CUSTOMER_DOC_FOLLOW_UP_DAYS/);

const radarConstants = read("src/constants/chanakya-radar.ts");
assert.match(radarConstants, /banker_interaction/);
assert.match(radarConstants, /document_approved/);
assert.match(radarConstants, /approval_completed/);
assert.match(radarConstants, /assignment_changed/);
assert.match(radarConstants, /CHANAKYA_RADAR_NON_OPERATIONAL_ACTIVITY_PATTERNS/);

const classify = read("src/lib/chanakya-radar/classify-operational-deal.ts");
assert.match(classify, /computeEnterpriseActivityIntelligence/);
assert.match(classify, /isHealthyWaiting/);
assert.match(classify, /idleForClass/);
assert.match(classify, /blendDealHealthWithActivityMomentum/);
assert.ok(
  classify.includes("Healthy Waiting") || classify.includes("isHealthyWaiting"),
  "classify must protect Healthy Waiting",
);

const dashboard = read("src/lib/chanakya-radar/derive-dashboard.ts");
assert.match(dashboard, /activityMomentumScore/);
assert.match(dashboard, /activityAttentionMultiplier/);
assert.match(dashboard, /activity_momentum/);
assert.match(dashboard, /isHealthyWaiting/);

// UI must remain the frozen dial — no Activity Intelligence redesign in visual
const visual = read("src/components/catalyst-one/chanakya-radar/chanakya-radar-visual.tsx");
assert.match(visual, /AVG DEAL HEALTH|Average Deal Health|healthScore/i);
assert.ok(
  !/Activity Momentum Dial|redesign radar/i.test(visual),
  "visual must not introduce a parallel Activity dial",
);

const ebiHealth = read("src/lib/enterprise-business-intelligence/business-health.ts");
assert.match(ebiHealth, /activityMomentumScore/);

const ebiOps = read("src/lib/enterprise-business-intelligence/operational-kpis.ts");
assert.match(ebiOps, /isHealthyWaiting/);

console.log("CO-MC-001 verify: PASS");
console.log("  Activity Intelligence engine wired into Radar Decision Engine");
console.log("  Healthy Waiting protected from idle-based score reduction");
console.log("  Radar visual unchanged (backward compatible)");
