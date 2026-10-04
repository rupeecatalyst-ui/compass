/**
 * CO-MARKETING-REDESIGN-002 — Durable repository contract verifier.
 * Uses an explicit in-memory test fixture. Does not contact a database or send.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

const compositionSrc = read("src/lib/enterprise-marketing-engine/durability/composition.ts");
const prismaSrc = read("src/lib/enterprise-marketing-engine/durability/repositories/prisma.ts");
const campaignSrc = read("server/services/enterprise-marketing-engine/campaign.service.ts");
const executionSrc = read("server/services/enterprise-marketing-engine/execution.service.ts");
const pkg = read("package.json");

assert.doesNotMatch(
  compositionSrc,
  /createMemoryMarketingDurabilityPorts\(/,
  "composition must not auto-create a memory adapter",
);
assert.match(compositionSrc, /configureMarketingDurabilityTestFixture/);
assert.match(compositionSrc, /Refusing in-memory fallback/);
assert.match(prismaSrc, /updateMany/);
assert.doesNotMatch(prismaSrc, /createMemoryMarketingDurabilityPorts/);
assert.match(campaignSrc, /onPause\(campaignId\)/);
assert.match(campaignSrc, /onStop\(campaignId\)/);
assert.match(campaignSrc, /onCancel\(campaignId\)/);
assert.doesNotMatch(
  campaignSrc,
  /if \(action === "PAUSE" \|\| action === "STOP" \|\| action === "CANCEL"\) \{\s*marketingExecutionService\.onStop/,
);
assert.match(executionSrc, /onPause\(campaignId/);
assert.match(executionSrc, /onCancel\(campaignId/);
assert.match(executionSrc, /marketingExecutionService\.onPause\(campaignId\)/);
assert.doesNotMatch(
  executionSrc,
  /pause: async \(campaignId\) => \{\s*marketingExecutionService\.onStop/,
);
assert.match(pkg, /verify:co-marketing-redesign-002/);

const durabilityUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/durability/index.ts"),
).href;
const durability = await import(durabilityUrl);

durability.resetMarketingDurabilityComposition();

const previousMode = process.env.ENTERPRISE_PERSISTENCE_MODE;
process.env.ENTERPRISE_PERSISTENCE_MODE = "prisma";
let productionThrew = false;
try {
  durability.resolveMarketingDurabilityPorts();
} catch (error) {
  productionThrew = true;
  assert.equal(error.code, "DURABLE_PERSISTENCE_UNAVAILABLE");
}
assert.equal(productionThrew, true, "prisma mode must fail closed without configured Prisma ports");
if (previousMode === undefined) delete process.env.ENTERPRISE_PERSISTENCE_MODE;
else process.env.ENTERPRISE_PERSISTENCE_MODE = previousMode;

durability.resetMarketingDurabilityComposition();
const fixture = durability.createMemoryMarketingDurabilityPorts();
assert.equal(fixture.kind, "memory-test-fixture");
durability.configureMarketingDurabilityTestFixture(fixture);

const orgA = "org-a";
const orgB = "org-b";
const campaignId = "camp-1";
const snapshotId = "snap-1";
const ts = nowIso();

await fixture.snapshots.insert({
  id: snapshotId,
  organizationId: orgA,
  campaignId,
  campaignVersionId: "ver-1",
  sourceBindingId: "bind-1",
  sourceWorkbookId: "sheet-1",
  sourceTabId: "tab-1",
  sourceTabName: "Master",
  extractedAt: ts,
  frozenAt: ts,
  frozenByUserId: "actor-1",
  eligibleCount: 2,
  estimatedBatchCount: 1,
  columnMap: { email: "Email" },
  createdByUserId: "actor-1",
  updatedByUserId: "actor-1",
  createdAt: ts,
  updatedAt: ts,
});
await fixture.snapshotRecipients.insertMany([
  {
    id: "rcpt-1",
    organizationId: orgA,
    snapshotId,
    campaignId,
    sourceWorkbookId: "sheet-1",
    sourceTabId: "tab-1",
    sourceTabName: "Master",
    sourceRowNumber: 2,
    sourceStableKey: "row:2",
    recipientFingerprint: "email:one@example.com",
    normalizedEmail: "one@example.com",
    assignedBatchNumber: 1,
    createdAt: ts,
    updatedAt: ts,
  },
  {
    id: "rcpt-2",
    organizationId: orgA,
    snapshotId,
    campaignId,
    sourceWorkbookId: "sheet-1",
    sourceTabId: "tab-1",
    sourceTabName: "Master",
    sourceRowNumber: 3,
    sourceStableKey: "row:3",
    recipientFingerprint: "email:two@example.com",
    normalizedEmail: "two@example.com",
    assignedBatchNumber: 1,
    createdAt: ts,
    updatedAt: ts,
  },
]);
await fixture.leases.upsert({
  id: "lease-1",
  organizationId: orgA,
  campaignId,
  snapshotId,
  nextRunAt: ts,
  streamCursor: "cursor-0",
  lastCompletedBatchNumber: null,
  pauseState: "ACTIVE",
  leaseHolder: null,
  leaseExpiresAt: null,
  createdByUserId: "actor-1",
  updatedByUserId: "actor-1",
  createdAt: ts,
  updatedAt: ts,
});
await fixture.suppressions.upsert({
  id: "sup-1",
  organizationId: orgA,
  identityFingerprint: "email:blocked@example.com",
  normalizedEmail: "blocked@example.com",
  channel: "EMAIL",
  reason: "UNSUBSCRIBE",
  consentStatus: "withdrawn",
  createdByUserId: "actor-1",
  updatedByUserId: "actor-1",
  createdAt: ts,
  updatedAt: ts,
});

const batchClaims = await Promise.all([
  fixture.batches.tryClaim({
    organizationId: orgA,
    campaignId,
    snapshotId,
    batchNumber: 1,
    scheduledAt: ts,
    plannedSize: 100,
    workerId: "w1",
  }),
  fixture.batches.tryClaim({
    organizationId: orgA,
    campaignId,
    snapshotId,
    batchNumber: 1,
    scheduledAt: ts,
    plannedSize: 100,
    workerId: "w2",
  }),
]);
const batchWins = batchClaims.filter((row) => row.ok);
const batchRejects = batchClaims.filter((row) => !row.ok);
assert.equal(batchWins.length, 1, "exactly one worker claims a batch");
assert.equal(batchRejects.length, 1, "second worker is rejected");
assert.equal(batchRejects[0].reason, "concurrency");
const batchId = batchWins[0].record.id;

const claimInput = {
  organizationId: orgA,
  campaignId,
  campaignVersionId: "ver-1",
  snapshotId,
  snapshotRecipientId: "rcpt-1",
  channel: "EMAIL",
  normalizedEmail: "one@example.com",
  sourceStableKey: "row:2",
  idempotencyKey: `${orgA}:${campaignId}:email:one@example.com`,
  batchId,
  batchNumber: 1,
};
const recipientClaims = await Promise.all([
  fixture.ledger.tryClaim({ ...claimInput, workerId: "w1" }),
  fixture.ledger.tryClaim({ ...claimInput, workerId: "w2" }),
]);
const recWins = recipientClaims.filter((row) => row.ok);
const recRejects = recipientClaims.filter((row) => !row.ok);
assert.equal(recWins.length, 1, "exactly one worker claims a recipient");
assert.equal(recRejects.length, 1, "concurrent recipient claim rejected");
assert.equal(recRejects[0].reason, "concurrency");

await fixture.ledger.finalize(orgA, claimInput.idempotencyKey, {
  status: "delivered",
  processedAt: nowIso(),
  providerMessageId: "prov-1",
});
const successRetry = await fixture.ledger.tryClaim({ ...claimInput, workerId: "w3" });
assert.equal(successRetry.ok, false);
assert.equal(successRetry.reason, "already_terminal");

const failKey = `${orgA}:${campaignId}:email:two@example.com`;
const failClaim = await fixture.ledger.tryClaim({
  ...claimInput,
  snapshotRecipientId: "rcpt-2",
  normalizedEmail: "two@example.com",
  sourceStableKey: "row:3",
  idempotencyKey: failKey,
  workerId: "w1",
});
assert.equal(failClaim.ok, true);
await fixture.ledger.finalize(orgA, failKey, { status: "failed", processedAt: nowIso() });
const retry1 = await fixture.ledger.tryClaim({
  ...claimInput,
  snapshotRecipientId: "rcpt-2",
  normalizedEmail: "two@example.com",
  sourceStableKey: "row:3",
  idempotencyKey: failKey,
  workerId: "w1",
});
assert.equal(retry1.ok, true, "failed recipient may retry under policy");
await fixture.ledger.finalize(orgA, failKey, { status: "failed", processedAt: nowIso() });
const retry2 = await fixture.ledger.tryClaim({
  ...claimInput,
  snapshotRecipientId: "rcpt-2",
  normalizedEmail: "two@example.com",
  sourceStableKey: "row:3",
  idempotencyKey: failKey,
  workerId: "w1",
});
assert.equal(retry2.ok, true);
await fixture.ledger.finalize(orgA, failKey, { status: "failed", processedAt: nowIso() });
const retryDenied = await fixture.ledger.tryClaim({
  ...claimInput,
  snapshotRecipientId: "rcpt-2",
  normalizedEmail: "two@example.com",
  sourceStableKey: "row:3",
  idempotencyKey: failKey,
  workerId: "w1",
});
assert.equal(retryDenied.ok, false);
assert.equal(retryDenied.reason, "retry_not_allowed");

const beforePause = await durability.reconstructMarketingExecutionState(fixture, orgA, campaignId);
assert.equal(beforePause.snapshotId, snapshotId);
assert.equal(beforePause.snapshotRecipientCount, 2);
assert.equal(beforePause.streamCursor, "cursor-0");
assert.equal(beforePause.completedRecipientIds.includes("rcpt-1"), true);

const paused = await durability.applyMarketingOperationalControl({
  ports: fixture,
  organizationId: orgA,
  campaignId,
  fromStatus: "RUNNING",
  action: "PAUSE",
  actorUserId: "actor-1",
});
assert.equal(paused.toStatus, "PAUSED");
assert.equal(paused.pauseState, "PAUSED");
const pausedState = await durability.reconstructMarketingExecutionState(fixture, orgA, campaignId);
assert.equal(pausedState.streamCursor, "cursor-0");
assert.equal(pausedState.completedRecipientIds.includes("rcpt-1"), true);

const resumed = await durability.applyMarketingOperationalControl({
  ports: fixture,
  organizationId: orgA,
  campaignId,
  fromStatus: "PAUSED",
  action: "RESUME",
  actorUserId: "actor-1",
});
assert.equal(resumed.toStatus, "RUNNING");
assert.equal(resumed.pauseState, "ACTIVE");
const resumedRecipients = durability.nextUnprocessedSnapshotRecipients(
  await fixture.snapshotRecipients.listBySnapshot(orgA, snapshotId),
  new Set(pausedState.completedRecipientIds),
);
assert.equal(resumedRecipients.some((row) => row.id === "rcpt-1"), false);
assert.equal(resumedRecipients.some((row) => row.id === "rcpt-2"), true);

const stopped = await durability.applyMarketingOperationalControl({
  ports: fixture,
  organizationId: orgA,
  campaignId,
  fromStatus: "RUNNING",
  action: "STOP",
  actorUserId: "actor-1",
});
assert.equal(stopped.toStatus, "STOPPED");
assert.equal(stopped.pauseState, "STOPPED");
let stopResumeBlocked = false;
try {
  await durability.applyMarketingOperationalControl({
    ports: fixture,
    organizationId: orgA,
    campaignId,
    fromStatus: "STOPPED",
    action: "RESUME",
    actorUserId: "actor-1",
  });
} catch (error) {
  stopResumeBlocked = error.code === "STOP_IS_FINAL";
}
assert.equal(stopResumeBlocked, true, "STOP is final");
const afterStop = await fixture.ledger.tryClaim({
  ...claimInput,
  snapshotRecipientId: "rcpt-new",
  normalizedEmail: "three@example.com",
  sourceStableKey: "row:4",
  idempotencyKey: `${orgA}:${campaignId}:email:three@example.com`,
  workerId: "w9",
});
assert.equal(afterStop.ok, false);
assert.equal(afterStop.reason, "stopped");

const orgBRows = await fixture.ledger.listByCampaign(orgB, campaignId);
assert.equal(orgBRows.length, 0);
const orgBSnap = await fixture.snapshots.getForOrg(snapshotId, orgB);
assert.equal(orgBSnap, null);
const orgASnap = await fixture.snapshots.getForOrg(snapshotId, orgA);
assert.ok(orgASnap);

const exported = fixture.exportState();
const restarted = durability.createMemoryMarketingDurabilityPorts(exported);
const reconstructed = await durability.reconstructMarketingExecutionState(restarted, orgA, campaignId);
assert.equal(reconstructed.snapshotId, snapshotId);
assert.equal(reconstructed.snapshotRecipientCount, 2);
assert.equal(reconstructed.pauseState, "STOPPED");
assert.equal(reconstructed.completedRecipientIds.includes("rcpt-1"), true);
assert.equal(reconstructed.suppressionCount, 1);
assert.ok(reconstructed.attemptTotal >= 1);

const audits = await fixture.audit.list(orgA, campaignId);
assert.ok(audits.some((row) => row.kind === "campaign.pause"));
assert.ok(audits.some((row) => row.kind === "campaign.resume"));
assert.ok(audits.some((row) => row.kind === "campaign.stop"));

const cancelFixture = durability.createMemoryMarketingDurabilityPorts();
await cancelFixture.leases.upsert({
  id: "lease-c",
  organizationId: orgA,
  campaignId: "camp-cancel",
  snapshotId: null,
  nextRunAt: ts,
  streamCursor: null,
  lastCompletedBatchNumber: null,
  pauseState: "ACTIVE",
  leaseHolder: null,
  leaseExpiresAt: null,
  createdByUserId: null,
  updatedByUserId: null,
  createdAt: ts,
  updatedAt: ts,
});
const cancelled = await durability.applyMarketingOperationalControl({
  ports: cancelFixture,
  organizationId: orgA,
  campaignId: "camp-cancel",
  fromStatus: "SCHEDULED",
  action: "CANCEL",
  actorUserId: "actor-1",
});
assert.equal(cancelled.toStatus, "CANCELLED");

assert.equal(
  durability.canRetryFailedMarketingDelivery("delivered", 1),
  false,
);
assert.equal(durability.canRetryFailedMarketingDelivery("failed", 1), true);
assert.equal(durability.canRetryFailedMarketingDelivery("failed", 3), false);

const decisionSuccess = durability.decideMarketingRecipientClaim(
  { status: "delivered", attemptCount: 1, claimedAt: ts },
  Date.now(),
);
assert.equal(decisionSuccess.action, "reject");
assert.equal(decisionSuccess.reason, "already_terminal");

console.log("OK: CO-MARKETING-REDESIGN-002 durability contracts (fixture, no database)");
console.log("ATOMIC_CLAIM=pass");
console.log("CONCURRENCY_REJECTION=pass");
console.log("RESTART_RECONSTRUCTION=pass");
console.log("SUCCESS_DEDUP=pass");
console.log("FAILED_RETRY_POLICY=pass");
console.log("PAUSE_RESUME=pass");
console.log("STOP_FINAL=pass");
console.log("ORG_ISOLATION=pass");
console.log("NO_PRODUCTION_MEMORY_FALLBACK=pass");
