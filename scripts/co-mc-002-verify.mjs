/**
 * CO-MC-002 — Static verify for Mission Control Enterprise Intelligence.
 * Run: node scripts/co-mc-002-verify.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

for (const rel of [
  "src/constants/mission-control-enterprise-intelligence.ts",
  "src/types/mission-control-enterprise-intelligence.ts",
  "src/lib/mission-control-enterprise-intelligence/derive-sections.ts",
  "src/mission-control/enterprise-intelligence/EnterpriseIntelligencePlatform.tsx",
  "docs/co-mc-002/CO-MC-002-MISSION-CONTROL-ENTERPRISE-INTELLIGENCE-READINESS-REPORT.md",
]) {
  assert.ok(exists(rel), `missing ${rel}`);
}

const constants = read("src/constants/mission-control-enterprise-intelligence.ts");
assert.match(constants, /MISSION_CONTROL_ANALYTICS_REFRESH_CRON/);
assert.match(constants, /30 20 \* \* \*/);
assert.match(constants, /executive_summary/);
assert.match(constants, /ai_executive/);
assert.match(constants, /wealth_partner/);

const compose = read(
  "server/services/enterprise-metrics-engine/compose-mission-control-snapshot.ts",
);
assert.match(compose, /deriveMissionControlEnterpriseIntelligence/);
assert.match(compose, /intelligence/);
assert.match(compose, /CO-MC-002/);

const eme = read("server/services/enterprise-metrics-engine/index.ts");
assert.match(eme, /opportunities:/);
assert.match(eme, /composeMissionControlExecutiveSnapshot/);

const services = read("src/mission-control/executive-briefing/services.ts");
assert.match(services, /enterpriseIntelligence/);
assert.match(services, /intelligence/);
assert.ok(
  !/deriveMissionControlEnterpriseIntelligence\s*\(/.test(services),
  "MC page must not derive intelligence live",
);
assert.ok(
  !/composeMissionControlExecutiveSnapshot\s*\(/.test(services),
  "MC page must not compose snapshot live",
);

const page = read("src/mission-control/executive-briefing/ExecutiveBriefingPage.tsx");
assert.match(page, /EnterpriseIntelligencePlatform/);
assert.ok(!/BusinessPerformanceSection/.test(page), "two-column Business Performance must be retired from primary layout");
assert.ok(!/lg:grid-cols-2/.test(page));

assert.match(read("vercel.json"), /30 20 \* \* \*/);
assert.match(
  read("src/constants/mission-control-snapshot.ts"),
  /30 20 \* \* \*/,
);

console.log("CO-MC-002 Mission Control Enterprise Intelligence verify: PASS");
