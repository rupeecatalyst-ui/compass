/**
 * CO-MARKETING-REDESIGN-004 — Restart-safe scheduler and paced delivery engine.
 * Local fixtures only. No Google, Prisma apply, live send, cron registration, commit, or deploy.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function mustInclude(haystack, needle, label = needle) {
  assert.ok(haystack.includes(needle), `missing ${label}`);
}

const pkg = read("package.json");
const executionConst = read("src/constants/enterprise-marketing-engine/execution.ts");
const plannerSrc = read("src/lib/enterprise-marketing-engine/execution/snapshot-pacing-plan.ts");
const workerSrc = read("src/lib/enterprise-marketing-engine/execution/snapshot-pacing-worker.ts");
const cronActivationSrc = read("src/lib/enterprise-marketing-engine/execution/cron-activation.ts");
const cronRouteSrc = read("src/app/api/cron/marketing-pacing/route.ts");
const executionSrc = read("server/services/enterprise-marketing-engine/execution.service.ts");
const vercel = read("vercel.json");

mustInclude(pkg, "verify:co-marketing-redesign-004");
mustInclude(executionConst, "batchSize: MARKETING_DEFAULT_BATCH_SIZE");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_SIZE = 100");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_INTERVAL_MS = 60 * 60 * 1000");
mustInclude(executionConst, 'timezone: "Asia/Kolkata"');
mustInclude(plannerSrc, "computeMarketingSnapshotPacingPlan");
mustInclude(plannerSrc, "splitMarketingBatchSizes");
mustInclude(workerSrc, "runMarketingSnapshotPacingTick");
mustInclude(workerSrc, "SNAPSHOT_REQUIRED");
mustInclude(workerSrc, "liveSheetReread: false");
mustInclude(workerSrc, "tryAcquire");
mustInclude(workerSrc, "campaign_paused");
mustInclude(workerSrc, "campaign_stopped");
mustInclude(workerSrc, "lease_held_by_other_worker");
mustInclude(cronActivationSrc, "MARKETING_PACING_CRON_REGISTERED = false");
mustInclude(cronActivationSrc, "CRON_NOT_ACTIVATED");
mustInclude(cronRouteSrc, "CRON_NOT_ACTIVATED");
mustInclude(executionSrc, "tickFromFrozenSnapshot");
mustInclude(executionSrc, "runMarketingSnapshotPacingTick");
mustInclude(executionSrc, "completedAt: null");
assert.doesNotMatch(workerSrc, /streamRows/);
assert.doesNotMatch(workerSrc, /resend|nodemailer|twilio|sendgrid/i);
assert.doesNotMatch(vercel, /marketing-pacing/);
assert.doesNotMatch(vercel, /marketing-execution/);
assert.doesNotMatch(executionSrc, /createContact\(|createOpportunity\(/);

process.env.ENTERPRISE_PERSISTENCE_MODE = "memory";
process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE = "memory";
process.env.ENTERPRISE_MARKETING_PACING_CRON_ENABLED = "true";

const plannerUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/execution/snapshot-pacing-plan.ts"),
).href;
const workerUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/execution/snapshot-pacing-worker.ts"),
).href;
const cronUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/execution/cron-activation.ts"),
).href;
const durabilityUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/durability/index.ts"),
).href;
const policyUrl = pathToFileURL(
  resolve(root, "src/constants/enterprise-marketing-engine/execution.ts"),
).href;

const planner = await import(plannerUrl);
const worker = await import(workerUrl);
const cron = await import(cronUrl);
const durability = await import(durabilityUrl);
const executionDefaults = await import(policyUrl);

assert.equal(executionDefaults.MARKETING_DEFAULT_BATCH_SIZE, 100);
assert.equal(executionDefaults.MARKETING_DEFAULT_BATCH_INTERVAL_MS, 60 * 60 * 1000);
assert.equal(executionDefaults.MARKETING_DEFAULT_BATCH_POLICY.batchSize, 100);
assert.equal(executionDefaults.MARKETING_DEFAULT_BATCH_POLICY.intervalMs, 60 * 60 * 1000);
assert.equal(cron.MARKETING_PACING_CRON_REGISTERED, false);
assert.equal(cron.isMarketingPacingCronActivated(), false, "env flag alone must not activate cron");

const defaultPolicy = {
  ...executionDefaults.MARKETING_DEFAULT_BATCH_POLICY,
  startAt: "2026-09-04T03:30:00.000Z",
};
const sizes = planner.splitMarketingBatchSizes(250, 100);
assert.deepEqual(sizes, [100, 100, 50]);

const defaultPlan = planner.computeMarketingSnapshotPacingPlan({
  eligibleCount: 250,
  policy: defaultPolicy,
  now: new Date("2026-09-04T03:30:00.000Z"),
});
assert.deepEqual(
  defaultPlan.batches.map((b) => b.size),
  [100, 100, 50],
);
assert.deepEqual(
  defaultPlan.batches.map((b) => b.batchNumber),
  [1, 2, 3],
);
assert.equal(defaultPlan.firstBatchAt, "2026-09-04T03:30:00.000Z");
assert.equal(defaultPlan.expectedCompletionAt, defaultPlan.batches[2].scheduledAt);
for (let i = 1; i < defaultPlan.batches.length; i += 1) {
  const gap =
    Date.parse(defaultPlan.batches[i].scheduledAt) - Date.parse(defaultPlan.batches[i - 1].scheduledAt);
  assert.ok(gap >= 60 * 60 * 1000, `batch ${i + 1} must be at least 60 minutes after batch ${i}`);
}

const windowPolicy = {
  ...defaultPolicy,
  sendWindowStart: "09:00",
  sendWindowEnd: "11:00",
  startAt: "2026-09-04T04:30:00.000Z",
};
const windowPlan = planner.computeMarketingSnapshotPacingPlan({
  eligibleCount: 250,
  policy: windowPolicy,
  now: new Date("2026-09-04T04:30:00.000Z"),
});
assert.equal(windowPlan.batches[0].zonedDateKey, "2026-09-04");
assert.equal(windowPlan.batches[1].zonedDateKey, "2026-09-05", "batch 2 must roll to the next permitted window");
assert.equal(windowPlan.batches[2].zonedDateKey, "2026-09-05");
assert.ok(
  Date.parse(windowPlan.batches[1].scheduledAt) - Date.parse(windowPlan.batches[0].scheduledAt) >=
    60 * 60 * 1000,
);

const capPolicy = {
  ...defaultPolicy,
  dailyMax: 100,
  sendWindowStart: "09:00",
  sendWindowEnd: "19:00",
  startAt: "2026-09-04T03:30:00.000Z",
};
const capPlan = planner.computeMarketingSnapshotPacingPlan({
  eligibleCount: 250,
  policy: capPolicy,
  now: new Date("2026-09-04T03:30:00.000Z"),
});
assert.equal(capPlan.batches[0].zonedDateKey, "2026-09-04");
assert.equal(capPlan.batches[1].zonedDateKey, "2026-09-05", "daily cap must roll batch 2 to the next day");
assert.equal(capPlan.batches[2].zonedDateKey, "2026-09-06", "daily cap must roll batch 3 after day-2 fill");
assert.equal(capPlan.firstBatchAt, capPlan.batches[0].scheduledAt);
assert.equal(capPlan.expectedCompletionAt, capPlan.batches[2].scheduledAt);

function nowIso() {
  return new Date().toISOString();
}

async function seedSnapshot(ports, input) {
  const ts = nowIso();
  const snapshot = await ports.snapshots.insert({
    id: input.snapshotId,
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    campaignVersionId: input.campaignVersionId,
    sourceBindingId: "bind-1",
    sourceWorkbookId: "fixture-marketing-master",
    sourceTabId: "tab-1",
    sourceTabName: "Segment",
    extractedAt: ts,
    frozenAt: ts,
    frozenByUserId: "actor-1",
    eligibleCount: input.emails.length,
    estimatedBatchCount: Math.ceil(input.emails.length / 100),
    columnMap: { email: "Email" },
    snapshotHash: "abc".padEnd(64, "0"),
    createdByUserId: "actor-1",
    updatedByUserId: "actor-1",
    createdAt: ts,
    updatedAt: ts,
  });
  await ports.snapshotRecipients.insertMany(
    input.emails.map((email, index) => ({
      id: `${input.snapshotId}-r-${index + 1}`,
      organizationId: input.organizationId,
      snapshotId: snapshot.id,
      campaignId: input.campaignId,
      sourceWorkbookId: "fixture-marketing-master",
      sourceTabId: "tab-1",
      sourceTabName: "Segment",
      sourceRowNumber: index + 2,
      sourceStableKey: `row:${String(index + 1).padStart(4, "0")}`,
      recipientFingerprint: `email:${email}`,
      normalizedEmail: email,
      assignedBatchNumber: Math.floor(index / 100) + 1,
      createdAt: ts,
      updatedAt: ts,
    })),
  );
  await ports.leases.upsert({
    id: `lease-${input.campaignId}`,
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    snapshotId: snapshot.id,
    nextRunAt: ts,
    streamCursor: null,
    lastCompletedBatchNumber: null,
    pauseState: "ACTIVE",
    leaseHolder: null,
    leaseExpiresAt: null,
    dailyProcessedCount: 0,
    dailyCountResetDate: "2026-09-04",
    lastError: null,
    createdByUserId: "actor-1",
    updatedByUserId: "actor-1",
    createdAt: ts,
    updatedAt: ts,
  });
  return snapshot;
}

function emails(count, prefix = "user") {
  return Array.from({ length: count }, (_, i) => `${prefix}.${String(i + 1).padStart(3, "0")}@example.com`);
}

async function tick(ports, campaignId, holderId, extras = {}) {
  return worker.runMarketingSnapshotPacingTick({
    ports,
    organizationId: "org-004",
    campaignId,
    campaignVersionId: "ver-004",
    channel: "EMAIL",
    policy: extras.policy ?? defaultPolicy,
    holderId,
    now: extras.now ?? new Date("2026-09-04T03:30:00.000Z"),
    forceRun: extras.forceRun ?? true,
    probe: extras.probe,
    deliver: extras.deliver,
    campaignStatus: extras.campaignStatus,
  });
}

durability.resetMarketingDurabilityComposition();
const ports = durability.createMemoryMarketingDurabilityPorts();
durability.configureMarketingDurabilityTestFixture(ports);

const probe = worker.createMarketingPacingProviderProbe();
await seedSnapshot(ports, {
  organizationId: "org-004",
  campaignId: "camp-250",
  campaignVersionId: "ver-004",
  snapshotId: "snap-250",
  emails: emails(250),
});

const batch1 = await tick(ports, "camp-250", "worker-1", { probe });
assert.equal(batch1.batchNumber, 1);
assert.equal(batch1.processed, 100);
assert.equal(batch1.dryRun, true);
assert.equal(batch1.liveSheetReread, false);
assert.equal(batch1.liveProviderInvoked, false);
assert.equal(batch1.campaignComplete, false);
assert.equal(probe.liveProviderCalls, 0);
assert.equal(probe.dryRunDeliveries, 100);

const reconstructed = await durability.reconstructMarketingExecutionState(ports, "org-004", "camp-250");
assert.equal(reconstructed.completedRecipientIds.length, 100);
assert.equal(reconstructed.snapshotId, "snap-250");

const batch2 = await tick(ports, "camp-250", "worker-restart", { probe });
assert.equal(batch2.batchNumber, 2);
assert.equal(batch2.processed, 100);
assert.equal(batch2.recovered === true || batch2.recovered === false, true);
const ledgerAfterTwo = await ports.ledger.listByCampaign("org-004", "camp-250");
const sentAfterTwo = ledgerAfterTwo.filter((row) => row.status === "sent");
assert.equal(sentAfterTwo.length, 200, "restart must continue without duplicating batch 1");

const batch3 = await tick(ports, "camp-250", "worker-3", { probe });
assert.equal(batch3.batchNumber, 3);
assert.equal(batch3.processed, 50);
assert.equal(batch3.campaignComplete, true);
assert.equal(probe.liveProviderCalls, 0);
assert.equal(probe.dryRunDeliveries, 250);

const replay = await tick(ports, "camp-250", "worker-replay", { probe });
assert.equal(replay.campaignComplete, true);
assert.equal(replay.processed, 0);
const ledgerFinal = await ports.ledger.listByCampaign("org-004", "camp-250");
assert.equal(ledgerFinal.filter((row) => row.status === "sent").length, 250);

const concurrentPorts = durability.createMemoryMarketingDurabilityPorts();
await seedSnapshot(concurrentPorts, {
  organizationId: "org-004",
  campaignId: "camp-lock",
  campaignVersionId: "ver-004",
  snapshotId: "snap-lock",
  emails: emails(20, "lock"),
});
const held = await concurrentPorts.leases.tryAcquire("org-004", "camp-lock", "worker-a", 90_000);
assert.equal(held, true);
const concurrent = await worker.runMarketingSnapshotPacingTick({
  ports: concurrentPorts,
  organizationId: "org-004",
  campaignId: "camp-lock",
  campaignVersionId: "ver-004",
  channel: "EMAIL",
  policy: defaultPolicy,
  holderId: "worker-b",
  now: new Date("2026-09-04T03:30:00.000Z"),
  forceRun: true,
});
assert.equal(concurrent.skippedReason, "lease_held_by_other_worker");
assert.equal(concurrent.processed, 0);
assert.equal(concurrent.campaignComplete, false);
await concurrentPorts.leases.release("org-004", "camp-lock", "worker-a");
const afterRelease = await worker.runMarketingSnapshotPacingTick({
  ports: concurrentPorts,
  organizationId: "org-004",
  campaignId: "camp-lock",
  campaignVersionId: "ver-004",
  channel: "EMAIL",
  policy: defaultPolicy,
  holderId: "worker-b",
  now: new Date("2026-09-04T03:30:00.000Z"),
  forceRun: true,
});
assert.equal(afterRelease.processed, 20);

const pausePorts = durability.createMemoryMarketingDurabilityPorts();
await seedSnapshot(pausePorts, {
  organizationId: "org-004",
  campaignId: "camp-pause",
  campaignVersionId: "ver-004",
  snapshotId: "snap-pause",
  emails: emails(250, "pause"),
});
const pauseFirst = await worker.runMarketingSnapshotPacingTick({
  ports: pausePorts,
  organizationId: "org-004",
  campaignId: "camp-pause",
  campaignVersionId: "ver-004",
  channel: "EMAIL",
  policy: defaultPolicy,
  holderId: "worker-pause-1",
  now: new Date("2026-09-04T03:30:00.000Z"),
  forceRun: true,
});
assert.equal(pauseFirst.processed, 100);
const paused = await durability.applyMarketingOperationalControl({
  ports: pausePorts,
  organizationId: "org-004",
  campaignId: "camp-pause",
  fromStatus: "RUNNING",
  action: "PAUSE",
  actorUserId: "actor-1",
});
assert.equal(paused.pauseState, "PAUSED");
const pausedTick = await worker.runMarketingSnapshotPacingTick({
  ports: pausePorts,
  organizationId: "org-004",
  campaignId: "camp-pause",
  campaignVersionId: "ver-004",
  channel: "EMAIL",
  policy: defaultPolicy,
  holderId: "worker-pause-2",
  now: new Date("2026-09-04T04:30:00.000Z"),
  forceRun: true,
  campaignStatus: "PAUSED",
});
assert.equal(pausedTick.skippedReason, "campaign_paused");
assert.equal(pausedTick.campaignComplete, false);
assert.equal(pausedTick.processed, 0);
const afterPauseLedger = await pausePorts.ledger.listByCampaign("org-004", "camp-pause");
assert.equal(afterPauseLedger.filter((row) => row.status === "sent").length, 100);

const resumed = await durability.applyMarketingOperationalControl({
  ports: pausePorts,
  organizationId: "org-004",
  campaignId: "camp-pause",
  fromStatus: "PAUSED",
  action: "RESUME",
  actorUserId: "actor-1",
});
assert.equal(resumed.pauseState, "ACTIVE");
const resumeTick = await worker.runMarketingSnapshotPacingTick({
  ports: pausePorts,
  organizationId: "org-004",
  campaignId: "camp-pause",
  campaignVersionId: "ver-004",
  channel: "EMAIL",
  policy: defaultPolicy,
  holderId: "worker-pause-3",
  now: new Date("2026-09-04T04:30:00.000Z"),
  forceRun: true,
});
assert.equal(resumeTick.batchNumber, 2);
assert.equal(resumeTick.processed, 100);

const stopPorts = durability.createMemoryMarketingDurabilityPorts();
await seedSnapshot(stopPorts, {
  organizationId: "org-004",
  campaignId: "camp-stop",
  campaignVersionId: "ver-004",
  snapshotId: "snap-stop",
  emails: emails(250, "stop"),
});
await worker.runMarketingSnapshotPacingTick({
  ports: stopPorts,
  organizationId: "org-004",
  campaignId: "camp-stop",
  campaignVersionId: "ver-004",
  channel: "EMAIL",
  policy: defaultPolicy,
  holderId: "worker-stop-1",
  now: new Date("2026-09-04T03:30:00.000Z"),
  forceRun: true,
});
await durability.applyMarketingOperationalControl({
  ports: stopPorts,
  organizationId: "org-004",
  campaignId: "camp-stop",
  fromStatus: "RUNNING",
  action: "STOP",
  actorUserId: "actor-1",
});
const stoppedTick = await worker.runMarketingSnapshotPacingTick({
  ports: stopPorts,
  organizationId: "org-004",
  campaignId: "camp-stop",
  campaignVersionId: "ver-004",
  channel: "EMAIL",
  policy: defaultPolicy,
  holderId: "worker-stop-2",
  now: new Date("2026-09-04T04:30:00.000Z"),
  forceRun: true,
  campaignStatus: "STOPPED",
});
assert.equal(stoppedTick.skippedReason, "campaign_stopped");
assert.equal(stoppedTick.campaignComplete, false, "STOP must not mark the campaign completed");
const stopLease = await stopPorts.leases.getByCampaign("org-004", "camp-stop");
assert.equal(stopLease.pauseState, "STOPPED");
assert.equal((await stopPorts.ledger.listByCampaign("org-004", "camp-stop")).filter((r) => r.status === "sent").length, 100);

const manualPorts = durability.createMemoryMarketingDurabilityPorts();
await seedSnapshot(manualPorts, {
  organizationId: "org-004",
  campaignId: "camp-manual",
  campaignVersionId: "ver-004",
  snapshotId: "snap-manual",
  emails: emails(250, "manual"),
});
await manualPorts.leases.upsert({
  ...(await manualPorts.leases.getByCampaign("org-004", "camp-manual")),
  nextRunAt: "2099-01-01T00:00:00.000Z",
  updatedAt: nowIso(),
});
const manual1 = await worker.runMarketingSnapshotPacingTick({
  ports: manualPorts,
  organizationId: "org-004",
  campaignId: "camp-manual",
  campaignVersionId: "ver-004",
  channel: "EMAIL",
  policy: defaultPolicy,
  holderId: "admin-1",
  now: new Date("2026-09-04T03:30:00.000Z"),
  forceRun: true,
});
assert.equal(manual1.batchNumber, 1);
assert.equal(manual1.processed, 100);
const manual2 = await worker.runMarketingSnapshotPacingTick({
  ports: manualPorts,
  organizationId: "org-004",
  campaignId: "camp-manual",
  campaignVersionId: "ver-004",
  channel: "EMAIL",
  policy: defaultPolicy,
  holderId: "admin-2",
  now: new Date("2026-09-04T03:30:00.000Z"),
  forceRun: true,
});
assert.equal(manual2.batchNumber, 2);
assert.equal(manual2.processed, 100);
const manualDup = await worker.runMarketingSnapshotPacingTick({
  ports: manualPorts,
  organizationId: "org-004",
  campaignId: "camp-manual",
  campaignVersionId: "ver-004",
  channel: "EMAIL",
  policy: { ...defaultPolicy, startAt: "2099-01-01T00:00:00.000Z" },
  holderId: "admin-3",
  now: new Date("2026-09-04T03:30:00.000Z"),
  forceRun: false,
});
assert.equal(manualDup.skippedReason, "not_due_yet");
const sentManual = (await manualPorts.ledger.listByCampaign("org-004", "camp-manual")).filter(
  (row) => row.status === "sent",
);
assert.equal(sentManual.length, 200, "manual next batch must not duplicate earlier sends");

const retryPorts = durability.createMemoryMarketingDurabilityPorts();
await seedSnapshot(retryPorts, {
  organizationId: "org-004",
  campaignId: "camp-retry",
  campaignVersionId: "ver-004",
  snapshotId: "snap-retry",
  emails: ["ok.one@example.com", "retry-fail@example.com", "ok.two@example.com"],
});
const retryPolicy = { ...defaultPolicy, batchSize: 100, dailyMax: 500 };
const retry1 = await worker.runMarketingSnapshotPacingTick({
  ports: retryPorts,
  organizationId: "org-004",
  campaignId: "camp-retry",
  campaignVersionId: "ver-004",
  channel: "EMAIL",
  policy: retryPolicy,
  holderId: "worker-retry-1",
  now: new Date("2026-09-04T03:30:00.000Z"),
  forceRun: true,
});
assert.equal(retry1.processed, 2);
assert.equal(retry1.failed, 1);
const retry2 = await worker.runMarketingSnapshotPacingTick({
  ports: retryPorts,
  organizationId: "org-004",
  campaignId: "camp-retry",
  campaignVersionId: "ver-004",
  channel: "EMAIL",
  policy: retryPolicy,
  holderId: "worker-retry-2",
  now: new Date("2026-09-04T04:30:00.000Z"),
  forceRun: true,
});
assert.equal(retry2.retried, 1);
assert.equal(retry2.processed, 0);
assert.equal(retry2.failed, 1);
const retryLedger = await retryPorts.ledger.listByCampaign("org-004", "camp-retry");
assert.equal(retryLedger.filter((row) => row.status === "sent").length, 2);
assert.equal(retryLedger.filter((row) => row.normalizedEmail === "retry-fail@example.com").length, 1);

let missingSnapshot = false;
try {
  await worker.runMarketingSnapshotPacingTick({
    ports: durability.createMemoryMarketingDurabilityPorts(),
    organizationId: "org-004",
    campaignId: "camp-missing",
    campaignVersionId: "ver-004",
    channel: "EMAIL",
    policy: defaultPolicy,
    holderId: "worker-missing",
    forceRun: true,
  });
} catch (error) {
  missingSnapshot = true;
  assert.equal(error.code, "SNAPSHOT_REQUIRED");
}
assert.equal(missingSnapshot, true);

const audits = await pausePorts.audit.list("org-004", "camp-pause");
assert.ok(audits.some((row) => row.kind === "execution.lease.acquired"));
assert.ok(audits.some((row) => row.kind === "campaign.pause"));
assert.ok(audits.some((row) => row.kind === "campaign.resume"));
assert.ok(audits.some((row) => row.kind === "execution.batch.frozen_snapshot"));

console.log(
  JSON.stringify(
    {
      ok: true,
      defaultBatchSize: 100,
      defaultIntervalMinutes: 60,
      sizes250: sizes,
      firstBatchAt: defaultPlan.firstBatchAt,
      expectedCompletionAt: defaultPlan.expectedCompletionAt,
      windowRolloverDays: windowPlan.batches.map((b) => b.zonedDateKey),
      dailyCapRolloverDays: capPlan.batches.map((b) => b.zonedDateKey),
      processed250: [batch1.processed, batch2.processed, batch3.processed],
      restartSafe: sentAfterTwo.length === 200,
      concurrentRejected: concurrent.skippedReason === "lease_held_by_other_worker",
      pauseResume: [pausedTick.skippedReason, resumeTick.batchNumber],
      stopDoesNotComplete: stoppedTick.campaignComplete === false,
      manualNoDuplicates: sentManual.length === 200,
      retryOnlyFailures: retry2.retried === 1 && retryLedger.filter((r) => r.status === "sent").length === 2,
      liveProviderCalls: probe.liveProviderCalls,
      dryRunDeliveries: probe.dryRunDeliveries,
      cronActivated: cron.isMarketingPacingCronActivated(),
      snapshotRequired: true,
    },
    null,
    2,
  ),
);
