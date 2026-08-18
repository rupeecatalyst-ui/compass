/**
 * CO-C1-KANBAN-DEAL-HEALTH-001
 * Lender Pipeline Kanban Deal Health is a read-time Phase-1 proxy from
 * stageEnteredAt. No Deal-row persistence. No snapshot join.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dealToLenderExecution } from "../src/lib/enterprise-deal/deal-pipeline-runtime.ts";
import {
  computeDealHealthProxyScore,
  resolveKanbanDealHealthScore,
} from "../src/lib/enterprise-metrics-engine/deal-health-proxy.ts";
import { dealHealthScoreKanbanTone } from "../src/constants/lender-pipeline.ts";

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

function expect(name, condition) {
  if (!condition) failures.push(name);
}

const eme = "server/services/enterprise-metrics-engine/index.ts";
const persist = "server/services/enterprise-metrics-engine/deal-health-persist.ts";
const runtime = "src/lib/enterprise-deal/deal-pipeline-runtime.ts";
const proxy = "src/lib/enterprise-metrics-engine/deal-health-proxy.ts";
const kanban = "src/components/catalyst-one/execution/lender-pipeline-board.tsx";

mustContain(proxy, "export function computeDealHealthProxyScore", "shared score function");
mustContain(eme, "computeDealHealthProxyScore", "EME uses shared proxy");
mustContain(eme, "const days = deal.daysInStage ?? 0", "EME still uses stored daysInStage");
mustContain(eme, 'metricKey: "deal.health"', "health snapshots still queued");
mustContain(eme, "if (!dryRun && persistOnDealRow)", "Deal-row health write gated");
mustContain(persist, "shouldPersistDealHealthOnDealRow", "persist policy present");
mustContain(runtime, "resolveKanbanDealHealthScore", "Kanban mapping uses read-time resolve");
mustContain(runtime, "stageEnteredAt: deal.stageEnteredAt", "Kanban ageing from stageEnteredAt");
mustContain(kanban, "dealHealthScoreKanbanTone(caseExecution.dealHealthScore)", "Kanban tone unchanged");

mustNotContain(
  eme,
  "Math.max(5, Math.min(98, 85 - Math.min(days, 60)))",
  "second inline EME formula copy",
);

const runtimeSrc = read(runtime);
const healthStart = runtimeSrc.indexOf("dealHealthScore: resolveKanbanDealHealthScore");
const healthEnd = runtimeSrc.indexOf("identifiedAt:");
if (healthStart < 0 || healthEnd < 0 || healthEnd <= healthStart) {
  failures.push("Kanban health mapping block not found");
} else {
  const healthBlock = runtimeSrc.slice(healthStart, healthEnd);
  if (
    healthBlock.includes("updatedAt") ||
    healthBlock.includes("createdAt") ||
    healthBlock.includes("disbursedAt")
  ) {
    failures.push("Kanban health resolve must not use updatedAt/createdAt/disbursedAt");
  }
}
if (runtimeSrc.includes("enterpriseMetricSnapshot") || runtimeSrc.includes("enterprise_metric_snapshots")) {
  failures.push("Kanban mapping must not join metric snapshots");
}
if (runtimeSrc.includes("prisma.enterpriseDeal.update")) {
  failures.push("pipeline runtime must not write EnterpriseDeal");
}

mustNotContain(proxy, "updatedAt", "proxy must not reference updatedAt");
mustNotContain(proxy, "createdAt", "proxy must not reference createdAt");
mustNotContain(proxy, "disbursedAt", "proxy must not reference disbursedAt");
mustNotContain(proxy, "healthComputedAt", "proxy must not reference healthComputedAt");

const now = new Date("2026-08-16T10:00:00.000Z");
const MS_DAY = 24 * 60 * 60 * 1000;

function isoDaysAgo(days, hours = 0) {
  return new Date(now.getTime() - days * MS_DAY - hours * 3600 * 1000).toISOString();
}

function baseDeal(overrides = {}) {
  return {
    id: "deal-kanban-health-1",
    dealNumber: "DEAL-TEST-001",
    rowVersion: 1,
    grossStage: "identified",
    lifecycleStatus: "active",
    archived: false,
    isDeleted: false,
    primaryCounterpartyName: "Test Lender",
    ...overrides,
  };
}

expect("today → 85", computeDealHealthProxyScore(0) === 85);
expect("10 days → 75", computeDealHealthProxyScore(10) === 75);
expect("60 days caps at 25", computeDealHealthProxyScore(60) === 25);
expect("61 days still 25", computeDealHealthProxyScore(61) === 25);
expect("90 days still 25", computeDealHealthProxyScore(90) === 25);

const todayDeal = dealToLenderExecution(
  baseDeal({
    stageEnteredAt: now.toISOString(),
    healthScore: null,
    updatedAt: isoDaysAgo(0, -2),
    createdAt: isoDaysAgo(40),
  }),
  { now },
);
expect("1. stageEnteredAt today → 85", todayDeal.dealHealthScore === 85);
expect(
  "1. today tone is not em-dash",
  dealHealthScoreKanbanTone(todayDeal.dealHealthScore).label === "85%",
);

const laterUpdate = dealToLenderExecution(
  baseDeal({
    stageEnteredAt: isoDaysAgo(10),
    healthScore: 99,
    updatedAt: now.toISOString(),
    createdAt: isoDaysAgo(40),
  }),
  { now },
);
expect("2. later updatedAt does not change health", laterUpdate.dealHealthScore === 75);
expect("2. stale cache 99 is ignored when stageEnteredAt exists", laterUpdate.dealHealthScore !== 99);

const aged10 = dealToLenderExecution(
  baseDeal({
    stageEnteredAt: isoDaysAgo(10),
    healthScore: 40,
    updatedAt: now.toISOString(),
  }),
  { now },
);
expect("3. stageEnteredAt 10 days ago → 75", aged10.dealHealthScore === 75);

const aged60 = dealToLenderExecution(
  baseDeal({
    stageEnteredAt: isoDaysAgo(60),
    healthScore: 80,
  }),
  { now },
);
const aged90 = dealToLenderExecution(
  baseDeal({
    stageEnteredAt: isoDaysAgo(90),
    healthScore: 80,
  }),
  { now },
);
expect("4. 60 days caps deduction", aged60.dealHealthScore === 25);
expect("4. 60+ days still capped", aged90.dealHealthScore === 25);

const newDeal = dealToLenderExecution(
  baseDeal({
    stageEnteredAt: isoDaysAgo(3),
    healthScore: null,
    updatedAt: now.toISOString(),
    createdAt: isoDaysAgo(3),
  }),
  { now },
);
expect("5. null cache + valid stageEnteredAt is calculated", newDeal.dealHealthScore === 82);
expect(
  "5. new Deal tone is not em-dash",
  dealHealthScoreKanbanTone(newDeal.dealHealthScore).label !== "—",
);

const staleCache = dealToLenderExecution(
  baseDeal({
    stageEnteredAt: isoDaysAgo(10),
    healthScore: 12,
  }),
  { now },
);
expect("6. read-time calc beats stale cache", staleCache.dealHealthScore === 75);

const cachedOnly = dealToLenderExecution(
  baseDeal({
    stageEnteredAt: null,
    healthScore: 42,
    updatedAt: now.toISOString(),
    createdAt: isoDaysAgo(20),
  }),
  { now },
);
expect("7. missing stageEnteredAt keeps cached score", cachedOnly.dealHealthScore === 42);

const emptyOnly = dealToLenderExecution(
  baseDeal({
    stageEnteredAt: null,
    healthScore: null,
    updatedAt: now.toISOString(),
  }),
  { now },
);
expect("7. missing stageEnteredAt + null cache → null", emptyOnly.dealHealthScore === null);
expect(
  "7. null tone is em-dash",
  dealHealthScoreKanbanTone(emptyOnly.dealHealthScore).label === "—",
);

const invalidEntered = resolveKanbanDealHealthScore(
  { stageEnteredAt: "not-a-date", healthScore: 33 },
  now,
);
expect("7. unparseable stageEnteredAt keeps cache", invalidEntered === 33);

const disbursed = dealToLenderExecution(
  baseDeal({
    grossStage: "disbursed",
    stageEnteredAt: now.toISOString(),
    disbursedAt: isoDaysAgo(30),
    healthScore: 12,
    updatedAt: now.toISOString(),
    createdAt: isoDaysAgo(80),
  }),
  { now },
);
expect(
  "Disbursed Deal still ages from stageEnteredAt, not disbursedAt",
  disbursed.dealHealthScore === 85,
);
expect("Disbursed date mapping unchanged", disbursed.disbursedAt === isoDaysAgo(30));
expect("Updated mapping unchanged", disbursed.updatedAt === now.toISOString());

if (failures.length) {
  console.error("CO-C1-KANBAN-DEAL-HEALTH-001 VERIFY FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-C1-KANBAN-DEAL-HEALTH-001 VERIFY PASS");
console.log(
  JSON.stringify(
    {
      today: todayDeal.dealHealthScore,
      aged10: aged10.dealHealthScore,
      cap60: aged60.dealHealthScore,
      newDeal: newDeal.dealHealthScore,
      staleIgnored: staleCache.dealHealthScore,
      cachedFallback: cachedOnly.dealHealthScore,
      disbursedLive: disbursed.dealHealthScore,
    },
    null,
    2,
  ),
);
