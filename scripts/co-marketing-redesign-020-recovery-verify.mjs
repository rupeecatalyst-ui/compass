/**
 * CO-MARKETING-REDESIGN-020 — Failure recovery, bounded retry, quarantine, operational health.
 * Deterministic crash/restart/concurrency fixtures. No send, cron, Prisma apply, commit, or deploy.
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
const safety = read("src/constants/enterprise-marketing-engine/safety.ts");
const cronSrc = read("src/lib/enterprise-marketing-engine/execution/cron-activation.ts");
const schema = read("prisma/schema.prisma");
const executionConst = read("src/constants/enterprise-marketing-engine/execution.ts");
const builderPage = read("src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx");
const permLib = read("src/lib/enterprise-marketing-engine/permissions.ts");
const gates = read("scripts/co-marketing-redesign-pre-staging-gates.mjs");
const monitoring010 = read("src/lib/enterprise-marketing-engine/monitoring.ts");
const explorer010 = read("src/lib/enterprise-marketing-engine/recipient-explorer.ts");
const evaluateSrc = read("src/lib/enterprise-marketing-engine/qualification/evaluate.ts");
const inboxSrc = read("src/lib/enterprise-marketing-engine/qualification/inbox-boundary.ts");
const workerSrc = read("src/lib/enterprise-marketing-engine/execution/snapshot-pacing-worker.ts");
const claimSrc = read("src/lib/enterprise-marketing-engine/durability/claim.ts");
const retrySrc = read("src/lib/enterprise-marketing-engine/durability/retry-policy.ts");
const healthUi = read(
  "src/components/catalyst-one/admin/marketing/marketing-operational-health-panel.tsx",
);
const vercel = read("vercel.json");
const eligibility = read("src/constants/enterprise-marketing-engine/whatsapp-delivery.ts");

mustInclude(pkg, "verify:co-marketing-redesign-020");
mustInclude(gates, "verify:co-marketing-redesign-020");
mustInclude(safety, "ENTERPRISE_MARKETING_EXECUTION_ENABLED = false");
mustInclude(safety, "ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false");
mustInclude(safety, 'ENTERPRISE_MARKETING_HANDOFF_MODE ?? "fixture"');
mustInclude(safety, "ENTERPRISE_MARKETING_MASS_HANDOFF_ENABLED = false");
mustInclude(cronSrc, "MARKETING_PACING_CRON_REGISTERED = false");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_SIZE = 100");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_INTERVAL_MS = 60 * 60 * 1000");
assert.doesNotMatch(schema, /model\s+Lead\b/);
assert.doesNotMatch(schema, /model\s+MarketingProspect\b/);
assert.doesNotMatch(builderPage, /test_send/);
assert.doesNotMatch(builderPage, /run_test_batch/);
assert.doesNotMatch(builderPage, /run_next_batch/);
assert.doesNotMatch(permLib, /CAMPAIGN_APPROVE,/);
assert.doesNotMatch(permLib, /CAMPAIGN_SCHEDULE/);
assert.doesNotMatch(permLib, /CAMPAIGN_RUN/);
assert.doesNotMatch(permLib, /CAMPAIGN_STOP/);
assert.doesNotMatch(permLib, /CAMPAIGN_RETRY/);
mustInclude(monitoring010, 'unavailableMarketingMetric("Not connected")');
mustInclude(explorer010, "maskMarketingRecipientEmail");
mustInclude(evaluateSrc, 'intent === "open" || input.intent === "click"');
mustInclude(inboxSrc, "openClickDoesNotCreateContact");
mustInclude(workerSrc, "expireAbandonedMarketingLease");
mustInclude(workerSrc, "retry_backoff");
mustInclude(workerSrc, "daily_cap_exhausted");
mustInclude(claimSrc, "classifyMarketingRecipientClaim");
mustInclude(claimSrc, "delayed");
mustInclude(retrySrc, "MARKETING_RETRY_BACKOFF_MS");
mustInclude(healthUi, "Worker status");
mustInclude(healthUi, "Last heartbeat");
mustInclude(healthUi, "Active lease");
mustInclude(healthUi, "Next scheduled run");
mustInclude(healthUi, "Delayed batches");
mustInclude(healthUi, "Exhausted retries");
mustInclude(healthUi, "Quarantined recipients");
mustInclude(healthUi, "Provider availability");
mustInclude(healthUi, "Scheduler status");
mustInclude(healthUi, "Processing latency");
mustInclude(eligibility, "enabled: true");
assert.doesNotMatch(vercel, /marketing-pacing/);

process.env.ENTERPRISE_PERSISTENCE_MODE = "memory";
process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE = "memory";
process.env.ENTERPRISE_MARKETING_PACING_CRON_ENABLED = "true";

const durabilityUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/durability/index.ts"),
).href;
const workerUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/execution/snapshot-pacing-worker.ts"),
).href;
const cronUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/execution/cron-activation.ts"),
).href;
const policyUrl = pathToFileURL(
  resolve(root, "src/constants/enterprise-marketing-engine/execution.ts"),
).href;
const healthUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/operational-health.ts"),
).href;
const delivererUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/execution/recovery-deliverer.ts"),
).href;
const classifyUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/durability/failure-classification.ts"),
).href;

const durability = await import(durabilityUrl);
const worker = await import(workerUrl);
const cron = await import(cronUrl);
const executionDefaults = await import(policyUrl);
const health = await import(healthUrl);
const recoveryDeliverer = await import(delivererUrl);
const classify = await import(classifyUrl);

assert.equal(cron.MARKETING_PACING_CRON_REGISTERED, false);
assert.equal(cron.isMarketingPacingCronActivated(), false);
assert.equal(executionDefaults.MARKETING_DEFAULT_BATCH_SIZE, 100);

const policy = {
  ...executionDefaults.MARKETING_DEFAULT_BATCH_POLICY,
  startAt: "2026-09-04T03:30:00.000Z",
};

function nowIso(date = new Date("2026-09-04T03:30:00.000Z")) {
  return date.toISOString();
}

async function seedSnapshot(ports, input) {
  const ts = nowIso();
  const snapshot = await ports.snapshots.insert({
    id: input.snapshotId,
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    campaignVersionId: input.campaignVersionId ?? "ver-020",
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
      assignedBatchNumber: 1,
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
    leaseHolder: input.leaseHolder ?? null,
    leaseExpiresAt: input.leaseExpiresAt ?? null,
    dailyProcessedCount: input.dailyProcessedCount ?? 0,
    dailyCountResetDate: "2026-09-04",
    lastError: null,
    createdByUserId: "actor-1",
    updatedByUserId: "actor-1",
    createdAt: ts,
    updatedAt: ts,
  });
  return snapshot;
}

function ledgerSeed(input) {
  const ts = input.processedAt ?? nowIso();
  return {
    id: input.id,
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    campaignVersionId: "ver-020",
    snapshotId: input.snapshotId,
    snapshotRecipientId: input.snapshotRecipientId,
    channel: "EMAIL",
    normalizedEmail: input.normalizedEmail,
    sourceStableKey: input.sourceStableKey,
    idempotencyKey: `${input.organizationId}:${input.campaignId}:EMAIL:${input.normalizedEmail}`,
    batchId: "batch-seed",
    batchNumber: 1,
    status: input.status,
    scheduledAt: ts,
    claimedAt: input.claimedAt ?? ts,
    processedAt: input.status === "processing" ? null : ts,
    attemptCount: input.attemptCount ?? 1,
    providerMessageId: input.status === "sent" ? `dry-run-${input.snapshotRecipientId}` : null,
    openedAt: null,
    clickedAt: null,
    repliedAt: null,
    unsubscribedAt: null,
    suppressionReason: null,
    linkedContactId: null,
    linkedOpportunityId: null,
    createdByUserId: "dead-worker",
    updatedByUserId: "dead-worker",
    createdAt: ts,
    updatedAt: ts,
  };
}

async function tick(ports, campaignId, holderId, extras = {}) {
  return worker.runMarketingSnapshotPacingTick({
    ports,
    organizationId: extras.organizationId ?? "org-020",
    campaignId,
    campaignVersionId: "ver-020",
    channel: "EMAIL",
    policy: extras.policy ?? policy,
    holderId,
    now: extras.now ?? new Date("2026-09-04T03:30:00.000Z"),
    forceRun: extras.forceRun ?? true,
    recovery: extras.recovery,
    deliver: extras.deliver,
    probe: extras.probe,
  });
}

durability.resetMarketingDurabilityComposition();

const noRetry = classify.classifyMarketingDeliveryFailure({
  kind: "unsubscribe",
  attemptCount: 0,
});
assert.equal(noRetry.retryable, false);
assert.equal(
  classify.classifyMarketingDeliveryFailure({ kind: "terminal_success", status: "sent", attemptCount: 1 }).retryable,
  false,
);
assert.equal(
  classify.classifyMarketingDeliveryFailure({ kind: "complaint", attemptCount: 1 }).retryable,
  false,
);
assert.equal(
  classify.classifyMarketingDeliveryFailure({ kind: "hard_bounce", attemptCount: 1 }).retryable,
  false,
);
assert.equal(
  classify.classifyMarketingDeliveryFailure({ kind: "permanent_suppression", attemptCount: 1 }).retryable,
  false,
);
assert.equal(
  classify.classifyMarketingDeliveryFailure({ kind: "provider_timeout", attemptCount: 1 }).retryable,
  true,
);

const exactPorts = durability.createMemoryMarketingDurabilityPorts();
await seedSnapshot(exactPorts, {
  organizationId: "org-020",
  campaignId: "camp-exact",
  snapshotId: "snap-exact",
  emails: ["once@example.com"],
});
const key = "org-020:camp-exact:EMAIL:once@example.com";
const claimInput = {
  organizationId: "org-020",
  campaignId: "camp-exact",
  campaignVersionId: "ver-020",
  snapshotId: "snap-exact",
  snapshotRecipientId: "snap-exact-r-1",
  channel: "EMAIL",
  normalizedEmail: "once@example.com",
  sourceStableKey: "row:0001",
  idempotencyKey: key,
  batchId: "batch-exact",
  batchNumber: 1,
  workerId: "w-a",
};
const [firstClaim, secondClaim] = await Promise.all([
  exactPorts.ledger.tryClaim(claimInput),
  exactPorts.ledger.tryClaim({ ...claimInput, workerId: "w-b" }),
]);
assert.equal([firstClaim.ok, secondClaim.ok].filter(Boolean).length, 1, "exact-once claim");
assert.equal((firstClaim.ok ? firstClaim : secondClaim).record.idempotencyKey, key);
const sent = await exactPorts.ledger.finalize("org-020", key, {
  status: "sent",
  processedAt: nowIso(),
  providerMessageId: "dry-run-once",
});
assert.equal(sent.status, "sent");
const replayClaim = await exactPorts.ledger.tryClaim({ ...claimInput, workerId: "w-c" });
assert.equal(replayClaim.ok, false);
assert.equal(replayClaim.reason, "already_terminal");

const crashPorts = durability.createMemoryMarketingDurabilityPorts(
  {
    ledger: [
      ledgerSeed({
        id: "led-sent",
        organizationId: "org-020",
        campaignId: "camp-crash",
        snapshotId: "snap-crash",
        snapshotRecipientId: "snap-crash-r-1",
        normalizedEmail: "ok.one@example.com",
        sourceStableKey: "row:0001",
        status: "sent",
      }),
      ledgerSeed({
        id: "led-inflight",
        organizationId: "org-020",
        campaignId: "camp-crash",
        snapshotId: "snap-crash",
        snapshotRecipientId: "snap-crash-r-2",
        normalizedEmail: "ok.two@example.com",
        sourceStableKey: "row:0002",
        status: "processing",
        claimedAt: "2026-09-04T03:27:00.000Z",
        attemptCount: 1,
      }),
    ],
  },
);
await seedSnapshot(crashPorts, {
  organizationId: "org-020",
  campaignId: "camp-crash",
  snapshotId: "snap-crash",
  emails: ["ok.one@example.com", "ok.two@example.com", "ok.three@example.com"],
  leaseHolder: "dead-worker",
  leaseExpiresAt: "2026-09-04T03:28:00.000Z",
});
const crashRecovery = durability.createMemoryMarketingRecoveryStore();
const crashTick = await tick(crashPorts, "camp-crash", "restart-worker", {
  now: new Date("2026-09-04T03:32:00.000Z"),
  recovery: crashRecovery,
});
assert.equal(crashTick.recovered, true);
assert.equal(crashTick.liveProviderInvoked, false);
const crashLedger = await crashPorts.ledger.listByCampaign("org-020", "camp-crash");
assert.equal(crashLedger.filter((row) => row.status === "sent").length, 3);
assert.equal(crashLedger.filter((row) => row.normalizedEmail === "ok.one@example.com").length, 1);
assert.equal(
  crashLedger.find((row) => row.normalizedEmail === "ok.one@example.com").idempotencyKey,
  "org-020:camp-crash:EMAIL:ok.one@example.com",
);
assert.equal(
  crashLedger.find((row) => row.normalizedEmail === "ok.two@example.com").attemptCount >= 2,
  true,
);
const crashLease = await crashPorts.leases.getByCampaign("org-020", "camp-crash");
assert.notEqual(crashLease.leaseHolder, "dead-worker");

const exported = crashPorts.exportState();
const restartPorts = durability.createMemoryMarketingDurabilityPorts(exported);
const restartTick = await tick(restartPorts, "camp-crash", "hostinger-worker", {
  now: new Date("2026-09-04T04:30:00.000Z"),
});
assert.equal(restartTick.processed, 0);
assert.equal(
  (await restartPorts.ledger.listByCampaign("org-020", "camp-crash")).filter((row) => row.status === "sent").length,
  3,
  "Hostinger restart must not resend processed recipients",
);

const retryPorts = durability.createMemoryMarketingDurabilityPorts();
const retryStore = durability.createMemoryMarketingRecoveryStore();
await seedSnapshot(retryPorts, {
  organizationId: "org-020",
  campaignId: "camp-retry",
  snapshotId: "snap-retry",
  emails: ["timeout@example.com"],
});
const deliver = recoveryDeliverer.createMarketingRecoveryDryRunDeliverer();
const retryTimes = [
  "2026-09-04T03:30:00.000Z",
  "2026-09-04T03:31:05.000Z",
  "2026-09-04T03:36:10.000Z",
];
const firstFail = await tick(retryPorts, "camp-retry", "worker-retry-1", {
  now: new Date(retryTimes[0]),
  recovery: retryStore,
  deliver,
});
assert.equal(firstFail.failed, 1);
const backedOff = await tick(retryPorts, "camp-retry", "worker-retry-wait", {
  now: new Date("2026-09-04T03:30:30.000Z"),
  recovery: retryStore,
  deliver,
});
assert.equal(backedOff.skippedReason, "retry_backoff");
assert.equal(backedOff.claimed, 0);
for (const at of retryTimes.slice(1)) {
  const result = await tick(retryPorts, "camp-retry", `worker-${at}`, {
    now: new Date(at),
    recovery: retryStore,
    deliver,
  });
  assert.equal(result.failed, 1);
}
const fourth = await tick(retryPorts, "camp-retry", "worker-fourth", {
  now: new Date("2026-09-04T03:52:00.000Z"),
  recovery: retryStore,
  deliver,
});
assert.equal(fourth.claimed, 0);
assert.ok(fourth.skippedReason === "campaign_complete" || fourth.skippedReason === "retry_backoff");
const retryLedger = await retryPorts.ledger.listByCampaign("org-020", "camp-retry");
assert.equal(retryLedger.length, 1);
assert.equal(retryLedger[0].idempotencyKey, "org-020:camp-retry:EMAIL:timeout@example.com");
assert.equal(retryLedger[0].attemptCount, 3);
const attempts = retryStore.attemptsForKey("org-020", retryLedger[0].idempotencyKey);
assert.ok(attempts.length >= 3);
assert.ok(attempts.every((row) => row.idempotencyKey === retryLedger[0].idempotencyKey));
assert.equal(retryStore.listQuarantine("org-020", "camp-retry").length, 1);

const isolatePorts = durability.createMemoryMarketingDurabilityPorts();
await seedSnapshot(isolatePorts, {
  organizationId: "org-020",
  campaignId: "camp-isolate",
  snapshotId: "snap-isolate",
  emails: ["ok.keep@example.com", "crash-throw@example.com", "ok.later@example.com"],
});
const isolateTick = await tick(isolatePorts, "camp-isolate", "worker-isolate", {
  deliver: recoveryDeliverer.createMarketingRecoveryDryRunDeliverer({ throwOn: "crash-throw@" }),
  recovery: durability.createMemoryMarketingRecoveryStore(),
});
const isolateLedger = await isolatePorts.ledger.listByCampaign("org-020", "camp-isolate");
assert.equal(isolateLedger.filter((row) => row.status === "sent").length, 2);
assert.equal(isolateLedger.filter((row) => row.status === "failed").length, 1);
assert.equal(isolateTick.campaignComplete, false);

const capPorts = durability.createMemoryMarketingDurabilityPorts();
await seedSnapshot(capPorts, {
  organizationId: "org-020",
  campaignId: "camp-cap",
  snapshotId: "snap-cap",
  emails: ["cap.one@example.com", "cap.two@example.com"],
  dailyProcessedCount: 500,
});
const capTick = await tick(capPorts, "camp-cap", "worker-cap", {
  now: new Date("2026-09-04T03:30:00.000Z"),
});
assert.equal(capTick.skippedReason, "daily_cap_exhausted");
assert.equal(capTick.processed, 0);

const kindsPorts = durability.createMemoryMarketingDurabilityPorts();
const kindsStore = durability.createMemoryMarketingRecoveryStore();
await seedSnapshot(kindsPorts, {
  organizationId: "org-020",
  campaignId: "camp-kinds",
  snapshotId: "snap-kinds",
  emails: [
    "ok.kinds@example.com",
    "perm-reject@example.com",
    "invalid@example.com",
    "unsub@example.com",
    "ratelimit@example.com",
  ],
});
await tick(kindsPorts, "camp-kinds", "worker-kinds", {
  deliver,
  recovery: kindsStore,
});
const kindsLedger = await kindsPorts.ledger.listByCampaign("org-020", "camp-kinds");
assert.equal(kindsLedger.find((row) => row.normalizedEmail === "ok.kinds@example.com").status, "sent");
assert.equal(kindsLedger.find((row) => row.normalizedEmail === "perm-reject@example.com").status, "skipped");
assert.equal(kindsLedger.find((row) => row.normalizedEmail === "invalid@example.com").status, "skipped");
assert.equal(kindsLedger.find((row) => row.normalizedEmail === "unsub@example.com").status, "skipped");
assert.equal(kindsLedger.find((row) => row.normalizedEmail === "ratelimit@example.com").status, "failed");
assert.ok(kindsStore.listQuarantine("org-020", "camp-kinds").length >= 1);

const webhookPorts = durability.createMemoryMarketingDurabilityPorts();
const event = {
  id: "eng-1",
  organizationId: "org-020",
  campaignId: "camp-webhook",
  ledgerId: "led-1",
  eventType: "OPENED",
  providerEventId: "evt-replay-1",
  idempotencyKey: "evt-replay-1",
  occurredAt: nowIso(),
  createdAt: nowIso(),
};
const firstReplay = await durability.replayMarketingEngagementEvent({ ports: webhookPorts, event });
const secondReplay = await durability.replayMarketingEngagementEvent({ ports: webhookPorts, event });
assert.equal(firstReplay.duplicate, false);
assert.equal(secondReplay.duplicate, true);

const concurrentPorts = durability.createMemoryMarketingDurabilityPorts();
await seedSnapshot(concurrentPorts, {
  organizationId: "org-020",
  campaignId: "camp-lock",
  snapshotId: "snap-lock",
  emails: ["lock.one@example.com"],
});
const held = await concurrentPorts.leases.tryAcquire("org-020", "camp-lock", "worker-a", 90_000);
assert.equal(held, true);
const blocked = await tick(concurrentPorts, "camp-lock", "worker-b");
assert.equal(blocked.skippedReason, "lease_held_by_other_worker");

const healthSnapshot = await health.composeMarketingOperationalHealth({
  organizationId: "org-020",
  campaignId: "camp-retry",
  ports: retryPorts,
  recovery: retryStore,
  now: new Date("2026-09-04T03:52:00.000Z"),
});
assert.equal(healthSnapshot.dryRun, true);
assert.equal(healthSnapshot.liveSend, false);
assert.equal(healthSnapshot.cronRegistered, false);
assert.equal(healthSnapshot.providerAvailability.value, "unavailable");
assert.equal(healthSnapshot.schedulerStatus.value, "unregistered");
assert.equal(healthSnapshot.exhaustedRetries.source, "durable");
assert.equal(healthSnapshot.quarantinedRecipients.value, 1);
assert.equal(healthSnapshot.workerStatus.source, "durable");
assert.ok(healthSnapshot.lastHeartbeat.source === "durable" || healthSnapshot.lastHeartbeat.source === "simulated");
assert.ok(healthSnapshot.notice.includes("simulated") || healthSnapshot.notice.includes("dry-run"));

const simulated = health.createSimulatedMarketingOperationalHealth("org-020");
assert.equal(simulated.workerStatus.source, "simulated");
assert.equal(simulated.providerAvailability.source, "durable");
assert.equal(simulated.schedulerStatus.value, "unregistered");

console.log(
  JSON.stringify(
    {
      ok: true,
      exactOnce: true,
      crashRestartNoResend: 3,
      boundedRetryAttempts: retryLedger[0].attemptCount,
      quarantined: 1,
      isolateSent: 2,
      dailyCap: capTick.skippedReason,
      webhookReplayDuplicate: true,
      cronRegistered: cron.MARKETING_PACING_CRON_REGISTERED,
      healthFields: [
        "workerStatus",
        "lastHeartbeat",
        "activeLease",
        "nextScheduledRun",
        "delayedBatches",
        "exhaustedRetries",
        "quarantinedRecipients",
        "providerAvailability",
        "schedulerStatus",
        "processingLatencyMs",
      ],
    },
    null,
    2,
  ),
);
