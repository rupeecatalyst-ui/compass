/**
 * CO-C1-EAR-COVERAGE-002 — Future Deal/Opportunity EAR emission.
 * Engineering gate only. Does not mutate production data or run backfill.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  filterEventsForScope,
} from "../src/lib/enterprise-activity-registry/transaction-timeline.ts";
import {
  emitDealTimelineToEarBestEffort,
  mapDealTimelineEventToEarEmit,
} from "../server/services/enterprise-activity/deal-timeline-ear.ts";
import {
  emitOpportunityLifecycleToEarBestEffort,
  mapOpportunityLifecycleToEarEmit,
} from "../server/services/enterprise-activity/opportunity-lifecycle-ear.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function ear(partial) {
  return {
    id: partial.id,
    organizationId: "org",
    eventKind: partial.eventKind ?? "workflow",
    sourceSystem: partial.sourceSystem ?? "deal_timeline",
    sourceEventId: partial.sourceEventId ?? null,
    title: partial.title ?? "Event",
    summary: null,
    payload: null,
    opportunityId: partial.opportunityId ?? null,
    dealId: partial.dealId ?? null,
    contactId: null,
    taskId: null,
    documentId: null,
    actorUserId: null,
    actorName: null,
    occurredAt: partial.occurredAt ?? "2026-08-16T10:00:00.000Z",
    createdAt: "2026-08-16T10:00:00.000Z",
  };
}

const mapped = mapDealTimelineEventToEarEmit({
  timelineEventId: "tl-event-1",
  dealId: "deal-a",
  opportunityId: "opp-1",
  eventType: "stage_transition",
  summary: "Stage login → logged_in_wip",
  actorUserId: "user-1",
  occurredAt: "2026-08-16T12:00:00.000Z",
});

assert.equal(mapped.sourceSystem, "deal_timeline");
assert.equal(mapped.sourceEventId, "tl-event-1");
assert.equal(mapped.dealId, "deal-a");
assert.equal(mapped.opportunityId, "opp-1");
assert.equal(mapped.eventKind, "stage_change");
assert.equal(mapped.title, "Stage login → logged_in_wip");
assert.equal(mapped.occurredAt, "2026-08-16T12:00:00.000Z");

const workflowMapped = mapDealTimelineEventToEarEmit({
  timelineEventId: "tl-event-2",
  dealId: "deal-a",
  opportunityId: "opp-1",
  eventType: "deal_created",
  summary: "Deal created",
  occurredAt: new Date("2026-08-16T12:01:00.000Z"),
});
assert.equal(workflowMapped.eventKind, "workflow");
assert.equal(workflowMapped.sourceEventId, "tl-event-2");

const first = mapDealTimelineEventToEarEmit({
  timelineEventId: "tl-dup",
  dealId: "deal-a",
  opportunityId: "opp-1",
  eventType: "deal_created",
  summary: "Deal created",
  occurredAt: "2026-08-16T12:02:00.000Z",
});
const second = mapDealTimelineEventToEarEmit({
  timelineEventId: "tl-dup",
  dealId: "deal-a",
  opportunityId: "opp-1",
  eventType: "deal_created",
  summary: "Deal created (retry)",
  occurredAt: "2026-08-16T12:03:00.000Z",
});
assert.equal(first.sourceEventId, second.sourceEventId);
assert.equal(first.sourceSystem, second.sourceSystem);

let threw = false;
await emitDealTimelineToEarBestEffort(
  {
    timelineEventId: "tl-fail",
    dealId: "deal-a",
    opportunityId: "opp-1",
    eventType: "deal_created",
    summary: "Must not throw",
    occurredAt: "2026-08-16T12:04:00.000Z",
  },
  async () => {
    threw = true;
    throw new Error("EAR unavailable");
  },
);
assert.equal(threw, true);

const dealOriginated = ear({
  id: "deal-origin",
  opportunityId: "opp-1",
  dealId: "deal-a",
  sourceSystem: "deal_timeline",
  sourceEventId: "tl-event-1",
  title: "Stage login → logged_in_wip",
});
const opportunityView = filterEventsForScope([dealOriginated], {
  mode: "opportunity",
  opportunityId: "opp-1",
});
assert.deepEqual(
  opportunityView.map((e) => e.id),
  ["deal-origin"],
);

const sibling = filterEventsForScope(
  [
    ear({ id: "this", opportunityId: "opp-1", dealId: "deal-a" }),
    ear({ id: "sibling", opportunityId: "opp-1", dealId: "deal-b" }),
    ear({ id: "shared", opportunityId: "opp-1", dealId: null }),
  ],
  { mode: "deal", dealId: "deal-a", opportunityId: "opp-1" },
);
assert.deepEqual(
  sibling.map((e) => e.id).sort(),
  ["shared", "this"],
);

const filterLib = read("src/lib/enterprise-activity-registry/transaction-timeline.ts");
assert.match(filterLib, /Opportunity mode: all EAR rows for that opportunityId/);
assert.match(filterLib, /excludes sibling-deal-only events/);
assert.doesNotMatch(filterLib, /updatedAt/);
assert.doesNotMatch(filterLib, /healthComputedAt/);

const repo = read("server/repositories/enterprise-deal/enterprise-deal.repository.ts");
assert.match(repo, /emitDealTimelineToEarBestEffort/);
assert.match(repo, /opportunityId: created\.deal\.opportunityId/);
assert.match(repo, /select: \{ opportunityId: true \}/);

const helper = read("server/services/enterprise-activity/deal-timeline-ear.ts");
assert.match(helper, /sourceSystem: "deal_timeline"/);
assert.match(helper, /sourceEventId: input.timelineEventId/);
assert.match(helper, /fail-open/);
assert.doesNotMatch(helper, /enterpriseDeal\.update/);
assert.doesNotMatch(helper, /updatedAt/);
assert.doesNotMatch(helper, /disbursedAt/);
assert.doesNotMatch(helper, /stageEnteredAt/);

const earRepo = read(
  "server/repositories/enterprise-activity/enterprise-activity.repository.ts",
);
assert.match(earRepo, /organizationId_sourceSystem_sourceEventId/);

const oppMapped = mapOpportunityLifecycleToEarEmit({
  opportunityId: "opp-1",
  action: "created",
  title: "Opportunity OPP-1 created",
  toStatus: "active",
  actorUserId: "user-1",
});
assert.equal(oppMapped.sourceSystem, "opportunity");
assert.equal(oppMapped.opportunityId, "opp-1");
assert.equal(oppMapped.dealId, undefined);
assert.equal(oppMapped.sourceEventId, "opportunity:opp-1:created");

await emitOpportunityLifecycleToEarBestEffort(
  {
    opportunityId: "opp-1",
    action: "created",
    title: "Must not throw",
  },
  async () => {
    throw new Error("EAR unavailable");
  },
);

const oppService = read("server/services/enterprise-opportunity/index.ts");
assert.match(oppService, /emitOpportunityLifecycleToEarBestEffort/);
assert.match(oppService, /action: "created"/);
assert.match(oppService, /converted_to_deal/);

const timelineUi = read(
  "src/components/catalyst-one/transaction-activity-timeline/transaction-activity-timeline.tsx",
);
assert.match(timelineUi, /loadTransactionActivityTimeline/);

const schema = read("prisma/schema.prisma");
assert.match(schema, /model EnterpriseActivityEvent/);
assert.match(schema, /model EnterpriseDealTimelineEvent/);
assert.doesNotMatch(schema, /model DialogueActivity/);

console.log("CO-C1-EAR-COVERAGE-002 VERIFY PASS");
