/**
 * Schema-faithful controlled-five execution.
 * Validates every create/upsert in the real Prisma adapter against prisma/schema.prisma.
 * Does not open a database connection and does not send email.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function ts(rel) {
  return pathToFileURL(resolve(root, rel)).href;
}

const schema = readFileSync(join(root, "prisma", "schema.prisma"), "utf8");
const SCALARS = new Set(["String", "Int", "Boolean", "DateTime", "Json", "Float", "Decimal", "BigInt", "Bytes"]);
const MODELS = [
  "EnterpriseMarketingAudienceSnapshot",
  "EnterpriseMarketingSnapshotRecipient",
  "EnterpriseMarketingDeliveryBatch",
  "EnterpriseMarketingRecipientLedger",
  "EnterpriseMarketingExecutionLease",
  "EnterpriseMarketingAuditEvent",
];

function requiredScalars(modelName) {
  const start = schema.indexOf(`model ${modelName} {`);
  if (start < 0) throw new Error(`Schema model ${modelName} was not found`);
  const body = schema.slice(start, schema.indexOf("\n}", start));
  const required = [];
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("@@") || trimmed.startsWith("model ")) continue;
    const match = trimmed.match(/^(\w+)\s+([A-Za-z0-9_]+)(\?)?/);
    if (!match) continue;
    const [, field, type, optional] = match;
    if (!SCALARS.has(type) || optional || /@default\(/.test(trimmed) || /@updatedAt\b/.test(trimmed)) continue;
    required.push(field);
  }
  return required;
}

const requiredByModel = Object.fromEntries(MODELS.map((name) => [name, requiredScalars(name)]));
for (const name of ["EnterpriseMarketingDeliveryBatch", "EnterpriseMarketingRecipientLedger", "EnterpriseMarketingExecutionLease"]) {
  assert.ok(requiredByModel[name].includes("id"), `${name} id must stay required`);
}
assert.ok(requiredByModel.EnterpriseMarketingExecutionLease.includes("batchPolicyJson"));
assert.ok(requiredByModel.EnterpriseMarketingRecipientLedger.includes("recipientFingerprint"));
assert.ok(requiredByModel.EnterpriseMarketingRecipientLedger.includes("sourceWorkbookId"));

function assertCreateData(modelName, data) {
  for (const field of requiredByModel[modelName]) {
    if (data?.[field] === undefined) {
      throw new Error(`Argument \`${field}\` is missing.`);
    }
  }
}

assert.throws(
  () => assertCreateData("EnterpriseMarketingDeliveryBatch", { organizationId: "org", campaignId: "camp" }),
  /Argument `id` is missing/,
);

function matches(row, where) {
  if (!where) return true;
  return Object.entries(where).every(([key, expected]) => {
    if (expected && typeof expected === "object" && !Array.isArray(expected) && !(expected instanceof Date)) {
      if ("in" in expected) return expected.in.includes(row[key]);
      return false;
    }
    return row[key] === expected;
  });
}

function applyPatch(row, data) {
  for (const [key, value] of Object.entries(data ?? {})) {
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && "increment" in value) {
      row[key] = Number(row[key] ?? 0) + Number(value.increment);
    } else {
      row[key] = value;
    }
  }
}

function delegate(modelName) {
  const rows = [];
  return {
    rows,
    async findFirst({ where } = {}) {
      return rows.find((row) => matches(row, where)) ?? null;
    },
    async findMany({ where } = {}) {
      return rows.filter((row) => matches(row, where));
    },
    async create({ data }) {
      assertCreateData(modelName, data);
      const row = { ...data };
      rows.push(row);
      return row;
    },
    async updateMany({ where, data }) {
      const found = rows.filter((row) => matches(row, where));
      for (const row of found) applyPatch(row, data);
      return { count: found.length };
    },
    async upsert({ where, create, update }) {
      const existing = rows.find((row) => matches(row, where));
      if (!existing) return this.create({ data: create });
      applyPatch(existing, update);
      return existing;
    },
    async update() {
      throw new Error(`${modelName}.update is not used by this execution path`);
    },
  };
}

const delegates = Object.fromEntries(
  [
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
  ].map((key) => {
    const modelName = key[0].toUpperCase() + key.slice(1);
    return [key, delegate(MODELS.includes(modelName) ? modelName : "EnterpriseMarketingAuditEvent")];
  }),
);

const client = {
  $transaction: async (fn) => fn(client),
  ...delegates,
};

const prismaPorts = await import(ts("src/lib/enterprise-marketing-engine/durability/repositories/prisma.ts"));
const worker = await import(ts("src/lib/enterprise-marketing-engine/execution/snapshot-pacing-worker.ts"));
const executionDefaults = await import(ts("src/constants/enterprise-marketing-engine/execution.ts"));

const ORG = "org-schema-five";
const CAMPAIGN = "camp-schema-five";
const ports = prismaPorts.createPrismaMarketingDurabilityPorts(client);
const tsNow = "2026-10-25T04:00:00.000Z";
const emails = ["one@example.com", "two@example.com", "three@example.com", "four@example.com", "five@example.com"];

await ports.snapshots.insert({
  id: "snap-schema-five",
  organizationId: ORG,
  campaignId: CAMPAIGN,
  campaignVersionId: "ver-schema-five",
  sourceBindingId: "bind-schema",
  sourceWorkbookId: "fixture-marketing-master",
  sourceTabId: "tab-test",
  sourceTabName: "Test",
  extractedAt: tsNow,
  frozenAt: tsNow,
  frozenByUserId: "admin",
  eligibleCount: emails.length,
  estimatedBatchCount: 1,
  columnMap: { email: "Email", name: "Full Name" },
  snapshotHash: "abc".padEnd(64, "0"),
  createdByUserId: "admin",
  updatedByUserId: "admin",
  createdAt: tsNow,
  updatedAt: tsNow,
});
await ports.snapshotRecipients.insertMany(
  emails.map((email, index) => ({
    id: `snap-schema-five-r-${index + 1}`,
    organizationId: ORG,
    snapshotId: "snap-schema-five",
    campaignId: CAMPAIGN,
    sourceWorkbookId: "fixture-marketing-master",
    sourceTabId: "tab-test",
    sourceTabName: "Test",
    sourceRowNumber: index + 2,
    sourceStableKey: `row:${index + 1}`,
    recipientFingerprint: `email:${email}`,
    normalizedEmail: email,
    displayName: `Recipient ${index + 1}`,
    normalizedMobile: null,
    mappedAttributesJson: { firstName: "Recipient", city: "Pune", product: "Home Loan" },
    assignedBatchNumber: 1,
    createdAt: tsNow,
    updatedAt: tsNow,
  })),
);

const policy = {
  ...executionDefaults.MARKETING_DEFAULT_BATCH_POLICY,
  batchSize: 5,
  dailyMax: 5,
  startAt: tsNow,
};
let providerCalls = 0;
const first = await worker.runMarketingSnapshotPacingTick({
  ports,
  organizationId: ORG,
  campaignId: CAMPAIGN,
  campaignVersionId: "ver-schema-five",
  channel: "EMAIL",
  policy,
  holderId: "schema-worker",
  now: new Date(tsNow),
  forceRun: true,
  campaignStatus: "APPROVED",
  controlledRecipientDeliveryAuthorized: true,
  deliver: async () => {
    providerCalls += 1;
    return {
      status: "sent",
      retryable: false,
      dryRun: false,
      providerMessageId: `mock-msg-${providerCalls}`,
      liveProviderInvoked: true,
    };
  },
});

const batches = await ports.batches.listByCampaign(ORG, CAMPAIGN);
const ledger = await ports.ledger.listByCampaign(ORG, CAMPAIGN);
assert.equal(first.processed, 5);
assert.equal(first.failed, 0);
assert.equal(first.claimed, 5);
assert.equal(providerCalls, 5);
assert.equal(batches.length, 1);
assert.match(batches[0].id, /^mkt-batch-/);
assert.equal(batches[0].status, "processed");
assert.equal(ledger.length, 5);
for (const row of ledger) {
  assert.match(row.id, /^mkt-led-/);
  assert.equal(row.attemptCount, 1);
  assert.match(row.providerMessageId, /^mock-msg-/);
  assert.equal(row.status, "sent");
  assert.equal(row.sourceWorkbookId, "fixture-marketing-master");
  assert.equal(row.sourceTabId, "tab-test");
  assert.equal(row.sourceTabName, "Test");
  assert.ok(row.recipientFingerprint);
  assert.equal(row.batchId, batches[0].id);
}

const second = await worker.runMarketingSnapshotPacingTick({
  ports,
  organizationId: ORG,
  campaignId: CAMPAIGN,
  campaignVersionId: "ver-schema-five",
  channel: "EMAIL",
  policy,
  holderId: "schema-worker-2",
  now: new Date("2026-10-25T05:00:00.000Z"),
  forceRun: true,
  campaignStatus: "APPROVED",
  deliver: async () => {
    throw new Error("A second tick must not invoke the provider");
  },
});
const ledgerAfter = await ports.ledger.listByCampaign(ORG, CAMPAIGN);
assert.equal(second.skippedReason, "campaign_complete");
assert.equal(second.campaignComplete, true);
assert.equal(second.processed, 0);
assert.equal(ledgerAfter.length, 5);
assert.equal((await ports.batches.listByCampaign(ORG, CAMPAIGN)).length, 1);

console.log(
  JSON.stringify({
    ok: true,
    schema: "prisma/schema.prisma",
    databaseConnection: false,
    smtpCalls: 0,
    providerMockCalls: providerCalls,
    batches: batches.length,
    ledger: ledgerAfter.length,
    providerResults: ledgerAfter.filter((row) => row.providerMessageId).length,
    secondTick: second.skippedReason,
  }),
);
