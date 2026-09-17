import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { createPrismaMarketingDurabilityPorts } from "../src/lib/enterprise-marketing-engine/durability/repositories/prisma.ts";
import { confirmMarketingColumnMap } from "../src/lib/enterprise-marketing-engine/column-mapping.ts";
import { scanMarketingAudienceEligibility } from "../src/lib/enterprise-marketing-engine/eligibility-scan.ts";
import { freezeApprovedAudienceSnapshot } from "../src/lib/enterprise-marketing-engine/freeze-audience.ts";
import { emptyFilterDefinition } from "../src/lib/enterprise-marketing-engine/audience-filters.ts";

let stored;
const delegate = {
  findMany: async () => stored ? [stored] : [],
  findFirst: async () => stored ?? null,
  create: async () => ({}),
  update: async () => ({}),
  updateMany: async () => ({ count: 0 }),
  upsert: async ({ create }) => {
    stored = { ...create, createdAt: new Date(create.createdAt), updatedAt: new Date(create.updatedAt) };
    return stored;
  },
};
const client = { $transaction: async (fn) => fn(client) };
for (const name of [
  "enterpriseMarketingSheetBinding", "enterpriseMarketingAudienceDefinition",
  "enterpriseMarketingAudienceSnapshot", "enterpriseMarketingSnapshotRecipient",
  "enterpriseMarketingDeliveryBatch", "enterpriseMarketingRecipientLedger",
  "enterpriseMarketingExecutionLease", "enterpriseMarketingSuppression",
  "enterpriseMarketingEngagementEvent", "enterpriseMarketingTestSend",
  "enterpriseMarketingQualification", "enterpriseMarketingAuditEvent",
]) client[name] = delegate;

let storedSnapshot;
const storedRecipients = [];
const snapshotModel = Prisma.dmmf.datamodel.models.find((model) => model.name === "EnterpriseMarketingAudienceSnapshot");
assert.ok(snapshotModel, "generated Prisma client must include the snapshot model");
const snapshotFields = new Set(snapshotModel.fields.map((field) => field.name));
const recipientModel = Prisma.dmmf.datamodel.models.find((model) => model.name === "EnterpriseMarketingSnapshotRecipient");
assert.ok(recipientModel);
const recipientFields = new Set(recipientModel.fields.map((field) => field.name));
client.enterpriseMarketingAudienceSnapshot = {
  ...delegate,
  create: async ({ data }) => {
    const unknown = Object.keys(data).filter((key) => !snapshotFields.has(key));
    const requiredMissing = snapshotModel.fields
      .filter((field) => field.kind === "scalar" && field.isRequired && !field.hasDefaultValue && data[field.name] == null)
      .map((field) => field.name);
    assert.deepEqual(unknown, [], "snapshot create must use generated Prisma field names");
    assert.deepEqual(requiredMissing, [], "snapshot create must provide all required Prisma columns");
    storedSnapshot = structuredClone(data);
    return storedSnapshot;
  },
  findFirst: async ({ where }) => storedSnapshot?.id === where.id && storedSnapshot.organizationId === where.organizationId ? storedSnapshot : null,
  findMany: async ({ where }) => storedSnapshot?.organizationId === where.organizationId && storedSnapshot.campaignId === where.campaignId ? [storedSnapshot] : [],
};
client.enterpriseMarketingSnapshotRecipient = {
  ...delegate,
  create: async ({ data }) => {
    assert.deepEqual(Object.keys(data).filter((key) => !recipientFields.has(key)), []);
    assert.deepEqual(recipientModel.fields
      .filter((field) => field.kind === "scalar" && field.isRequired && !field.hasDefaultValue && data[field.name] == null)
      .map((field) => field.name), []);
    storedRecipients.push(data);
    return data;
  },
  findMany: async ({ where }) => storedRecipients.filter((row) => row.organizationId === where.organizationId && row.snapshotId === where.snapshotId),
};

