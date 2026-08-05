/**
 * CO-TASKS-PLANNER-002 — workspace density / CHANAKYA LIVE ticker verify.
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

const workspace = read("src/components/catalyst-one/tasks/enterprise-tasks-workspace.tsx");
assert.match(workspace, /PlannerChanakyaLiveTicker/);
assert.match(workspace, /buildPlannerChanakyaLiveItems/);
assert.match(workspace, /density="registry"/);
assert.match(workspace, /min-h-\[calc\(100vh-11\.5rem\)\]/);

const tickerUi = read("src/components/catalyst-one/tasks/planner-chanakya-live-ticker.tsx");
assert.match(tickerUi, /CHANAKYA LIVE/);
assert.match(tickerUi, /co-planner-chanakya-live-scroll/);
assert.match(tickerUi, /prefers-reduced-motion/);

const tickerLib = read("src/lib/enterprise-planner/chanakya-live-ticker.ts");
assert.match(tickerLib, /buildPlannerChanakyaLiveItems/);
assert.match(tickerLib, /overdue/);

const metrics = read("src/components/catalyst-one/tasks/tasks-workspace-summary-strip.tsx");
assert.match(metrics, /etw-metrics-toolbar/);
assert.doesNotMatch(metrics, /text-xl/);
assert.match(metrics, /Overdue/);
assert.match(metrics, /Completed/);

const desk = read("src/components/catalyst-one/tasks/tasks-planner-desk.tsx");
assert.match(desk, /calc\(100vh - 14rem\)/);
assert.match(desk, /gridTemplateRows/);

console.log("CO-TASKS-PLANNER-002 verify: PASS");
