/**
 * P0 marketing launch execution: 2000/100/500 limits, live-flag isolation,
 * signed Home Loan URLs, snapshot isolation, dry-run SMTP prohibition.
 * Local fixtures only. No live send.
 */
import assert from "node:assert/strict";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function ts(rel) {
  return pathToFileURL(resolve(root, rel)).href;
}

process.env.ENTERPRISE_PERSISTENCE_MODE = "memory";
process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE = "memory";

const ceiling = await import(ts("src/lib/enterprise-marketing-engine/phase1-live-ceiling.ts"));
const claimMod = await import(ts("src/lib/enterprise-marketing-engine/durability/claim.ts"));
const entry = await import(ts("src/lib/enterprise-marketing-engine/campaign-entry-gate.ts"));
const auth = await import(ts("server/services/enterprise-marketing-engine/snapshot-live-deliverer.ts"));
const worker = await import(ts("src/lib/enterprise-marketing-engine/execution/snapshot-pacing-worker.ts"));
const durability = await import(ts("src/lib/enterprise-marketing-engine/durability/index.ts"));
const executionDefaults = await import(ts("src/constants/enterprise-marketing-engine/execution.ts"));
const smtp = await import(ts("src/constants/enterprise-marketing-engine/hostinger-smtp.ts"));

assert.equal(smtp.MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING, 2000);
assert.equal(smtp.MARKETING_PHASE1_LIVE_RECIPIENT_CEILING, 2000);
assert.equal(smtp.MARKETING_PHASE1_BATCH_RECIPIENT_CEILING, 100);
assert.equal(smtp.MARKETING_PHASE1_DAILY_RECIPIENT_CEILING, 500);
assert.equal(executionDefaults.MARKETING_DEFAULT_BATCH_POLICY.batchSize, 100);
assert.equal(executionDefaults.MARKETING_DEFAULT_BATCH_POLICY.dailyMax, 500);
assert.equal(executionDefaults.MARKETING_DEFAULT_BATCH_POLICY.sendWindowStart, "09:00");
assert.equal(executionDefaults.MARKETING_DEFAULT_BATCH_POLICY.sendWindowEnd, "19:00");
assert.equal(executionDefaults.MARKETING_DEFAULT_BATCH_POLICY.timezone, "Asia/Kolkata");

assert.equal(ceiling.assessMarketingPhase1CampaignAudienceCeiling(2000).ok, true);
assert.equal(ceiling.assessMarketingPhase1CampaignAudienceCeiling(50).ok, true);
assert.equal(ceiling.assessMarketingPhase1CampaignAudienceCeiling(2001).ok, false);
assert.throws(() => ceiling.assertMarketingPhase1CampaignAudienceCeiling(2001), {
  code: "marketing.phase1.audience_limit_exceeded",
});
assert.throws(() => ceiling.assertMarketingPhase1BatchCeiling(101), {
  code: "marketing.phase1.batch_limit_exceeded",
});
assert.throws(() => ceiling.assertMarketingPhase1DailyCeiling(501), {
  code: "marketing.phase1.daily_limit_exceeded",
});
const clamped = ceiling.clampMarketingBatchPolicy({
  ...executionDefaults.MARKETING_DEFAULT_BATCH_POLICY,
  batchSize: 2000,
  dailyMax: 2000,
});
assert.equal(clamped.batchSize, 100, "campaign size must never override the batch ceiling");
assert.equal(clamped.dailyMax, 500, "campaign size must never override the daily ceiling");

assert.equal(entry.resolveLiveHomeLoanCampaignEntry({ product: "home-loan", campaignToken: "tok" }).ok, true);
assert.match(entry.resolveLiveHomeLoanCampaignEntry({ product: "home-loan", campaignToken: "tok" }).url, /\/apply\/home-loan\?campaign=/);
assert.equal(entry.resolveLiveHomeLoanCampaignEntry({ product: "personal-loan", campaignToken: "tok" }).ok, false);
assert.equal(entry.resolveLiveHomeLoanCampaignEntry({ product: "home-loan", campaignToken: "" }).code, "marketing.campaign.token_missing");