const durable = createPrismaMarketingDurabilityPorts(client);
const headers = ["Email", "Name", "Mobile", "Location", "Customer ID"];
const map = { email: "Email", name: "Name", mobile: "Mobile", location: "Location", sourceStableKey: "Customer ID" };
const mapping = confirmMarketingColumnMap({ map, headers, confirmedByUserId: "operator" });
const filters = emptyFilterDefinition();
const now = new Date().toISOString();
await durable.audienceDefinitions.upsert({
  id: "audience", organizationId: "org", campaignId: "campaign", bindingId: "binding",
  sourceTabId: "Sheet1", sourceTabName: "Sheet1", columnMap: map, name: "Campaign audience",
  filterDefinition: filters, exclusionDefinition: filters,
  suppressionPolicy: { applyOrgSuppression: true, reasons: [] },
  eligibilityRules: { requireIdentity: true, requireValidEmailIfPresent: true, excludeDuplicatesInScan: true },
  mappingConfirmed: true, mapping, createdByUserId: "operator", updatedByUserId: "operator",
  createdAt: now, updatedAt: now,
});
const [reloaded] = await durable.audienceDefinitions.list("org");
assert.equal(reloaded.mappingConfirmed, true);
assert.deepEqual(reloaded.mapping, mapping);
assert.equal(reloaded.columnMap.sourceStableKey, "Customer ID");

const rows = [
  { Email: "a@example.com", Name: "A", "Customer ID": "1" },
  { Email: "b@example.com", Name: "B", "Customer ID": "2" },
  { Email: "c@example.com", Name: "C", "Customer ID": "3" },
  { Email: "d@example.com", Name: "D", "Customer ID": "4" },
  { Email: "suppressed@example.com", Name: "Suppressed", "Customer ID": "5" },
];
const port = {
  providerType: "GOOGLE_SHEETS",
  listBindings: async () => [], discoverDatasets: async () => [],
  getSchema: async () => ({ headers, schemaFingerprint: "test" }),
  estimateAudience: async () => ({ approximateRowCount: 999, dataRowEstimate: 999, method: "fixture", note: "" }),
  streamRows: async () => ({ rows, sourceRowNumbers: [2, 3, 4, 5, 6] }),
};
const lookups = {
  isSuppressed: ({ normalizedEmail }) => normalizedEmail === "suppressed@example.com",
  isPreviouslyContacted: () => false,
};
const rules = reloaded.eligibilityRules;
const preview = await scanMarketingAudienceEligibility({
  port, bindingId: "binding", datasetId: "Sheet1", columnMap: reloaded.columnMap,
  mapping: reloaded.mapping, inclusion: filters, exclusion: filters,
  eligibilityRules: rules, purpose: "preview", lookups,
});
assert.equal(preview.counts.eligible, 4);
assert.equal(preview.counts.suppressed, 1);

const snapshots = durable;
const freezeInput = {
  ports: snapshots, port, organizationId: "org", campaignId: "campaign",
  campaignVersionId: "version", sourceBindingId: "binding", sourceWorkbookId: "workbook",
  sourceTabId: "Sheet1", sourceTabName: "Sheet1", headers, inclusion: filters,
  exclusion: filters, eligibilityRules: rules, mapping: reloaded.mapping, lookups,
};
const frozen = await freezeApprovedAudienceSnapshot(freezeInput);
assert.equal(frozen.eligibleCount, 4);
const readBack = await snapshots.snapshots.getForOrg(frozen.snapshot.id, "org");
assert.equal(readBack.campaignId, "campaign");
assert.equal(readBack.campaignVersionId, "version");
assert.equal(readBack.sourceRowCount, 999);
assert.equal(readBack.validEmailCount, 5);
assert.equal(readBack.suppressedCount, 1);
assert.equal(readBack.snapshotHash, frozen.snapshotHash);
assert.deepEqual(readBack.columnMap, mapping.map);
assert.equal(storedRecipients.length, 4);
assert.equal((await snapshots.snapshots.listByCampaign("org", "campaign"))[0].id, frozen.snapshot.id);
await durable.audienceDefinitions.upsert({
  ...reloaded, lastSnapshotId: frozen.snapshot.id, lastSnapshotHash: frozen.snapshotHash,
});
const restored = await durable.audienceDefinitions.getForOrg("audience", "org");
assert.equal(restored.lastSnapshotId, frozen.snapshot.id);
assert.equal(restored.mappingConfirmed, true);
await assert.rejects(
  freezeApprovedAudienceSnapshot({ ...freezeInput, mapping: { ...mapping, confirmed: false } }),
  (error) => error.code === "MAPPING_NOT_CONFIRMED",
);
assert.equal((await snapshots.snapshots.listByCampaign("org", "campaign")).length, 1);
console.log("OK: confirmed mapping previews 4, Prisma snapshot create/read-back links campaign, unconfirmed freeze blocked");
