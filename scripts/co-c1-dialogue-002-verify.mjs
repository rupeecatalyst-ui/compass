/**
 * CO-C1-DIALOGUE-002 — Unified Transaction Activity Timeline verification.
 * Proves EAR projection filtering, ordering, actor, and mount wiring.
 * No production data mutation. No WP/Gateway changes.
 */

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyEarEvent,
  filterEventsForScope,
  isOperationalTimelineEvent,
  mapEarEventToTimelineItem,
  matchesTimelineFilter,
} from "../src/lib/enterprise-activity-registry/transaction-timeline.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function ear(partial) {
  return {
    id: partial.id,
    organizationId: "org",
    eventKind: partial.eventKind ?? "workflow",
    sourceSystem: partial.sourceSystem ?? "system",
    sourceEventId: null,
    title: partial.title ?? "Event",
    summary: partial.summary ?? null,
    payload: partial.payload ?? null,
    opportunityId: partial.opportunityId ?? null,
    dealId: partial.dealId ?? null,
    contactId: null,
    taskId: null,
    documentId: null,
    actorUserId: null,
    actorName: partial.actorName ?? null,
    occurredAt: partial.occurredAt ?? "2026-07-27T10:00:00.000Z",
    createdAt: partial.occurredAt ?? "2026-07-27T10:00:00.000Z",
  };
}

// --- A. EAR is chronology SSOT (no new activity table in this sprint) ---
const timelineLib = read("src/lib/enterprise-activity-registry/transaction-timeline.ts");
assert.match(timelineLib, /listEnterpriseActivity/);
assert.match(timelineLib, /filterEventsForScope/);
assert.doesNotMatch(timelineLib, /CREATE TABLE|prisma\.\w*ActivityTimeline/);

const reportPath = "docs/co-c1-dialogue-002/CO-C1-DIALOGUE-002-IMPLEMENTATION-REPORT.md";
assert.ok(existsSync(join(root, reportPath)), "Implementation report must exist");

// --- B. Transaction filtering + no cross-Deal / cross-Opportunity leakage ---
const oppA = "opp-A";
const oppB = "opp-B";
const dealHdfc = "deal-hdfc";
const dealAxis = "deal-axis";

const corpus = [
  ear({
    id: "1",
    opportunityId: oppA,
    dealId: null,
    title: "Opp note",
    eventKind: "notes",
    sourceSystem: "business_notes",
    actorName: "Neha Sharma",
    occurredAt: "2026-07-27T10:42:00.000Z",
  }),
  ear({
    id: "2",
    opportunityId: oppA,
    dealId: dealHdfc,
    title: "HDFC stage",
    eventKind: "stage_change",
    sourceSystem: "deal_timeline",
    payload: { fromStage: "Logged In – WIP", toStage: "Soft Approved" },
    actorName: "Amit Kumar",
    occurredAt: "2026-07-26T16:20:00.000Z",
  }),
  ear({
    id: "3",
    opportunityId: oppA,
    dealId: dealAxis,
    title: "Axis only",
    eventKind: "stage_change",
    sourceSystem: "deal_timeline",
    actorName: "Axis RM",
    occurredAt: "2026-07-26T12:00:00.000Z",
  }),
  ear({
    id: "4",
    opportunityId: oppB,
    dealId: null,
    title: "Other opportunity",
    eventKind: "notes",
    sourceSystem: "business_notes",
    actorName: "Other",
    occurredAt: "2026-07-27T09:00:00.000Z",
  }),
  ear({
    id: "5",
    opportunityId: oppA,
    dealId: dealHdfc,
    title: "Doc uploaded",
    eventKind: "documents",
    sourceSystem: "document",
    actorName: "Rahul Sharma",
    occurredAt: "2026-07-26T14:10:00.000Z",
  }),
];

const oppScoped = filterEventsForScope(corpus, {
  mode: "opportunity",
  opportunityId: oppA,
});
assert.equal(oppScoped.length, 4);
assert.ok(oppScoped.every((e) => e.opportunityId === oppA));
assert.ok(!oppScoped.some((e) => e.opportunityId === oppB));
assert.ok(oppScoped.some((e) => e.dealId === dealAxis)); // Opportunity history includes child deals

const dealScoped = filterEventsForScope(corpus, {
  mode: "deal",
  dealId: dealHdfc,
  opportunityId: oppA,
});
const dealIds = dealScoped.map((e) => e.id).sort();
assert.deepEqual(dealIds, ["1", "2", "5"]);
assert.ok(!dealScoped.some((e) => e.dealId === dealAxis));
assert.ok(!dealScoped.some((e) => e.opportunityId === oppB));

// --- C. Ordering newest first + actor ---
const items = dealScoped
  .map(mapEarEventToTimelineItem)
  .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
assert.equal(items[0].id, "1");
assert.equal(items[0].actorLabel, "Neha Sharma");
assert.equal(items[0].category, "note");

