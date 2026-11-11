/**
 * Governed audience segments. Does not read the live worksheet or send email.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING } from "../src/constants/enterprise-marketing-engine/hostinger-smtp.ts";
import {
  defaultMarketingConsentPolicy,
  interpretMarketingConsentValue,
  marketingMissingConsentIsGranted,
} from "../src/lib/enterprise-marketing-engine/consent-policy.ts";
import { freezeApprovedAudienceSnapshot } from "../src/lib/enterprise-marketing-engine/freeze-audience.ts";
import { scanMarketingAudienceEligibility } from "../src/lib/enterprise-marketing-engine/eligibility-scan.ts";
import { isCompleteFreezeWorkingSet } from "../src/lib/enterprise-marketing-engine/audience-working-set.ts";
import { createMemoryMarketingDurabilityPorts } from "../src/lib/enterprise-marketing-engine/durability/repositories/memory.ts";
import { createPrismaMarketingDurabilityPorts } from "../src/lib/enterprise-marketing-engine/durability/repositories/prisma.ts";

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, "..");
const consentSource = fs.readFileSync(
  path.join(repo, "src/lib/enterprise-marketing-engine/consent-policy.ts"),
  "utf8",
);
assert.match(consentSource, /requireExplicitConsent:\s*false/);
assert.equal(marketingMissingConsentIsGranted(), false);
assert.equal(interpretMarketingConsentValue("", defaultMarketingConsentPolicy("org-segment")), "missing");
assert.equal(MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING, 2000);

const mapping = {
  confirmed: true,
  confirmedAt: "2026-11-11T00:00:00.000Z",
  confirmedByUserId: "segment-verify",
  map: { email: "MAILINGEMAIL", name: "Customer Name", consent: null, sourceStableKey: null },
  suggested: { email: "MAILINGEMAIL", name: "Customer Name" },
};
const headers = ["Customer Name", "MAILINGEMAIL"];
const inclusion = { version: 1, logic: "AND", rules: [] };
const segmentInclusion = {
  ...inclusion,
  segment: { mode: "next_unassigned", eligibleCap: 2000 },
};

function people(count, prefix = "person") {
  return Array.from({ length: count }, (_, index) => ({
    row: index + 2,
    email: `${prefix}${index}@example.com`,
    name: `Person ${index}`,
  }));
}

function sheetPort(rows, options = {}) {
  const master = JSON.stringify(rows);
  let calls = 0;
  return {
    master,
    rows,
    providerType: "GOOGLE_SHEETS",
    async listBindings() {
      return [];
    },
    async discoverDatasets() {
      return [];
    },
    async getSchema() {
      return {
        headers,
        schemaFingerprint: "segment-verify",
        detectedEmailColumn: "MAILINGEMAIL",
        detectedPhoneColumn: null,
        detectedExternalKeyColumn: null,
      };
    },
    async estimateAudience() {
      return {
        approximateRowCount: rows.length,
        dataRowEstimate: rows.length,
        method: "fixture",
        note: "fixture",
      };
    },
    async streamRows({ cursor, limit }) {
      calls += 1;
      if (options.failOnCall && calls >= options.failOnCall) {
        throw Object.assign(new Error("Google Sheets read quota was exceeded"), {
          statusCode: 429,
          code: "SHEETS_QUOTA_EXCEEDED",
        });
      }
      const start = cursor ? Number(cursor) : 0;
      const slice = rows.slice(start, start + limit);
      const next = start + slice.length < rows.length ? String(start + slice.length) : undefined;
      return {
        headers,
        rows: slice.map((row) => ({ "Customer Name": row.name, MAILINGEMAIL: row.email })),
        sourceRowNumbers: slice.map((row) => row.row),
        nextCursor: next,
      };
    },
  };
}

function freezeInput(ports, port, campaignId, filter, extra = {}) {
  return {
    ports,
    port,
    organizationId: "org-segment",
    campaignId,
    campaignVersionId: `${campaignId}-v1`,
    audienceDefinitionId: `${campaignId}-aud`,
    sourceBindingId: "binding-salaried-2",
    sourceWorkbookId: "workbook-authorised-master",
    sourceTabId: "sheet-gid-salaried-2",
    sourceTabName: "Salaried 2",
    mapping,
    headers,
    inclusion: filter,
    exclusion: inclusion,
    eligibilityRules: {
      requireIdentity: true,
      requireValidEmailIfPresent: true,
      excludeDuplicatesInScan: true,
    },
    lookups: {
      isSuppressed: ({ normalizedEmail }) =>
        normalizedEmail === "blocked@example.com" || normalizedEmail === "gone@example.com",
      isPreviouslyContacted: () => false,
    },
    actorUserId: "segment-verify",
    ...extra,
  };
}

async function emailsOf(ports, campaignId) {
  const snapshots = await ports.snapshots.listByCampaign("org-segment", campaignId);
  const all = [];
  for (const snapshot of snapshots) {
    const rows = await ports.snapshotRecipients.listBySnapshot("org-segment", snapshot.id);
    all.push(...rows.map((row) => row.normalizedEmail));
  }
  return all;
}

const unfilteredPort = sheetPort(people(2500, "full"));
const unfilteredPorts = createMemoryMarketingDurabilityPorts();
const unfilteredScan = await scanMarketingAudienceEligibility({
  port: unfilteredPort,
  bindingId: "binding-salaried-2",
  datasetId: "sheet-gid-salaried-2",
  columnMap: mapping.map,
  mapping,
  inclusion,
  exclusion: inclusion,
  eligibilityRules: {
    requireIdentity: true,
    requireValidEmailIfPresent: true,
    excludeDuplicatesInScan: true,
  },
  purpose: "approval",
});
assert.equal(unfilteredScan.audienceLimitStatus, "over_limit");
assert.equal(unfilteredScan.scanComplete, false);
assert.equal(unfilteredScan.eligibleRecipients.length, 0);
assert.equal(unfilteredScan.segmentAllocation, null);
await assert.rejects(
  () => freezeApprovedAudienceSnapshot(freezeInput(unfilteredPorts, unfilteredPort, "camp-full", inclusion)),
  (error) => error.code === "INCOMPLETE_AUDIENCE_SCAN",
);
assert.equal((await unfilteredPorts.snapshots.listByCampaign("org-segment", "camp-full")).length, 0);
assert.equal(JSON.stringify(unfilteredPort.rows), unfilteredPort.master);

const segmentRows = people(2100, "seg");
const segmentPort = sheetPort(segmentRows);
const segmentPorts = createMemoryMarketingDurabilityPorts();
const beforeMaster = JSON.stringify(segmentRows);
const segmentA = await freezeApprovedAudienceSnapshot(
  freezeInput(segmentPorts, segmentPort, "camp-a", segmentInclusion),
);
assert.equal(segmentA.eligibleCount, 2000);
assert.equal(segmentA.recipients.length, 2000);
assert.equal(new Set(segmentA.recipients.map((row) => row.normalizedEmail)).size, 2000);
const boundary = segmentA.snapshot.filterSnapshot.segmentResult;
assert.equal(boundary.complete, true);
assert.equal(boundary.mode, "next_unassigned");
assert.equal(boundary.eligibleCap, 2000);
assert.ok(boundary.lastSourceRowNumber > 1);

const segmentB = await freezeApprovedAudienceSnapshot(
  freezeInput(segmentPorts, segmentPort, "camp-b", segmentInclusion),
);
assert.equal(segmentB.eligibleCount, 100);
const setA = new Set(segmentA.recipients.map((row) => row.normalizedEmail));
assert.equal(segmentB.recipients.filter((row) => setA.has(row.normalizedEmail)).length, 0);
assert.equal(JSON.stringify(segmentRows), beforeMaster);

const clamped = await freezeApprovedAudienceSnapshot(
  freezeInput(createMemoryMarketingDurabilityPorts(), sheetPort(people(2100, "cap")), "camp-cap", {
    ...inclusion,
    segment: { mode: "next_unassigned", eligibleCap: 5000 },
  }),
);
assert.equal(clamped.eligibleCount, 2000);

const qualityRows = [
  { row: 2, email: "dup@example.com", name: "First" },
  { row: 3, email: "dup@example.com", name: "Second" },
  { row: 4, email: "blocked@example.com", name: "Blocked" },
  { row: 5, email: "gone@example.com", name: "Unsubscribed" },
  { row: 9, email: "kept@example.com", name: "Kept" },
];
const quality = await freezeApprovedAudienceSnapshot(
  freezeInput(createMemoryMarketingDurabilityPorts(), sheetPort(qualityRows), "camp-quality", {
    ...inclusion,
    segment: { mode: "next_unassigned", eligibleCap: 10 },
  }),
);
assert.deepEqual(
  quality.recipients.map((row) => row.normalizedEmail).sort(),
  ["dup@example.com", "kept@example.com"],
);
assert.equal(JSON.stringify(quality.recipients).includes("granted"), false);

const moved = people(4, "move");
const movedPort = sheetPort(moved);
const movedPorts = createMemoryMarketingDurabilityPorts();
const firstOnly = await freezeApprovedAudienceSnapshot(
  freezeInput(movedPorts, movedPort, "camp-move-a", {
    ...inclusion,
    segment: { mode: "next_unassigned", eligibleCap: 1 },
  }),
);
const assignedEmail = firstOnly.recipients[0].normalizedEmail;
const originalRow = firstOnly.recipients[0].sourceRowNumber;
moved.sort((a, b) => a.row - b.row);
const assignedPerson = moved.find((row) => row.email === assignedEmail);
assignedPerson.row = 500;
const next = await freezeApprovedAudienceSnapshot(
  freezeInput(movedPorts, movedPort, "camp-move-b", {
    ...inclusion,
    segment: { mode: "next_unassigned", eligibleCap: 10 },
  }),
);
assert.equal(next.recipients.some((row) => row.normalizedEmail === assignedEmail), false);
assert.notEqual(originalRow, 500);

const interruptedPorts = createMemoryMarketingDurabilityPorts();
await assert.rejects(
  () =>
    freezeApprovedAudienceSnapshot(
      freezeInput(interruptedPorts, sheetPort(people(150, "fail"), { failOnCall: 2 }), "camp-fail", segmentInclusion),
    ),
  (error) => error.code === "SHEETS_QUOTA_EXCEEDED",
);
assert.equal((await interruptedPorts.snapshots.listByCampaign("org-segment", "camp-fail")).length, 0);

const preview = await scanMarketingAudienceEligibility({
  port: sheetPort(people(30, "preview")),
  bindingId: "binding-salaried-2",
  datasetId: "sheet-gid-salaried-2",
  columnMap: mapping.map,
  mapping,
  inclusion: segmentInclusion,
  exclusion: inclusion,
  eligibilityRules: {
    requireIdentity: true,
    requireValidEmailIfPresent: true,
    excludeDuplicatesInScan: true,
  },
  purpose: "preview",
});
assert.equal(preview.segmentAllocation, null);
assert.equal(isCompleteFreezeWorkingSet(preview), false);

const raceRows = people(30, "race");
const racePort = sheetPort(raceRows);
const racePorts = createMemoryMarketingDurabilityPorts();
const raceFilter = { ...inclusion, segment: { mode: "next_unassigned", eligibleCap: 10 } };
const raced = await Promise.allSettled([
  freezeApprovedAudienceSnapshot(freezeInput(racePorts, racePort, "camp-race-a", raceFilter)),
  freezeApprovedAudienceSnapshot(freezeInput(racePorts, racePort, "camp-race-b", raceFilter)),
]);
const fulfilled = raced.filter((result) => result.status === "fulfilled");
const rejected = raced.filter((result) => result.status === "rejected");
assert.equal(fulfilled.length, 1);
assert.equal(rejected.length, 1);
assert.equal(rejected[0].reason.code, "SEGMENT_ALLOCATION_CONFLICT");
const raceEmails = [
  ...(await emailsOf(racePorts, "camp-race-a")),
  ...(await emailsOf(racePorts, "camp-race-b")),
];
assert.equal(raceEmails.length, 10);
assert.equal(new Set(raceEmails).size, 10);
const raceNext = await freezeApprovedAudienceSnapshot(
  freezeInput(racePorts, racePort, "camp-race-c", raceFilter),
);
assert.equal(raceNext.recipients.filter((row) => raceEmails.includes(row.normalizedEmail)).length, 0);

const delegates = [
  "enterpriseMarketingSheetBinding",
  "enterpriseMarketingAudienceDefinition",
  "enterpriseMarketingAudienceSnapshot",
  "enterpriseMarketingSnapshotRecipient",
  "enterpriseMarketingDeliveryBatch",
  "enterpriseMarketingRecipientLedger",
  "enterpriseMarketingExecutionLease",
  "enterpriseMarketingSuppression",
  "enterpriseMarketingEngagementEvent",
  "enterpriseMarketingTestSend",
  "enterpriseMarketingQualification",
  "enterpriseMarketingAuditEvent",
];
const assigned = [];
const lockOrder = [];
let transactionChain = Promise.resolve();
const fake = { $transaction: (fn) => {
  const run = transactionChain.then(() => fn(fake));
  transactionChain = run.then(() => undefined, () => undefined);
  return run;
} };
for (const name of delegates) {
  fake[name] = {
    async findMany() {
      return [];
    },
    async findFirst() {
      return null;
    },
    async create({ data }) {
      return data;
    },
    async update() {
      return {};
    },
    async updateMany() {
      if (name === "enterpriseMarketingSheetBinding") lockOrder.push("lock");
      return { count: 1 };
    },
    async upsert() {
      return {};
    },
  };
}
fake.enterpriseMarketingSnapshotRecipient.findMany = async () => {
  lockOrder.push("read");
  return assigned.map((email) => ({ normalizedEmail: email }));
};
fake.enterpriseMarketingSnapshotRecipient.create = async ({ data }) => {
  assigned.push(data.normalizedEmail);
  lockOrder.push("write");
  return data;
};
const prismaPorts = createPrismaMarketingDurabilityPorts(fake);
const concurrent = await Promise.all([
  prismaPorts.allocateSourceSegment(
    {
      organizationId: "org-segment",
      sourceBindingId: "binding-salaried-2",
      sourceWorkbookId: "workbook-authorised-master",
      sourceTabId: "sheet-gid-salaried-2",
    },
    async ({ assignedEmails, persist }) => {
      assert.equal(assignedEmails.has("race@example.com"), false);
      await persist(
        {
          id: "snap-race",
          organizationId: "org-segment",
          campaignId: "camp-race-prisma",
          campaignVersionId: "camp-race-prisma-v1",
          sourceBindingId: "binding-salaried-2",
          sourceWorkbookId: "workbook-authorised-master",
          sourceTabId: "sheet-gid-salaried-2",
          sourceTabName: "Salaried 2",
          extractedAt: "2026-11-11T00:00:00.000Z",
          frozenAt: "2026-11-11T00:00:00.000Z",
          frozenByUserId: null,
          eligibleCount: 1,
          estimatedBatchCount: 1,
          columnMap: {},
          createdByUserId: null,
          updatedByUserId: null,
          createdAt: "2026-11-11T00:00:00.000Z",
          updatedAt: "2026-11-11T00:00:00.000Z",
        },
        [{
          id: "snap-race-r-1",
          organizationId: "org-segment",
          snapshotId: "snap-race",
          campaignId: "camp-race-prisma",
          sourceWorkbookId: "workbook-authorised-master",
          sourceTabId: "sheet-gid-salaried-2",
          sourceTabName: "Salaried 2",
          sourceRowNumber: 2,
          sourceStableKey: "row:2",
          recipientFingerprint: "email:race@example.com",
          normalizedEmail: "race@example.com",
          displayName: null,
          normalizedMobile: null,
          mappedAttributesJson: {},
          assignedBatchNumber: 1,
          createdAt: "2026-11-11T00:00:00.000Z",
          updatedAt: "2026-11-11T00:00:00.000Z",
        }],
      );
      return "first";
    },
  ),
  prismaPorts.allocateSourceSegment(
    {
      organizationId: "org-segment",
      sourceBindingId: "binding-salaried-2",
      sourceWorkbookId: "workbook-authorised-master",
      sourceTabId: "sheet-gid-salaried-2",
    },
    async ({ assignedEmails }) => {
      assert.equal(assignedEmails.has("race@example.com"), true);
      return "second";
    },
  ),
]);
assert.deepEqual(concurrent.sort(), ["first", "second"]);
assert.deepEqual(lockOrder, ["lock", "read", "write", "lock", "read"]);

console.log(JSON.stringify({
  ok: true,
  unfiltered: "over_limit",
  segmentA: segmentA.eligibleCount,
  segmentB: segmentB.eligibleCount,
  overlap: 0,
  concurrentConflict: true,
  masterUnchanged: true,
  consentGranted: false,
}));
