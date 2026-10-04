/**
 * CO-MARKETING-REDESIGN-012 — Durable Consent and Suppression Centre.
 * Local fixtures only. No send, migrate, Hostinger, commit, or deploy.
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
const migration = read(
  "prisma/migrations/20260905120000_co_marketing_redesign_durable_foundation/migration.sql",
);
const executionConst = read("src/constants/enterprise-marketing-engine/execution.ts");
const consentConst = read("src/constants/enterprise-marketing-engine/consent-suppression.ts");
const policySrc = read("src/lib/enterprise-marketing-engine/consent-policy.ts");
const evaluateSrc = read("src/lib/enterprise-marketing-engine/consent-evaluate.ts");
const historySrc = read("src/lib/enterprise-marketing-engine/consent-history.ts");
const storeSrc = read("server/services/enterprise-marketing-engine/suppression-store.ts");
const serviceSrc = read("server/services/enterprise-marketing-engine/consent.service.ts");
const apiSrc = read("src/app/api/admin/marketing/consent/route.ts");
const panelSrc = read(
  "src/components/catalyst-one/admin/marketing/marketing-consent-panel.tsx",
);
const workerSrc = read(
  "src/lib/enterprise-marketing-engine/execution/snapshot-pacing-worker.ts",
);
const audienceSvc = read("server/services/enterprise-marketing-engine/audience.service.ts");
const executionSvc = read("server/services/enterprise-marketing-engine/execution.service.ts");
const permConst = read("src/constants/enterprise-marketing-engine/permissions.ts");
const permLib = read("src/lib/enterprise-marketing-engine/permissions.ts");
const builderPage = read(
  "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
);
const orgSrc = read("server/services/enterprise-marketing-engine/organization.ts");
const gates = read("scripts/co-marketing-redesign-pre-staging-gates.mjs");

mustInclude(pkg, "verify:co-marketing-redesign-012");
mustInclude(gates, "verify:co-marketing-redesign-012");
mustInclude(safety, "ENTERPRISE_MARKETING_EXECUTION_ENABLED = false");
mustInclude(cronSrc, "MARKETING_PACING_CRON_REGISTERED = false");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_SIZE = 100");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_INTERVAL_MS = 60 * 60 * 1000");
assert.doesNotMatch(schema, /model\s+Lead\b/);
assert.doesNotMatch(schema, /model\s+MarketingProspect\b/);
assert.doesNotMatch(migration, /Lead\b/);
mustInclude(migration, "Do not apply without explicit Product Owner approval");
mustInclude(migration, "enterprise_marketing_suppressions");
mustInclude(migration, 'REFERENCES "organizations"("id")');
mustInclude(consentConst, "CONSENT_GRANTED");
mustInclude(consentConst, "UNSUBSCRIBED");
mustInclude(consentConst, "HARD_BOUNCE");
mustInclude(consentConst, "SPAM_COMPLAINT");
mustInclude(consentConst, "TEMPORARY_SUPPRESSION");
mustInclude(consentConst, "CAMPAIGN_EXCLUSION");
mustInclude(policySrc, "marketingMissingConsentIsGranted");
mustInclude(evaluateSrc, 'phase: "snapshot_approval" | "delivery"');
mustInclude(historySrc, "assertMarketingSnapshotNotSilentlyPurged");
mustInclude(storeSrc, "seedFixtureSuppressions");
mustInclude(serviceSrc, 'trimmed === "default"');
mustInclude(serviceSrc, "SUPPRESSION_REASON_REQUIRED");
mustInclude(serviceSrc, "FIXTURE_RECIPIENTS_ONLY");
mustInclude(serviceSrc, "CONSENT_DELETE_FORBIDDEN");
mustInclude(apiSrc, "resolveMarketingOrganizationId");
mustInclude(apiSrc, "fromMarketingUnknownError");
mustInclude(apiSrc, 'action === "delete"');
mustInclude(panelSrc, "mkt-consent-card");
mustInclude(panelSrc, "Recipient history");
mustInclude(panelSrc, "Prepare export");
mustInclude(panelSrc, "No consent or suppression records");
mustInclude(workerSrc, "shouldSuppressDelivery");
mustInclude(workerSrc, 'status: "suppressed"');
mustInclude(audienceSvc, 'phase: "snapshot_approval"');
mustInclude(executionSvc, 'phase: "delivery"');
mustInclude(permConst, "SUPPRESSION_VIEW");
mustInclude(permConst, "SUPPRESSION_MANAGE");
mustInclude(permConst, "SUPPRESSION_EXPORT");
mustInclude(permConst, "SUPPRESSION_VIEW_PII");
mustInclude(orgSrc, 'organizationId === "default"');
assert.doesNotMatch(builderPage, /test_send/);
assert.doesNotMatch(builderPage, /run_test_batch/);
assert.doesNotMatch(builderPage, /run_next_batch/);

const adminDefault = permLib.slice(
  permLib.indexOf("const ADMIN_DEFAULT"),
  permLib.indexOf("export function resolveMarketingPermissions"),
);
assert.ok(adminDefault.includes("SUPPRESSION_VIEW"));
assert.ok(adminDefault.includes("SUPPRESSION_MANAGE"));
assert.equal(adminDefault.includes("SUPPRESSION_EXPORT"), false);
assert.equal(adminDefault.includes("SUPPRESSION_VIEW_PII"), false);
assert.equal(adminDefault.includes("CAMPAIGN_APPROVE"), false);
assert.equal(adminDefault.includes("CAMPAIGN_SEND"), false);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "marketing-pre-staging-local-jwt-secret-aaaa";
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = "marketing-pre-staging-local-jwt-refresh-bbbb";
}

const storeUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/suppression-store.ts"),
).href;
const serviceUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/consent.service.ts"),
).href;
const policyUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/consent-policy.ts"),
).href;
const evaluateUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/consent-evaluate.ts"),
).href;
const historyUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/consent-history.ts"),
).href;
const permUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/permissions.ts")).href;

const storeMod = await import(storeUrl);
const serviceMod = await import(serviceUrl);
const policyMod = await import(policyUrl);
const evaluateMod = await import(evaluateUrl);
const historyMod = await import(historyUrl);
const permMod = await import(permUrl);

storeMod.marketingSuppressionStore.reset();

const orgA = {
  userId: "verify-012-a",
  organizationId: "org-mkt-012-a",
  role: "SUPER_ADMIN",
};
const orgB = {
  userId: "verify-012-b",
  organizationId: "org-mkt-012-b",
  role: "SUPER_ADMIN",
};
const adminOnly = {
  userId: "verify-012-admin",
  organizationId: "org-mkt-012-a",
  role: "ADMIN",
};

assert.equal(policyMod.marketingMissingConsentIsGranted(), false);

let defaultRejected = false;
try {
  serviceMod.marketingConsentService.list({
    userId: "x",
    organizationId: "default",
    role: "SUPER_ADMIN",
  });
} catch (err) {
  defaultRejected = err?.code === "ORGANIZATION_REQUIRED";
}
assert.equal(defaultRejected, true, "default org must be rejected");

const snapshotRecipients = [
  { id: "snap-r-1", normalizedEmail: "later.unsubscribe@example.com" },
  { id: "snap-r-2", normalizedEmail: "hard.bounce@example.com" },
];
const beforeIds = snapshotRecipients.map((row) => row.id);

const approvalOpen = storeMod.marketingSuppressionStore.evaluateDelivery({
  organizationId: orgA.organizationId,
  fingerprints: ["email:later.unsubscribe@example.com"],
  phase: "snapshot_approval",
  channel: "EMAIL",
});
assert.equal(approvalOpen.blocked, false, "recipient must be eligible at freeze time");

const unsub = serviceMod.marketingConsentService.add(orgA, {
  fingerprint: "email:later.unsubscribe@example.com",
  reason: "Recipient unsubscribed after freeze",
  kind: "UNSUBSCRIBED",
});
assert.equal(unsub.kind, "UNSUBSCRIBED");
assert.ok(unsub.auditTimestamp);
assert.equal(unsub.duration, "PERMANENT");

historyMod.assertMarketingSnapshotNotSilentlyPurged({
  beforeIds,
  afterIds: snapshotRecipients.map((row) => row.id),
});

const laterBlock = storeMod.marketingSuppressionStore.evaluateDelivery({
  organizationId: orgA.organizationId,
  fingerprints: ["email:later.unsubscribe@example.com"],
  phase: "delivery",
  channel: "EMAIL",
});
assert.equal(laterBlock.blocked, true);
assert.equal(laterBlock.code, "unsubscribe");
assert.equal(laterBlock.historicalSnapshotPreserved, true);
assert.equal(
  evaluateMod.laterUnsubscribePreventsDelivery({
    snapshotContainedRecipient: true,
    unsubscribedAfterFreeze: true,
    decision: laterBlock,
  }),
  true,
);

const bounce = serviceMod.marketingConsentService.add(orgA, {
  fingerprint: "email:hard.bounce@example.com",
  reason: "Provider hard bounce",
  kind: "HARD_BOUNCE",
  source: "PROVIDER",
});
assert.equal(bounce.kind, "HARD_BOUNCE");
const bounceBlock = storeMod.marketingSuppressionStore.evaluateDelivery({
  organizationId: orgA.organizationId,
  fingerprints: ["email:hard.bounce@example.com"],
  phase: "delivery",
  channel: "EMAIL",
});
assert.equal(bounceBlock.blocked, true);
assert.equal(bounceBlock.code, "hard_bounce");

const complaint = serviceMod.marketingConsentService.add(orgA, {
  fingerprint: "email:spam.complaint@example.com",
  reason: "Spam complaint",
  kind: "SPAM_COMPLAINT",
  source: "PROVIDER",
});
const complaintBlock = storeMod.marketingSuppressionStore.evaluateDelivery({
  organizationId: orgA.organizationId,
  fingerprints: ["email:spam.complaint@example.com"],
  phase: "delivery",
  channel: "EMAIL",
});
assert.equal(complaintBlock.blocked, true);
assert.equal(complaintBlock.code, "complaint");

const hiddenFromB = serviceMod.marketingConsentService.list(orgB);
assert.equal(
  hiddenFromB.some((row) => row.id === unsub.id || row.identityPreview.includes("later.unsubscribe")),
  false,
  "org B must not see org A suppressions",
);

let missingReason = false;
try {
  serviceMod.marketingConsentService.add(orgA, {
    fingerprint: "email:no.reason@example.com",
    reason: "   ",
    kind: "MANUAL_SUPPRESSION",
  });
} catch (err) {
  missingReason = err?.code === "SUPPRESSION_REASON_REQUIRED";
}
assert.equal(missingReason, true, "manual add requires reason");

let missingLift = false;
try {
  serviceMod.marketingConsentService.lift(orgA, bounce.id, "");
} catch (err) {
  missingLift = err?.code === "SUPPRESSION_REASON_REQUIRED";
}
assert.equal(missingLift, true, "lift requires reason");

const lifted = serviceMod.marketingConsentService.lift(orgA, bounce.id, "Verified mailbox recovered");
assert.equal(lifted.status, "LIFTED");
assert.ok(lifted.auditTimestamp);

const bounceAfterLift = storeMod.marketingSuppressionStore.evaluateDelivery({
  organizationId: orgA.organizationId,
  fingerprints: ["email:hard.bounce@example.com"],
  phase: "delivery",
  channel: "EMAIL",
});
assert.equal(bounceAfterLift.blocked, false, "lifted hard bounce must not keep blocking");

let realRecipient = false;
try {
  serviceMod.marketingConsentService.add(orgA, {
    fingerprint: "email:person@gmail.com",
    reason: "Should not ingest",
    kind: "MANUAL_SUPPRESSION",
  });
} catch (err) {
  realRecipient = err?.code === "FIXTURE_RECIPIENTS_ONLY";
}
assert.equal(realRecipient, true, "real recipients must not be ingested");

let deleteBlocked = false;
try {
  serviceMod.marketingConsentService.delete(orgA, unsub.id);
} catch (err) {
  deleteBlocked = err?.code === "CONSENT_DELETE_FORBIDDEN";
}
assert.equal(deleteBlocked, true);

serviceMod.marketingConsentService.savePolicy(orgA, { requireExplicitConsent: true });
const missingConsent = storeMod.marketingSuppressionStore.evaluateDelivery({
  organizationId: orgA.organizationId,
  fingerprints: ["email:no.consent.column@example.com"],
  phase: "snapshot_approval",
  channel: "EMAIL",
  consentValue: "",
});
assert.equal(missingConsent.blocked, true);
assert.equal(missingConsent.code, "missing_consent");

const grantedConsent = storeMod.marketingSuppressionStore.evaluateDelivery({
  organizationId: orgA.organizationId,
  fingerprints: ["email:granted.consent@example.com"],
  phase: "snapshot_approval",
  channel: "EMAIL",
  consentValue: "yes",
});
assert.equal(grantedConsent.blocked, false);

assert.equal(permMod.hasMarketingPermission(adminOnly, "admin.marketing.suppression.view"), true);
assert.equal(permMod.hasMarketingPermission(adminOnly, "admin.marketing.suppression.manage"), true);
assert.equal(permMod.hasMarketingPermission(adminOnly, "admin.marketing.suppression.export"), false);
assert.equal(permMod.hasMarketingPermission(adminOnly, "admin.marketing.suppression.view_pii"), false);

let exportDenied = false;
try {
  serviceMod.marketingConsentService.prepareExport(adminOnly);
} catch (err) {
  exportDenied = err?.code === "MARKETING_PERMISSION_DENIED";
}
assert.equal(exportDenied, true, "ADMIN must not export without grant");

const masked = serviceMod.marketingConsentService.list(adminOnly);
assert.ok(masked.length > 0);
assert.equal(
  masked.some((row) => (row.normalizedEmail || "").includes("later.unsubscribe@example.com")),
  false,
  "ADMIN must not see unmasked suppressed PII",
);

const prepared = serviceMod.marketingConsentService.prepareExport(orgA);
assert.equal(prepared.fileWritten, false);
assert.ok(prepared.rows.length > 0);

const audit = serviceMod.marketingConsentService.recentAudit(orgA, 40);
assert.ok(audit.some((event) => event.kind === "consent.add" && event.detail?.auditTimestamp));
assert.ok(audit.some((event) => event.kind === "consent.lift"));
assert.ok(audit.some((event) => event.kind === "consent.policy.update"));

const temp = serviceMod.marketingConsentService.add(orgA, {
  fingerprint: "email:temp.hold@example.com",
  reason: "Temporary legal hold",
  kind: "TEMPORARY_SUPPRESSION",
  duration: "TEMPORARY",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
});
assert.equal(temp.duration, "TEMPORARY");
assert.ok(temp.expiresAt);

console.log("CO-MARKETING-REDESIGN-012 consent/suppression verify: PASS");
