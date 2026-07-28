/**
 * CO-ARCH-003 — Processing tiers engineering gate.
 * Run: node scripts/co-arch-003-processing-tiers-verify.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const constants = read("src/constants/enterprise-processing-architecture.ts");
assert.match(constants, /PROCESSING_TIER_1/);
assert.match(constants, /TIER1_TARGETS_SECONDS/);
assert.match(constants, /move_to_deal/);

const eme = read("src/app/api/enterprise-metrics/dashboard/route.ts");
assert.match(eme, /warming: true/);
assert.doesNotMatch(eme, /const warmed = await enterpriseMetricsEngineService\.forceRecalculate/);

const repo = read("server/repositories/enterprise-deal/enterprise-deal.repository.ts");
assert.match(repo, /scheduleTier2Work/);
assert.match(repo, /return updated/);

const service = read("server/services/enterprise-deal/enterprise-deal.service.ts");
assert.match(service, /scheduleTier2Work/);

const client = read("src/lib/enterprise-deal/deal-api-client.ts");
assert.match(client, /queueMicrotask/);

const arrivals = read(
  "src/components/catalyst-one/user-home-dashboard/new-arrivals-section.tsx",
);
assert.doesNotMatch(arrivals, /await hydrateEcmFromPrisma/);

const ow = read(
  "src/components/catalyst-one/opportunity-workspace/opportunity-workspace-context.tsx",
);
assert.match(ow, /scheduleClientDeferredWork/);

const vercel = read("vercel.json");
assert.match(vercel, /enterprise-metrics/);
assert.match(vercel, /0 2 \* \* \*/);

const rule = read(".cursor/rules/enterprise-processing-architecture.mdc");
assert.match(rule, /CO-ARCH-003/);

console.log(
  "CO-ARCH-003 processing tiers verify PASS (engineering gate — BAT/RUM still required).",
);
