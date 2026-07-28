/**
 * CO-ARCH-005 — Mission Control Snapshot engineering gate.
 * Run: node scripts/co-arch-005-mission-control-snapshot-verify.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

assert.match(read("src/constants/mission-control-snapshot.ts"), /EME_MISSION_CONTROL_SNAPSHOT_KEY/);
assert.match(read("src/constants/mission-control-snapshot.ts"), /Every 2 hours/);

assert.match(
  read("server/services/enterprise-metrics-engine/compose-mission-control-snapshot.ts"),
  /composeMissionControlExecutiveSnapshot/,
);
assert.match(
  read("server/services/enterprise-metrics-engine/index.ts"),
  /EME_MISSION_CONTROL_SNAPSHOT_KEY/,
);
assert.match(
  read("server/services/enterprise-metrics-engine/index.ts"),
  /setMissionControlSchedule/,
);

assert.match(
  read("src/app/api/enterprise-metrics/mission-control/route.ts"),
  /EME_MISSION_CONTROL_SNAPSHOT_KEY/,
);
assert.match(
  read("src/app/api/admin/enterprise-metrics/route.ts"),
  /set_mission_control_schedule/,
);

const briefingServices = read("src/mission-control/executive-briefing/services.ts");
assert.match(briefingServices, /loadCertifiedEbiSnapshot/);
assert.match(briefingServices, /awaiting_snapshot/);
assert.ok(
  !/composeBusinessIntelligenceSnapshot\s*\(/.test(briefingServices),
  "Mission Control must not live-compose EBI on page load",
);
assert.match(
  read("server/services/enterprise-metrics-engine/index.ts"),
  /isMissionControlRefreshDue/,
);
assert.match(read("src/app/api/cron/enterprise-metrics/route.ts"), /isMissionControlRefreshDue/);
assert.match(read("vercel.json"), /30 20 \* \* \*/);
assert.match(
  read("src/mission-control/executive-briefing/ExecutiveBriefingPage.tsx"),
  /MissionControlSnapshotBanner/,
);
assert.match(
  read("src/components/catalyst-one/admin/enterprise-metrics/enterprise-metrics-admin-panel.tsx"),
  /Mission Control Snapshot Schedule/,
);
assert.match(
  read("src/config/navigation.ts"),
  /MISSION_CONTROL_EXECUTIVE_BRIEFING/,
);

console.log(
  "CO-ARCH-005 Mission Control Snapshot verify PASS (engineering gate — BAT/RUM still required).",
);