const stage = items.find((i) => i.id === "2");
assert.ok(stage);
assert.equal(stage.category, "stage_change");
assert.equal(stage.previousValue, "Logged In – WIP");
assert.equal(stage.newValue, "Soft Approved");
assert.equal(stage.actorLabel, "Amit Kumar");

const noActor = mapEarEventToTimelineItem(
  ear({ id: "sys", title: "System pulse", actorName: null }),
);
assert.equal(noActor.actorLabel, "System");

// --- D. Classification / filters ---
assert.equal(
  classifyEarEvent(ear({ eventKind: "tasks", sourceSystem: "ete" })),
  "task",
);
assert.equal(
  classifyEarEvent(ear({ eventKind: "documents", sourceSystem: "document" })),
  "document",
);
assert.ok(matchesTimelineFilter(items[0], "notes"));
assert.ok(matchesTimelineFilter(stage, "stage_changes"));
assert.ok(matchesTimelineFilter(items[0], "all"));

// --- D2. Operational noise gate + stage pair only on stage categories ---
assert.equal(
  isOperationalTimelineEvent(
    ear({ eventKind: "chanakya", sourceSystem: "chanakya", title: "Radar tip" }),
  ),
  false,
);
assert.equal(
  isOperationalTimelineEvent(
    ear({
      eventKind: "notes",
      sourceSystem: "business_notes",
      title: "Customer contacted",
    }),
  ),
  true,
);
const noteWithStagePayload = mapEarEventToTimelineItem(
  ear({
    id: "note-stage-payload",
    eventKind: "notes",
    sourceSystem: "business_notes",
    title: "Internal note",
    payload: { stage: "ShouldNotShow" },
  }),
);
assert.equal(noteWithStagePayload.previousValue, null);
assert.equal(noteWithStagePayload.newValue, null);

const apiClient = read("src/lib/enterprise-activity-registry/api-client.ts");
assert.match(apiClient, /sessionFallback/);
assert.match(timelineLib, /isOperationalTimelineEvent/);

// --- E. Mount wiring (OW + Deal) — no demo default on OW panel ---
const ow = read("src/components/catalyst-one/opportunity-workspace/opportunity-workspace.tsx");
assert.match(ow, /tab === "timeline".*WorkspaceDialoguePanel|WorkspaceDialoguePanel/);
assert.match(ow, /timeline: "timeline"/);
assert.match(ow, /dialogue: "timeline"/);

const nav = read("src/components/catalyst-one/opportunity-workspace/strategic-tabs.ts");
assert.match(nav, /id: "timeline"/);
assert.match(nav, /Activity Timeline/);
// Discoverability: Timeline near front of nav (after Overview)
const timelineIdx = nav.indexOf('{ id: "timeline"');
const customerIdx = nav.indexOf('{ id: "customer"');
assert.ok(timelineIdx > 0 && timelineIdx < customerIdx);

const panel = read(
  "src/components/catalyst-one/opportunity-workspace/workspace-dialogue-panel.tsx",
);
assert.match(panel, /TransactionActivityTimeline/);
assert.match(panel, /mode: "opportunity"/);
assert.doesNotMatch(panel, /opp-demo-001/);
assert.doesNotMatch(panel, /seedDialogueIfEmpty/);

const dealHost = read(
  "src/components/catalyst-one/deal-workspace/deal-workspace-host.tsx",
);
assert.match(dealHost, /TransactionActivityTimeline/);
assert.match(dealHost, /mode: "deal"/);
assert.match(dealHost, /Activity Timeline/);
assert.match(dealHost, /active=\{timelineOpen\}/);

const notes = read(
  "src/components/catalyst-one/opportunity-workspace/workspace-notes-panel.tsx",
);
assert.match(notes, /EnterpriseBusinessNotesPanel/);

const ui = read(
  "src/components/catalyst-one/transaction-activity-timeline/transaction-activity-timeline.tsx",
);
assert.match(ui, /BusinessNotesActionButton/);
assert.match(ui, /loadTransactionActivityTimeline/);
assert.match(ui, /subscribeEarUpdated/);
assert.match(ui, /groupByDay|DayGroup/);
assert.doesNotMatch(ui, /sourceSystem \?/);

// --- F. Existing EBN → EAR pathway intact (service still emits) ---
const ebnService = read(
  "server/services/enterprise-business-notes/enterprise-business-notes.service.ts",
);
assert.match(ebnService, /EAR_SOURCE_BUSINESS_NOTES|business_notes/);
assert.match(ebnService, /sourceSystem/);

const report002a = "docs/co-c1-dialogue-002/CO-C1-DIALOGUE-002A-PO-INSPECTION-REPORT.md";
assert.ok(existsSync(join(root, report002a)), "002A inspection report must exist");

console.log("CO-C1-DIALOGUE-002 verify OK");
