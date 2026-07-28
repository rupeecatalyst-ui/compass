/**

 * CO-ARCH-007 — CHANAKYA Day/Night + Radar snapshot consumer engineering gate.

 * Run: node scripts/co-arch-007-chanakya-intelligence-verify.mjs

 */



import assert from "node:assert/strict";

import fs from "node:fs";

import path from "node:path";

import { fileURLToPath } from "node:url";



const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");



assert.match(read("src/constants/chanakya-operating-model.ts"), /CHANAKYA_PHILOSOPHY_QUOTE/);

assert.match(read("src/constants/chanakya-operating-model.ts"), /resolveChanakyaOperatingMode/);

assert.match(read("src/constants/manual-lender-selection.ts"), /MANUAL_LENDER_SELECTION_FORBIDDEN/);

assert.match(read("src/constants/enterprise-processing-architecture.ts"), /PROCESSING_TIER_4/);

assert.match(read("src/constants/enterprise-processing-architecture.ts"), /TIER4_SNAPSHOT_CONSUMERS/);



assert.match(

  read("server/services/enterprise-metrics-engine/compose-mission-control-snapshot.ts"),

  /dashboard: radar/,

);

assert.match(

  read("server/services/enterprise-metrics-engine/index.ts"),

  /setChanakyaNightSchedule/,

);

assert.match(read("src/app/api/enterprise-metrics/radar/route.ts"), /EME_MISSION_CONTROL_RADAR_KEY/);

assert.match(

  read("src/lib/chanakya-radar/load-certified-radar-snapshot.ts"),

  /loadCertifiedRadarSnapshot/,

);



const radarWs = read("src/components/catalyst-one/chanakya-radar/chanakya-radar-workspace.tsx");

assert.match(radarWs, /loadCertifiedRadarSnapshot/);

assert.match(radarWs, /ChanakyaRadarSnapshotChrome/);

assert.ok(

  !/buildChanakyaRadarDashboard\s*\(/.test(radarWs),

  "Radar workspace must not live-build dashboard on page load",

);

assert.ok(

  !/hydrateRadarDealFiles/.test(radarWs),

  "Radar workspace must not hydrate full deal book for intelligence on open",

);



assert.match(

  read("src/components/catalyst-one/chanakya-radar/chanakya-radar-snapshot-chrome.tsx"),

  /CHANAKYA_PHILOSOPHY_QUOTE/,

);

assert.match(

  read("src/app/api/admin/enterprise-metrics/route.ts"),

  /set_chanakya_night_schedule/,

);

assert.match(

  read("src/components/catalyst-one/admin/enterprise-metrics/enterprise-metrics-admin-panel.tsx"),

  /CHANAKYA Night Mode/,

);

assert.match(

  read("src/lib/enterprise-deal/deal-pipeline-runtime.ts"),

  /createManualLenderSelectionIntent/,

);



// CO-ARCH-005 must remain intact

assert.match(

  read("src/mission-control/executive-briefing/services.ts"),

  /loadCertifiedEbiSnapshot/,

);

assert.ok(

  !/composeBusinessIntelligenceSnapshot\s*\(/.test(

    read("src/mission-control/executive-briefing/services.ts"),

  ),

  "Mission Control must not regress to live EBI compose",

);



console.log(

  "CO-ARCH-007 CHANAKYA Day/Night + Radar snapshot verify PASS (engineering gate — BAT/RUM still required).",

);


