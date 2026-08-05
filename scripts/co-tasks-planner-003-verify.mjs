/**
 * CO-TASKS-PLANNER-003 — Enterprise Planner Workspace structural verify.
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

const intents = read("src/constants/enterprise-planner/create-intents.ts");
for (const label of [
  "Add Task",
  "Schedule Meeting",
  "Add Follow-up",
  "Block Time",
  "Add Reminder",
  "Create Personal Task",
]) {
  assert.match(intents, new RegExp(label));
}
assert.match(intents, /My Tasks/);
assert.match(intents, /Team Tasks/);

const desk = read("src/components/catalyst-one/tasks/tasks-planner-desk.tsx");
assert.match(desk, /PlannerDateCreateMenu/);
assert.match(desk, /PlannerDayActivitiesPanel/);
assert.ok(desk.includes(" more"), "Expected +N more overflow CTA");
assert.ok(
  desk.includes("PlannerDayActivitiesPanel"),
  "Expected day activities panel",
);
assert.match(desk, /Search planner/);
assert.match(desk, /My Tasks|mine/);
assert.match(desk, /Agenda/);
assert.match(desk, /PLANNER_DND_MIME/);
assert.match(desk, /reschedulePlannerActivity/);
assert.match(desk, /detectPlannerScheduleConflicts/);
assert.match(desk, /CHANAKYA/);

const card = read("src/components/catalyst-one/tasks/planner-event-card.tsx");
assert.match(card, /Mark Complete/);
assert.match(card, /Reschedule/);
assert.match(card, /Reassign/);
assert.match(card, /Open Deal/);
assert.match(card, /Open Customer/);
assert.match(card, /onContextMenu/);
assert.match(card, /longPressTimer/);

const workspace = read(
  "src/components/catalyst-one/tasks/enterprise-tasks-workspace.tsx",
);
assert.match(workspace, /onCreateIntent/);
assert.match(workspace, /handlePlannerContextAction/);
assert.match(workspace, /defaultDueOn/);
assert.match(workspace, /completeEteTask/);
assert.match(workspace, /patchEteTask/);
assert.match(workspace, /deleteEteTask/);
assert.match(workspace, /CO-TASKS-PLANNER-003/);

const createMenu = read(
  "src/components/catalyst-one/tasks/planner-date-create-menu.tsx",
);
assert.match(createMenu, /PLANNER_CREATE_INTENTS/);

const panel = read(
  "src/components/catalyst-one/tasks/planner-day-activities-panel.tsx",
);
assert.match(panel, /Enterprise Task Registry/);

const intel = read("src/lib/enterprise-planner/schedule-intelligence.ts");
assert.match(intel, /detectPlannerScheduleConflicts/);
assert.match(intel, /Double booking/);
assert.match(intel, /isHighPriorityPlannerEvent/);

const modal = read("src/components/catalyst-one/tasks/quick-task-create-modal.tsx");
assert.match(modal, /defaultDueOn/);
assert.match(modal, /defaultWorkType/);
assert.match(modal, /intentLabel/);

console.log("CO-TASKS-PLANNER-003 verify: PASS");
