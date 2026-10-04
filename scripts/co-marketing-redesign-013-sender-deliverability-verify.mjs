/**
 * CO-MARKETING-REDESIGN-013 — Sender identity and deliverability readiness.
 * Local fixtures only. No send, DNS mutation, migrate, Hostinger, commit, or deploy.
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
const senderConst = read("src/constants/enterprise-marketing-engine/sender-deliverability.ts");
const eligibilitySrc = read("src/lib/enterprise-marketing-engine/sender-eligibility.ts");
const readinessSrc = read("src/lib/enterprise-marketing-engine/deliverability-readiness.ts");
const storeSrc = read("server/services/enterprise-marketing-engine/sender-identity-store.ts");
const senderSvc = read("server/services/enterprise-marketing-engine/sender.service.ts");
const delivSvc = read("server/services/enterprise-marketing-engine/deliverability.service.ts");
const campaignSvc = read("server/services/enterprise-marketing-engine/campaign.service.ts");
const senderApi = read("src/app/api/admin/marketing/sender-identities/route.ts");
const delivApi = read("src/app/api/admin/marketing/deliverability/route.ts");
const panelSrc = read(
  "src/components/catalyst-one/admin/marketing/marketing-deliverability-panel.tsx",
);
const settingsSrc = read(
  "src/components/catalyst-one/admin/marketing/marketing-settings-panel.tsx",
);
const builderPage = read(
  "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
);
const permLib = read("src/lib/enterprise-marketing-engine/permissions.ts");
const disabledSrc = read("src/lib/enterprise-marketing-engine/disabled-ports.ts");
const gates = read("scripts/co-marketing-redesign-pre-staging-gates.mjs");
const inboundSvc = read(
  "server/services/enterprise-inbound-email/inbound-email-ingestion.service.ts",
);

mustInclude(pkg, "verify:co-marketing-redesign-013");
mustInclude(gates, "verify:co-marketing-redesign-013");
mustInclude(safety, "ENTERPRISE_MARKETING_EXECUTION_ENABLED = false");
mustInclude(cronSrc, "MARKETING_PACING_CRON_REGISTERED = false");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_SIZE = 100");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_INTERVAL_MS = 60 * 60 * 1000");
assert.doesNotMatch(schema, /model\s+Lead\b/);
assert.doesNotMatch(schema, /model\s+MarketingProspect\b/);
assert.doesNotMatch(migration, /Lead\b/);
mustInclude(migration, "Do not apply without explicit Product Owner approval");
mustInclude(migration, "enterprise_marketing_sender_identities");
mustInclude(migration, "enterprise_marketing_deliverability_observations");
mustInclude(migration, 'REFERENCES "organizations"("id")');
mustInclude(senderConst, "NOT_CONFIGURED");
mustInclude(senderConst, "UNAVAILABLE");
mustInclude(eligibilitySrc, "SENDER_NOT_APPROVED");
mustInclude(senderConst, "last_validation");
mustInclude(readinessSrc, "anyVerified: false");
mustInclude(storeSrc, 'verificationStatus: "PENDING"');
mustInclude(storeSrc, "simulated: true");
mustInclude(senderSvc, "forbidMarketingSenderVerificationEmail");
mustInclude(eligibilitySrc, "SENDER_VERIFY_EMAIL_FORBIDDEN");
mustInclude(delivSvc, "composeMarketingDeliverabilityReadiness");
mustInclude(campaignSvc, "assertMarketingSenderEligibleForCampaignApproval");
mustInclude(senderApi, "resolveMarketingOrganizationId");
mustInclude(senderApi, "SECRETS_NOT_ALLOWED");
mustInclude(senderApi, 'action === "verify_email"');
mustInclude(delivApi, "resolveMarketingOrganizationId");
mustInclude(panelSrc, "simulated (not verified)");
mustInclude(panelSrc, "mkt-deliverability-card");
mustInclude(settingsSrc, "simulated (not verified)");
mustInclude(disabledSrc, 'blocked("dns.lookup")');
mustInclude(disabledSrc, 'blocked("sender.verify_email")');
assert.doesNotMatch(builderPage, /test_send/);
assert.doesNotMatch(builderPage, /run_test_batch/);
assert.doesNotMatch(builderPage, /run_next_batch/);
assert.doesNotMatch(storeSrc, /dns\.lookup/);
assert.doesNotMatch(delivSvc, /dns\.lookup/);
assert.doesNotMatch(senderSvc, /dns\.promises/);
assert.doesNotMatch(senderApi, /enterprise-inbound-email/);
assert.doesNotMatch(delivApi, /enterprise-inbound-email/);
assert.doesNotMatch(senderSvc, /enterprise-inbound-email/);
assert.doesNotMatch(delivSvc, /enterprise-inbound-email/);

const adminDefault = permLib.slice(
  permLib.indexOf("const ADMIN_DEFAULT"),
  permLib.indexOf("export function resolveMarketingPermissions"),
);
assert.ok(adminDefault.includes("SENDER_MANAGE"));
assert.equal(adminDefault.includes("SENDER_APPROVE"), false);
assert.equal(adminDefault.includes("CAMPAIGN_APPROVE"), false);
assert.equal(adminDefault.includes("CAMPAIGN_SEND"), false);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "marketing-pre-staging-local-jwt-secret-aaaa";
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = "marketing-pre-staging-local-jwt-refresh-bbbb";
}

const storeUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/sender-identity-store.ts"),
).href;
const senderUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/sender.service.ts"),
).href;
const delivUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/deliverability.service.ts"),
).href;
const campUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/campaign.service.ts"),
).href;
const eligibilityUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/sender-eligibility.ts"),
).href;
const readinessUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/deliverability-readiness.ts"),
).href;
const disabledUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/disabled-ports.ts"))
  .href;
const permUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/permissions.ts")).href;

const storeMod = await import(storeUrl);
const senderMod = await import(senderUrl);
const delivMod = await import(delivUrl);
const campMod = await import(campUrl);
const eligibilityMod = await import(eligibilityUrl);
const readinessMod = await import(readinessUrl);
const disabledMod = await import(disabledUrl);
const permMod = await import(permUrl);

storeMod.marketingSenderIdentityStore.reset();

const orgA = {
  userId: "verify-013-a",
  organizationId: "org-mkt-013-a",
  role: "SUPER_ADMIN",
};
const adminOnly = {
  userId: "verify-013-admin",
  organizationId: "org-mkt-013-a",
  role: "ADMIN",
};

let defaultRejected = false;
try {
  senderMod.marketingSenderService.list({
    userId: "x",
    organizationId: "default",
    role: "SUPER_ADMIN",
  });
} catch (err) {
  defaultRejected = err?.code === "ORGANIZATION_REQUIRED";
}
assert.equal(defaultRejected, true, "default org must be rejected");

const fixture = storeMod.marketingSenderIdentityStore.getDefaultActive(orgA.organizationId);
assert.ok(fixture);
assert.equal(fixture.simulated, true);
assert.equal(fixture.verificationStatus, "PENDING");
assert.equal(fixture.approvalStatus, "DRAFT");
assert.notEqual(fixture.verificationStatus, "VERIFIED");

let simulatedApproveBlocked = false;
try {
  storeMod.marketingSenderIdentityStore.approve({
    organizationId: orgA.organizationId,
    id: fixture.id,
    actorUserId: orgA.userId,
  });
} catch (err) {
  simulatedApproveBlocked = err?.code === "SENDER_SIMULATED_NOT_VERIFIED";
}
assert.equal(simulatedApproveBlocked, true, "simulated fixture senders cannot be approved");

const publicDto = JSON.stringify(storeMod.marketingSenderIdentityStore.toPublicDto(fixture));
assert.equal(publicDto.includes("password"), false);
assert.equal(publicDto.includes("apiKey"), false);

const readiness = readinessMod.composeMarketingDeliverabilityReadiness({
  organizationId: orgA.organizationId,
  providerConnectEnabled: false,
  executionEnabled: false,
  simulated: true,
});
assert.equal(readiness.simulated, true);
assert.equal(readiness.anyVerified, false);
assert.ok(readiness.checks.length >= 11);
assert.ok(
  readiness.checks.every(
    (check) =>
      check.simulated &&
      check.state !== "VERIFIED" &&
      check.permanentTruth === false &&
      check.lastValidatedAt,
  ),
);
assert.ok(readiness.checks.some((check) => check.id === "last_validation"));
assert.equal(readinessMod.marketingDeliverabilityHasVerifiedSimulated(readiness), false);
assert.ok(readiness.lastValidationAt);
assert.ok(readiness.freshUntil);

const snapshot = delivMod.marketingDeliverabilityService.snapshot(orgA);
assert.equal(snapshot.readiness.anyVerified, false);
assert.ok(snapshot.senders.some((row) => row.simulated && row.verificationStatus !== "VERIFIED"));

let dnsBlocked = false;
try {
  eligibilityMod.forbidMarketingDnsMutation();
} catch (err) {
  dnsBlocked = err?.code === "DNS_MUTATION_FORBIDDEN";
}
assert.equal(dnsBlocked, true);

let verifyEmailBlocked = false;
try {
  senderMod.marketingSenderService.triggerVerificationEmail(orgA, fixture.id);
} catch (err) {
  verifyEmailBlocked = err?.code === "SENDER_VERIFY_EMAIL_FORBIDDEN";
}
assert.equal(verifyEmailBlocked, true);

let simulatedVerified = false;
try {
  storeMod.marketingSenderIdentityStore.upsert({
    organizationId: orgA.organizationId,
    displayName: "Bad",
    fromAddress: "bad@example.com",
    simulated: true,
    verificationStatus: "VERIFIED",
  });
} catch (err) {
  simulatedVerified = err?.code === "SENDER_SIMULATED_NOT_VERIFIED";
}
assert.equal(simulatedVerified, true);

const unapproved = storeMod.marketingSenderIdentityStore.upsert({
  organizationId: orgA.organizationId,
  displayName: "Unapproved sender",
  fromAddress: "unapproved.sender@example.com",
  simulated: false,
  approvalStatus: "DRAFT",
  createdByUserId: orgA.userId,
});
assert.equal(unapproved.approvalStatus, "DRAFT");

const created = await campMod.marketingCampaignService.create(orgA, {
  name: "013 unapproved sender",
  channel: "EMAIL",
});
await campMod.marketingCampaignService.save(orgA, created.campaign.id, {
  senderIdentityId: unapproved.id,
  sender: { fromName: unapproved.displayName, fromAddress: unapproved.fromAddress },
});
await campMod.marketingCampaignService.transition(orgA, created.campaign.id, "SUBMIT_FOR_REVIEW");
let blockedUnapproved = false;
try {
  await campMod.marketingCampaignService.transition(orgA, created.campaign.id, "APPROVE");
} catch (err) {
  blockedUnapproved = err?.code === "SENDER_NOT_APPROVED";
}
assert.equal(blockedUnapproved, true, "campaign approval must block unapproved senders");

const approved = storeMod.marketingSenderIdentityStore.upsert({
  organizationId: orgA.organizationId,
  displayName: "Approved sender",
  fromAddress: "approved.sender@example.com",
  simulated: false,
  createdByUserId: orgA.userId,
});
storeMod.marketingSenderIdentityStore.approve({
  organizationId: orgA.organizationId,
  id: approved.id,
  actorUserId: orgA.userId,
});
const approvedRow = storeMod.marketingSenderIdentityStore.get(approved.id, orgA.organizationId);
assert.equal(approvedRow.approvalStatus, "APPROVED");
assert.ok(approvedRow.approvedAt);
assert.equal(approvedRow.approvedByUserId, orgA.userId);
eligibilityMod.assertMarketingSenderEligibleForCampaignApproval({
  identity: approvedRow,
  senderIdentityId: approvedRow.id,
  productionCapable: true,
});

let adminApproveDenied = false;
try {
  senderMod.marketingSenderService.approve(adminOnly, approved.id);
} catch (err) {
  adminApproveDenied = err?.code === "MARKETING_PERMISSION_DENIED";
}
assert.equal(adminApproveDenied, true);
assert.equal(permMod.hasMarketingPermission(adminOnly, "admin.marketing.sender.manage"), true);
assert.equal(permMod.hasMarketingPermission(adminOnly, "admin.marketing.sender.approve"), false);

let liveDns = false;
try {
  await disabledMod.disabledMarketingDnsPort.lookup({ host: "example.com" });
  liveDns = true;
} catch {
  liveDns = false;
}
assert.equal(liveDns, false);
let liveVerify = false;
try {
  await disabledMod.disabledMarketingSenderVerificationPort.sendVerificationEmail({
    to: "campaigns@example.com",
  });
  liveVerify = true;
} catch {
  liveVerify = false;
}
assert.equal(liveVerify, false);

assert.ok(inboundSvc.includes("inbound"));

console.log("CO-MARKETING-REDESIGN-013 sender/deliverability verify: PASS");
