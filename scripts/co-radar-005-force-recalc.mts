/**
 * CO-RADAR-005 — Force EME Radar/MC snapshot recalculation after timeline hydration fix.
 * DIAGNOSTIC WRITE: refreshes certified snapshot only — does not mutate Deal Timeline SSOT.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const { enterpriseMetricsEngineService } = await import(
  "../server/services/enterprise-metrics-engine/index.ts"
);
const {
  EME_MISSION_CONTROL_RADAR_KEY,
  EME_MISSION_CONTROL_SNAPSHOT_KEY,
} = await import("../src/constants/enterprise-metrics-engine.ts");

const result = await enterpriseMetricsEngineService.forceRecalculate({
  triggerSource: "co-radar-005-force",
  actorUserId: "co-radar-005",
  metricKeys: [EME_MISSION_CONTROL_SNAPSHOT_KEY, EME_MISSION_CONTROL_RADAR_KEY],
});

const dir = resolve(process.cwd(), "docs/co-radar-005");
mkdirSync(dir, { recursive: true });
writeFileSync(
  resolve(dir, "CO-RADAR-005-FORCE-RECALC-RESULT.json"),
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
