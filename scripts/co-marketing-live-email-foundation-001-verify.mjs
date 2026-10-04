/**
 * CO-MARKETING-LIVE-EMAIL-FOUNDATION-001
 * Provider-neutral live-email foundation. Fixtures/mocks only.
 * No real email. No production connection. No migration. No deploy.
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

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "marketing-live-email-foundation-local-jwt-aaaa";
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = "marketing-live-email-foundation-local-jwt-bbbb";
}
process.env.ENTERPRISE_MARKETING_EMAIL_MODE = "dry_run";

const pkg = read("package.json");
const safety = read("src/constants/enterprise-marketing-engine/safety.ts");
const emailMode = read("src/constants/enterprise-marketing-engine/email-delivery.ts");
const liveAdapter = read(
  "server/services/enterprise-marketing-engine/adapters/live-email-provider.adapter.ts",
);
const deliverySvc = read("server/services/enterprise-marketing-engine/email-delivery.service.ts");
const operational = read(
  "server/services/enterprise-communication-center/operational-email-dispatch.service.ts",
);
const schema = read("prisma/schema.prisma");
const personalization = read("src/lib/enterprise-marketing-engine/personalization.ts");
const transitions = read("src/constants/enterprise-marketing-engine/transitions.ts");
const testSend = read("src/lib/enterprise-marketing-engine/test-send-safety.ts");

mustInclude(pkg, "verify:co-marketing-live-email-foundation-001");
mustInclude(safety, "ENTERPRISE_MARKETING_EXECUTION_ENABLED = false");
mustInclude(safety, "ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false");
mustInclude(emailMode, 'return "dry_run"');
mustInclude(deliverySvc, "evaluateDeliverySuppression");
mustInclude(deliverySvc, "createDryRunEmailDeliveryPort");
mustInclude(liveAdapter, "assertMarketingProviderConnectAllowed");
assert.doesNotMatch(liveAdapter, /fetch\(/);
assert.doesNotMatch(liveAdapter, /createTransport/);
assert.doesNotMatch(liveAdapter, /dns\.lookup/);
assert.doesNotMatch(operational, /marketingSuppressionStore/);
assert.doesNotMatch(operational, /marketingUnsubscribeService/);
mustInclude(personalization, "escapeMarketingMergeValue");
mustInclude(testSend, "liveSendAuthorized: false");
mustInclude(transitions, "DRAFT: [\"PREVIEW\", \"READY_FOR_REVIEW\", \"CANCELLED\"]");
mustInclude(deliverySvc, "email.delivery.live_not_authorized");
assert.doesNotMatch(schema, /model\s+MarketingProspect\b/);

let fetchCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  fetchCalls += 1;
  return originalFetch(...args);
};

const ts = (rel) => pathToFileURL(resolve(root, rel)).href;

const [
  safetyLib,
  readinessMod,
  liveAdapterMod,
  tokenMod,
  unsubSvcMod,
  suppressionMod,
  deliveryMod,
  senderStoreMod,
  recordMod,
  senderEligMod,
  audienceMod,
  personalizationMod,
  renderMod,
  scopeMod,
  testSendMod,
  qualityMod,
  transitionsMod,
] = await Promise.all([
  import(ts("src/lib/enterprise-marketing-engine/safety.ts")),
  import(ts("src/lib/enterprise-marketing-engine/live-email-provider-readiness.ts")),
  import(ts("server/services/enterprise-marketing-engine/adapters/live-email-provider.adapter.ts")),
  import(ts("src/lib/enterprise-marketing-engine/unsubscribe-token.ts")),
  import(ts("server/services/enterprise-marketing-engine/unsubscribe.service.ts")),
  import(ts("server/services/enterprise-marketing-engine/suppression-store.ts")),
  import(ts("server/services/enterprise-marketing-engine/email-delivery.service.ts")),
  import(ts("server/services/enterprise-marketing-engine/sender-identity-store.ts")),
  import(ts("server/services/enterprise-marketing-engine/delivery-record-store.ts")),
  import(ts("src/lib/enterprise-marketing-engine/sender-eligibility.ts")),
  import(ts("src/lib/enterprise-marketing-engine/audience-live-certification.ts")),
  import(ts("src/lib/enterprise-marketing-engine/personalization.ts")),
  import(ts("src/lib/enterprise-marketing-engine/email-render.ts")),
  import(ts("src/lib/enterprise-marketing-engine/unsubscribe-scope.ts")),
  import(ts("src/lib/enterprise-marketing-engine/test-send-safety.ts")),
  import(ts("src/lib/enterprise-marketing-engine/data-quality.ts")),
  import(ts("src/constants/enterprise-marketing-engine/transitions.ts")),
]);

const { ENTERPRISE_MARKETING_EXECUTION_ENABLED, ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED } =
  await import(ts("src/constants/enterprise-marketing-engine/safety.ts"));

assert.equal(ENTERPRISE_MARKETING_EXECUTION_ENABLED, false, "live execution still hard-OFF");
assert.equal(ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED, false, "provider connect still hard-OFF");

assert.throws(
  () => safetyLib.assertMarketingProviderConnectAllowed("test.connect"),
  /blocked/,
);
assert.throws(() => liveAdapterMod.createLiveEmailProviderPort(), /blocked|not authorized|EME_SAFETY/i);
assert.throws(() => liveAdapterMod.connectMarketingLiveEmailProvider(), /blocked/i);
assert.throws(() => liveAdapterMod.executeMarketingLiveEmailProviderSend(), /blocked/i);

const readiness = readinessMod.assessMarketingLiveEmailProviderReadiness();
assert.equal(readiness.canConnect, false);
assert.equal(readiness.canLiveSend, false);
assert.equal(readiness.liveSendAuthorized, false);
assert.equal(readiness.executionEnabled, false);
assert.equal(readiness.providerConnectEnabled, false);
assert.equal(readiness.providerDecisionRequired, false);
assert.equal(readiness.selectedProvider, "smtp");
assert.equal(readiness.providerVerificationState, "AWAITING_PROVIDER_VERIFICATION");
assert.equal(readinessMod.marketingLiveEmailFallbackIsDryRun(), true);
assert.ok(
  readiness.blockedReasons.includes("LIVE_ADAPTER_EXECUTION_BLOCKED") ||
    readiness.blockedReasons.includes("marketing.execution.disabled"),
);

tokenMod.configureMarketingUnsubscribeSecretForTests(
  "foundation-unsubscribe-test-secret-32bytes-min",
);

const org = "org-lef-001";
const fingerprint = "email:unsub.fixture@example.com";
const token = tokenMod.mintMarketingUnsubscribeToken({
  organizationId: org,
  recipientFingerprint: fingerprint,
  campaignId: "camp-lef-001",
});
assert.equal(token.includes("@"), false);
assert.doesNotMatch(token, /unsub\.fixture/i);
assert.equal(tokenMod.parseMarketingUnsubscribeToken("tampered-not-valid"), null);
assert.equal(tokenMod.parseMarketingUnsubscribeToken(token.slice(0, 12)), null);

const expired = tokenMod.mintMarketingUnsubscribeToken({
  organizationId: org,
  recipientFingerprint: fingerprint,
  ttlMs: 1,
  nowMs: 1,
});
assert.equal(tokenMod.parseMarketingUnsubscribeToken(expired, { nowMs: Date.now() }), null);

const unsub = unsubSvcMod.marketingUnsubscribeService;
const invalid = unsub.confirm("not-a-real-token");
assert.equal(invalid.valid, false);
assert.equal(invalid.ok, false);

const store = suppressionMod.marketingSuppressionStore;
store.reset();

const first = unsub.confirm(token);
assert.equal(first.ok, true);
assert.equal(first.alreadyUnsubscribed, false);
const second = unsub.confirm(token);
assert.equal(second.ok, true);
assert.equal(second.alreadyUnsubscribed, true);
const history = store.history(org, fingerprint).filter((row) => row.kind === "UNSUBSCRIBED" && row.status === "ACTIVE");
assert.equal(history.length, 1);

const decision = store.evaluateDelivery({
  organizationId: org,
  fingerprints: [fingerprint],
  channel: "EMAIL",
  phase: "delivery",
  campaignId: "camp-lef-001",
});
assert.equal(decision.blocked, true);
assert.equal(decision.code, "unsubscribe");

assert.equal(scopeMod.marketingUnsubscribeAppliesToOperationalEmail(), false);
assert.equal(scopeMod.marketingUnsubscribeAppliesToTransactionalEmail(), false);
assert.equal(scopeMod.marketingUnsubscribeChannel(), "EMAIL");

const senderStore = senderStoreMod.marketingSenderIdentityStore;
const sender = senderStore.getDefaultActive(org);
assert.ok(sender, "fixture sender");
const recordStore = recordMod.marketingEmailDeliveryRecordStore;
recordStore.resetCampaign?.("camp-lef-001");

const svc = deliveryMod.marketingEmailDeliveryService;
const mode = svc.getMode();
assert.equal(mode.executionEnabled, false);
assert.equal(mode.providerConnectEnabled, false);
assert.equal(mode.liveSendAuthorized, false);
assert.equal(mode.emailMode, "dry_run");

const dryRun = await svc.deliver({
  idempotencyKey: "lef:dry-run:ok",
  organizationId: org,
  campaignId: "camp-lef-001",
  campaignVersionId: "ver-lef-001",
  batchId: "batch-lef-1",
  recipientFingerprint: "email:dryrun.ok@example.com",
  recipientEmail: "dryrun.ok@example.com",
  sender: {
    senderIdentityId: sender.id,
    displayName: sender.displayName,
    fromAddress: sender.fromAddress,
    replyTo: sender.replyTo,
  },
  subject: "Hello",
  htmlBody: "<p>Hello {{unsubscribeUrl}}</p>",
  textBody: "Hello {{unsubscribeUrl}}",
});
assert.equal(dryRun.outcome, "SENT");
assert.equal(dryRun.dryRun, true);

const blockedDirect = await svc.deliver({
  idempotencyKey: "lef:direct:unsub",
  organizationId: org,
  campaignId: "camp-lef-001",
  campaignVersionId: "ver-lef-001",
  batchId: "batch-lef-1",
  recipientFingerprint: fingerprint,
  recipientEmail: "unsub.fixture@example.com",
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
assert.equal(blockedDirect.outcome, "BLOCKED");
assert.equal(blockedDirect.errorCode, "unsubscribe");
assert.equal(blockedDirect.dryRun, true);

const missingFp = await svc.deliver({
  idempotencyKey: "lef:missing-fp",
  organizationId: org,
  campaignId: "camp-lef-001",
  campaignVersionId: "ver-lef-001",
  batchId: "batch-lef-1",
  recipientFingerprint: "   ",
  recipientEmail: "missing.fp@example.com",
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
assert.equal(missingFp.outcome, "BLOCKED");
assert.equal(missingFp.errorCode, "missing_recipient_fingerprint");

const merged = personalizationMod.applyPersonalization("Hello {{firstName}}", {
  firstName: '<img src=x onerror="alert(1)">',
});
assert.equal(merged.includes("<img"), false);
assert.ok(merged.includes("&lt;img"));
assert.ok(merged.includes("&quot;"));

const html = renderMod.renderMarketingEmailHtml({
  content: {
    version: 1,
    blocks: [
      { id: "t1", type: "text", props: { html: "<p>Hello <strong>{{firstName}}</strong></p>" } },
    ],
  },
  subject: "Hi {{firstName}}",
  previewText: "Preview",
  mode: "desktop",
  personalization: { firstName: "<script>alert(1)</script>" },
});
assert.equal(/<script/i.test(html), false);
assert.ok(html.includes("<strong>"));
assert.ok(html.includes("&lt;script"));

const typedSender = {
  id: "sender-typed-only",
  organizationId: org,
  displayName: "Campaigns",
  fromAddress: "campaigns@example.com",
  replyTo: "reply@example.com",
  channel: "EMAIL",
  active: true,
  isDefault: false,
  simulated: false,
  approvalStatus: "APPROVED",
  verificationStatus: "UNVERIFIED",
  permittedCampaignCategories: ["Unspecified"],
  createdByUserId: null,
  approvedByUserId: "u1",
  approvedAt: new Date().toISOString(),
  lastValidationAt: null,
  validationFreshUntil: null,
  providerMapping: {
    providerType: "dry_run",
    providerProfileId: null,
    credentialConfigured: false,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
const senderLive = senderEligMod.assessMarketingSenderLiveReadiness(typedSender);
assert.equal(senderLive.eligible, false);
assert.ok(senderLive.reasons.includes("SENDER_LIVE_NOT_VERIFIED"));
assert.ok(senderLive.reasons.includes("AWAITING_PROVIDER_VERIFICATION"));
assert.throws(() => senderEligMod.assertMarketingSenderEligibleForLiveSend({ identity: typedSender }));

const uncertified = audienceMod.assessMarketingAudienceLiveCertification({
  sourceWorkbookId: "wb-1",
  sourceTabId: "tab-1",
  sourceBindingId: "bind-1",
  authorised: true,
  mappingConfirmed: true,
  snapshotHash: "abc",
  frozenAt: new Date().toISOString(),
  eligibleCount: 10,
  invalidCount: 1,
  duplicateCount: 2,
  suppressedCount: 1,
  frozenRecipientCount: 10,
  certificationStatus: "DRAFT",
});
assert.equal(uncertified.certified, false);
assert.equal(uncertified.liveEligible, false);
assert.ok(uncertified.reasons.includes("AUDIENCE_NOT_CERTIFIED"));
assert.throws(() => audienceMod.assertMarketingAudienceCertifiedForLiveSend(uncertified));

const certifiedShape = audienceMod.assessMarketingAudienceLiveCertification({
  ...uncertified,
  sourceBindingId: "bind-1",
  sourceWorkbookId: "wb-1",
  sourceTabId: "tab-1",
  authorised: true,
  mappingConfirmed: true,
  snapshotHash: "abc",
  frozenAt: new Date().toISOString(),
  eligibleCount: 10,
  invalidCount: 1,
  duplicateCount: 2,
  suppressedCount: 1,
  frozenRecipientCount: 10,
  certificationStatus: "CERTIFIED",
});
assert.equal(certifiedShape.certified, true);
assert.equal(certifiedShape.liveEligible, false);
assert.throws(() =>
  audienceMod.assertMarketingAudienceCertifiedForLiveSend({
    sourceBindingId: "bind-1",
    sourceWorkbookId: "wb-1",
    sourceTabId: "tab-1",
    authorised: true,
    mappingConfirmed: true,
    snapshotHash: "abc",
    frozenAt: new Date().toISOString(),
    eligibleCount: 10,
    invalidCount: 1,
    duplicateCount: 2,
    suppressedCount: 1,
    frozenRecipientCount: 10,
    certificationStatus: "CERTIFIED",
  }),
);

const seen = new Set();
const firstRow = qualityMod.assessMarketingRowQuality(
  { Email: "dup@example.com" },
  { emailColumn: "Email", phoneColumn: null, externalKeyColumn: null },
  { seenFingerprints: seen },
);
const dupRow = qualityMod.assessMarketingRowQuality(
  { Email: "dup@example.com" },
  { emailColumn: "Email", phoneColumn: null, externalKeyColumn: null },
  { seenFingerprints: seen },
);
assert.ok(!firstRow.issues.includes("duplicate_in_sample"));
assert.ok(dupRow.issues.includes("duplicate_in_sample"));

assert.equal(transitionsMod.isMarketingTransitionAllowed("DRAFT", "RUNNING"), false);
assert.equal(transitionsMod.isMarketingTransitionAllowed("DRAFT", "READY_FOR_REVIEW"), true);

const testSafety = testSendMod.assessMarketingControlledTestSendSafety({
  recipientEmail: "someone@example.net",
});
assert.equal(testSafety.allowlisted, false);
assert.equal(testSafety.liveSendAuthorized, false);
assert.equal(testSafety.actuallySent, false);
assert.throws(() => testSendMod.assertMarketingTestSendDryRunOnly({ dryRun: false }));
assert.throws(() => testSendMod.assertMarketingInternalTestRecipient("customer@example.net"));

tokenMod.configureMarketingUnsubscribeSecretForTests(null);
assert.throws(() =>
  tokenMod.mintMarketingUnsubscribeToken({
    organizationId: org,
    recipientFingerprint: fingerprint,
  }),
);

store.reset();
assert.equal(fetchCalls, 0, "no network email/provider calls");
globalThis.fetch = originalFetch;

console.log("CO-MARKETING-LIVE-EMAIL-FOUNDATION-001 verify: PASS");
