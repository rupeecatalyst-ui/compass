/**
 * CO-C1-DISBURSED-TIMESTAMP-001 — Disbursed date vs Updated persistence timestamp.
 * Static contract + pure mapping/display checks. No database writes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const serializeFile = "server/services/enterprise-deal/deal-serialize.ts";
const repositoryFile =
  "server/repositories/enterprise-deal/enterprise-deal.repository.ts";
const runtimeFile = "src/lib/enterprise-deal/deal-pipeline-runtime.ts";
const apiClientFile = "src/lib/enterprise-deal/deal-api-client.ts";
const kanbanFile =
  "src/components/catalyst-one/execution/lender-pipeline-board.tsx";
const pipelineConstants = "src/constants/lender-pipeline.ts";
const pdcService =
  "server/services/post-disbursement-confirmation/post-disbursement-confirmation.service.ts";
const pdcConstants = "src/constants/post-disbursement-confirmation.ts";

mustContain(
  serializeFile,
  "disbursedAt: iso(deal.disbursedAt)",
  "serializeDeal includes nullable disbursedAt",
);
mustContain(apiClientFile, "disbursedAt?: string | null", "API client type");
mustContain(
  runtimeFile,
  "disbursedAt: deal.disbursedAt ?? null",
  "pipeline mapping passes disbursedAt",
);
mustContain(runtimeFile, "updatedAt: deal.updatedAt || now", "pipeline mapping keeps updatedAt");
mustContain(kanbanFile, "resolveKanbanCardTimestampLines", "Kanban uses shared timestamp helper");
mustContain(kanbanFile, "caseExecution.disbursedAt", "Kanban reads disbursedAt");
mustContain(
  pipelineConstants,
  'DISBURSED_DATE_UNAVAILABLE_LABEL = "Disbursed date unavailable"',
  "historical null label",
);
mustContain(
  repositoryFile,
  'enteringDisbursed && !deal.disbursedAt ? { disbursedAt: now }',
  "first Disbursed transition writes disbursedAt",
);
mustContain(
  pdcConstants,
  "POST_DISBURSEMENT_CONFIRMATION_DELAY_HOURS = 72",
  "PDC delay hours unchanged",
);
mustContain(
  repositoryFile,
  "POST_DISBURSEMENT_CONFIRMATION_DELAY_HOURS * 60 * 60 * 1000",
  "PDC dueAt from Disbursed transition now",
);
mustNotContain(
  repositoryFile,
  "dueAt: deal.updatedAt",
  "PDC must not schedule from updatedAt",
);
mustNotContain(
  pdcService,
  "dueAt: deal.updatedAt",
  "PDC service must not schedule from updatedAt",
);
mustNotContain(
  kanbanFile,
  "formatKanbanCardDate(caseExecution.updatedAt)",
  "Disbursed card must not format Updated as the only date source inline",
);

const {
  DISBURSED_DATE_UNAVAILABLE_LABEL,
  formatKanbanCardDate,
  resolveKanbanCardTimestampLines,
} = await import("../src/constants/lender-pipeline.ts");
const { dealToLenderExecution } = await import(
  "../src/lib/enterprise-deal/deal-pipeline-runtime.ts"
);

const disbursedAt = "2026-08-04T09:15:00.000Z";
const updatedAt = "2026-08-13T02:00:00.000Z";
const createdAt = "2026-07-20T08:00:00.000Z";

const mapped = dealToLenderExecution({
  id: "deal-disbursed-timestamp-001",
  dealNumber: "DL-TEST-001",
  rowVersion: 3,
  grossStage: "disbursed",
  lifecycleStatus: "active",
  archived: false,
  isDeleted: false,
  createdAt,
  updatedAt,
  disbursedAt,
  snapshot: null,
});

if (mapped.disbursedAt !== disbursedAt) {
  failures.push("dealToLenderExecution must preserve disbursedAt");
}
if (mapped.updatedAt !== updatedAt) {
  failures.push("dealToLenderExecution must preserve updatedAt");
}
if (mapped.createdAt !== createdAt) {
  failures.push("dealToLenderExecution must preserve createdAt");
}

const card = resolveKanbanCardTimestampLines({
  caseStage: mapped.caseStage,
  updatedAt: mapped.updatedAt,
  disbursedAt: mapped.disbursedAt,
});
const expectedDisbursedLabel = formatKanbanCardDate(disbursedAt);
const expectedUpdatedLabel = formatKanbanCardDate(updatedAt);

if (!card.showDisbursedDate) {
  failures.push("Disbursed card must show the Disbursed date line");
}
if (card.disbursedValue !== expectedDisbursedLabel) {
  failures.push(
    `Disbursed card must display disbursedAt (${expectedDisbursedLabel}), got ${card.disbursedValue}`,
  );
}
if (card.updatedLabel !== expectedUpdatedLabel) {
  failures.push(
    `Updated must remain updatedAt (${expectedUpdatedLabel}), got ${card.updatedLabel}`,
  );
}
if (card.disbursedValue === card.updatedLabel) {
  failures.push("Disbursed date must not equal Updated after a later persistence write");
}

const laterUpdate = resolveKanbanCardTimestampLines({
  caseStage: "disbursed",
  updatedAt: "2026-08-16T11:00:00.000Z",
  disbursedAt,
});
if (laterUpdate.disbursedValue !== expectedDisbursedLabel) {
  failures.push("Later updatedAt must not change the displayed Disbursed date");
}
if (laterUpdate.updatedLabel === laterUpdate.disbursedValue) {
  failures.push("Later update must keep Updated distinct from Disbursed");
}

const historical = resolveKanbanCardTimestampLines({
  caseStage: "disbursed",
  updatedAt,
  disbursedAt: null,
});
if (historical.disbursedValue !== DISBURSED_DATE_UNAVAILABLE_LABEL) {
  failures.push("Null disbursedAt must show Disbursed date unavailable");
}
if (historical.disbursedValue === formatKanbanCardDate(updatedAt)) {
  failures.push("Historical Disbursed card must not display updatedAt as Disbursed");
}
if (historical.disbursedValue === formatKanbanCardDate(createdAt)) {
  failures.push("Historical Disbursed card must not display createdAt as Disbursed");
}

const identified = resolveKanbanCardTimestampLines({
  caseStage: "identified",
  updatedAt,
  disbursedAt,
});
if (identified.showDisbursedDate || identified.disbursedValue != null) {
  failures.push("Non-Disbursed stages must not show a Disbursed date line");
}
if (identified.updatedLabel !== expectedUpdatedLabel) {
  failures.push("Non-Disbursed stages must still show Updated from updatedAt");
}

const emptyMapped = dealToLenderExecution({
  id: "deal-historical-null",
  dealNumber: "DL-TEST-002",
  rowVersion: 1,
  grossStage: "disbursed",
  lifecycleStatus: "active",
  archived: false,
  isDeleted: false,
  createdAt,
  updatedAt,
  disbursedAt: null,
});
if (emptyMapped.disbursedAt != null) {
  failures.push("Null disbursedAt must stay null through pipeline mapping");
}

if (failures.length) {
  console.error("CO-C1-DISBURSED-TIMESTAMP-001 VERIFY FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-C1-DISBURSED-TIMESTAMP-001 VERIFY PASS");
console.log(
  JSON.stringify(
    {
      disbursedAt,
      updatedAt,
      displayedDisbursed: card.disbursedValue,
      displayedUpdated: card.updatedLabel,
      historicalFallback: historical.disbursedValue,
    },
    null,
    2,
  ),
);
