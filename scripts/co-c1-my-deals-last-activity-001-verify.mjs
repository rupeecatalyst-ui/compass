/**
 * CO-C1-MY-DEALS-LAST-ACTIVITY-001
 * Mapper fallback Last Activity = stageEnteredAt || createdAt.
 * updatedAt must not drive the execution-card "Updated" date.
 * EAR operational activity may overlay Updated when it is later.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mapEnterpriseDealToDealRegistryRow } from "../src/lib/enterprise-deal/map-deal-to-registry-row.ts";
import { overlayDealRowsWithEarLastActivity } from "../src/lib/enterprise-activity-registry/latest-opportunity-activity.ts";
import { groupDealRowsByOpportunity } from "../src/lib/my-deals/group-opportunities.ts";
import { deriveOpportunityExecutiveSummary } from "../src/lib/my-deals/derive-opportunity-executive-summary.ts";

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

const mapper = "src/lib/enterprise-deal/map-deal-to-registry-row.ts";
const port = "src/lib/enterprise-deal/deal-registry-port.ts";
const card = "src/components/catalyst-one/my-deals/opportunity-lender-journey-card.tsx";
const runtime = "src/lib/enterprise-deal/deal-pipeline-runtime.ts";
const kanban = "src/components/catalyst-one/execution/lender-pipeline-board.tsx";
const proxy = "src/lib/enterprise-metrics-engine/deal-health-proxy.ts";

mustContain(mapper, "deal.stageEnteredAt", "Last Activity from stageEnteredAt");
mustContain(mapper, "deal.createdAt", "createdAt fallback");
mustContain(card, "Updated ·", "Updated label preserved");
mustContain(card, "group.executive.lastActivityLabel", "card still reads mapped lastActivity");
mustContain(port, "mapEnterpriseDealToDealRegistryRow", "My Deals still uses registry mapper");
mustContain(port, "overlayDealRowsWithEarLastActivity", "My Deals overlays Updated from EAR");
mustContain(
  "src/lib/document-requests/timeline.ts",
  'sourceSystem: EAR_SOURCE_SYSTEMS.DOCUMENT_REQUEST',
  "LOD writes first-class EAR",
);
mustContain(
  "src/lib/document-requests/timeline.ts",
  "emitEnterpriseActivity",
  "LOD uses existing EAR writer",
);
mustContain(
  "src/lib/document-requests/store.ts",
  "custom_requirement_added",
  "custom requirement writes activity",
);
mustNotContain(port, "include=timeline", "My Deals must not load timeline");
mustNotContain(port, 'include: "timeline"', "My Deals must not request timeline include");
mustNotContain(mapper, "deal.updatedAt || deal.stageEnteredAt", "Updated must not prefer updatedAt");

const mapperSrc = read(mapper);
const lastActivityBlock = mapperSrc.slice(
  mapperSrc.indexOf("const lastActivity"),
  mapperSrc.indexOf("const lastModified"),
);
if (!lastActivityBlock.includes("stageEnteredAt")) {
  failures.push("lastActivity block must use stageEnteredAt");
}
if (lastActivityBlock.includes("updatedAt") || lastActivityBlock.includes("disbursedAt")) {
  failures.push("lastActivity must not use updatedAt or disbursedAt");
}

mustContain(runtime, "resolveKanbanDealHealthScore", "Kanban health read-time resolve unchanged");
mustContain(kanban, "dealHealthScoreKanbanTone(caseExecution.dealHealthScore)", "Kanban tone unchanged");
mustContain(proxy, "export function computeDealHealthProxyScore", "Kanban health proxy unchanged");

function apiDeal(overrides = {}) {
  return {
    id: "deal-1",
    dealNumber: "DEAL-2026-000001",
    rowVersion: 1,
    grossStage: "logged_in_wip",
    lifecycleStatus: "active",
    archived: false,
    isDeleted: false,
    opportunityId: "opp-1",
    opportunityNumber: "OPP-2026-000001",
    primaryCounterpartyName: "HDFC",
    productLabel: "Home Loan",
    requestedAmount: 5000000,
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-15T21:03:00.000Z",
    stageEnteredAt: "2026-08-10T12:00:00.000Z",
    disbursedAt: null,
    ...overrides,
  };
}

const withStage = mapEnterpriseDealToDealRegistryRow(apiDeal());
expect("1. uses stageEnteredAt when present", withStage.lastActivity === "2026-08-10T12:00:00.000Z");
expect(
  "1. label formatted from stageEnteredAt not updatedAt",
  withStage.lastActivityLabel !== "" && withStage.lastActivity !== withStage.lastModified,
);

const fallback = mapEnterpriseDealToDealRegistryRow(
  apiDeal({ stageEnteredAt: null, createdAt: "2026-08-01T08:00:00.000Z" }),
);
expect("2. falls back to createdAt", fallback.lastActivity === "2026-08-01T08:00:00.000Z");

const emptyStage = mapEnterpriseDealToDealRegistryRow(
  apiDeal({ stageEnteredAt: "   ", createdAt: "2026-08-01T08:00:00.000Z" }),
);
expect("2. blank stageEnteredAt falls back to createdAt", emptyStage.lastActivity === "2026-08-01T08:00:00.000Z");

expect("3. updatedAt does not become lastActivity", withStage.lastActivity !== withStage.lastModified);
expect(
  "3. lastActivity is not the technical persistence stamp",
  withStage.lastActivity !== "2026-08-15T21:03:00.000Z",
);

const afterTechnicalWrite = mapEnterpriseDealToDealRegistryRow(
  apiDeal({ updatedAt: "2026-08-16T10:00:00.000Z" }),
);
expect(
  "4. later updatedAt does not change lastActivity",
  afterTechnicalWrite.lastActivity === withStage.lastActivity,
);
expect(
  "4. lastActivity still stageEnteredAt after technical write",
  afterTechnicalWrite.lastActivity === "2026-08-10T12:00:00.000Z",
);

const childA = mapEnterpriseDealToDealRegistryRow(
  apiDeal({
    id: "deal-a",
    dealNumber: "DEAL-A",
    stageEnteredAt: "2026-08-08T10:00:00.000Z",
    updatedAt: "2026-08-15T21:03:00.000Z",
    primaryCounterpartyName: "Lender A",
  }),
);
const childB = mapEnterpriseDealToDealRegistryRow(
  apiDeal({
    id: "deal-b",
    dealNumber: "DEAL-B",
    stageEnteredAt: "2026-08-12T09:00:00.000Z",
    updatedAt: "2026-08-15T21:03:00.000Z",
    primaryCounterpartyName: "Lender B",
  }),
);
const groups = groupDealRowsByOpportunity([childA, childB]);
expect("5. one Opportunity group", groups.length === 1);
expect(
  "5. group lastActivity is max child stageEnteredAt",
  groups[0].lastActivity === "2026-08-12T09:00:00.000Z",
);
const executive = deriveOpportunityExecutiveSummary(groups[0].deals);
expect(
  "5. executive lastActivity is max child lastActivity",
  executive.lastActivity === "2026-08-12T09:00:00.000Z",
);

const disbursed = mapEnterpriseDealToDealRegistryRow(
  apiDeal({
    grossStage: "disbursed",
    stageEnteredAt: "2026-08-07T06:42:00.000Z",
    disbursedAt: "2026-08-04T09:15:00.000Z",
    updatedAt: "2026-08-15T21:03:00.000Z",
    createdAt: "2026-07-20T08:00:00.000Z",
  }),
);
expect(
  "6. Disbursed Last Activity uses stageEnteredAt",
  disbursed.lastActivity === "2026-08-07T06:42:00.000Z",
);
expect(
  "6. Disbursed Last Activity is not disbursedAt",
  disbursed.lastActivity !== "2026-08-04T09:15:00.000Z",
);
expect(
  "7. mapper does not consume disbursedAt for lastActivity",
  disbursed.lastActivity !== apiDeal().disbursedAt,
);

const sourceDeal = apiDeal({
  grossStage: "disbursed",
  stageEnteredAt: "2026-08-07T06:42:00.000Z",
  disbursedAt: "2026-08-04T09:15:00.000Z",
});
mapEnterpriseDealToDealRegistryRow(sourceDeal);
expect("7. input disbursedAt unchanged", sourceDeal.disbursedAt === "2026-08-04T09:15:00.000Z");

const earLater = overlayDealRowsWithEarLastActivity([withStage], [
  {
    id: "ear-1",
    organizationId: "org",
    eventKind: "documents",
    sourceSystem: "document_request",
    sourceEventId: "drc_lod",
    title: "LOD Generated",
    summary: null,
    payload: null,
    opportunityId: "opp-1",
    dealId: null,
    contactId: null,
    taskId: null,
    documentId: null,
    actorUserId: null,
    actorName: "RM",
    occurredAt: "2026-08-18T13:50:00.000Z",
    createdAt: "2026-08-18T13:50:00.000Z",
  },
]);
expect(
  "8. later EAR overlays lastActivity",
  earLater[0].lastActivity === "2026-08-18T13:50:00.000Z",
);
expect(
  "8. overlay does not use updatedAt",
  earLater[0].lastActivity !== withStage.lastModified,
);

const earOlder = overlayDealRowsWithEarLastActivity([withStage], [
  {
    id: "ear-old",
    organizationId: "org",
    eventKind: "documents",
    sourceSystem: "document_request",
    sourceEventId: "drc_old",
    title: "LOD Generated",
    summary: null,
    payload: null,
    opportunityId: "opp-1",
    dealId: null,
    contactId: null,
    taskId: null,
    documentId: null,
    actorUserId: null,
    actorName: "RM",
    occurredAt: "2026-08-09T10:00:00.000Z",
    createdAt: "2026-08-09T10:00:00.000Z",
  },
]);
expect(
  "8. older EAR keeps stageEnteredAt fallback",
  earOlder[0].lastActivity === "2026-08-10T12:00:00.000Z",
);

const noiseOnly = overlayDealRowsWithEarLastActivity([withStage], [
  {
    id: "ear-noise",
    organizationId: "org",
    eventKind: "chanakya",
    sourceSystem: "chanakya",
    sourceEventId: "pulse",
    title: "Radar vector hydrate",
    summary: null,
    payload: null,
    opportunityId: "opp-1",
    dealId: null,
    contactId: null,
    taskId: null,
    documentId: null,
    actorUserId: null,
    actorName: null,
    occurredAt: "2026-08-18T21:00:00.000Z",
    createdAt: "2026-08-18T21:00:00.000Z",
  },
]);
expect(
  "8. advisory EAR noise does not move Updated",
  noiseOnly[0].lastActivity === "2026-08-10T12:00:00.000Z",
);

const noEar = overlayDealRowsWithEarLastActivity([withStage], []);
expect(
  "8. no EAR keeps mapper fallback",
  noEar[0].lastActivity === "2026-08-10T12:00:00.000Z",
);

const overlaidGroups = groupDealRowsByOpportunity(earLater);
const overlaidExecutive = deriveOpportunityExecutiveSummary(overlaidGroups[0].deals);
expect(
  "8. Opportunity Updated uses overlaid EAR time",
  overlaidExecutive.lastActivity === "2026-08-18T13:50:00.000Z",
);

if (failures.length) {
  console.error("CO-C1-MY-DEALS-LAST-ACTIVITY-001 VERIFY FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-C1-MY-DEALS-LAST-ACTIVITY-001 VERIFY PASS");
console.log(
  JSON.stringify(
    {
      lastActivity: withStage.lastActivity,
      fallbackCreatedAt: fallback.lastActivity,
      afterTechnicalWrite: afterTechnicalWrite.lastActivity,
      groupMax: groups[0].lastActivity,
      disbursedLastActivity: disbursed.lastActivity,
      disbursedAtUnchanged: sourceDeal.disbursedAt,
    },
    null,
    2,
  ),
);
