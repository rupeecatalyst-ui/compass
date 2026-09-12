/**
 * CO-MARKETING-HOSTINGER-SMTP-001
 * Hostinger SMTP Phase 1 adapter. Mocked transport only. No network. No real email.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ts = (rel) => pathToFileURL(resolve(root, rel)).href;
const read = (rel) => readFileSync(join(root, rel), "utf8");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "marketing-hostinger-smtp-local-jwt-aaaaaaa";
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = "marketing-hostinger-smtp-local-jwt-bbbbbbb";
}
process.env.ENTERPRISE_MARKETING_EMAIL_MODE = "dry_run";

const safety = read("src/constants/enterprise-marketing-engine/safety.ts");
const adapterSrc = read("server/services/enterprise-marketing-engine/adapters/hostinger-smtp.adapter.ts");
const transportSrc = read("server/services/enterprise-marketing-engine/adapters/hostinger-smtp-transport.ts");
const deliverySrc = read("server/services/enterprise-marketing-engine/email-delivery.service.ts");
const personalization = read("src/lib/enterprise-marketing-engine/personalization.ts");
assert.ok(safety.includes("ENTERPRISE_MARKETING_EXECUTION_ENABLED = false"));
assert.ok(safety.includes("ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false"));
assert.doesNotMatch(adapterSrc, /fetch\(/);
assert.doesNotMatch(transportSrc, /connect\(/);
assert.ok(deliverySrc.includes("createDryRunEmailDeliveryPort"));
assert.ok(personalization.includes("escapeMarketingMergeValue"));

let fetchCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  fetchCalls += 1;
  return originalFetch(...args);
};

const [
  smtpConfigMod,
  ceilingMod,
  senderMod,
  readinessMod,
  adapterMod,
  transportMod,
  suppressionMod,
  mapMod,
  personalizationMod,
  renderMod,
  deliveryMod,
  recordMod,
  senderStoreMod,
  safetyConst,
] = await Promise.all([
  import(ts("src/lib/enterprise-marketing-engine/smtp-config.ts")),
  import(ts("src/lib/enterprise-marketing-engine/phase1-live-ceiling.ts")),
  import(ts("src/lib/enterprise-marketing-engine/phase1-sender.ts")),
  import(ts("src/lib/enterprise-marketing-engine/live-email-provider-readiness.ts")),
  import(ts("server/services/enterprise-marketing-engine/adapters/hostinger-smtp.adapter.ts")),
  import(ts("server/services/enterprise-marketing-engine/adapters/hostinger-smtp-transport.ts")),
  import(ts("server/services/enterprise-marketing-engine/suppression-store.ts")),
  import(ts("src/lib/enterprise-marketing-engine/email-delivery/map-outcome.ts")),
  import(ts("src/lib/enterprise-marketing-engine/personalization.ts")),
  import(ts("src/lib/enterprise-marketing-engine/email-render.ts")),
  import(ts("server/services/enterprise-marketing-engine/email-delivery.service.ts")),
  import(ts("server/services/enterprise-marketing-engine/delivery-record-store.ts")),
  import(ts("server/services/enterprise-marketing-engine/sender-identity-store.ts")),
  import(ts("src/constants/enterprise-marketing-engine/safety.ts")),
]);

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
  ENTERPRISE_MARKETING_UNSUBSCRIBE_SECRET: "fixture-unsubscribe-secret",
  NEXT_PUBLIC_APP_URL: "https://example.test",
};

const missing = smtpConfigMod.assessMarketingSmtpConfig({});
assert.ok(missing.blockers.includes("marketing.smtp.host_missing"));
assert.ok(missing.blockers.includes("marketing.smtp.username_missing"));
assert.ok(missing.blockers.includes("marketing.smtp.password_missing"));

const complete = smtpConfigMod.assessMarketingSmtpConfig(secretEnv);
assert.equal(smtpConfigMod.marketingSmtpConfigIsComplete(complete), true);
const readinessJson = JSON.stringify(readinessMod.assessMarketingLiveEmailProviderReadiness(secretEnv));
assert.equal(readinessJson.includes("fixture-not-a-real-password"), false);
assert.equal(readinessJson.includes("fixture-unsubscribe-secret"), false);

const liveReadiness = readinessMod.assessMarketingLiveEmailProviderReadiness(secretEnv);
assert.equal(liveReadiness.canLiveSend, false);
assert.equal(liveReadiness.canConnect, false);
assert.equal(liveReadiness.selectedProvider, "smtp");
assert.equal(liveReadiness.phase1LiveRecipientCeiling, 50);

assert.equal(
  senderMod.isMarketingPhase1Sender({
    fromAddress: "opportunities@rupeecatalyst.com",
    displayName: "Rupee Catalyst Opportunities",
    replyTo: "opportunities@rupeecatalyst.com",
  }),
  true,
);
assert.throws(() =>
  senderMod.assertMarketingPhase1Sender({
    fromAddress: "other@rupeecatalyst.com",
    displayName: "Rupee Catalyst Opportunities",
    replyTo: "opportunities@rupeecatalyst.com",
  }),
);

assert.equal(ceilingMod.assessMarketingPhase1LiveAudienceCeiling(50).ok, true);
assert.equal(ceilingMod.assessMarketingPhase1LiveAudienceCeiling(51).ok, false);
assert.throws(() => ceilingMod.assertMarketingPhase1LiveAudienceCeiling(51));
ceilingMod.assertMarketingPhase1LiveAudienceCeiling(50);

const audienceMod = await import(ts("src/lib/enterprise-marketing-engine/audience-live-certification.ts"));
const oversizeAudience = audienceMod.assessMarketingAudienceLiveCertification({
  sourceBindingId: "bind-1",
  sourceWorkbookId: "wb-1",
  sourceTabId: "tab-1",
  authorised: true,
  mappingConfirmed: true,
  snapshotHash: "abc",
  frozenAt: new Date().toISOString(),
  eligibleCount: 51,
  invalidCount: 0,
  duplicateCount: 0,
  suppressedCount: 0,
  frozenRecipientCount: 51,
  certificationStatus: "CERTIFIED",
});
assert.equal(oversizeAudience.certified, false);
assert.ok(oversizeAudience.reasons.includes("marketing.phase1.audience_limit_exceeded"));
const sizedAudience = audienceMod.assessMarketingAudienceLiveCertification({
  sourceBindingId: "bind-1",
  sourceWorkbookId: "wb-1",
  sourceTabId: "tab-1",
  authorised: true,
  mappingConfirmed: true,
  snapshotHash: "abc",
  frozenAt: new Date().toISOString(),
  eligibleCount: 50,
  invalidCount: 0,
  duplicateCount: 0,
  suppressedCount: 0,
  frozenRecipientCount: 50,
  certificationStatus: "CERTIFIED",
});
assert.equal(sizedAudience.certified, true);

const closedTransport = transportMod.createHostingerSmtpTransport();
const closedSend = await closedTransport.send({
  to: "ok@example.com",
  fromName: "Rupee Catalyst Opportunities",
  fromEmail: "opportunities@rupeecatalyst.com",
  replyTo: "opportunities@rupeecatalyst.com",
  subject: "Hello",
  html: "<p>Hello</p>",
  text: "Hello",
  idempotencyKey: "smtp:factory-off",
});
assert.equal(closedSend.accepted, false);
assert.equal(closedSend.errorCode, "marketing.execution.disabled");
assert.equal(closedTransport.clientCreateCount(), 0);

const smtpCalls = [];
const mockTransport = {
  async send(message) {
    smtpCalls.push(message);
    assert.equal(message.to.includes(","), false);
    return { accepted: true, providerMessageId: "smtp-mock-1", retryable: false };
  },
};

const html =
  '<p>Hello</p><a href="https://example.test/marketing/unsubscribe/token">Unsubscribe</a>';
const phase1Sender = {
  senderIdentityId: "phase1",
  displayName: "Rupee Catalyst Opportunities",
  fromAddress: "opportunities@rupeecatalyst.com",
  replyTo: "opportunities@rupeecatalyst.com",
};

const incompleteAdapter = adapterMod.createHostingerSmtpEmailDeliveryPort({
  transport: mockTransport,
  smtpEnv: {},
  gates: { executionEnabled: true, providerConnectEnabled: true },
});
const incomplete = await incompleteAdapter.deliver({
  idempotencyKey: "smtp:missing-config",
  organizationId: "org-smtp-001",
  campaignId: "camp-smtp",
  campaignVersionId: "ver-smtp",
  batchId: "batch-1",
  recipientFingerprint: "email:ok@example.com",
  recipientEmail: "ok@example.com",
  sender: phase1Sender,
  subject: "Hello",
  htmlBody: html,
  textBody: "Hello",
});
assert.equal(incomplete.outcome, "FAILED");
assert.equal(incomplete.errorCode, "marketing.smtp.host_missing");
assert.equal(smtpCalls.length, 0);

const gated = adapterMod.createHostingerSmtpEmailDeliveryPort({
  transport: mockTransport,
  smtpEnv: secretEnv,
});
const gatedResult = await gated.deliver({
  idempotencyKey: "smtp:flags-off",
  organizationId: "org-smtp-001",
  campaignId: "camp-smtp",
  campaignVersionId: "ver-smtp",
  batchId: "batch-1",
  recipientFingerprint: "email:ok@example.com",
  recipientEmail: "ok@example.com",
  sender: phase1Sender,
  subject: "Hello",
  htmlBody: html,
  textBody: "Hello",
});
assert.equal(gatedResult.outcome, "FAILED");
assert.equal(gatedResult.errorCode, "marketing.execution.disabled");
assert.equal(smtpCalls.length, 0);

const liveAdapter = adapterMod.createHostingerSmtpEmailDeliveryPort({
  transport: mockTransport,
  smtpEnv: secretEnv,
  gates: { executionEnabled: true, providerConnectEnabled: true },
});

const accepted = await liveAdapter.deliver({
  idempotencyKey: "smtp:accepted",
  organizationId: "org-smtp-001",
  campaignId: "camp-smtp",
  campaignVersionId: "ver-smtp",
  batchId: "batch-1",
  recipientFingerprint: "email:ok@example.com",
  recipientEmail: "ok@example.com",
  sender: phase1Sender,
  subject: "Hello",
  htmlBody: html,
  textBody: "Hello",
});
assert.equal(accepted.outcome, "ACCEPTED");
assert.equal(accepted.dryRun, false);
assert.ok(String(accepted.errorMessage || "").includes("not inbox delivery"));
assert.equal(mapMod.mapDeliveryOutcomeToLedgerStatus("ACCEPTED"), "processed");
assert.equal(smtpCalls.length, 1);
assert.equal(smtpCalls[0].to, "ok@example.com");

const dup = await liveAdapter.deliver({
  idempotencyKey: "smtp:accepted",
  organizationId: "org-smtp-001",
  campaignId: "camp-smtp",
  campaignVersionId: "ver-smtp",
  batchId: "batch-1",
  recipientFingerprint: "email:ok@example.com",
  recipientEmail: "ok@example.com",
  sender: phase1Sender,
  subject: "Hello",
  htmlBody: html,
  textBody: "Hello",
});
assert.equal(dup.duplicate, true);
assert.equal(smtpCalls.length, 1);

const bulk = await liveAdapter.deliver({
  idempotencyKey: "smtp:bulk",
  organizationId: "org-smtp-001",
  campaignId: "camp-smtp",
  campaignVersionId: "ver-smtp",
  batchId: "batch-1",
  recipientFingerprint: "email:a@example.com",
  recipientEmail: "a@example.com,b@example.com",
  sender: phase1Sender,
  subject: "Hello",
  htmlBody: html,
  textBody: "Hello",
});
assert.equal(bulk.outcome, "BLOCKED");
assert.equal(bulk.errorCode, "marketing.smtp.bulk_recipient_forbidden");

const wrongSender = await liveAdapter.deliver({
  idempotencyKey: "smtp:wrong-sender",
  organizationId: "org-smtp-001",
  campaignId: "camp-smtp",
  campaignVersionId: "ver-smtp",
  batchId: "batch-1",
  recipientFingerprint: "email:ok2@example.com",
  recipientEmail: "ok2@example.com",
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
assert.equal(wrongSender.outcome, "BLOCKED");
assert.equal(wrongSender.errorCode, "marketing.sender.not_phase1_sender");

const store = suppressionMod.marketingSuppressionStore;
store.reset();
store.upsert({
  organizationId: "org-smtp-001",
  fingerprint: "email:unsub.smtp@example.com",
  reason: "UNSUBSCRIBE",
  kind: "UNSUBSCRIBED",
  channel: "EMAIL",
  source: "PUBLIC_UNSUBSCRIBE",
});
const suppressed = await liveAdapter.deliver({
  idempotencyKey: "smtp:unsub",
  organizationId: "org-smtp-001",
  campaignId: "camp-smtp",
  campaignVersionId: "ver-smtp",
  batchId: "batch-1",
  recipientFingerprint: "email:unsub.smtp@example.com",
  recipientEmail: "unsub.smtp@example.com",
  sender: phase1Sender,
  subject: "Hello",
  htmlBody: html,
  textBody: "Hello",
});
assert.equal(suppressed.outcome, "BLOCKED");
assert.equal(smtpCalls.length, 1);

store.upsert({
  organizationId: "org-smtp-001",
  fingerprint: "email:suppressed.smtp@example.com",
  reason: "MANUAL",
  kind: "MANUAL_SUPPRESSION",
  channel: "EMAIL",
  source: "MANUAL",
});
const manualSuppressed = await liveAdapter.deliver({
  idempotencyKey: "smtp:manual-suppression",
  organizationId: "org-smtp-001",
  campaignId: "camp-smtp",
  campaignVersionId: "ver-smtp",
  batchId: "batch-1",
  recipientFingerprint: "email:suppressed.smtp@example.com",
  recipientEmail: "suppressed.smtp@example.com",
  sender: phase1Sender,
  subject: "Hello",
  htmlBody: html,
  textBody: "Hello",
});
assert.equal(manualSuppressed.outcome, "BLOCKED");
assert.equal(smtpCalls.length, 1);

const failing = adapterMod.createHostingerSmtpEmailDeliveryPort({
  smtpEnv: secretEnv,
  gates: { executionEnabled: true, providerConnectEnabled: true },
  transport: {
    async send() {
      throw new Error("timeout password=should-not-leak");
    },
  },
});
const failed = await failing.deliver({
  idempotencyKey: "smtp:fail",
  organizationId: "org-smtp-001",
  campaignId: "camp-smtp",
  campaignVersionId: "ver-smtp",
  batchId: "batch-1",
  recipientFingerprint: "email:fail@example.com",
  recipientEmail: "fail@example.com",
  sender: phase1Sender,
  subject: "Hello",
  htmlBody: html,
  textBody: "Hello",
});
assert.equal(failed.outcome, "RETRYABLE_FAILURE");
assert.equal(String(failed.errorMessage || "").includes("should-not-leak"), false);

const merged = personalizationMod.applyPersonalization("Hi {{firstName}}", {
  firstName: "<script>alert(1)</script>",
});
assert.equal(merged.includes("<script"), false);
const rendered = renderMod.renderMarketingEmailHtml({
  content: {
    version: 1,
    blocks: [
      { id: "t1", type: "text", props: { html: "<p>Hello <strong>{{firstName}}</strong></p>" } },
      { id: "u1", type: "unsubscribe", props: { href: "{{unsubscribeUrl}}", label: "Unsubscribe" } },
    ],
  },
  subject: "Hi",
  previewText: "Preview",
  mode: "desktop",
  personalization: { firstName: "<script>alert(1)</script>" },
});
assert.equal(/<script/i.test(rendered), false);
assert.ok(rendered.includes("{{unsubscribeUrl}}") || rendered.includes("unsubscribe"));

const svc = deliveryMod.marketingEmailDeliveryService;
const sender = senderStoreMod.marketingSenderIdentityStore.getDefaultActive("org-smtp-001");
recordMod.marketingEmailDeliveryRecordStore.resetCampaign?.("camp-smtp-dry");
const dry = await svc.deliver({
  idempotencyKey: "smtp:dry",
  organizationId: "org-smtp-001",
  campaignId: "camp-smtp-dry",
  campaignVersionId: "ver",
  batchId: "b1",
  recipientFingerprint: "email:dry.ok@example.com",
  recipientEmail: "dry.ok@example.com",
  sender: {
    senderIdentityId: sender.id,
    displayName: sender.displayName,
    fromAddress: sender.fromAddress,
    replyTo: sender.replyTo,
  },
  subject: "Hello",
  htmlBody: "<p>Hello</p>",
  textBody: "Hello",
});
assert.equal(dry.dryRun, true);
assert.equal(svc.getMode().liveSendAuthorized, false);

store.reset();
assert.equal(fetchCalls, 0);
globalThis.fetch = originalFetch;
console.log("CO-MARKETING-HOSTINGER-SMTP-001 verify: PASS");
