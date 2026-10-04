/**
 * CO-MARKETING-REDESIGN-015 — Campaign monitoring workspace.
 * Local fixtures only. No send, migrate, Hostinger, commit, or deploy.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function mustInclude(haystack, needle, label = needle) {
  assert.ok(haystack.includes(needle), `missing ${label}`);
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
      walk(abs, acc);
    } else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) {
      acc.push(abs);
    }
  }
  return acc;
}

const pkg = read("package.json");
const safety = read("src/constants/enterprise-marketing-engine/safety.ts");
const cronSrc = read("src/lib/enterprise-marketing-engine/execution/cron-activation.ts");
const schema = read("prisma/schema.prisma");
const executionConst = read("src/constants/enterprise-marketing-engine/execution.ts");
const builderPage = read(
  "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
);
const permLib = read("src/lib/enterprise-marketing-engine/permissions.ts");
const gates = read("scripts/co-marketing-redesign-pre-staging-gates.mjs");
const monitoring010 = read("src/lib/enterprise-marketing-engine/monitoring.ts");
const explorer010 = read("src/lib/enterprise-marketing-engine/recipient-explorer.ts");
const summaryLib = read("src/lib/enterprise-marketing-engine/campaign-monitoring.ts");
const retryLib = read("src/lib/enterprise-marketing-engine/monitoring-retry.ts");
const workspaceUi = read(
  "src/components/catalyst-one/admin/marketing/marketing-campaign-monitoring-workspace.tsx",
);
const apiRoute = read("src/app/api/admin/marketing/campaign-monitoring/route.ts");
const nav = read("src/constants/enterprise-marketing-engine/navigation.ts");
const routes = read("src/constants/routes.ts");

mustInclude(pkg, "verify:co-marketing-redesign-015");
mustInclude(gates, "verify:co-marketing-redesign-015");
mustInclude(safety, "ENTERPRISE_MARKETING_EXECUTION_ENABLED = false");
mustInclude(safety, "ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false");
mustInclude(cronSrc, "MARKETING_PACING_CRON_REGISTERED = false");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_SIZE = 100");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_INTERVAL_MS = 60 * 60 * 1000");
assert.doesNotMatch(schema, /model\s+Lead\b/);
assert.doesNotMatch(schema, /model\s+MarketingProspect\b/);
assert.doesNotMatch(builderPage, /test_send/);
assert.doesNotMatch(builderPage, /run_test_batch/);
assert.doesNotMatch(builderPage, /run_next_batch/);
mustInclude(monitoring010, 'unavailableMarketingMetric("Not connected")');
mustInclude(explorer010, "maskMarketingRecipientEmail");
mustInclude(summaryLib, 'unavailableMarketingMetric("Unavailable")');
mustInclude(retryLib, "hard_bounce");
mustInclude(retryLib, "unsubscribed");
mustInclude(retryLib, "complaint");
mustInclude(retryLib, "permanently_suppressed");
mustInclude(retryLib, "actuallySent: false");
mustInclude(workspaceUi, "Raw email and phone are");
mustInclude(workspaceUi, "Unavailable");
mustInclude(apiRoute, "fromMarketingUnknownError");
mustInclude(nav, 'id: "monitoring"');
mustInclude(routes, "ADMIN_MARKETING_MONITORING");

const adminDefault = permLib.slice(
  permLib.indexOf("const ADMIN_DEFAULT"),
  permLib.indexOf("export function resolveMarketingPermissions"),
);
assert.equal(adminDefault.includes("CAMPAIGN_APPROVE"), false);
assert.equal(adminDefault.includes("CAMPAIGN_SEND"), false);
assert.equal(adminDefault.includes("CAMPAIGN_RETRY"), false);
assert.equal(adminDefault.includes("CAMPAIGN_SCHEDULE"), false);
assert.equal(adminDefault.includes("CAMPAIGN_RUN"), false);
assert.equal(adminDefault.includes("CAMPAIGN_STOP"), false);

const secretLeak = /[?&](password|passwd|secret|token)=/i;
for (const abs of [...walk(join(root, "scripts")), ...walk(join(root, "src/app/api/admin/marketing"))]) {
  const rel = abs.slice(root.length + 1).replaceAll("\\", "/");
  if (!rel.includes("co-marketing") && !rel.includes("src/app/api/admin/marketing")) continue;
  const src = readFileSync(abs, "utf8");
  assert.doesNotMatch(src, secretLeak, `credential query-string leak in ${rel}`);
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "marketing-pre-staging-local-jwt-secret-aaaa";
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = "marketing-pre-staging-local-jwt-refresh-bbbb";
}

const summaryUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/campaign-monitoring.ts")).href;
const explorerUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/campaign-recipient-explorer.ts"),
).href;
const timelineUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/recipient-timeline.ts")).href;
const retryUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/monitoring-retry.ts")).href;
const redactUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/analytics/redact-fingerprint.ts"),
).href;
const monitoring010Url = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/monitoring.ts")).href;

const { composeMarketingCampaignMonitoringSummary } = await import(summaryUrl);
const { composeMarketingCampaignRecipientExplorer } = await import(explorerUrl);
const { composeMarketingRecipientTimeline } = await import(timelineUrl);
const { evaluateMarketingMonitoringRetry } = await import(retryUrl);
const { analyticsPayloadContainsPii } = await import(redactUrl);
const { composeMarketingMonitoringDashboard } = await import(monitoring010Url);

const ts = "2026-09-05T03:00:00.000Z";
function recipient(overrides = {}) {
  return {
    id: "rcpt-1",
    organizationId: "org-a",
    snapshotId: "snap-1",
    campaignId: "camp-1",
    sourceWorkbookId: "wb-1",
    sourceTabId: "tab-1",
    sourceTabName: "Master",
    sourceRowNumber: 2,
    sourceStableKey: "row:2",
    recipientFingerprint: "email:one@example.com",
    normalizedEmail: "one@example.com",
    assignedBatchNumber: 1,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

function ledger(overrides = {}) {
  return {
    id: "led-1",
    organizationId: "org-a",
    campaignId: "camp-1",
    campaignVersionId: "v1",
    snapshotId: "snap-1",
    snapshotRecipientId: "rcpt-1",
    channel: "EMAIL",
    normalizedEmail: "one@example.com",
    sourceStableKey: "row:2",
    idempotencyKey: "idem-1",
    batchId: "batch-1",
    batchNumber: 1,
    status: "queued",
    scheduledAt: ts,
    claimedAt: null,
    processedAt: null,
    attemptCount: 0,
    providerMessageId: null,
    openedAt: null,
    clickedAt: null,
    repliedAt: null,
    unsubscribedAt: null,
    suppressionReason: null,
    linkedContactId: null,
    linkedOpportunityId: null,
    createdByUserId: "u1",
    updatedByUserId: "u1",
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

function snapshot() {
  return {
    id: "snap-1",
    organizationId: "org-a",
    campaignId: "camp-1",
    campaignVersionId: "v1",
    sourceBindingId: "bind-1",
    sourceWorkbookId: "wb-1",
    sourceTabId: "tab-1",
    sourceTabName: "Master",
    extractedAt: ts,
    frozenAt: ts,
    frozenByUserId: "u1",
    eligibleCount: 2,
    estimatedBatchCount: 1,
    columnMap: { email: "Email" },
    sourceRowCount: 4,
    createdByUserId: "u1",
    updatedByUserId: "u1",
    createdAt: ts,
    updatedAt: ts,
  };
}

const unavailable = composeMarketingCampaignMonitoringSummary({
  organizationId: "org-a",
  durableAvailable: true,
  providerConnected: false,
  snapshots: [snapshot()],
  snapshotRecipients: [
    recipient(),
    recipient({
      id: "rcpt-b",
      organizationId: "org-b",
      snapshotId: "snap-b",
      campaignId: "camp-b",
      sourceStableKey: "row:9",
      recipientFingerprint: "email:other@example.com",
      normalizedEmail: "other@example.com",
    }),
  ],
  ledger: [ledger()],
});

assert.equal(unavailable.metrics.frozenAudience.value, 1);
assert.equal(unavailable.metrics.queued.value, 1);
assert.equal(unavailable.metrics.attempted.value, 0);
assert.equal(unavailable.metrics.delivered.availability, "unavailable");
assert.equal(unavailable.metrics.delivered.value, null);
assert.equal(unavailable.metrics.delivered.reason, "Unavailable");
assert.equal(unavailable.metrics.providerAccepted.reason, "Unavailable");
assert.equal(unavailable.metrics.opened.reason, "Unavailable");
assert.equal(unavailable.metrics.clicked.reason, "Unavailable");
assert.equal(unavailable.metrics.replied.reason, "Unavailable");
assert.equal(unavailable.metrics.softBounced.reason, "Unavailable");
assert.equal(unavailable.metrics.hardBounced.reason, "Unavailable");
assert.notEqual(unavailable.metrics.delivered.value, 0);

const missingDurable = composeMarketingCampaignMonitoringSummary({
  organizationId: "org-a",
  durableAvailable: false,
  providerConnected: false,
});
assert.equal(missingDurable.metrics.frozenAudience.reason, "Unavailable");
assert.equal(missingDurable.metrics.queued.value, null);

const aggregated = composeMarketingCampaignMonitoringSummary({
  organizationId: "org-a",
  durableAvailable: true,
  providerConnected: false,
  snapshots: [snapshot()],
  snapshotRecipients: [recipient(), recipient({ id: "rcpt-2", sourceStableKey: "row:3", sourceRowNumber: 3, recipientFingerprint: "email:two@example.com", normalizedEmail: "two@example.com" })],
  ledger: [
    ledger(),
    ledger({
      id: "led-2",
      snapshotRecipientId: "rcpt-2",
      normalizedEmail: "two@example.com",
      sourceStableKey: "row:3",
      status: "failed",
      attemptCount: 1,
    }),
    ledger({
      id: "led-b",
      organizationId: "org-b",
      campaignId: "camp-b",
      snapshotRecipientId: "rcpt-b",
      status: "failed",
      attemptCount: 2,
    }),
  ],
  engagements: [
    {
      id: "eng-open",
      organizationId: "org-a",
      campaignId: "camp-1",
      ledgerId: "led-1",
      eventType: "OPENED",
      providerEventId: "p-open",
      idempotencyKey: "open-1",
      occurredAt: "2026-09-05T03:10:00.000Z",
      createdAt: "2026-09-05T03:10:00.000Z",
    },
  ],
});
assert.equal(aggregated.metrics.frozenAudience.value, 2);
assert.equal(aggregated.metrics.queued.value, 1);
assert.equal(aggregated.metrics.attempted.value, 1);
assert.equal(aggregated.metrics.failed.value, 1);
assert.equal(aggregated.metrics.opened.availability, "ingested");
assert.equal(aggregated.metrics.opened.value, 1);

const explorer = composeMarketingCampaignRecipientExplorer({
  organizationId: "org-a",
  durableAvailable: true,
  campaignId: "camp-1",
  recipients: [
    recipient(),
    recipient({
      id: "rcpt-b",
      organizationId: "org-b",
      campaignId: "camp-b",
      normalizedEmail: "other@example.com",
      recipientFingerprint: "email:other@example.com",
    }),
  ],
  ledger: [ledger({ status: "failed", attemptCount: 1 })],
});
assert.equal(explorer.rows.length, 1);
assert.equal(explorer.rows[0].organizationId, "org-a");
assert.equal(explorer.rows[0].identityPreview.includes("@example.com"), true);
assert.ok(explorer.rows[0].identityPreview.includes("***"));
assert.equal(explorer.rows[0].identityPreview.includes("one@example.com"), false);
assert.equal(explorer.rows[0].sourceKey, "row:2");
assert.equal(explorer.rows[0].attemptCount, 1);
assert.equal(explorer.rows[0].status, "failed");
assert.equal(analyticsPayloadContainsPii(explorer.rows), false);

const filteredFailed = composeMarketingCampaignRecipientExplorer({
  organizationId: "org-a",
  durableAvailable: true,
  recipients: [recipient(), recipient({ id: "rcpt-2", sourceStableKey: "row:3" })],
  ledger: [ledger({ status: "failed", attemptCount: 1 }), ledger({ id: "led-2", snapshotRecipientId: "rcpt-2", status: "queued", attemptCount: 0 })],
  filters: { deliveryState: "failed" },
});
assert.equal(filteredFailed.rows.length, 1);
assert.equal(filteredFailed.rows[0].id, "rcpt-1");

const timeline = composeMarketingRecipientTimeline({
  organizationId: "org-a",
  recipientId: "rcpt-1",
  durableAvailable: true,
  recipients: [recipient()],
  ledger: [
    ledger({
      status: "sent",
      createdAt: "2026-09-05T03:00:00.000Z",
      scheduledAt: "2026-09-05T03:01:00.000Z",
      claimedAt: "2026-09-05T03:02:00.000Z",
      processedAt: "2026-09-05T03:03:00.000Z",
    }),
  ],
  engagements: [
    {
      id: "eng-late",
      organizationId: "org-a",
      campaignId: "camp-1",
      ledgerId: "led-1",
      eventType: "OPENED",
      providerEventId: "p-open",
      idempotencyKey: "open-1",
      occurredAt: "2026-09-05T03:20:00.000Z",
      createdAt: "2026-09-05T03:20:00.000Z",
    },
    {
      id: "eng-early",
      organizationId: "org-a",
      campaignId: "camp-1",
      ledgerId: "led-1",
      eventType: "ACCEPTED",
      providerEventId: "p-acc",
      idempotencyKey: "acc-1",
      occurredAt: "2026-09-05T03:04:00.000Z",
      createdAt: "2026-09-05T03:04:00.000Z",
    },
  ],
});
assert.ok(timeline);
assert.equal(timeline.identityPreview.includes("one@example.com"), false);
const times = timeline.events.map((event) => event.occurredAt);
assert.deepEqual(
  times,
  [...times].sort((a, b) => a.localeCompare(b)),
);
assert.ok(times[0] <= times[times.length - 1]);
const openedIndex = timeline.events.findIndex((event) => event.type === "OPENED");
const acceptedIndex = timeline.events.findIndex((event) => event.type === "ACCEPTED");
assert.ok(acceptedIndex >= 0 && openedIndex > acceptedIndex);

assert.equal(evaluateMarketingMonitoringRetry({ status: "delivered", attemptCount: 1 }).allowed, false);
assert.equal(evaluateMarketingMonitoringRetry({ status: "delivered", attemptCount: 1 }).reason, "delivered");
assert.equal(
  evaluateMarketingMonitoringRetry({ status: "bounced", attemptCount: 1, bounceCategory: "hard" }).allowed,
  false,
);
assert.equal(
  evaluateMarketingMonitoringRetry({ status: "bounced", attemptCount: 1, bounceCategory: "hard" }).reason,
  "hard_bounce",
);
assert.equal(evaluateMarketingMonitoringRetry({ status: "failed", attemptCount: 1, unsubscribed: true }).allowed, false);
assert.equal(evaluateMarketingMonitoringRetry({ status: "failed", attemptCount: 1, complaint: true }).allowed, false);
assert.equal(
  evaluateMarketingMonitoringRetry({ status: "failed", attemptCount: 1, permanentlySuppressed: true }).allowed,
  false,
);
assert.equal(evaluateMarketingMonitoringRetry({ status: "failed", attemptCount: 1 }).allowed, true);
assert.equal(
  evaluateMarketingMonitoringRetry({ status: "bounced", attemptCount: 1, bounceCategory: "soft" }).allowed,
  true,
);
assert.equal(evaluateMarketingMonitoringRetry({ status: "deferred", attemptCount: 1 }).allowed, true);
assert.equal(evaluateMarketingMonitoringRetry({ status: "bounced", attemptCount: 1 }).allowed, false);

const still010 = composeMarketingMonitoringDashboard({
  organizationId: "org-a",
  durableAvailable: false,
  providerConnected: false,
});
assert.equal(still010.metrics.delivered.reason, "Not connected");
assert.equal(still010.metrics.opened.reason, "Not connected");

console.log("CO-MARKETING-REDESIGN-015 PASS");
