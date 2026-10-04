/**
 * CO-MARKETING-REDESIGN-010 — Monitoring, qualification inbox, auth mapping.
 * Local fixtures only. No send, migrate, cron, commit, or deploy.
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
const mapperSrc = read("src/lib/enterprise-marketing-engine/api-error-map.ts");
const apiErrorSrc = read("src/lib/enterprise-marketing-engine/api-error.ts");
const monitoringSrc = read("src/lib/enterprise-marketing-engine/monitoring.ts");
const explorerSrc = read("src/lib/enterprise-marketing-engine/recipient-explorer.ts");
const inboxSrc = read("src/lib/enterprise-marketing-engine/qualification/inbox-boundary.ts");
const evaluateSrc = read("src/lib/enterprise-marketing-engine/qualification/evaluate.ts");
const analyticsRoute = read("src/app/api/admin/marketing/analytics/route.ts");
const foundationRoute = read("src/app/api/admin/marketing/route.ts");
const campaignsRoute = read("src/app/api/admin/marketing/campaigns/route.ts");
const responsesUi = read(
  "src/components/catalyst-one/admin/marketing/marketing-responses-panel.tsx",
);
const monitoringUi = read(
  "src/components/catalyst-one/admin/marketing/marketing-monitoring-panel.tsx",
);
const identitySrc = read(
  "server/services/enterprise-marketing-engine/adapters/fixture-identity.adapter.ts",
);
const opportunitySrc = read(
  "server/services/enterprise-marketing-engine/adapters/fixture-opportunity.adapter.ts",
);
const ingestSrc = read("server/services/enterprise-marketing-engine/qualification.service.ts");
const durabilityTypes = read("src/types/enterprise-marketing-durability.ts");
const executionConst = read("src/constants/enterprise-marketing-engine/execution.ts");
const approvalSrc = read("src/lib/enterprise-marketing-engine/approval-rules.ts");

mustInclude(pkg, "verify:co-marketing-redesign-010");
mustInclude(pkg, "verify:co-marketing-redesign-pre-staging");
mustInclude(safety, "ENTERPRISE_MARKETING_EXECUTION_ENABLED = false");
mustInclude(safety, 'ENTERPRISE_MARKETING_HANDOFF_MODE ?? "fixture"');
mustInclude(cronSrc, "MARKETING_PACING_CRON_REGISTERED = false");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_SIZE = 100");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_INTERVAL_MS = 60 * 60 * 1000");
assert.doesNotMatch(schema, /model\s+Lead\b/);
assert.doesNotMatch(schema, /model\s+MarketingProspect\b/);
assert.doesNotMatch(schema, /model\s+MarketingAudienceRow\b/);
mustInclude(durabilityTypes, "Google Sheet remains the raw audience SSOT");
mustInclude(mapperSrc, "authShaped.status === 401");
mustInclude(apiErrorSrc, "fromMarketingUnknownError");
mustInclude(foundationRoute, "fromMarketingUnknownError");
mustInclude(campaignsRoute, "fromMarketingUnknownError");
mustInclude(analyticsRoute, 'view === "monitoring"');
mustInclude(analyticsRoute, 'view === "recipients"');
mustInclude(monitoringSrc, 'unavailableMarketingMetric("Not connected")');
mustInclude(monitoringSrc, 'unavailableMarketingMetric("Unavailable")');
mustInclude(explorerSrc, "maskMarketingRecipientEmail");
mustInclude(inboxSrc, "openClickDoesNotCreateContact");
mustInclude(inboxSrc, "noLeadEntity");
mustInclude(evaluateSrc, 'intent === "open" || input.intent === "click"');
mustInclude(responsesUi, "do not create a Contact or Opportunity");
mustInclude(monitoringUi, "Raw email and phone are");
mustInclude(identitySrc, "emailsMatch");
mustInclude(opportunitySrc, "o.contactId === input.contactId && o.campaignId === input.campaignId");
mustInclude(ingestSrc, "findByCampaignFingerprint");
mustInclude(ingestSrc, "duplicatePrevented");
mustInclude(approvalSrc, "actuallySent: false");
mustInclude(campaignsRoute, "MARKETING_LIVE_PROVIDER_SENDING_DISABLED");

const marketingApiFiles = walk(join(root, "src/app/api/admin/marketing"));
for (const abs of marketingApiFiles) {
  const src = readFileSync(abs, "utf8");
  if (src.includes("requireAccessToken") && src.includes("fromUnknown")) {
    assert.ok(
      src.includes("fromMarketingUnknownError"),
      `auth mapper missing in ${abs.slice(root.length + 1)}`,
    );
    assert.doesNotMatch(
      src,
      /statusCode === 401 \|\| statusCode === 403\) \{\s*return fromAuthError/,
      `legacy statusCode-only auth mapping still present in ${abs.slice(root.length + 1)}`,
    );
  }
}

const secretLeak = /[?&](password|passwd|secret|token)=/i;
const marketingScriptDir = join(root, "scripts");
const marketingApiDir = join(root, "src/app/api/admin/marketing");
for (const abs of [...walk(marketingScriptDir), ...walk(marketingApiDir)]) {
  const rel = abs.slice(root.length + 1).replaceAll("\\", "/");
  if (!rel.includes("co-marketing") && !rel.includes("src/app/api/admin/marketing")) continue;
  const src = readFileSync(abs, "utf8");
  assert.doesNotMatch(src, secretLeak, `credential query-string leak in ${rel}`);
}

const libUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/api-error-map.ts")).href;
const monitoringUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/monitoring.ts")).href;
const explorerUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/recipient-explorer.ts"),
).href;
const evaluateUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/qualification/evaluate.ts"),
).href;
const inboxUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/qualification/inbox-boundary.ts"),
).href;
const identityUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/adapters/fixture-identity.adapter.ts"),
).href;
const opportunityUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/adapters/fixture-opportunity.adapter.ts"),
).href;
const redactUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/analytics/redact-fingerprint.ts"),
).href;

const { mapMarketingUnknownError } = await import(libUrl);
const { composeMarketingMonitoringDashboard } = await import(monitoringUrl);
const { composeMarketingRecipientExplorer } = await import(explorerUrl);
const { evaluateMarketingQualificationState, canHandoffMarketingQualification } = await import(evaluateUrl);
const {
  marketingOpenOrClickQualifies,
  canCreateContactFromQualificationState,
  canCreateOpportunityFromQualificationState,
  marketingIntentCreatesCrmRecords,
} = await import(inboxUrl);
const { createFixtureIdentityResolutionPort, marketingFixtureIdentityDirectory } = await import(identityUrl);
const { createFixtureOpportunityCreatePort, marketingFixtureOpportunityDirectory } = await import(opportunityUrl);
const { analyticsPayloadContainsPii } = await import(redactUrl);

const unauth = mapMarketingUnknownError(
  {
    status: 401,
    body: { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
  },
  "MARKETING_STATUS_FAILED",
  "failed",
);
assert.equal(unauth.status, 401);
assert.equal(unauth.code, "UNAUTHORIZED");
assert.ok(unauth.authBody);

const forbidden = mapMarketingUnknownError(
  Object.assign(new Error("Only administrators can access Marketing Command Center"), {
    statusCode: 403,
    code: "FORBIDDEN",
  }),
  "MARKETING_STATUS_FAILED",
  "failed",
);
assert.equal(forbidden.status, 403);
assert.equal(forbidden.code, "FORBIDDEN");

const generic = mapMarketingUnknownError(new Error("boom"), "MARKETING_STATUS_FAILED", "failed");
assert.equal(generic.status, 500);

assert.equal(evaluateMarketingQualificationState({ intent: "open" }), "ENGAGED");
assert.equal(evaluateMarketingQualificationState({ intent: "click" }), "ENGAGED");
assert.equal(marketingOpenOrClickQualifies("open"), false);
assert.equal(marketingOpenOrClickQualifies("click"), false);
assert.equal(canHandoffMarketingQualification("ENGAGED"), false);
assert.equal(canCreateContactFromQualificationState("ENGAGED"), false);
assert.equal(canCreateOpportunityFromQualificationState("ENGAGED"), false);
assert.equal(canCreateContactFromQualificationState("QUALIFIED"), true);
assert.equal(marketingIntentCreatesCrmRecords("open"), false);

const disconnected = composeMarketingMonitoringDashboard({
  organizationId: "org-a",
  durableAvailable: false,
  providerConnected: false,
});
assert.equal(disconnected.metrics.sourceRows.reason, "Unavailable");
assert.equal(disconnected.metrics.delivered.reason, "Not connected");
assert.equal(disconnected.metrics.opened.reason, "Not connected");
assert.equal(disconnected.metrics.attributedPipeline.reason, "Not connected");
assert.equal(disconnected.metrics.attributedRevenue.reason, "Not connected");
assert.equal(disconnected.metrics.sourceRows.value, null);

const ts = new Date().toISOString();
const connected = composeMarketingMonitoringDashboard({
  organizationId: "org-a",
  durableAvailable: true,
  providerConnected: false,
  snapshots: [
    {
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
    },
  ],
  snapshotRecipients: [
    {
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
    },
    {
      id: "rcpt-b",
      organizationId: "org-b",
      snapshotId: "snap-b",
      campaignId: "camp-b",
      sourceWorkbookId: "wb-1",
      sourceTabId: "tab-1",
      sourceTabName: "Master",
      sourceRowNumber: 9,
      sourceStableKey: "row:9",
      recipientFingerprint: "email:other@example.com",
      normalizedEmail: "other@example.com",
      assignedBatchNumber: 1,
      createdAt: ts,
      updatedAt: ts,
    },
  ],
  ledger: [
    {
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
    },
  ],
  qualifications: [
    {
      id: "q1",
      organizationId: "org-a",
      campaignId: "camp-1",
      channel: "EMAIL",
      recipientFingerprint: "email:one@example.com",
      intent: "enquiry",
      businessState: "QUALIFIED",
      processState: "NEW",
      createdAt: ts,
      updatedAt: ts,
    },
  ],
});
assert.equal(connected.metrics.sourceRows.value, 4);
assert.equal(connected.metrics.eligible.value, 2);
assert.equal(connected.metrics.snapshotted.value, 1);
assert.equal(connected.metrics.queued.value, 1);
assert.equal(connected.metrics.opened.reason, "Not connected");
assert.equal(connected.metrics.qualified.value, 1);

const explorer = composeMarketingRecipientExplorer({
  organizationId: "org-a",
  durableAvailable: true,
  recipients: connected.metrics ? [
    {
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
    },
    {
      id: "rcpt-b",
      organizationId: "org-b",
      snapshotId: "snap-b",
      campaignId: "camp-b",
      sourceWorkbookId: "wb-1",
      sourceTabId: "tab-1",
      sourceTabName: "Master",
      sourceRowNumber: 9,
      sourceStableKey: "row:9",
      recipientFingerprint: "email:other@example.com",
      normalizedEmail: "other@example.com",
      assignedBatchNumber: 1,
      createdAt: ts,
      updatedAt: ts,
    },
  ] : [],
});
assert.equal(explorer.rows.length, 1);
assert.equal(explorer.rows[0].organizationId, "org-a");
assert.equal(explorer.rows[0].emailPreview.includes("@example.com"), true);
assert.ok(explorer.rows[0].emailPreview.includes("***"));
assert.equal(explorer.rows[0].emailPreview.includes("one@example.com"), false);
assert.equal(analyticsPayloadContainsPii(explorer.rows), false);

marketingFixtureIdentityDirectory.resetOrganization("org-a");
marketingFixtureOpportunityDirectory.reset();
const identity = createFixtureIdentityResolutionPort();
const first = await identity.matchOrCreate({
  organizationId: "org-a",
  actorUserId: "u1",
  name: "Ada",
  email: "ada@example.com",
  phone: null,
});
const reused = await identity.matchOrCreate({
  organizationId: "org-a",
  actorUserId: "u1",
  name: "Ada Second",
  email: "ada@example.com",
  phone: null,
});
assert.equal(first.created, true);
assert.equal(reused.created, false);
assert.equal(reused.contactId, first.contactId);

const opportunities = createFixtureOpportunityCreatePort();
const opp1 = await opportunities.createDialogue({
  organizationId: "org-a",
  actorUserId: "u1",
  assigneeUserId: "u1",
  contactId: first.contactId,
  contactName: "Ada",
  contactEmail: "ada@example.com",
  contactPhone: null,
  campaignId: "camp-1",
  campaignName: "Camp",
  qualificationId: "q-1",
});
const opp2 = await opportunities.createDialogue({
  organizationId: "org-a",
  actorUserId: "u1",
  assigneeUserId: "u1",
  contactId: first.contactId,
  contactName: "Ada",
  contactEmail: "ada@example.com",
  contactPhone: null,
  campaignId: "camp-1",
  campaignName: "Camp",
  qualificationId: "q-2",
});
assert.equal(opp1.created, true);
assert.equal(opp2.created, false);
assert.equal(opp2.opportunityId, opp1.opportunityId);

console.log("CO-MARKETING-REDESIGN-010 PASS");
