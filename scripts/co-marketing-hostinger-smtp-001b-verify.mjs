/**
 * CO-MARKETING-HOSTINGER-SMTP-001B
 * Real SMTP transport factory + controlled-test gates. Mocked clients only. No network.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ts = (rel) => pathToFileURL(resolve(root, rel)).href;
const read = (rel) => readFileSync(join(root, rel), "utf8");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "marketing-hostinger-smtp-1b-local-jwt-aaaaaaa";
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = "marketing-hostinger-smtp-1b-local-jwt-bbbbbbb";
}
process.env.ENTERPRISE_MARKETING_EMAIL_MODE = "dry_run";
delete process.env.ENTERPRISE_MARKETING_TEST_RECIPIENT_ALLOWLIST;

const pkg = read("package.json");
const safety = read("src/constants/enterprise-marketing-engine/safety.ts");
const transportSrc = read("server/services/enterprise-marketing-engine/adapters/hostinger-smtp-transport.ts");
const delivSrc = read("server/services/enterprise-marketing-engine/deliverability.service.ts");
const panelSrc = read("src/components/catalyst-one/admin/marketing/marketing-deliverability-panel.tsx");
assert.ok(pkg.includes('"nodemailer"'));
assert.ok(pkg.includes("verify:co-marketing-hostinger-smtp-001b"));
assert.ok(safety.includes("ENTERPRISE_MARKETING_EXECUTION_ENABLED = false"));
assert.ok(safety.includes("ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false"));
assert.ok(transportSrc.includes("requireTLS"));
assert.ok(transportSrc.includes('minVersion: "TLSv1.2"'));
assert.ok(transportSrc.includes("logger: false"));
assert.ok(transportSrc.includes("debug: false"));
assert.ok(delivSrc.includes("snapshot("));
assert.equal(delivSrc.includes("verifySmtp") && panelSrc.includes("verify_smtp"), true);
assert.ok(panelSrc.includes("void load()"));
assert.ok(panelSrc.includes("Verify SMTP connection"));
const campaignSrc = read("server/services/enterprise-marketing-engine/campaign.service.ts");
assert.ok(campaignSrc.includes("assertMarketingLiveTestSendAllowlistIfLive"));
assert.ok(!campaignSrc.includes("ENTERPRISE_MARKETING_TEST_RECIPIENT_ALLOWLIST"));

const [
  smtpConfigMod,
  allowlistMod,
  ceilingMod,
  senderMod,
  mapMod,
  transportMod,
  adapterMod,
  delivMod,
  deliveryMod,
  durabilityMod,
  durableMod,
  senderStoreMod,
  recordMod,
  suppressionMod,
  testSendMod,
  safetyConst,
] = await Promise.all([
  import(ts("src/lib/enterprise-marketing-engine/smtp-config.ts")),
  import(ts("src/lib/enterprise-marketing-engine/test-recipient-allowlist.ts")),
  import(ts("src/lib/enterprise-marketing-engine/phase1-live-ceiling.ts")),
  import(ts("src/lib/enterprise-marketing-engine/phase1-sender.ts")),
  import(ts("src/lib/enterprise-marketing-engine/email-delivery/map-outcome.ts")),
  import(ts("server/services/enterprise-marketing-engine/adapters/hostinger-smtp-transport.ts")),
  import(ts("server/services/enterprise-marketing-engine/adapters/hostinger-smtp.adapter.ts")),
  import(ts("server/services/enterprise-marketing-engine/deliverability.service.ts")),
  import(ts("server/services/enterprise-marketing-engine/email-delivery.service.ts")),
  import(ts("src/lib/enterprise-marketing-engine/durability/repositories/memory.ts")),
  import(ts("src/lib/enterprise-marketing-engine/durable-send-idempotency.ts")),
  import(ts("server/services/enterprise-marketing-engine/sender-identity-store.ts")),
  import(ts("server/services/enterprise-marketing-engine/delivery-record-store.ts")),
  import(ts("server/services/enterprise-marketing-engine/suppression-store.ts")),
  import(ts("src/lib/enterprise-marketing-engine/test-send-safety.ts")),
  import(ts("src/constants/enterprise-marketing-engine/safety.ts")),
]);

const { configureMarketingDurabilityTestFixture, resetMarketingDurabilityComposition } = await import(
  ts("src/lib/enterprise-marketing-engine/durability/composition.ts")
);

assert.equal(safetyConst.ENTERPRISE_MARKETING_EXECUTION_ENABLED, false);
assert.equal(safetyConst.ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED, false);

const secretEnv = {
  ENTERPRISE_MARKETING_SMTP_HOST: "smtp.hostinger.com",
  ENTERPRISE_MARKETING_SMTP_PORT: "465",
  ENTERPRISE_MARKETING_SMTP_SECURE: "true",
  ENTERPRISE_MARKETING_SMTP_USERNAME: "opportunities@rupeecatalyst.com",
  ENTERPRISE_MARKETING_SMTP_PASSWORD: "fixture-not-a-real-password",
  ENTERPRISE_MARKETING_FROM_EMAIL: "opportunities@rupeecatalyst.com",
  ENTERPRISE_MARKETING_FROM_NAME: "Rupee Catalyst Opportunities",
  ENTERPRISE_MARKETING_REPLY_TO: "opportunities@rupeecatalyst.com",
};

assert.equal(smtpConfigMod.marketingSmtpConfigIsComplete(smtpConfigMod.assessMarketingSmtpConfig(secretEnv)), true);

const missingPassword = smtpConfigMod.assessMarketingSmtpConfig({
  ...secretEnv,
  ENTERPRISE_MARKETING_SMTP_PASSWORD: "",
});
assert.ok(missingPassword.blockers.includes("marketing.smtp.password_missing"));

const unsafeTls = smtpConfigMod.assessMarketingSmtpConfig({
  ...secretEnv,
  ENTERPRISE_MARKETING_SMTP_SECURE: "false",
});
assert.equal(unsafeTls.tlsSafe, false);
assert.ok(unsafeTls.blockers.includes("marketing.smtp.tls_required"));

const factoryCalls = [];
const sendMailCalls = [];
const verifyCalls = [];
const mockFactory = (input) => {
  factoryCalls.push({
    host: input.host,
    port: input.port,
    secure: input.secure,
    requireTLS: input.requireTLS,
    maxConnections: input.maxConnections,
    logger: input.logger,
    debug: input.debug,
    hasPassword: Boolean(input.auth?.pass),
  });
  assert.equal(input.secure, true);
  assert.equal(input.requireTLS, true);
  assert.equal(input.logger, false);
  assert.equal(input.debug, false);
  return {
    async sendMail(message) {
      sendMailCalls.push(message);
      return { messageId: "<mock@smtp>" };
    },
    async verify() {
      verifyCalls.push(true);
      return true;
    },
  };
};

const flagsOff = transportMod.createHostingerSmtpTransport({
  env: secretEnv,
  clientFactory: mockFactory,
});
const offSend = await flagsOff.send({
  to: "one@example.com",
  fromName: "Rupee Catalyst Opportunities",
  fromEmail: "opportunities@rupeecatalyst.com",
  replyTo: "opportunities@rupeecatalyst.com",
  subject: "x",
  html: "<p>x</p>",
  text: "x",
  idempotencyKey: "k-off",
});
assert.equal(offSend.accepted, false);
assert.equal(flagsOff.clientCreateCount(), 0);
assert.equal(factoryCalls.length, 0);

const actor = { userId: "verify-1b", organizationId: "org-smtp-1b", role: "SUPER_ADMIN" };
senderStoreMod.marketingSenderIdentityStore.reset?.();
const snapshot = delivMod.marketingDeliverabilityService.snapshot(actor);
assert.equal(snapshot.smtpReadiness.liveSendAuthorized, false);
const snapshotJson = JSON.stringify(snapshot);
assert.equal(snapshotJson.includes("fixture-not-a-real-password"), false);
assert.equal(factoryCalls.length, 0);

const blockedVerify = await delivMod.marketingDeliverabilityService.verifySmtp(actor, {
  transport: flagsOff,
});
assert.equal(blockedVerify.status, "BLOCKED");
assert.equal(verifyCalls.length, 0);
assert.equal(sendMailCalls.length, 0);

const liveTransport = transportMod.createHostingerSmtpTransport({
  env: secretEnv,
  clientFactory: mockFactory,
  gates: { executionEnabled: true, providerConnectEnabled: true },
});
const verified = await liveTransport.verify();
assert.equal(verified.status, "CONNECTED");
assert.equal(verifyCalls.length, 1);
assert.equal(sendMailCalls.length, 0);
assert.equal(liveTransport.clientCreateCount(), 1);
const verifiedJson = JSON.stringify(verified);
assert.equal(verifiedJson.includes("fixture-not-a-real-password"), false);

assert.equal(allowlistMod.parseMarketingTestRecipientAllowlist("").length, 0);
assert.equal(allowlistMod.isMarketingLiveTestRecipientAllowlisted("anyone@example.com"), false);
assert.throws(() => allowlistMod.assertMarketingLiveTestRecipientAllowlisted("anyone@example.com"));
assert.throws(() =>
  allowlistMod.assertMarketingLiveTestRecipientAllowlisted("qa@rupeecatalyst.com", ""),
);
assert.equal(
  allowlistMod.assertMarketingLiveTestRecipientAllowlisted(
    "qa@rupeecatalyst.com",
    "qa@rupeecatalyst.com",
  ),
  "qa@rupeecatalyst.com",
);
assert.throws(() =>
  allowlistMod.assertMarketingLiveTestRecipientAllowlisted(
    "other@rupeecatalyst.com",
    "qa@rupeecatalyst.com",
  ),
);

assert.equal(
  testSendMod.assertMarketingLiveTestSendAllowlistIfLive("qa@rupeecatalyst.com"),
  "qa@rupeecatalyst.com",
);
const testSafety = testSendMod.assessMarketingControlledTestSendSafety({
  recipientEmail: "qa@rupeecatalyst.com",
});
assert.equal(testSafety.allowlisted, true);
assert.equal(testSafety.liveAllowlisted, false);
assert.equal(testSafety.liveSendAuthorized, false);

assert.equal(
  senderMod.isMarketingPhase1Sender({
    fromAddress: "opportunities@rupeecatalyst.com",
    displayName: "Rupee Catalyst Opportunities",
    replyTo: "opportunities@rupeecatalyst.com",
  }),
  true,
);
assert.equal(
  senderMod.isMarketingPhase1Sender({
    fromAddress: "other@rupeecatalyst.com",
    displayName: "Rupee Catalyst Opportunities",
    replyTo: "opportunities@rupeecatalyst.com",
  }),
  false,
);

assert.equal(ceilingMod.assessMarketingPhase1LiveAudienceCeiling(51).ok, false);
assert.equal(ceilingMod.assessMarketingPhase1LiveAudienceCeiling(50).ok, true);

const html =
  '<p>Hello</p><a href="https://example.test/marketing/unsubscribe/token">Unsubscribe</a>';
const phase1Sender = {
  senderIdentityId: "phase1",
  displayName: "Rupee Catalyst Opportunities",
  fromAddress: "opportunities@rupeecatalyst.com",
  replyTo: "opportunities@rupeecatalyst.com",
};

const adapter = adapterMod.createHostingerSmtpEmailDeliveryPort({
  transport: liveTransport,
  smtpEnv: secretEnv,
  gates: { executionEnabled: true, providerConnectEnabled: true },
});
const accepted = await adapter.deliver({
  idempotencyKey: "smtp-1b:accepted",
  organizationId: "org-smtp-1b",
  campaignId: "camp-1b",
  campaignVersionId: "ver-1b",
  batchId: "b1",
  recipientFingerprint: "email:one@example.com",
  recipientEmail: "one@example.com",
  sender: phase1Sender,
  subject: "Hello",
  htmlBody: html,
  textBody: "Hello",
});
assert.equal(accepted.outcome, "ACCEPTED");
assert.equal(mapMod.mapDeliveryOutcomeToLedgerStatus("ACCEPTED"), "processed");
assert.equal(sendMailCalls.length, 1);
assert.equal(sendMailCalls[0].to, "one@example.com");

const bulk = await adapter.deliver({
  idempotencyKey: "smtp-1b:bulk",
  organizationId: "org-smtp-1b",
  campaignId: "camp-1b",
  campaignVersionId: "ver-1b",
  batchId: "b1",
  recipientFingerprint: "email:a@example.com",
  recipientEmail: "a@example.com;b@example.com",
  sender: phase1Sender,
  subject: "Hello",
  htmlBody: html,
  textBody: "Hello",
});
assert.equal(bulk.outcome, "BLOCKED");

const wrong = await adapter.deliver({
  idempotencyKey: "smtp-1b:wrong",
  organizationId: "org-smtp-1b",
  campaignId: "camp-1b",
  campaignVersionId: "ver-1b",
  batchId: "b1",
  recipientFingerprint: "email:two@example.com",
  recipientEmail: "two@example.com",
  sender: {
    senderIdentityId: "x",
    displayName: "Other",
    fromAddress: "other@rupeecatalyst.com",
    replyTo: "other@rupeecatalyst.com",
  },
  subject: "Hello",
  htmlBody: html,
  textBody: "Hello",
});
assert.equal(wrong.outcome, "BLOCKED");

suppressionMod.marketingSuppressionStore.reset();
suppressionMod.marketingSuppressionStore.upsert({
  organizationId: "org-smtp-1b",
  fingerprint: "email:suppressed@example.com",
  reason: "UNSUBSCRIBE",
  kind: "UNSUBSCRIBED",
  channel: "EMAIL",
  source: "PUBLIC_UNSUBSCRIBE",
});
const suppressed = await adapter.deliver({
  idempotencyKey: "smtp-1b:suppressed",
  organizationId: "org-smtp-1b",
  campaignId: "camp-1b",
  campaignVersionId: "ver-1b",
  batchId: "b1",
  recipientFingerprint: "email:suppressed@example.com",
  recipientEmail: "suppressed@example.com",
  sender: phase1Sender,
  subject: "Hello",
  htmlBody: html,
  textBody: "Hello",
});
assert.equal(suppressed.outcome, "BLOCKED");
assert.equal(sendMailCalls.length, 1);

const failingTransport = transportMod.createHostingerSmtpTransport({
  env: secretEnv,
  gates: { executionEnabled: true, providerConnectEnabled: true },
  clientFactory: () => ({
    async sendMail() {
      throw new Error("timeout password=should-not-leak");
    },
    async verify() {
      throw new Error("auth=should-not-leak");
    },
  }),
});
const failAdapter = adapterMod.createHostingerSmtpEmailDeliveryPort({
  transport: failingTransport,
  smtpEnv: secretEnv,
  gates: { executionEnabled: true, providerConnectEnabled: true },
});
const failed = await failAdapter.deliver({
  idempotencyKey: "smtp-1b:fail",
  organizationId: "org-smtp-1b",
  campaignId: "camp-1b",
  campaignVersionId: "ver-1b",
  batchId: "b1",
  recipientFingerprint: "email:fail@example.com",
  recipientEmail: "fail@example.com",
  sender: phase1Sender,
  subject: "Hello",
  htmlBody: html,
  textBody: "Hello",
});
assert.equal(failed.outcome, "RETRYABLE_FAILURE");
assert.equal(String(failed.errorMessage || "").includes("should-not-leak"), false);
const failVerify = await failingTransport.verify();
assert.equal(failVerify.status, "FAILED");
assert.equal(JSON.stringify(failVerify).includes("should-not-leak"), false);

resetMarketingDurabilityComposition();
const ports = durabilityMod.createMemoryMarketingDurabilityPorts();
configureMarketingDurabilityTestFixture(ports);
const durableKey = "org-smtp-1b:camp-durable:EMAIL:durable@example.com";
const claim1 = await ports.ledger.tryClaim({
  organizationId: "org-smtp-1b",
  campaignId: "camp-durable",
  campaignVersionId: "ver-d",
  snapshotId: "snap-d",
  snapshotRecipientId: "rcpt-d",
  channel: "EMAIL",
  normalizedEmail: "durable@example.com",
  sourceStableKey: "durable@example.com",
  idempotencyKey: durableKey,
  batchId: "batch-d",
  batchNumber: 1,
  workerId: "worker-1b",
});
assert.equal(claim1.ok, true);
const durableAdapter = adapterMod.createHostingerSmtpEmailDeliveryPort({
  transport: liveTransport,
  smtpEnv: secretEnv,
  gates: { executionEnabled: true, providerConnectEnabled: true },
});
const firstDurable = await durableAdapter.deliver({
  idempotencyKey: durableKey,
  organizationId: "org-smtp-1b",
  campaignId: "camp-durable",
  campaignVersionId: "ver-d",
  batchId: "batch-d",
  recipientFingerprint: "email:durable@example.com",
  recipientEmail: "durable@example.com",
  sender: phase1Sender,
  subject: "Hello",
  htmlBody: html,
  textBody: "Hello",
});
assert.equal(firstDurable.outcome, "ACCEPTED");
await ports.ledger.finalize("org-smtp-1b", durableKey, {
  status: "sent",
  processedAt: new Date().toISOString(),
  providerMessageId: firstDurable.providerMessageId,
});
const claim2 = await ports.ledger.tryClaim({
  organizationId: "org-smtp-1b",
  campaignId: "camp-durable",
  campaignVersionId: "ver-d",
  snapshotId: "snap-d",
  snapshotRecipientId: "rcpt-d",
  channel: "EMAIL",
  normalizedEmail: "durable@example.com",
  sourceStableKey: "durable@example.com",
  idempotencyKey: durableKey,
  batchId: "batch-d",
  batchNumber: 1,
  workerId: "worker-1b",
});
assert.equal(claim2.ok, false);
recordMod.marketingEmailDeliveryRecordStore.resetCampaign("camp-durable");
const sendCountAfterFirst = sendMailCalls.length;
const secondService = await deliveryMod.marketingEmailDeliveryService.deliver({
  idempotencyKey: durableKey,
  organizationId: "org-smtp-1b",
  campaignId: "camp-durable",
  campaignVersionId: "ver-d",
  batchId: "batch-d",
  recipientFingerprint: "email:durable@example.com",
  recipientEmail: "durable@example.com",
  sender: phase1Sender,
  subject: "Hello",
  htmlBody: html,
  textBody: "Hello",
});
assert.equal(secondService.duplicate, true);
assert.equal(sendMailCalls.length, sendCountAfterFirst);
assert.equal(durableMod.marketingDurableSendAlreadyCompleted(await durableMod.lookupDurableMarketingSend("org-smtp-1b", durableKey)), true);

resetMarketingDurabilityComposition();
suppressionMod.marketingSuppressionStore.reset();
assert.equal(factoryCalls.every((row) => row.hasPassword === true || row.hasPassword === false), true);
console.log("CO-MARKETING-HOSTINGER-SMTP-001B verify: PASS");
