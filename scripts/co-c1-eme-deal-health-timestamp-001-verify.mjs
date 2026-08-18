/**
 * CO-C1-EME-DEAL-HEALTH-TIMESTAMP-001
 * Nightly/force EME health calculation must not mutate Deal updatedAt.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function mustContain(rel, needle, label = needle) {
  if (!read(rel).includes(needle)) failures.push(`${rel} missing ${label}`);
}

function mustNotContain(rel, needle, label = needle) {
  if (read(rel).includes(needle)) failures.push(`${rel} must not contain ${label}`);
}

const eme = "server/services/enterprise-metrics-engine/index.ts";
const persist = "server/services/enterprise-metrics-engine/deal-health-persist.ts";
const serialize = "server/services/enterprise-deal/deal-serialize.ts";
const runtime = "src/lib/enterprise-deal/deal-pipeline-runtime.ts";
const pdcConstants = "src/constants/post-disbursement-confirmation.ts";
const repository =
  "server/repositories/enterprise-deal/enterprise-deal.repository.ts";
const pdcService =
  "server/services/post-disbursement-confirmation/post-disbursement-confirmation.service.ts";

mustContain(persist, "shouldComputeDealHealthProxy", "compute policy");
mustContain(persist, "shouldPersistDealHealthOnDealRow", "Deal-row persist policy");
mustContain(eme, "shouldComputeDealHealthProxy", "EME uses compute policy");
mustContain(eme, "shouldPersistDealHealthOnDealRow", "EME uses persist policy");
mustContain(eme, "computeDealHealthProxyScore", "EME uses shared Phase-1 proxy");
mustContain(eme, "const days = deal.daysInStage ?? 0", "EME snapshot still uses stored daysInStage");
mustContain(eme, "metricKey: \"deal.health\"", "health snapshots still queued");
mustContain(eme, "enterpriseMetricSnapshot.upsert", "metric snapshots still written");
mustContain(
  eme,
  "if (!dryRun && persistOnDealRow)",
  "Deal-row health write gated",
);
mustContain(
  eme,
  "Deal health proxy snapshot only — Deal row timestamps not mutated.",
  "nightly/force snapshot-only note",
);
mustNotContain(
  eme,
  'if (keysWanted.has("deal.health") || input.runType !== "event_refresh")',
  "ungated nightly Deal-row health write",
);
mustNotContain(
  eme,
  "Math.max(5, Math.min(98, 85 - Math.min(days, 60)))",
  "inline formula copy after shared extract",
);

mustContain(serialize, "disbursedAt: iso(deal.disbursedAt)", "Disbursed API field");
mustContain(runtime, "disbursedAt: deal.disbursedAt ?? null", "Kanban mapping");
mustContain(
  pdcConstants,
  "POST_DISBURSEMENT_CONFIRMATION_DELAY_HOURS = 72",
  "PDC delay unchanged",
);
mustContain(
  repository,
  "POST_DISBURSEMENT_CONFIRMATION_DELAY_HOURS * 60 * 60 * 1000",
  "PDC dueAt from Disbursed transition now",
);
mustContain(
  repository,
  "enteringDisbursed && !deal.disbursedAt ? { disbursedAt: now }",
  "first-entry disbursedAt",
);
mustNotContain(pdcService, "dueAt: deal.updatedAt", "PDC must not use updatedAt");

const {
  shouldComputeDealHealthProxy,
  shouldPersistDealHealthOnDealRow,
} = await import(
  "../server/services/enterprise-metrics-engine/deal-health-persist.ts"
);

const empty = new Set();
const healthKeys = new Set(["deal.health"]);

function expect(name, condition) {
  if (!condition) failures.push(name);
}

expect(
  "nightly_snapshot computes health snapshots",
  shouldComputeDealHealthProxy("nightly_snapshot", empty) === true,
);
expect(
  "nightly_snapshot does not persist onto Deal row",
  shouldPersistDealHealthOnDealRow("nightly_snapshot", empty) === false,
);
expect(
  "force_recalculate computes health snapshots",
  shouldComputeDealHealthProxy("force_recalculate", healthKeys) === true,
);
expect(
  "force_recalculate does not persist onto Deal row",
  shouldPersistDealHealthOnDealRow("force_recalculate", healthKeys) === false,
);
expect(
  "dry_run computes health snapshots",
  shouldComputeDealHealthProxy("dry_run", empty) === true,
);
expect(
  "dry_run does not persist onto Deal row",
  shouldPersistDealHealthOnDealRow("dry_run", empty) === false,
);
expect(
  "event_refresh with deal.health still computes",
  shouldComputeDealHealthProxy("event_refresh", healthKeys) === true,
);
expect(
  "event_refresh with deal.health still persists reserved Deal columns",
  shouldPersistDealHealthOnDealRow("event_refresh", healthKeys) === true,
);
expect(
  "event_refresh without deal.health does not compute health proxy",
  shouldComputeDealHealthProxy("event_refresh", empty) === false,
);
expect(
  "event_refresh without deal.health does not persist Deal row",
  shouldPersistDealHealthOnDealRow("event_refresh", empty) === false,
);

if (failures.length) {
  console.error("CO-C1-EME-DEAL-HEALTH-TIMESTAMP-001 VERIFY FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-C1-EME-DEAL-HEALTH-TIMESTAMP-001 VERIFY PASS");
console.log(
  JSON.stringify(
    {
      nightlyPersistsDealRow: shouldPersistDealHealthOnDealRow(
        "nightly_snapshot",
        empty,
      ),
      forcePersistsDealRow: shouldPersistDealHealthOnDealRow(
        "force_recalculate",
        healthKeys,
      ),
      eventRefreshPersistsDealRow: shouldPersistDealHealthOnDealRow(
        "event_refresh",
        healthKeys,
      ),
      nightlyComputesSnapshots: shouldComputeDealHealthProxy(
        "nightly_snapshot",
        empty,
      ),
    },
    null,
    2,
  ),
);