assert.equal(
  auth.isMarketingSnapshotLiveDeliveryAuthorized({
    executionEnabled: true,
    providerConnectEnabled: false,
    campaignStatus: "RUNNING",
    approvedAt: "2026-09-04T03:30:00.000Z",
    channel: "EMAIL",
  }),
  false,
);
assert.equal(
  auth.isMarketingSnapshotLiveDeliveryAuthorized({
    executionEnabled: true,
    providerConnectEnabled: true,
    campaignStatus: "RUNNING",
    approvedAt: "2026-09-04T03:30:00.000Z",
    channel: "EMAIL",
  }),
  true,
);
assert.equal(
  auth.isMarketingSnapshotLiveDeliveryAuthorized({
    executionEnabled: true,
    providerConnectEnabled: true,
    campaignStatus: "DRAFT",
    approvedAt: "2026-09-04T03:30:00.000Z",
    channel: "EMAIL",
  }),
  false,
);

const expiredProcessing = {
  status: "processing",
  claimedAt: "2026-09-04T03:00:00.000Z",
  providerMessageId: null,
  attemptCount: 1,
};
assert.deepEqual(claimMod.decideMarketingRecipientClaim(expiredProcessing, Date.parse("2026-09-04T03:05:00.000Z")), {
  action: "reject",
  reason: "uncertain_in_flight",
});
assert.deepEqual(
  claimMod.decideMarketingRecipientClaim(
    { ...expiredProcessing, providerMessageId: "smtp-1" },
    Date.parse("2026-09-04T03:05:00.000Z"),
  ),
  { action: "reject", reason: "already_terminal" },
);
assert.deepEqual(
  claimMod.decideMarketingRecipientClaim({ status: "sent", attemptCount: 1 }, Date.now()),
  { action: "reject", reason: "already_terminal" },
);

function nowIso() {
  return new Date().toISOString();
}

