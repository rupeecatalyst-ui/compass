/**
 * Admin run_test_batch stays simulated with production mode on or off.
 * No SMTP, ledger claim, or cursor movement. Controlled five-send is untouched.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.ENTERPRISE_PERSISTENCE_MODE = "memory";
process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE = "memory";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function load(rel) {
  return import(pathToFileURL(resolve(root, rel)).href);
}

const executionSource = readFileSync(
  join(root, "server/services/enterprise-marketing-engine/execution.service.ts"),
  "utf8",
);
const routeSource = readFileSync(join(root, "src/app/api/admin/marketing/campaigns/route.ts"), "utf8");
const testStart = executionSource.indexOf("async runControlledTestBatch");
const fiveStart = executionSource.indexOf("async runControlledFiveRecipientSend");
const testBody = executionSource.slice(testStart, fiveStart);
assert.equal(testBody.includes("tickBatchInternal"), false);
assert.equal(testBody.includes("tickFromFrozenSnapshot"), false);
assert.match(testBody, /simulated_action_does_not_deliver/);
assert.match(testBody, /deliveryLabel: "SIMULATED"/);
assert.match(testBody, /actuallySent: false/);
assert.ok(executionSource.indexOf("assessMarketingControlledFiveGates", fiveStart) > fiveStart);
assert.ok(executionSource.indexOf("tickFromFrozenSnapshot", fiveStart) > fiveStart);
assert.match(routeSource, /Run Test Batch is simulated/);
assert.match(routeSource, /deliveryLabel: "SIMULATED"/);
assert.match(routeSource, /actuallySent: false/);

const [execution, campaigns, campaignStore, delivery, durability, production, memory] = await Promise.all([
  load("server/services/enterprise-marketing-engine/execution.service.ts"),
  load("server/services/enterprise-marketing-engine/campaign.service.ts"),
  load("server/services/enterprise-marketing-engine/campaign-store.ts"),
  load("server/services/enterprise-marketing-engine/email-delivery.service.ts"),
  load("src/lib/enterprise-marketing-engine/durability/composition.ts"),
  load("server/services/enterprise-marketing-engine/production-mode.service.ts"),
  load("src/lib/enterprise-marketing-engine/durability/repositories/memory.ts"),
]);

const ports = memory.createMemoryMarketingDurabilityPorts();
durability.configureMarketingDurabilityTestFixture(ports);

let smtpCalls = 0;
delivery.marketingEmailDeliveryService.deliverForExecutionClaim = async () => {
  smtpCalls += 1;
  throw new Error("SMTP must not be contacted by simulated Run Test Batch");
};

const actor = {
  userId: "test-batch-verify",
  organizationId: "org-test-batch-verify",
  role: "SUPER_ADMIN",
};
const created = await campaigns.marketingCampaignService.create(actor, {
  name: "Simulated test batch",
  channel: "EMAIL",
  product: "home-loan",
});
await campaignStore.marketingCampaignStore.updateCampaign(created.campaign.id, actor.organizationId, {
  status: "RUNNING",
  governance: {
    ...created.campaign.governance,
    approvedAt: "2026-11-10T00:00:00.000Z",
    approvedByUserId: actor.userId,
  },
});
const now = "2026-11-10T00:00:00.000Z";
await ports.snapshots.insert({
  id: "snap-test-batch",
  organizationId: actor.organizationId,
  campaignId: created.campaign.id,
  campaignVersionId: created.draft.id,
  sourceBindingId: "bind-1",
  sourceWorkbookId: "fixture",
  sourceTabId: "tab-1",
  sourceTabName: "Segment",
  extractedAt: now,
  frozenAt: now,
  frozenByUserId: actor.userId,
  eligibleCount: 1,
  estimatedBatchCount: 1,
  columnMap: { email: "Email" },
  snapshotHash: "abc".padEnd(64, "0"),
  createdByUserId: actor.userId,
  updatedByUserId: actor.userId,
  createdAt: now,
  updatedAt: now,
});
await ports.snapshotRecipients.insertMany([
  {
    id: "snap-test-batch-r-1",
    organizationId: actor.organizationId,
    snapshotId: "snap-test-batch",
    campaignId: created.campaign.id,
    sourceWorkbookId: "fixture",
    sourceTabId: "tab-1",
    sourceTabName: "Segment",
    sourceRowNumber: 2,
    sourceStableKey: "row:0001",
    recipientFingerprint: "email:qa.test.batch@rupeecatalyst.com",
    normalizedEmail: "qa.test.batch@rupeecatalyst.com",
    consentState: "missing",
    suppressionState: "clear",
    qualityStatus: "valid",
    mappedValues: { Email: "qa.test.batch@rupeecatalyst.com" },
    createdAt: now,
  },
]);
await execution.marketingExecutionService.configure(
  created.campaign.id,
  actor.organizationId,
  created.campaign.batchPolicy,
  { resetCursor: false },
);
const cursorBefore = execution.marketingExecutionService.getSummary(created.campaign.id).lease?.streamCursor ?? null;
const ledgerBefore = (await ports.ledger.listByCampaign(actor.organizationId, created.campaign.id)).length;

async function run(productionOn, createdAt) {
  await ports.audit.append({
    id: `audit-production-${productionOn ? "on" : "off"}`,
    organizationId: actor.organizationId,
    campaignId: null,
    actorUserId: actor.userId,
    kind: "marketing.production.mode",
    createdAt,
    detailJson: { enabled: productionOn },
  });
  assert.equal(
    await production.isMarketingProductionLiveEnabled(actor.organizationId),
    productionOn,
  );
  const tick = await execution.marketingExecutionService.runControlledTestBatch(
    created.campaign.id,
    actor.organizationId,
    5,
  );
  assert.equal(tick.deliveryLabel, "SIMULATED");
  assert.equal(tick.actuallySent, false);
  assert.equal(tick.dryRun, true);
  assert.equal(tick.liveProviderInvoked, false);
  assert.equal(tick.claimed, 0);
  assert.equal(tick.processed, 0);
  assert.equal(tick.skippedReason, "simulated_action_does_not_deliver");
  assert.equal(tick.testBatchSize, 5);
}

await run(true, "2026-11-10T01:00:00.000Z");
await run(false, "2026-11-10T02:00:00.000Z");

const cursorAfter = execution.marketingExecutionService.getSummary(created.campaign.id).lease?.streamCursor ?? null;
const ledgerAfter = (await ports.ledger.listByCampaign(actor.organizationId, created.campaign.id)).length;
assert.equal(cursorAfter, cursorBefore);
assert.equal(ledgerAfter, ledgerBefore);
assert.equal(smtpCalls, 0);
durability.resetMarketingDurabilityComposition();

console.log(
  JSON.stringify({
    ok: true,
    productionOn: "simulated",
    productionOff: "simulated",
    smtpCalls,
    ledgerAfter,
    cursorUnchanged: cursorAfter === cursorBefore,
  }),
);
