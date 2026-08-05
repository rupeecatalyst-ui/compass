/**
 * CO-WF-006 — Enterprise Stage Transition Experience (static gates).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const required = [
  "src/constants/enterprise-stage-transition.ts",
  "src/lib/enterprise-stage-transition/index.ts",
  "src/components/catalyst-one/shared/enterprise-stage-transition-dialog.tsx",
  "docs/co-wf-006/CO-WF-006-STAGE-TRANSITION-READINESS-REPORT.md",
];
for (const rel of required) {
  assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
}

const dialog = read(
  "src/components/catalyst-one/shared/enterprise-stage-transition-dialog.tsx",
);
assert.match(dialog, /CHANAKYA Recommendation/);
assert.match(dialog, /Recommended Sub-Stage/);
assert.match(dialog, /EnterpriseActivityComposer/);
assert.match(dialog, /Save Transition/);
assert.match(dialog, /advisory only/i);

const recommend = read("src/lib/enterprise-stage-transition/index.ts");
assert.match(recommend, /recommendStageTransitionSubStage/);
assert.match(recommend, /Advisory only/);

const consts = read("src/constants/enterprise-stage-transition.ts");
assert.match(consts, /LENDER_CASE_SUB_STAGES/);
assert.match(consts, /listLenderSubStagesForStage/);
assert.match(consts, /listEoleSubStagesForStage/);

const board = read("src/components/catalyst-one/execution/lender-pipeline-board.tsx");
assert.match(board, /EnterpriseStageTransitionDialog/);
assert.match(board, /enterprise_transition_dialog/);
assert.match(board, /caseSubStage/);
assert.match(board, /appendEdcTimelineEntry/);
assert.match(board, /lenderSubStageLabel/);

const ow = read(
  "src/components/catalyst-one/opportunity-workspace/workspace-stage-panel.tsx",
);
assert.match(ow, /EnterpriseStageTransitionDialog/);
assert.match(ow, /appendEdcTimelineEntry/);
assert.match(ow, /CO-WF-006/);

const runtime = read("src/lib/enterprise-deal/deal-pipeline-runtime.ts");
assert.match(runtime, /caseSubStage/);
assert.match(runtime, /toSubStage/);

console.log("CO-WF-006 verify: PASS");
