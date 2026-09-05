/**
 * CO-MARKETING-REDESIGN-001 — Static schema / contract verifier.
 * Does not contact a database. Does not apply migrations. Does not send.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION_DIR = "prisma/migrations/20260905120000_co_marketing_redesign_durable_foundation";
const MIGRATION_FILE = `${MIGRATION_DIR}/migration.sql`;

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function mustInclude(haystack, needle, label = needle) {
  assert.ok(haystack.includes(needle), `missing ${label}`);
}

function extractModel(schema, name) {
  const re = new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`);
  const match = schema.match(re);
  assert.ok(match, `model ${name} missing`);
  return match[0];
}

assert.equal(
  existsSync(join(root, MIGRATION_FILE)),
  true,
  `migration file missing: ${MIGRATION_FILE}`,
);

const schema = read("prisma/schema.prisma");
const migration = read(MIGRATION_FILE);
const execution = read("src/constants/enterprise-marketing-engine/execution.ts");
const safety = read("src/constants/enterprise-marketing-engine/safety.ts");
const emailDelivery = read("src/constants/enterprise-marketing-engine/email-delivery.ts");
const whatsappDelivery = read("src/constants/enterprise-marketing-engine/whatsapp-delivery.ts");
const pkg = read("package.json");

const REQUIRED_MODELS = [
  "EnterpriseMarketingCampaign",
  "EnterpriseMarketingCampaignVersion",
  "EnterpriseMarketingSheetBinding",
  "EnterpriseMarketingAudienceDefinition",
  "EnterpriseMarketingAudienceSnapshot",
  "EnterpriseMarketingSnapshotRecipient",
  "EnterpriseMarketingDeliveryBatch",
  "EnterpriseMarketingRecipientLedger",
  "EnterpriseMarketingExecutionLease",
  "EnterpriseMarketingSuppression",
  "EnterpriseMarketingEngagementEvent",
  "EnterpriseMarketingTestSend",
  "EnterpriseMarketingQualification",
  "EnterpriseMarketingAuditEvent",
];

const REQUIRED_TABLES = [
  "enterprise_marketing_campaigns",
  "enterprise_marketing_campaign_versions",
  "enterprise_marketing_sheet_bindings",
  "enterprise_marketing_audience_definitions",
  "enterprise_marketing_audience_snapshots",
  "enterprise_marketing_snapshot_recipients",
  "enterprise_marketing_delivery_batches",
  "enterprise_marketing_recipient_ledgers",
  "enterprise_marketing_execution_leases",
  "enterprise_marketing_suppressions",
  "enterprise_marketing_engagement_events",
  "enterprise_marketing_test_sends",
  "enterprise_marketing_qualifications",
  "enterprise_marketing_audit_events",
];

const FORBIDDEN_MODEL_NAMES = [
  "MarketingLead",
  "EnterpriseMarketingLead",
  "EnterpriseMarketingProspect",
  "MarketingProspect",
  "ProspectMirror",
  "EnterpriseMarketingProspectMirror",
];

const FORBIDDEN_TABLE_NAMES = [
  "enterprise_marketing_leads",
  "enterprise_marketing_prospects",
  "marketing_leads",
  "marketing_prospects",
  "marketing_prospect_mirror",
  "enterprise_marketing_prospect_mirror",
];

for (const model of REQUIRED_MODELS) {
  mustInclude(schema, `model ${model} {`, `model ${model}`);
}
for (const table of REQUIRED_TABLES) {
  mustInclude(schema, `@@map("${table}")`, `@@map ${table}`);
}

for (const name of FORBIDDEN_MODEL_NAMES) {
  assert.doesNotMatch(schema, new RegExp(`model\\s+${name}\\s+\\{`), `forbidden model ${name}`);
}
for (const table of FORBIDDEN_TABLE_NAMES) {
  assert.doesNotMatch(schema, new RegExp(`@@map\\("${table}"\\)`), `forbidden table ${table}`);
  assert.doesNotMatch(
    migration,
    new RegExp(`CREATE TABLE "${table}"`, "i"),
    `forbidden CREATE TABLE ${table}`,
  );
}

for (const name of REQUIRED_MODELS) {
  const body = extractModel(schema, name);
  mustInclude(body, "organizationId", `${name}.organizationId`);
  if (name !== "EnterpriseMarketingCampaignVersion") {
    assert.match(body, /organization\s+Organization\b/, `${name} Organization relation`);
  }
}

const campaign = extractModel(schema, "EnterpriseMarketingCampaign");
for (const field of [
  "id",
  "organizationId",
  "status",
  "currentDraftVersionId",
  "activePublishedVersionId",
  "createdByUserId",
  "updatedByUserId",
  "sourceBindingId",
  "approvedSnapshotId",
  "createdAt",
  "updatedAt",
]) {
  mustInclude(campaign, field, `campaign.${field}`);
}

const version = extractModel(schema, "EnterpriseMarketingCampaignVersion");
for (const field of [
  "id",
  "campaignId",
  "organizationId",
  "versionNumber",
  "createdByUserId",
  "updatedByUserId",
]) {
  mustInclude(version, field, `version.${field}`);
}

const binding = extractModel(schema, "EnterpriseMarketingSheetBinding");
for (const field of ["spreadsheetId", "driveFileId", "authorised", "authRef"]) {
  mustInclude(binding, field, `binding.${field}`);
}

const snapshot = extractModel(schema, "EnterpriseMarketingAudienceSnapshot");
for (const field of [
  "sourceWorkbookId",
  "sourceTabId",
  "sourceTabName",
  "extractedAt",
  "columnMapJson",
  "frozenAt",
  "eligibleCount",
]) {
  mustInclude(snapshot, field, `snapshot.${field}`);
}

const recipient = extractModel(schema, "EnterpriseMarketingSnapshotRecipient");
for (const field of [
  "normalizedEmail",
  "sourceStableKey",
  "sourceRowNumber",
  "recipientFingerprint",
  "sourceWorkbookId",
  "sourceTabId",
]) {
  mustInclude(recipient, field, `snapshotRecipient.${field}`);
}

const batch = extractModel(schema, "EnterpriseMarketingDeliveryBatch");
for (const field of ["batchNumber", "scheduledAt", "processedAt", "dryRun"]) {
  mustInclude(batch, field, `batch.${field}`);
}

const ledger = extractModel(schema, "EnterpriseMarketingRecipientLedger");
for (const field of [
  "idempotencyKey",
  "normalizedEmail",
  "sourceStableKey",
  "batchNumber",
  "scheduledAt",
  "processedAt",
  "attemptCount",
  "providerMessageId",
  "openedAt",
  "clickedAt",
  "repliedAt",
  "unsubscribedAt",
  "suppressionReason",
  "linkedContactId",
  "linkedOpportunityId",
  "createdByUserId",
  "updatedByUserId",
]) {
  mustInclude(ledger, field, `ledger.${field}`);
}

const lease = extractModel(schema, "EnterpriseMarketingExecutionLease");
for (const field of ["pauseState", "streamCursor", "nextRunAt", "lastCompletedBatchNumber"]) {
  mustInclude(lease, field, `lease.${field}`);
}

const suppression = extractModel(schema, "EnterpriseMarketingSuppression");
for (const field of ["reason", "consentStatus", "identityFingerprint"]) {
  mustInclude(suppression, field, `suppression.${field}`);
}

const engagement = extractModel(schema, "EnterpriseMarketingEngagementEvent");
for (const field of ["eventType", "providerEventId", "occurredAt"]) {
  mustInclude(engagement, field, `engagement.${field}`);
}

const testSend = extractModel(schema, "EnterpriseMarketingTestSend");
for (const field of ["idempotencyKey", "dryRun", "actuallySent", "providerMessageId"]) {
  mustInclude(testSend, field, `testSend.${field}`);
}

const qualification = extractModel(schema, "EnterpriseMarketingQualification");
for (const field of ["linkedContactId", "linkedOpportunityId", "recipientFingerprint"]) {
  mustInclude(qualification, field, `qualification.${field}`);
}

const audit = extractModel(schema, "EnterpriseMarketingAuditEvent");
for (const field of ["actorUserId", "kind", "createdAt"]) {
  mustInclude(audit, field, `audit.${field}`);
}

mustInclude(schema, 'map: "emrl_org_idempotency_uidx"', "ledger org idempotency unique");
mustInclude(schema, 'map: "emts_org_idempotency_uidx"', "test-send org idempotency unique");
mustInclude(schema, 'map: "emee_org_provider_event_uidx"', "engagement provider event unique");
mustInclude(schema, 'map: "emrl_campaign_channel_email_uidx"', "ledger campaign/channel/email unique");
mustInclude(schema, 'map: "emc_approved_snapshot_uidx"', "approved snapshot unique");
mustInclude(schema, 'map: "emsb_org_sheet_uidx"', "sheet binding org unique");
mustInclude(schema, 'map: "emdb_campaign_batch_uidx"', "batch sequence unique");

mustInclude(migration, 'CREATE UNIQUE INDEX "emrl_org_idempotency_uidx"');
mustInclude(migration, 'CREATE UNIQUE INDEX "emts_org_idempotency_uidx"');
mustInclude(migration, 'ALTER TABLE "enterprise_marketing_campaigns" ADD COLUMN');
mustInclude(migration, 'CREATE TABLE "enterprise_marketing_audience_snapshots"');
mustInclude(migration, "Do not apply without explicit Product Owner approval");

assert.doesNotMatch(migration, /\bDROP TABLE\b/i, "migration must not DROP TABLE");
assert.doesNotMatch(migration, /\bTRUNCATE\b/i, "migration must not TRUNCATE");
assert.doesNotMatch(migration, /DROP COLUMN/i, "migration must not DROP COLUMN");
assert.doesNotMatch(migration, /RENAME COLUMN/i, "migration must not RENAME COLUMN");
assert.doesNotMatch(migration, /_prisma_migrations/, "migration must not write apply history");

mustInclude(execution, "MARKETING_DEFAULT_BATCH_SIZE = 100");
mustInclude(execution, "MARKETING_DEFAULT_BATCH_INTERVAL_MS = 60 * 60 * 1000");
mustInclude(safety, "ENTERPRISE_MARKETING_EXECUTION_ENABLED = false");
mustInclude(safety, "ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false");
mustInclude(safety, "ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED = false");
mustInclude(emailDelivery, '?? "dry_run"');
mustInclude(whatsappDelivery, '?? "dry_run"');
mustInclude(emailDelivery, 'EnterpriseMarketingEmailDeliveryMode = "off" | "dry_run" | "live"');

mustInclude(pkg, '"verify:co-marketing-redesign-001"');
mustInclude(
  pkg,
  '"verify:co-marketing-redesign-001": "node --import tsx scripts/co-marketing-redesign-001-schema-verify.mjs"',
);

assert.doesNotMatch(pkg, /verify:co-marketing-redesign-001": ".*prisma /);

const lifecycleUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/durability/lifecycle.ts"),
).href;
const policyUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/durability/policy.ts"),
).href;
const identityUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/durability/identity.ts"),
).href;
const safetyUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/durability/safety-contract.ts"),
).href;
const leaseUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/durability/lease-state.ts"),
).href;
const executionUrl = pathToFileURL(
  resolve(root, "src/constants/enterprise-marketing-engine/execution.ts"),
).href;
const safetyConstUrl = pathToFileURL(
  resolve(root, "src/constants/enterprise-marketing-engine/safety.ts"),
).href;
const transUrl = pathToFileURL(
  resolve(root, "src/constants/enterprise-marketing-engine/transitions.ts"),
).href;

const lifecycle = await import(lifecycleUrl);
const policy = await import(policyUrl);
const identity = await import(identityUrl);
const safetyContract = await import(safetyUrl);
const leaseState = await import(leaseUrl);
const executionMod = await import(executionUrl);
const safetyMod = await import(safetyConstUrl);
const transMod = await import(transUrl);

assert.equal(executionMod.MARKETING_DEFAULT_BATCH_SIZE, 100);
assert.equal(executionMod.MARKETING_DEFAULT_BATCH_INTERVAL_MS, 3_600_000);
assert.equal(executionMod.MARKETING_DEFAULT_BATCH_POLICY.batchSize, 100);
assert.equal(executionMod.MARKETING_DEFAULT_BATCH_POLICY.intervalMs, 60 * 60 * 1000);
policy.assertMarketingDefaultPacingPolicy();
assert.equal(safetyMod.ENTERPRISE_MARKETING_EXECUTION_ENABLED, false);
assert.equal(safetyMod.ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED, false);
safetyContract.assertMarketingLiveSendDisabled();

assert.equal(lifecycle.assertMarketingActionAllowed("DRAFT", "SAVE"), "DRAFT");
assert.equal(lifecycle.assertMarketingActionAllowed("RUNNING", "PAUSE"), "PAUSED");
assert.equal(lifecycle.assertMarketingActionAllowed("RUNNING", "STOP"), "STOPPED");
assert.equal(lifecycle.assertMarketingActionAllowed("PAUSED", "RESUME"), "RUNNING");
assert.equal(lifecycle.assertMarketingActionAllowed("PAUSED", "RESUME", "SCHEDULED"), "SCHEDULED");

assert.equal(transMod.isMarketingTransitionAllowed("DRAFT", "RUNNING"), false);
assert.equal(transMod.isMarketingTransitionAllowed("RUNNING", "PAUSED"), true);
assert.equal(transMod.isMarketingTransitionAllowed("COMPLETED", "RUNNING"), false);

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

expectThrow(() => lifecycle.assertMarketingActionAllowed("COMPLETED", "SAVE"), "ILLEGAL_LIFECYCLE_TRANSITION");
expectThrow(() => lifecycle.assertMarketingActionAllowed("DRAFT", "APPROVE"), "ILLEGAL_LIFECYCLE_TRANSITION");
expectThrow(() => lifecycle.assertMarketingActionAllowed("RUNNING", "RESUME"), "ILLEGAL_LIFECYCLE_TRANSITION");
expectThrow(() => transMod.assertMarketingTransitionAllowed("RUNNING", "DRAFT"), "ILLEGAL_LIFECYCLE_TRANSITION");
expectThrow(() => leaseState.assertMarketingLeasePauseTransition("STOPPED", "ACTIVE"), "ILLEGAL_LEASE_PAUSE_TRANSITION");

assert.equal(identity.normalizeMarketingLedgerEmail("  Foo@Example.COM "), "foo@example.com");
assert.equal(
  identity.buildMarketingLedgerIdempotencyKey({
    organizationId: "org-1",
    campaignId: "camp-1",
    channel: "EMAIL",
    normalizedEmail: "Foo@Example.COM",
  }),
  "org-1:camp-1:email:foo@example.com",
);
assert.equal(identity.buildMarketingSourceStableKey({ sourceRowNumber: 12 }), "row:12");
expectThrow(() => identity.assertNormalizedMarketingEmail("not-an-email"), "INVALID_NORMALIZED_EMAIL");

const estimated = policy.estimateMarketingBatchCount(250, 100);
assert.equal(estimated, 3);
const doneAt = policy.estimateMarketingCompletionAt({
  firstScheduledAt: new Date("2026-09-04T09:00:00.000Z"),
  eligibleCount: 250,
  policy: executionMod.MARKETING_DEFAULT_BATCH_POLICY,
});
assert.equal(doneAt.toISOString(), "2026-09-04T11:00:00.000Z");

console.log("OK: CO-MARKETING-REDESIGN-001 schema / contracts (static, no database)");
console.log(`MIGRATION=${MIGRATION_FILE}`);
console.log("LIVE_SEND=false");
console.log("DEFAULT_POLICY=100/60min");
console.log("MIGRATION_APPLIED=false (not executed; SQL is additive source only)");
