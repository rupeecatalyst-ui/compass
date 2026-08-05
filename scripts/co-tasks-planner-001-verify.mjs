/**
 * CO-TASKS-PLANNER-001 / 001A — smoke verify (no deploy).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function mustExist(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `Missing: ${rel}`);
  return fs.readFileSync(p, "utf8");
}

const page = mustExist("src/app/(dashboard)/tasks/page.tsx");
assert.match(page, /EnterpriseTasksWorkspace/);

const nav = mustExist("src/config/navigation.ts");
assert.match(nav, /title:\s*"Tasks"/);
assert.doesNotMatch(nav, /title:\s*"Planner"/);

mustExist("src/components/catalyst-one/tasks/enterprise-tasks-workspace.tsx");
mustExist("src/components/catalyst-one/tasks/tasks-execution-desk.tsx");
mustExist("src/components/catalyst-one/tasks/tasks-planner-desk.tsx");
mustExist("src/components/catalyst-one/tasks/planner-event-card.tsx");
mustExist("src/components/catalyst-one/tasks/planner-event-preview.tsx");
mustExist("src/lib/enterprise-planner/compose-planner.ts");
mustExist("src/lib/enterprise-planner/reschedule.ts");
mustExist("src/lib/enterprise-tasks-workspace/compose.ts");

const workspace = mustExist("src/components/catalyst-one/tasks/enterprise-tasks-workspace.tsx");
assert.match(workspace, /PlannerEventPreview/);
assert.match(workspace, /TasksPlannerDesk/);
assert.match(workspace, /ensureEnterpriseTasksDemoSeed/);
assert.doesNotMatch(workspace, /ensurePlannerOperationalSeed/);

const planner = mustExist("src/components/catalyst-one/tasks/tasks-planner-desk.tsx");
for (const mode of ["agenda", "day", "week", "month"]) {
  assert.match(planner, new RegExp(mode), `planner must support ${mode}`);
}
assert.match(planner, /reschedulePlannerActivity/);
assert.match(planner, /DropZone|onDrop/);

const card = mustExist("src/components/catalyst-one/tasks/planner-event-card.tsx");
assert.match(card, /customerName/);
assert.match(card, /activityLabel/);
assert.match(card, /assigneeLabel/);
assert.match(card, /dueDateLabel/);
assert.match(card, /Executive/);

const constants = mustExist("src/constants/enterprise-planner/index.ts");
assert.match(constants, /PLANNER_SCHEDULE_TONE_META/);
assert.match(constants, /due_today/);
assert.match(constants, /overdue/);
/* Agenda order: Today → Tomorrow → This Week → Overdue → Upcoming */
const agendaIdx = {
  today: constants.indexOf('id: "today"'),
  tomorrow: constants.indexOf('id: "tomorrow"'),
  this_week: constants.indexOf('id: "this_week"'),
  overdue: constants.indexOf('id: "overdue"'),
  upcoming: constants.indexOf('id: "upcoming"'),
};
assert.ok(
  agendaIdx.today < agendaIdx.tomorrow &&
    agendaIdx.tomorrow < agendaIdx.this_week &&
    agendaIdx.this_week < agendaIdx.overdue &&
    agendaIdx.overdue < agendaIdx.upcoming,
  "Agenda section order must be Today → Tomorrow → This Week → Overdue → Upcoming",
);

const reschedule = mustExist("src/lib/enterprise-planner/reschedule.ts");
assert.match(reschedule, /patchEteTask/);
assert.match(reschedule, /recordEteAudit/);
assert.match(reschedule, /appendEdcTimelineEntry/);

const compose = mustExist("src/lib/enterprise-planner/compose-planner.ts");
assert.match(compose, /agendaSections/);
assert.match(compose, /listEteTasks/);
assert.doesNotMatch(compose, /listEnterpriseMeetings/);
assert.doesNotMatch(compose, /listEnterpriseReminders/);
assert.match(compose, /Single SSOT|Enterprise Task Registry only/);

const preview = mustExist("src/components/catalyst-one/tasks/planner-event-preview.tsx");
assert.match(preview, /Open Opportunity/);
assert.match(preview, /Open Customer/);
assert.match(preview, /Complete Activity/);
assert.match(preview, /Reschedule/);

console.log("CO-TASKS-PLANNER-001A verify: PASS");
