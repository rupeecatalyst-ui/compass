#!/usr/bin/env node
/** COMPASS Advantage — C1 engine boundary. No COMPASS-local commercial formula. */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const banned = /0\.0045|0\.0055|ltvFactor|incomeFactor|baseRate|INDICATIVE_BPS|COMPASS_ADVANTAGE_MIN_AMOUNT|COMPASS_ADVANTAGE_MAX_AMOUNT/;

const engineFiles = [
  "server/services/compass-customer-gateway/compass-advantage.service.ts",
  "src/constants/compass-advantage/schedule.ts",
  "src/lib/compass-advantage/calculate.ts",
];
for (const rel of engineFiles) {
  assert.ok(existsSync(join(root, rel)), rel);
  assert.doesNotMatch(readFileSync(join(root, rel), "utf8"), banned);
}

assert.match(
  readFileSync(join(root, "server/services/compass-customer-gateway/compass-advantage.service.ts"), "utf8"),
  /resolveCompassAdvantageForOpportunity/,
);
assert.doesNotMatch(
  readFileSync(join(root, "compass/src/services/catalyst-one/client.ts"), "utf8"),
  /0\.003|INDICATIVE_BPS|2_50_000/,
);

console.log("CO-COMPASS-ADVANTAGE-BOUNDARY verify: PASS");
