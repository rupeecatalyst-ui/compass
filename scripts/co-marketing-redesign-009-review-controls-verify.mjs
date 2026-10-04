/**
 * CO-MARKETING-REDESIGN-009 — Readiness review, approval freeze, delivery controls.
 * Local fixtures only. No send, migrate, cron, commit, or deploy.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

process.env.ENTERPRISE_MARKETING_EMAIL_MODE = "dry_run";
process.env.ENTERPRISE_MARKETING_EXECUTION_ENABLED = "false";

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function mustInclude(haystack, needle, label = needle) {
  assert.ok(haystack.includes(needle), `missing ${label}`);
}

function expectThrow(fn, code) {
  let thrown = false;
  try {
    fn();
  } catch (err) {
    thrown = true;
    assert.equal(err && err.code, code, `expected ${code}, got ${err && err.code}`);
  }
  assert.equal(thrown, true, `expected throw ${code}`);
}

function nowIso() {
  return new Date().toISOString();
}

const pkg = read("package.json");
const executionSrc = read("src/constants/enterprise-marketing-engine/execution.ts");
const permissionsSrc = read("src/lib/enterprise-marketing-engine/permissions.ts");
const permissionKeys = read("src/constants/enterprise-marketing-engine/permissions.ts");
const approvalSrc = read("src/lib/enterprise-marketing-engine/approval-rules.ts");
const reviewSrc = read("src/lib/enterprise-marketing-engine/readiness-review.ts");
const opsSrc = read("src/lib/enterprise-marketing-engine/delivery-operations.ts");
const opPermSrc = read("src/lib/enterprise-marketing-engine/operation-permissions.ts");
const campaignSrc = read("server/services/enterprise-marketing-engine/campaign.service.ts");
const apiSrc = read("src/app/api/admin/marketing/campaigns/route.ts");
const builderPage = read(
  "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
);
const opsPanel = read(
  "src/components/catalyst-one/admin/marketing/marketing-delivery-operations-panel.tsx",
);
const reviewUi = read(
  "src/components/catalyst-one/admin/marketing/marketing-readiness-review.tsx",
);
const deliveryCopy = read("src/constants/enterprise-marketing-engine/delivery-operations.ts");
const cronSrc = read("src/lib/enterprise-marketing-engine/execution/cron-activation.ts");
const safety = read("src/constants/enterprise-marketing-engine/safety.ts");

mustInclude(pkg, "verify:co-marketing-redesign-009");
mustInclude(executionSrc, "MARKETING_DEFAULT_BATCH_SIZE = 100");
mustInclude(executionSrc, "MARKETING_DEFAULT_BATCH_INTERVAL_MS = 60 * 60 * 1000");
mustInclude(permissionKeys, "CAMPAIGN_SCHEDULE");
mustInclude(permissionKeys, "CAMPAIGN_RUN");
mustInclude(permissionKeys, "CAMPAIGN_PAUSE");
mustInclude(permissionKeys, "CAMPAIGN_STOP");
mustInclude(permissionKeys, "CAMPAIGN_RETRY");
mustInclude(permissionsSrc, "CAMPAIGN_CREATE");
assert.doesNotMatch(permissionsSrc, /CAMPAIGN_APPROVE,/);
assert.doesNotMatch(permissionsSrc, /CAMPAIGN_SCHEDULE/);
assert.doesNotMatch(permissionsSrc, /CAMPAIGN_RUN/);
assert.doesNotMatch(permissionsSrc, /CAMPAIGN_STOP/);
assert.doesNotMatch(permissionsSrc, /CAMPAIGN_RETRY/);
mustInclude(approvalSrc, "SAVE_IS_NOT_APPROVAL");
mustInclude(approvalSrc, "actuallySent: false");
mustInclude(reviewSrc, "Final frozen eligible count");
mustInclude(opsSrc, "DELIVERY_CONFIRMATION_REQUIRED");
mustInclude(opPermSrc, "CAMPAIGN_SCHEDULE");
mustInclude(campaignSrc, "permissionForMarketingLifecycleAction");
mustInclude(campaignSrc, "reopenApprovedAsDraft");
mustInclude(campaignSrc, "simulateLaunch");
mustInclude(apiSrc, "simulate_launch");
mustInclude(apiSrc, "retry_eligible_failures");
mustInclude(builderPage, "Approve");
mustInclude(builderPage, "Schedule / Launch");
mustInclude(builderPage, "disabled");
mustInclude(builderPage, "MarketingReadinessReview");
mustInclude(builderPage, "MarketingDeliveryOperationsPanel");
mustInclude(builderPage, "MARKETING_LIVE_PROVIDER_SENDING_DISABLED");
mustInclude(opsPanel, "MARKETING_LIVE_PROVIDER_SENDING_DISABLED");
mustInclude(deliveryCopy, "Live provider sending is disabled");
mustInclude(reviewUi, "Final review");
mustInclude(opsPanel, "MARKETING_DELIVERY_OPERATION_LABELS.pause");
mustInclude(opsPanel, "MARKETING_DELIVERY_OPERATION_LABELS.resume");
mustInclude(opsPanel, "MARKETING_DELIVERY_OPERATION_LABELS.stop");
mustInclude(opsPanel, "MARKETING_DELIVERY_OPERATION_LABELS.runNextBatch");
mustInclude(opsPanel, "MARKETING_DELIVERY_OPERATION_LABELS.retry");
mustInclude(deliveryCopy, "Pause");
mustInclude(deliveryCopy, "Resume");
mustInclude(deliveryCopy, "Stop");
mustInclude(deliveryCopy, "Run Next Batch");
mustInclude(deliveryCopy, "Retry eligible failures");
mustInclude(cronSrc, "MARKETING_PACING_CRON_REGISTERED = false");
mustInclude(safety, "ENTERPRISE_MARKETING_EXECUTION_ENABLED = false");
assert.doesNotMatch(builderPage, /test_send/);
assert.doesNotMatch(builderPage, /run_test_batch/);
assert.doesNotMatch(builderPage, /run_next_batch/);

const approvalUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/approval-rules.ts")).href;
const reviewUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/readiness-review.ts")).href;
const opsUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/delivery-operations.ts")).href;
const opPermUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/operation-permissions.ts")).href;
const permUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/permissions.ts")).href;
const execUrl = pathToFileURL(resolve(root, "src/constants/enterprise-marketing-engine/execution.ts")).href;
const blocksUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/content-blocks.ts")).href;
const durabilityUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/durability/index.ts")).href;

const approval = await import(approvalUrl);
const review = await import(reviewUrl);
const ops = await import(opsUrl);
const opPerm = await import(opPermUrl);
const perms = await import(permUrl);
const execution = await import(execUrl);
const blocks = await import(blocksUrl);
const durability = await import(durabilityUrl);

assert.equal(execution.MARKETING_DEFAULT_BATCH_SIZE, 100);
assert.equal(execution.MARKETING_DEFAULT_BATCH_INTERVAL_MS, 60 * 60 * 1000);
assert.equal(execution.MARKETING_DEFAULT_BATCH_POLICY.batchSize, 100);
assert.equal(execution.MARKETING_DEFAULT_BATCH_POLICY.intervalMs, 60 * 60 * 1000);
assert.equal(opPerm.marketingPermissionsAreSeparated(), true);

const adminPerms = perms.resolveMarketingPermissions({ role: "ADMIN" });
assert.equal(adminPerms.has(opPerm.MARKETING_OPERATION_PERMISSIONS.edit), true);
assert.equal(adminPerms.has(opPerm.MARKETING_OPERATION_PERMISSIONS.approve), false);
assert.equal(adminPerms.has(opPerm.MARKETING_OPERATION_PERMISSIONS.schedule), false);
assert.equal(adminPerms.has(opPerm.MARKETING_OPERATION_PERMISSIONS.run), false);
assert.equal(adminPerms.has(opPerm.MARKETING_OPERATION_PERMISSIONS.pause), false);
assert.equal(adminPerms.has(opPerm.MARKETING_OPERATION_PERMISSIONS.stop), false);
assert.equal(adminPerms.has(opPerm.MARKETING_OPERATION_PERMISSIONS.retry), false);

const superPerms = perms.resolveMarketingPermissions({ role: "SUPER_ADMIN" });
for (const key of Object.values(opPerm.MARKETING_OPERATION_PERMISSIONS)) {
  assert.equal(superPerms.has(key), true, `SUPER_ADMIN missing ${key}`);
}

assert.equal(opPerm.permissionForMarketingLifecycleAction("APPROVE"), opPerm.MARKETING_OPERATION_PERMISSIONS.approve);
assert.equal(opPerm.permissionForMarketingLifecycleAction("SCHEDULE"), opPerm.MARKETING_OPERATION_PERMISSIONS.schedule);
assert.equal(opPerm.permissionForMarketingLifecycleAction("RUN"), opPerm.MARKETING_OPERATION_PERMISSIONS.run);
assert.equal(opPerm.permissionForMarketingLifecycleAction("PAUSE"), opPerm.MARKETING_OPERATION_PERMISSIONS.pause);
assert.equal(opPerm.permissionForMarketingLifecycleAction("RESUME"), opPerm.MARKETING_OPERATION_PERMISSIONS.pause);
assert.equal(opPerm.permissionForMarketingLifecycleAction("STOP"), opPerm.MARKETING_OPERATION_PERMISSIONS.stop);
assert.equal(opPerm.permissionForMarketingLifecycleAction("SAVE"), opPerm.MARKETING_OPERATION_PERMISSIONS.edit);

approval.assertSaveDraftIsNotApproval({ action: "save" });
expectThrow(
  () => approval.assertSaveDraftIsNotApproval({ action: "save", lifecycleAction: "APPROVE" }),
  "SAVE_IS_NOT_APPROVAL",
);

const frozenVersion = approval.freezeMarketingContentVersion({
  id: "ver-1",
  campaignId: "camp-1",
  versionNumber: 1,
  immutable: false,
  frozenAt: null,
  frozenReason: null,
  subject: "Hello {{firstName}}",
  previewText: "Preview",
  content: blocks.createEmptyContentDocument(),
  trackingEnabled: true,
  createdAt: nowIso(),
  updatedAt: nowIso(),
});
assert.equal(frozenVersion.immutable, true);
expectThrow(() => approval.assertCannotMutateFrozenContent(frozenVersion), "FROZEN_CONTENT_IMMUTABLE");
approval.assertApprovalFreezesContentAndAudience({ contentFrozen: true, snapshotFrozen: true });
expectThrow(
  () => approval.assertApprovalFreezesContentAndAudience({ contentFrozen: true, snapshotFrozen: false }),
  "SNAPSHOT_NOT_FROZEN",
);
approval.assertApprovedContentIsImmutable({ status: "APPROVED", versionImmutable: true });
expectThrow(
  () => approval.assertApprovedContentIsImmutable({ status: "APPROVED", versionImmutable: false }),
  "APPROVED_CONTENT_NOT_IMMUTABLE",
);

const minted = approval.mintMarketingReapprovalDraft(frozenVersion);
assert.equal(minted.frozenPreserved.immutable, true);
assert.equal(minted.frozenPreserved.id, frozenVersion.id);
assert.equal(minted.draft.immutable, false);
assert.equal(minted.draft.versionNumber, 2);
assert.equal(minted.requiresReapproval, true);
expectThrow(
  () =>
    approval.assertEditApprovedRequiresReapproval({
      status: "APPROVED",
      editingContentOrAudience: true,
      reapprovalDraftCreated: false,
    }),
  "REQUIRES_REAPPROVAL_DRAFT",
);
approval.assertEditApprovedRequiresReapproval({
  status: "APPROVED",
  editingContentOrAudience: true,
  reapprovalDraftCreated: true,
});

expectThrow(() => approval.assertScheduleRequiresApproval("DRAFT"), "SCHEDULE_REQUIRES_APPROVAL");
approval.assertScheduleRequiresApproval("APPROVED");

const launchBlockers = approval.buildMarketingLaunchBlockers({
  prePublishBlockingCodes: ["unsubscribe"],
  contentFrozen: false,
  snapshotFrozen: false,
});
assert.ok(launchBlockers.includes("unsubscribe"));
expectThrow(() => approval.assertLaunchBlockersPass(launchBlockers), "LAUNCH_BLOCKERS_PRESENT");
approval.assertLaunchBlockersPass([]);

const blockedLaunch = approval.simulateMarketingTestModeLaunch({
  approved: true,
  blockers: ["missing snapshot"],
  hasRunPermission: true,
});
assert.equal(blockedLaunch.ok, false);
assert.equal(blockedLaunch.simulated, true);
assert.equal(blockedLaunch.actuallySent, false);
assert.equal(blockedLaunch.liveProviderSending, false);

const deniedLaunch = approval.simulateMarketingTestModeLaunch({
  approved: true,
  blockers: [],
  hasRunPermission: false,
});
assert.equal(deniedLaunch.ok, false);

const dryLaunch = approval.simulateMarketingTestModeLaunch({
  approved: true,
  blockers: [],
  hasRunPermission: true,
});
assert.equal(dryLaunch.ok, true);
assert.equal(dryLaunch.simulated, true);
assert.equal(dryLaunch.actuallySent, false);
assert.match(dryLaunch.notice, /Live provider sending is disabled/);

const campaign = {
  id: "camp-1",
  organizationId: "org-1",
  name: "Professionals nurture",
  objective: "Awareness",
  channel: "EMAIL",
  sender: { fromName: "RC Campaigns", fromAddress: "campaigns@rupeecatalyst.com" },
  status: "APPROVED",
  currentDraftVersionId: frozenVersion.id,
  activePublishedVersionId: frozenVersion.id,
  audienceId: "aud-1",
  schedulePlaceholder: { enabled: true, startAt: "2026-09-05T09:00:00.000Z" },
  routingPlaceholder: { mode: "UNCONFIGURED", ownerUserId: "owner-1", tags: [] },
  notificationPlaceholder: { inApp: false, email: false, whatsapp: false },
  batchPolicy: execution.MARKETING_DEFAULT_BATCH_POLICY,
  governance: {
    createdByUserId: "owner-1",
    modifiedByUserId: "owner-1",
    submittedByUserId: "owner-1",
    approvedByUserId: "approver-1",
    scheduledByUserId: null,
    submittedAt: "2026-09-05T03:00:00.000Z",
    approvedAt: "2026-09-05T04:00:00.000Z",
    scheduledAt: null,
  },
  stateHistory: [],
  createdAt: "2026-09-05T02:00:00.000Z",
  updatedAt: "2026-09-05T04:00:00.000Z",
};
const snapshot = {
  id: "snap-1",
  organizationId: "org-1",
  campaignId: "camp-1",
  campaignVersionId: frozenVersion.id,
  sourceBindingId: "bind-1",
  sourceWorkbookId: "Professionals.xlsx",
  sourceTabId: "tab-1",
  sourceTabName: "Master",
  extractedAt: "2026-09-05T03:30:00.000Z",
  frozenAt: "2026-09-05T04:00:00.000Z",
  frozenByUserId: "approver-1",
  eligibleCount: 250,
  estimatedBatchCount: 3,
  columnMap: { email: "Email", name: "Full Name", consent: "Consent" },
  snapshotHash: "abc123",
  sourceRowCount: 300,
  validEmailCount: 280,
  duplicateCount: 10,
  invalidCount: 20,
  suppressedCount: 5,
  previouslyContactedCount: 15,
  createdByUserId: "owner-1",
  updatedByUserId: "approver-1",
  createdAt: "2026-09-05T03:30:00.000Z",
  updatedAt: "2026-09-05T04:00:00.000Z",
};
const model = review.composeMarketingReadinessReview({
  campaign,
  version: frozenVersion,
  ownerUserId: "owner-1",
  workbookName: "Professionals.xlsx",
  tabName: "Master",
  columnMap: snapshot.columnMap,
  snapshot,
  excludedCount: 8,
  unresolvedWarnings: [],
  latestTestSend: {
    id: "ts-1",
    campaignId: "camp-1",
    campaignVersionId: frozenVersion.id,
    campaignVersionNumber: 1,
    requesterUserId: "owner-1",
    recipientEmail: "qa@rupeecatalyst.com",
    timestamp: "2026-09-05T04:10:00.000Z",
    adapterResult: "dry_run",
    actuallySent: false,
    dryRun: true,
    failureReason: null,
    notice: "dry-run",
  },
});
const labels = model.fields.map((row) => row.label);
for (const label of review.MARKETING_READINESS_REVIEW_LABELS) {
  assert.ok(labels.includes(label), `review missing ${label}`);
}
assert.equal(model.contentFrozen, true);
assert.equal(model.snapshotFrozen, true);
assert.equal(model.liveProviderSendingDisabled, true);
assert.equal(model.defaults.batchSize, 100);
assert.equal(model.defaults.intervalMs, 60 * 60 * 1000);

expectThrow(
  () => ops.assertMarketingDeliveryConfirmation({ action: "STOP" }),
  "DELIVERY_CONFIRMATION_REQUIRED",
);
ops.assertMarketingDeliveryConfirmation({
  action: "STOP",
  confirmed: true,
  confirmationPhrase: "STOP",
});
ops.assertMarketingDeliveryConfirmation({
  action: "RUN_NEXT_BATCH",
  confirmed: true,
  confirmationPhrase: "RUN",
});
assert.equal(ops.assertMarketingDeliveryActionAllowed("RUNNING", "PAUSE"), "PAUSED");
assert.equal(ops.assertMarketingDeliveryActionAllowed("PAUSED", "RESUME"), "RUNNING");
assert.equal(ops.assertMarketingDeliveryActionAllowed("RUNNING", "STOP"), "STOPPED");
expectThrow(() => ops.assertMarketingDeliveryActionAllowed("STOPPED", "RESUME"), "STOP_IS_FINAL");

durability.resetMarketingDurabilityComposition();
const fixture = durability.createMemoryMarketingDurabilityPorts();
const ts = nowIso();
const orgA = "org-a";
const campaignId = "camp-ops";
const retryCampaignId = "camp-retry";
await fixture.leases.upsert({
  id: "lease-retry",
  organizationId: orgA,
  campaignId: retryCampaignId,
  snapshotId: "snap-retry",
  nextRunAt: ts,
  streamCursor: null,
  lastCompletedBatchNumber: null,
  pauseState: "ACTIVE",
  leaseHolder: null,
  leaseExpiresAt: null,
  createdByUserId: "actor-1",
  updatedByUserId: "actor-1",
  createdAt: ts,
  updatedAt: ts,
});
const failKey = `${orgA}:${retryCampaignId}:email:fail@example.com`;
await fixture.ledger.tryClaim({
  organizationId: orgA,
  campaignId: retryCampaignId,
  campaignVersionId: "ver-1",
  snapshotId: "snap-retry",
  snapshotRecipientId: "rcpt-fail",
  channel: "EMAIL",
  normalizedEmail: "fail@example.com",
  sourceStableKey: "row:2",
  idempotencyKey: failKey,
  batchId: "batch-1",
  batchNumber: 1,
  workerId: "w1",
});
await fixture.ledger.finalize(orgA, failKey, {
  status: "failed",
  processedAt: nowIso(),
});
const retried = await ops.retryEligibleMarketingFailures({
  ports: fixture,
  organizationId: orgA,
  campaignId: retryCampaignId,
  workerId: "retry-1",
});
assert.equal(retried.actuallySent, false);
assert.equal(retried.retried >= 1, true);

await fixture.leases.upsert({
  id: "lease-1",
  organizationId: orgA,
  campaignId,
  snapshotId: "snap-ops",
  nextRunAt: ts,
  streamCursor: "cursor-0",
  lastCompletedBatchNumber: 1,
  pauseState: "ACTIVE",
  leaseHolder: "worker-1",
  leaseExpiresAt: ts,
  createdByUserId: "actor-1",
  updatedByUserId: "actor-1",
  createdAt: ts,
  updatedAt: ts,
});
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
const stopped = await durability.applyMarketingOperationalControl({
  ports: fixture,
  organizationId: orgA,
  campaignId,
  fromStatus: "RUNNING",
  action: "STOP",
  actorUserId: "actor-1",
});
assert.equal(stopped.toStatus, "STOPPED");
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
assert.equal(stopResumeBlocked, true);

const reconstructed = await durability.reconstructMarketingExecutionState(fixture, orgA, campaignId);
const lease = await fixture.leases.getByCampaign(orgA, campaignId);
const ledger = await fixture.ledger.listByCampaign(orgA, campaignId);
const display = review.projectMarketingDeliveryOperationsFromDurable({
  reconstructed,
  lease,
  ledger,
});
assert.ok(display.leaseStatus.includes("STOPPED"));
assert.equal(typeof display.completedRecipients, "number");
assert.equal(typeof display.failures, "number");

console.log(
  JSON.stringify(
    {
      ok: true,
      defaults: { batchSize: 100, intervalMs: 3_600_000 },
      permissionsSeparated: true,
      saveIsNotApproval: true,
      freezeImmutable: true,
      reapprovalDraft: true,
      dryRunLaunch: { simulated: true, actuallySent: false },
      pauseResumeStop: true,
      liveSendingDisabled: true,
    },
    null,
    2,
  ),
);
