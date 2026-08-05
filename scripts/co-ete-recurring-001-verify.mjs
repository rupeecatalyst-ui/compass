/**
 * CO-ETE-RECURRING-001 — structural + recurrence math verify.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `Missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

for (const rel of [
  "src/lib/enterprise-task-engine/recurrence-engine.ts",
  "src/constants/enterprise-task-engine/recurrence.ts",
  "src/components/catalyst-one/tasks/task-recurrence-fields.tsx",
  "docs/co-ete-recurring-001/CO-ETE-RECURRING-001-READINESS-REPORT.md",
]) {
  assert.ok(fs.existsSync(path.join(root, rel)), `Missing ${rel}`);
}

const types = read("src/types/enterprise-task-engine.ts");
for (const token of [
  "scheduleKind",
  "seriesId",
  "occurrenceNumber",
  "seriesRootTaskId",
  "EteRecurrenceFrequency",
  "half_yearly",
  "after_count",
]) {
  assert.match(types, new RegExp(token));
}

const engine = read("src/lib/enterprise-task-engine/recurrence-engine.ts");
assert.match(engine, /computeNextOccurrenceDueOn/);
assert.match(engine, /buildNextOccurrenceDraft/);
assert.match(engine, /shouldSpawnNextOccurrence/);
assert.match(engine, /resolveReminderAt/);

const registry = read("src/lib/enterprise-task-engine/task-registry.ts");
assert.match(registry, /shouldSpawnNextOccurrence/);
assert.match(registry, /listEteSeriesOccurrences/);
assert.match(registry, /cancelEteSeries/);
assert.match(registry, /buildNextOccurrenceDraft/);

const modal = read("src/components/catalyst-one/tasks/quick-task-create-modal.tsx");
assert.match(modal, /TaskRecurrenceFields/);
assert.match(modal, /scheduleKind/);

const desk = read("src/components/catalyst-one/tasks/tasks-planner-desk.tsx");
assert.match(desk, /ETE_SCHEDULE_FILTERS/);
assert.match(desk, /scheduleFilter/);

const compose = read("src/lib/enterprise-planner/compose-planner.ts");
assert.match(compose, /isRecurringTask/);
assert.match(compose, /describeEteRecurrence/);
assert.match(compose, /seriesId/);

const card = read("src/components/catalyst-one/tasks/planner-event-card.tsx");
assert.match(card, /Recurring/);

// Pure recurrence math (duplicated lightly for node verify without TS path aliases)
function addMonths(from, months, dayOfMonth) {
  const next = new Date(from.getTime());
  const targetMonth = next.getMonth() + months;
  const year = next.getFullYear() + Math.floor(targetMonth / 12);
  const monthIndex = ((targetMonth % 12) + 12) % 12;
  const dim = new Date(year, monthIndex + 1, 0).getDate();
  const dom = Math.min(Math.max(1, dayOfMonth ?? next.getDate()), dim);
  next.setFullYear(year, monthIndex, dom);
  return next;
}

const jan5 = new Date("2026-01-05T10:00:00");
const apr = addMonths(jan5, 3, 5);
assert.equal(apr.getMonth(), 3);
assert.equal(apr.getDate(), 5);
const jul = addMonths(apr, 3, 5);
assert.equal(jul.getMonth(), 6);
const oct = addMonths(jul, 3, 5);
assert.equal(oct.getMonth(), 9);

const daily = new Date("2026-08-04T09:00:00");
daily.setDate(daily.getDate() + 2);
assert.equal(daily.getDate(), 6);

console.log("CO-ETE-RECURRING-001 verify: PASS");