async function seedSnapshot(ports, input) {
  const ts = nowIso();
  const snapshot = await ports.snapshots.insert({
    id: input.snapshotId,
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    campaignVersionId: input.campaignVersionId ?? "ver-p0",
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

const defaultPolicy = {
  ...executionDefaults.MARKETING_DEFAULT_BATCH_POLICY,
  startAt: "2026-09-04T03:30:00.000Z",
};

async function tick(ports, campaignId, holderId, extras = {}) {
  return worker.runMarketingSnapshotPacingTick({
    ports,
    organizationId: extras.organizationId ?? "org-p0",
    campaignId,
    campaignVersionId: "ver-p0",
    channel: "EMAIL",
    policy: extras.policy ?? defaultPolicy,
    holderId,
    now: extras.now ?? new Date("2026-09-04T03:30:00.000Z"),
    forceRun: extras.forceRun ?? true,
    probe: extras.probe,
    deliver: extras.deliver,
    campaignStatus: extras.campaignStatus ?? "RUNNING",
    liveDeliveryAuthorized: extras.liveDeliveryAuthorized,
    shouldSuppressDelivery: extras.shouldSuppressDelivery,
  });
}

durability.resetMarketingDurabilityComposition();
const ports = durability.createMemoryMarketingDurabilityPorts();
durability.configureMarketingDurabilityTestFixture(ports);

const twoThousand = Array.from({ length: 2000 }, (_, i) => `ok.${String(i + 1).padStart(4, "0")}@example.com`);
await seedSnapshot(ports, {
  organizationId: "org-p0",
  campaignId: "camp-2000",
  snapshotId: "snap-2000",
  emails: twoThousand,
});
const probe2000 = worker.createMarketingPacingProviderProbe();
const oversizedPolicyTick = await tick(ports, "camp-2000", "w-2000", {
  probe: probe2000,
  policy: { ...defaultPolicy, batchSize: 2000, dailyMax: 2000 },
});
assert.equal(oversizedPolicyTick.processed, 100);
assert.equal(oversizedPolicyTick.dryRun, true);
assert.equal(probe2000.liveProviderCalls, 0);
assert.equal(probe2000.dryRunDeliveries, 100);

const tooBig = durability.createMemoryMarketingDurabilityPorts();
await seedSnapshot(tooBig, {
  organizationId: "org-p0",
  campaignId: "camp-2001",
  snapshotId: "snap-2001",
  emails: [...twoThousand, "too.many@example.com"],
});
await assert.rejects(() => tick(tooBig, "camp-2001", "w-2001"), {
  code: "marketing.phase1.audience_limit_exceeded",
});

const dailyPorts = durability.createMemoryMarketingDurabilityPorts();
await seedSnapshot(dailyPorts, {
  organizationId: "org-p0",
  campaignId: "camp-daily",
  snapshotId: "snap-daily",
  emails: Array.from({ length: 120 }, (_, i) => `daily.${i}@example.com`),
  dailyProcessedCount: 500,
});
const dailyTick = await tick(dailyPorts, "camp-daily", "w-daily");
assert.equal(dailyTick.skippedReason, "daily_cap_exhausted");
assert.equal(dailyTick.processed, 0);

const windowPorts = durability.createMemoryMarketingDurabilityPorts();
await seedSnapshot(windowPorts, {
  organizationId: "org-p0",
  campaignId: "camp-window",
  snapshotId: "snap-window",
  emails: ["window@example.com"],
});
const windowTick = await tick(windowPorts, "camp-window", "w-window", {
  forceRun: false,
  now: new Date("2026-09-04T02:00:00.000Z"),
});
assert.equal(windowTick.skippedReason, "not_due_yet");
assert.equal(windowTick.processed, 0);

const flagPorts = durability.createMemoryMarketingDurabilityPorts();
await seedSnapshot(flagPorts, {
  organizationId: "org-p0",
  campaignId: "camp-flags",
  snapshotId: "snap-flags",
  emails: ["live@example.com"],
});
await assert.rejects(
  () =>
    tick(flagPorts, "camp-flags", "w-flags", {
      liveDeliveryAuthorized: false,
      deliver: async () => ({
        status: "sent",
        retryable: false,
        dryRun: false,
        providerMessageId: "smtp-should-not-run",
        liveProviderInvoked: true,
      }),
    }),
  { code: "LIVE_PROVIDER_FORBIDDEN" },
);

const livePorts = durability.createMemoryMarketingDurabilityPorts();
await seedSnapshot(livePorts, {
  organizationId: "org-p0",
  campaignId: "camp-live",
  snapshotId: "snap-live",
  emails: ["accepted@example.com", "accepted2@example.com"],
});
const liveProbe = worker.createMarketingPacingProviderProbe();
const liveDeliver = async (recipient) => {
  liveProbe.liveProviderCalls += 1;
  return {
    status: "sent",
    retryable: false,
    dryRun: false,
    providerMessageId: `smtp-${recipient.normalizedEmail}`,
    liveProviderInvoked: true,
  };
};
const liveTick = await tick(livePorts, "camp-live", "w-live", {
  liveDeliveryAuthorized: true,
  probe: liveProbe,
  deliver: liveDeliver,
});
assert.equal(liveTick.dryRun, false);
assert.equal(liveTick.liveProviderInvoked, true);
assert.equal(liveTick.processed, 2);
const liveLedger = await livePorts.ledger.listByCampaign("org-p0", "camp-live");
assert.equal(liveLedger.every((row) => row.status === "sent"), true);
assert.equal(liveLedger.every((row) => row.providerMessageId?.startsWith("smtp-")), true);
const replayLive = await tick(livePorts, "camp-live", "w-live-replay", {
  liveDeliveryAuthorized: true,
  probe: worker.createMarketingPacingProviderProbe(),
  deliver: liveDeliver,
});
assert.equal(replayLive.processed, 0);
assert.equal((await livePorts.ledger.listByCampaign("org-p0", "camp-live")).filter((row) => row.status === "sent").length, 2);

const suppressPorts = durability.createMemoryMarketingDurabilityPorts();
await seedSnapshot(suppressPorts, {
  organizationId: "org-p0",
  campaignId: "camp-sup",
  snapshotId: "snap-sup",
  emails: ["blocked@example.com"],
});
let smtpCalls = 0;
const suppressed = await tick(suppressPorts, "camp-sup", "w-sup", {
  liveDeliveryAuthorized: true,
  shouldSuppressDelivery: () => true,
  deliver: async () => {
    smtpCalls += 1;
    return { status: "sent", retryable: false, dryRun: false, providerMessageId: "x", liveProviderInvoked: true };
  },
});
assert.equal(smtpCalls, 0);
assert.equal(suppressed.suppressed, 1);
assert.equal((await suppressPorts.ledger.listByCampaign("org-p0", "camp-sup"))[0].status, "suppressed");

const isoPorts = durability.createMemoryMarketingDurabilityPorts();
await seedSnapshot(isoPorts, {
  organizationId: "org-p0",
  campaignId: "camp-a",
  snapshotId: "snap-a",
  emails: ["a@example.com"],
});
await seedSnapshot(isoPorts, {
  organizationId: "org-p0",
  campaignId: "camp-b",
  snapshotId: "snap-b",
  emails: ["b@example.com"],
});
await tick(isoPorts, "camp-a", "w-iso");
assert.equal((await isoPorts.ledger.listByCampaign("org-p0", "camp-a")).length, 1);
assert.equal((await isoPorts.ledger.listByCampaign("org-p0", "camp-b")).length, 0);

const retryPorts = durability.createMemoryMarketingDurabilityPorts();
await seedSnapshot(retryPorts, {
  organizationId: "org-p0",
  campaignId: "camp-retry",
  snapshotId: "snap-retry",
  emails: ["retry@example.com"],
});
const retry1 = await tick(retryPorts, "camp-retry", "w-retry-1");
assert.equal(retry1.failed, 1);
assert.equal((await retryPorts.ledger.listByCampaign("org-p0", "camp-retry"))[0].status, "failed");

const stalePorts = durability.createMemoryMarketingDurabilityPorts({
  ledger: [
    {
      id: "led-stale",
      organizationId: "org-p0",
      campaignId: "camp-stale",
      campaignVersionId: "ver-p0",
      snapshotId: "snap-stale",
      snapshotRecipientId: "snap-stale-r-1",
      channel: "EMAIL",
      normalizedEmail: "stale@example.com",
      sourceStableKey: "row:0001",
      idempotencyKey: "org-p0:camp-stale:EMAIL:stale@example.com",
      batchId: "batch-stale",
      batchNumber: 1,
      status: "processing",
      scheduledAt: null,
      claimedAt: "2026-09-04T03:00:00.000Z",
      processedAt: null,
      attemptCount: 1,
      providerMessageId: null,
      openedAt: null,
      clickedAt: null,
      repliedAt: null,
      unsubscribedAt: null,
      suppressionReason: null,
      linkedContactId: null,
      linkedOpportunityId: null,
      createdByUserId: "dead",
      updatedByUserId: "dead",
      createdAt: "2026-09-04T03:00:00.000Z",
      updatedAt: "2026-09-04T03:00:00.000Z",
    },
  ],
});
await seedSnapshot(stalePorts, {
  organizationId: "org-p0",
  campaignId: "camp-stale",
  snapshotId: "snap-stale",
  emails: ["stale@example.com"],
});
let staleSmtp = 0;
await tick(stalePorts, "camp-stale", "w-stale", {
  now: new Date("2026-09-04T03:32:00.000Z"),
  liveDeliveryAuthorized: true,
  deliver: async () => {
    staleSmtp += 1;
    return { status: "sent", retryable: false, dryRun: false, providerMessageId: "dup", liveProviderInvoked: true };
  },
});
assert.equal(staleSmtp, 0);
const staleRow = (await stalePorts.ledger.listByCampaign("org-p0", "camp-stale"))[0];
assert.equal(staleRow.status, "skipped");
assert.equal(staleRow.suppressionReason, "marketing.delivery.uncertain_in_flight");

console.log("OK: P0 marketing launch execution limits, fail-closed gates, and recovery");
