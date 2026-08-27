/**
 * CO-REFINEMENT-003 — Flexible Deal stage movement + audit contracts.
 * No production data mutation.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assertLenderPipelineStageTransition } from "../server/services/enterprise-deal/deal-stage-rules.ts";
import { mapDealTimelineEventToEarEmit } from "../server/services/enterprise-activity/deal-timeline-ear.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  const abs = join(root, rel);
  assert.ok(existsSync(abs), `Missing: ${rel}`);
  return readFileSync(abs, "utf8");
}

function mustContain(rel: string, needle: string, label?: string) {
  assert.ok(read(rel).includes(needle), `${label ?? rel}: expected "${needle}"`);
}

function mustThrow(fn: () => void, label: string) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  assert.ok(threw, `Expected throw: ${label}`);
}

// Sequential forward
assert.equal(
  assertLenderPipelineStageTransition({
    fromGrossStage: "prelogin",
    toGrossStage: "logged_in_wip",
  }).toGrossStage,
  "logged_in_wip",
);

// Skip Soft Approved (UBL-style)
assert.equal(
  assertLenderPipelineStageTransition({
    fromGrossStage: "logged_in_wip",
    toGrossStage: "final_approved",
  }).toGrossStage,
  "final_approved",
);

// Backward
assert.equal(
  assertLenderPipelineStageTransition({
    fromGrossStage: "final_approved",
    toGrossStage: "logged_in_wip",
  }).toGrossStage,
  "logged_in_wip",
);
assert.equal(
  assertLenderPipelineStageTransition({
    fromGrossStage: "closure_wip",
    toGrossStage: "final_approved",
  }).toGrossStage,
  "final_approved",
);
assert.equal(
  assertLenderPipelineStageTransition({
    fromGrossStage: "soft_approved",
    toGrossStage: "logged_in_wip",
  }).toGrossStage,
  "logged_in_wip",
);

// Repeated zigzag remains valid each step
assert.equal(
  assertLenderPipelineStageTransition({
    fromGrossStage: "logged_in_wip",
    toGrossStage: "final_approved",
  }).toGrossStage,
  "final_approved",
);
assert.equal(
  assertLenderPipelineStageTransition({
    fromGrossStage: "final_approved",
    toGrossStage: "logged_in_wip",
  }).toGrossStage,
  "logged_in_wip",
);
assert.equal(
  assertLenderPipelineStageTransition({
    fromGrossStage: "logged_in_wip",
    toGrossStage: "soft_approved",
  }).toGrossStage,
  "soft_approved",
);
assert.equal(
  assertLenderPipelineStageTransition({
    fromGrossStage: "soft_approved",
    toGrossStage: "final_approved",
  }).toGrossStage,
  "final_approved",
);

// Hard gates retained
mustThrow(
  () =>
    assertLenderPipelineStageTransition({
      fromGrossStage: "disbursed",
      toGrossStage: "post_disbursement_confirmation",
    }),
  "human cannot enter PDC via general transition",
);
mustThrow(
  () =>
    assertLenderPipelineStageTransition({
      fromGrossStage: "logged_in_wip",
      toGrossStage: "post_disbursement_confirmation",
    }),
  "cannot jump to PDC",
);
mustThrow(
  () =>
    assertLenderPipelineStageTransition({
      fromGrossStage: "disbursed",
      toGrossStage: "closure_wip",
    }),
  "cannot leave Disbursed via general endpoint",
);
mustThrow(
  () =>
    assertLenderPipelineStageTransition({
      fromGrossStage: "post_disbursement_confirmation",
      toGrossStage: "disbursed",
    }),
  "cannot leave PDC via general endpoint",
);
mustThrow(
  () =>
    assertLenderPipelineStageTransition({
      fromGrossStage: "lost",
      toGrossStage: "logged_in_wip",
    }),
  "Lost remains locked",
);

// Lost / Hold still allowed from operational
assert.equal(
  assertLenderPipelineStageTransition({
    fromGrossStage: "logged_in_wip",
    toGrossStage: "lost",
  }).toGrossStage,
  "lost",
);
assert.equal(
  assertLenderPipelineStageTransition({
    fromGrossStage: "hold",
    toGrossStage: "final_approved",
  }).toGrossStage,
  "final_approved",
);

// Audit EAR mapping includes previous/new stage
const ear = mapDealTimelineEventToEarEmit({
  timelineEventId: "tl-1",
  dealId: "deal-1",
  opportunityId: "opp-1",
  eventType: "stage_transition",
  summary: "Stage logged_in_wip → final_approved",
  actorUserId: "user-1",
  occurredAt: new Date().toISOString(),
  payload: {
    fromGrossStage: "logged_in_wip",
    toGrossStage: "final_approved",
    dealNumber: "DEAL-1",
  },
});
assert.equal(ear.eventKind, "stage_change");
assert.equal(ear.dealId, "deal-1");
assert.equal(ear.opportunityId, "opp-1");
assert.equal(ear.actorUserId, "user-1");
assert.equal(ear.payload?.previousStage, "logged_in_wip");
assert.equal(ear.payload?.newStage, "final_approved");

mustContain(
  "src/app/api/enterprise-deals/[dealId]/transitions/route.ts",
  "allowSkip",
  "API forwards allowSkip",
);
mustContain(
  "server/repositories/enterprise-deal/enterprise-deal.repository.ts",
  'eventType: "stage_transition"',
  "transitionDeal appends timeline",
);
mustContain(
  "src/components/catalyst-one/execution/lender-pipeline-board.tsx",
  "flexible_operational",
  "Kanban free operational drag",
);
mustContain(
  "server/services/enterprise-deal/deal-stage-rules.ts",
  "CO-REFINEMENT-003",
  "rules marker",
);

console.log(
  "CO-REFINEMENT-003 verify OK — flexible stage move · hard gates · audit payload.",
);
