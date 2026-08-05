/**
 * CO-BUG-PLANNER-EMPTY — Planner reads ETE SSOT + identity/recurrence fixes.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const compose = read("src/lib/enterprise-planner/compose-planner.ts");
assert.match(compose, /listEteTasks/);
assert.match(compose, /computeNextOccurrenceDueOn/);
assert.match(compose, /isProjectedOccurrence/);
assert.match(compose, /needsSchedule/);
assert.match(compose, /projectTaskToPlannerEvents/);
assert.doesNotMatch(compose, /meeting-registry\.ts/);

const desk = read("src/components/catalyst-one/tasks/tasks-planner-desk.tsx");
assert.match(desk, /sameAssigneeRef/);
assert.doesNotMatch(desk, /e\.assigneeRef !== opts\.userRef/);

const myWork = read("src/lib/enterprise-task-engine/my-work.ts");
assert.match(myWork, /export function sameAssigneeRef/);

const qt = read("src/components/catalyst-one/tasks/quick-task-create-modal.tsx");
assert.match(qt, /fallback\.setHours\(17/);

assert.ok(
  fs.existsSync(path.join(root, "docs/co-bug-planner-empty/CO-BUG-PLANNER-EMPTY-RCA.md")),
);

console.log("CO-BUG-PLANNER-EMPTY verify: PASS");
