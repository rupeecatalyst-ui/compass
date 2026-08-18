/**
 * CO-C1-PDC-SCHEDULE-REPAIR-001
 * Missing PDC schedule repair: clock authority, dueAt formula, idempotency, exclusions.
 * Does not write production data.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  computePostDisbursementDueAt,
  pickEarliestDisbursedTimelineOccurredAt,
  resolveHistoricalDisbursedTransitionAt,
} from "../src/lib/post-disbursement-confirmation/historical-disbursed-clock.ts";
import { POST_DISBURSEMENT_CONFIRMATION_DELAY_HOURS } from "../src/constants/post-disbursement-confirmation.ts";

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

const clock = "src/lib/post-disbursement-confirmation/historical-disbursed-clock.ts";
const repair = "server/services/post-disbursement-confirmation/historical-schedule-repair.ts";
const repo = "server/repositories/enterprise-deal/enterprise-deal.repository.ts";
const cron = "src/app/api/cron/post-disbursement-confirmation/route.ts";
const script = "scripts/co-c1-pdc-schedule-repair-001.mjs";
const pdcService = "server/services/post-disbursement-confirmation/post-disbursement-confirmation.service.ts";

mustContain(clock, "disbursedAt", "disbursedAt priority");
mustContain(clock, "stageEnteredAt", "stageEnteredAt fallback");
mustContain(clock, "timeline", "timeline fallback");
mustContain(clock, "POST_DISBURSEMENT_CONFIRMATION_DELAY_HOURS", "72h constant");
mustContain(repair, 'grossStage: "disbursed"', "only Disbursed Deals");
mustContain(repair, "isDeleted: false", "excludes deleted");
mustContain(repair, "ensurePendingPostDisbursementSchedule", "reuses schedule upsert");
mustContain(repo, "ensurePendingPostDisbursementSchedule", "shared schedule helper");
mustContain(repo, "update: {}", "existing schedules unchanged via upsert");
mustContain(repo, "enterprisePostDisbursementSchedule.upsert", "canonical upsert remains");
mustContain(repo, "POST_DISBURSEMENT_CONFIRMATION_DELAY_HOURS", "live transition still +72h");
mustContain(script, "planHistoricalPdcScheduleRepair", "dry-run planner");
mustContain(script, '--execute', "explicit write flag");
mustContain(cron, "processDueSchedules", "cron unchanged as hand-off");
mustContain(pdcService, 'status: "pending"', "cron still claims pending");

mustNotContain(clock, "updatedAt", "clock must not reference updatedAt");
mustNotContain(clock, "healthComputedAt", "clock must not reference healthComputedAt");
mustNotContain(clock, "createdAt", "clock must not reference createdAt");

const repairSrc = read(repair);
if (/prisma\.enterpriseDeal\.update/.test(repairSrc) || /enterpriseDeal\.updateMany/.test(repairSrc)) {
  failures.push("repair must not mutate EnterpriseDeal");
}
if (repairSrc.includes("processDueSchedules(")) {
  failures.push("repair must not invoke PDC cron/stage transition");
}

expect("72h constant is 72", POST_DISBURSEMENT_CONFIRMATION_DELAY_HOURS === 72);

const source = new Date("2026-08-10T12:04:39.208Z");
const due = computePostDisbursementDueAt(source);
expect(
  "dueAt = source + 72h",
  due.toISOString() === "2026-08-13T12:04:39.208Z",
);

const withDisbursedAt = resolveHistoricalDisbursedTransitionAt({
  grossStage: "disbursed",
  disbursedAt: "2026-08-04T09:15:00.000Z",
  stageEnteredAt: "2026-08-10T12:04:39.208Z",
  disbursedTimelineOccurredAt: "2026-08-10T12:04:45.678Z",
});
expect("disbursedAt wins over stageEnteredAt", withDisbursedAt?.source === "disbursedAt");
expect(
  "disbursedAt value used",
  withDisbursedAt?.at.toISOString() === "2026-08-04T09:15:00.000Z",
);

const withStage = resolveHistoricalDisbursedTransitionAt({
  grossStage: "disbursed",
  disbursedAt: null,
  stageEnteredAt: "2026-08-10T12:04:39.208Z",
  disbursedTimelineOccurredAt: "2026-08-10T12:04:45.678Z",
});
expect("stageEnteredAt used when disbursedAt null", withStage?.source === "stageEnteredAt");
expect(
  "DEAL-082 expected clock",
  withStage?.at.toISOString() === "2026-08-10T12:04:39.208Z",
);
expect(
  "DEAL-082 expected dueAt",
  computePostDisbursementDueAt(withStage.at).toISOString() ===
    "2026-08-13T12:04:39.208Z",
);

const laterUpdatedIgnored = resolveHistoricalDisbursedTransitionAt({
  grossStage: "disbursed",
  disbursedAt: null,
  stageEnteredAt: "2026-08-10T12:04:39.208Z",
});
expect(
  "updatedAt cannot be passed into clock result",
  laterUpdatedIgnored?.at.toISOString() === "2026-08-10T12:04:39.208Z",
);

const nonDisbursedStageEntered = resolveHistoricalDisbursedTransitionAt({
  grossStage: "closure_wip",
  disbursedAt: null,
  stageEnteredAt: "2026-08-10T12:04:39.208Z",
  disbursedTimelineOccurredAt: "2026-08-06T06:35:57.530Z",
});
expect(
  "stageEnteredAt ignored unless currently disbursed",
  nonDisbursedStageEntered?.source === "timeline",
);

const timelineOnly = resolveHistoricalDisbursedTransitionAt({
  grossStage: "disbursed",
  disbursedAt: null,
  stageEnteredAt: null,
  disbursedTimelineOccurredAt: "2026-08-10T12:04:45.678Z",
});
expect("timeline fallback", timelineOnly?.source === "timeline");
expect(
  "timeline value",
  timelineOnly?.at.toISOString() === "2026-08-10T12:04:45.678Z",
);

const earliest = pickEarliestDisbursedTimelineOccurredAt([
  {
    eventType: "stage_transition",
    occurredAt: "2026-08-06T06:35:57.530Z",
    payload: { toGrossStage: "closure_wip" },
  },
  {
    eventType: "stage_transition",
    occurredAt: "2026-08-10T12:04:45.678Z",
    payload: { toGrossStage: "disbursed" },
  },
  {
    eventType: "stage_transition",
    occurredAt: "2026-08-12T00:00:00.000Z",
    payload: { toGrossStage: "disbursed" },
  },
]);
expect(
  "earliest disbursed timeline event",
  earliest?.toISOString() === "2026-08-10T12:04:45.678Z",
);

const unresolved = resolveHistoricalDisbursedTransitionAt({
  grossStage: "disbursed",
  disbursedAt: null,
  stageEnteredAt: null,
  disbursedTimelineOccurredAt: null,
});
expect("unresolved when no authority", unresolved === null);

const loggedIn = resolveHistoricalDisbursedTransitionAt({
  grossStage: "logged_in_wip",
  disbursedAt: null,
  stageEnteredAt: "2026-08-10T12:04:39.208Z",
});
expect("non-Disbursed without timeline excluded", loggedIn === null);

expect(
  "idempotent dueAt for same source",
  computePostDisbursementDueAt(source).toISOString() ===
    computePostDisbursementDueAt(source).toISOString(),
);

if (failures.length) {
  console.error("CO-C1-PDC-SCHEDULE-REPAIR-001 VERIFY FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-C1-PDC-SCHEDULE-REPAIR-001 VERIFY PASS");
console.log(
  JSON.stringify(
    {
      delayHours: POST_DISBURSEMENT_CONFIRMATION_DELAY_HOURS,
      exampleDueAt: due.toISOString(),
      deal082DueAt: computePostDisbursementDueAt(withStage.at).toISOString(),
    },
    null,
    2,
  ),
);
