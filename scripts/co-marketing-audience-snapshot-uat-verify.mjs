import assert from "node:assert/strict";
import { createPrismaMarketingDurabilityPorts } from "../src/lib/enterprise-marketing-engine/durability/repositories/prisma.ts";
import { createMemoryMarketingDurabilityPorts } from "../src/lib/enterprise-marketing-engine/durability/repositories/memory.ts";
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
];
const port = {
  providerType: "GOOGLE_SHEETS",
  listBindings: async () => [], discoverDatasets: async () => [],
  getSchema: async () => ({ headers, schemaFingerprint: "test" }),
  estimateAudience: async () => ({ approximateRowCount: 4, dataRowEstimate: 4, method: "fixture", note: "" }),
  streamRows: async () => ({ rows, sourceRowNumbers: [2, 3, 4, 5] }),
};
const rules = reloaded.eligibilityRules;
const preview = await scanMarketingAudienceEligibility({
  port, bindingId: "binding", datasetId: "Sheet1", columnMap: reloaded.columnMap,
  mapping: reloaded.mapping, inclusion: filters, exclusion: filters,
  eligibilityRules: rules, purpose: "preview",
});
assert.equal(preview.counts.eligible, 4);

const snapshots = createMemoryMarketingDurabilityPorts();
const freezeInput = {
  ports: snapshots, port, organizationId: "org", campaignId: "campaign",
  campaignVersionId: "version", sourceBindingId: "binding", sourceWorkbookId: "workbook",
  sourceTabId: "Sheet1", sourceTabName: "Sheet1", headers, inclusion: filters,
  exclusion: filters, eligibilityRules: rules, mapping: reloaded.mapping,
};
const frozen = await freezeApprovedAudienceSnapshot(freezeInput);
assert.equal(frozen.eligibleCount, 4);
assert.equal((await snapshots.snapshots.listByCampaign("org", "campaign")).length, 1);
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
console.log("OK: confirmed mapping persists, previews 4 eligible, and freezes; unconfirmed mapping remains blocked");
