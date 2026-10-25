/**
 * Isolated three-address Home Loan test_send gates. No SMTP. No production.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ts = (rel) => pathToFileURL(resolve(root, rel)).href;
const read = (rel) => readFileSync(join(root, rel), "utf8");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "marketing-controlled-test-local-jwt-aaaaaaaa";
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = "marketing-controlled-test-local-jwt-bbbbbbbb";
}

const THREE = [
  "rahulakapoor@gmail.com",
  "rahul@rupeecatalyst.com",
  "rupeecatalyst@gmail.com",
];
const THREE_ENV = THREE.join(",");

process.env.ENTERPRISE_MARKETING_EMAIL_MODE = "live";
process.env.ENTERPRISE_MARKETING_EXECUTION_ENABLED = "false";
process.env.ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = "false";
process.env.ENTERPRISE_MARKETING_CONTROLLED_TEST_SEND_ENABLED = "true";
process.env.ENTERPRISE_MARKETING_TEST_RECIPIENT_ALLOWLIST = THREE_ENV;

const execSrc = read("server/services/enterprise-marketing-engine/execution.service.ts");
const snapSrc = read("server/services/enterprise-marketing-engine/snapshot-live-deliverer.ts");
const cronSrc = read("src/lib/enterprise-marketing-engine/execution/cron-activation.ts");
const routeSrc = read("src/app/api/admin/marketing/campaigns/route.ts");
const adapterSrc = read("server/services/enterprise-marketing-engine/adapters/hostinger-smtp.adapter.ts");
const deliverySrc = read("server/services/enterprise-marketing-engine/email-delivery.service.ts");
assert.equal(execSrc.includes("controlledTestSend: true"), false);
assert.equal(snapSrc.includes("controlledTestSend: true"), false);
assert.ok(cronSrc.includes("MARKETING_PACING_CRON_REGISTERED = false"));
assert.ok(routeSrc.includes("test_send cannot expand to multiple recipients"));
assert.ok(adapterSrc.includes("isolatedTestSend"));
assert.ok(adapterSrc.includes("request.controlledTestSend"));
assert.ok(deliverySrc.includes("controlledTestSendEnabled: true"));

const [
  allowlistMod,
  testSendMod,
  safetyLib,
  safetyConst,
  recipients,
  validateMod,
  entryUrl,
  ctaGate,
] = await Promise.all([
  import(ts("src/lib/enterprise-marketing-engine/test-recipient-allowlist.ts")),
  import(ts("src/lib/enterprise-marketing-engine/test-send-safety.ts")),
  import(ts("src/lib/enterprise-marketing-engine/safety.ts")),
  import(ts("src/constants/enterprise-marketing-engine/safety.ts")),
  import(ts("src/constants/enterprise-marketing-engine/controlled-live-test-recipients.ts")),
  import(ts("src/lib/enterprise-marketing-engine/email-delivery/validate-request.ts")),
  import(ts("src/lib/product-journey/campaign-entry-url.ts")),
  import(ts("src/lib/enterprise-marketing-engine/campaign-entry-gate.ts")),
]);

assert.deepEqual([...recipients.MARKETING_CONTROLLED_LIVE_TEST_RECIPIENTS], THREE);
assert.equal(safetyConst.ENTERPRISE_MARKETING_EXECUTION_ENABLED, false);
assert.equal(safetyConst.ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED, false);
assert.equal(safetyConst.isMarketingControlledTestSendEnabled(), true);

for (const email of THREE) {
  assert.equal(allowlistMod.resolveExactMarketingLiveTestRecipient(email, THREE_ENV), email);
}

assert.throws(() => allowlistMod.resolveExactMarketingLiveTestRecipient("anyone@gmail.com", THREE_ENV));
assert.throws(() => allowlistMod.resolveExactMarketingLiveTestRecipient("qa@rupeecatalyst.com", THREE_ENV));
assert.throws(() =>
  allowlistMod.resolveExactMarketingLiveTestRecipient(`${THREE[0]},${THREE[1]}`, THREE_ENV),
);
assert.throws(() => allowlistMod.resolveExactMarketingLiveTestRecipient(THREE[0], ""));

assert.doesNotThrow(() => safetyLib.assertEmailDeliveryAllowed("email.controlled_test_send"));
assert.throws(() => safetyLib.assertEmailDeliveryAllowed("email.deliver"));

process.env.ENTERPRISE_MARKETING_CONTROLLED_TEST_SEND_ENABLED = "false";
assert.throws(() => safetyLib.assertEmailDeliveryAllowed("email.controlled_test_send"));
process.env.ENTERPRISE_MARKETING_CONTROLLED_TEST_SEND_ENABLED = "true";

const k1 = testSendMod.buildMarketingControlledTestSendIdempotencyKey({
  organizationId: "org-a",
  campaignId: "camp-hl",
  campaignVersionId: "ver-1",
  recipientEmail: THREE[0],
});
const k1b = testSendMod.buildMarketingControlledTestSendIdempotencyKey({
  organizationId: "org-a",
  campaignId: "camp-hl",
  campaignVersionId: "ver-1",
  recipientEmail: THREE[0].toUpperCase(),
});
const k2 = testSendMod.buildMarketingControlledTestSendIdempotencyKey({
  organizationId: "org-a",
  campaignId: "camp-hl",
  campaignVersionId: "ver-1",
  recipientEmail: THREE[1],
});
assert.equal(k1, k1b);
assert.notEqual(k1, k2);
assert.equal(k1.includes(THREE[0]), true);

testSendMod.assertMarketingTestSendDryRunOnly({ dryRun: false });

const safety = testSendMod.assessMarketingControlledTestSendSafety({ recipientEmail: THREE[0] });
assert.equal(safety.liveAllowlisted, true);
assert.equal(safety.liveSendAuthorized, true);

const gmailSafety = testSendMod.assessMarketingControlledTestSendSafety({
  recipientEmail: "random@gmail.com",
});
assert.equal(gmailSafety.liveAllowlisted, false);
assert.equal(gmailSafety.liveSendAuthorized, false);

const bulk = validateMod.validateMarketingEmailDeliveryRequest({
  idempotencyKey: "k",
  organizationId: "o",
  campaignId: "c",
  campaignVersionId: "v",
  batchId: "b",
  recipientFingerprint: "f",
  recipientEmail: `${THREE[0]},${THREE[1]}`,
  sender: {
    senderIdentityId: "s",
    displayName: "Rupee Catalyst Opportunities",
    fromAddress: "opportunities@rupeecatalyst.com",
    replyTo: "opportunities@rupeecatalyst.com",
  },
  subject: "Home Loan",
  htmlBody: "<p>x</p>",
  textBody: "x",
});
assert.equal(bulk?.code, "SINGLE_RECIPIENT_REQUIRED");

const entry = ctaGate.resolveLiveHomeLoanCampaignEntry({
  product: "home-loan",
  campaignToken: "placeholder-token-not-verified-here",
});
assert.equal(typeof entry.ok, "boolean");
assert.equal(typeof entryUrl.withCampaignEntryCtas, "function");

console.log("co-marketing-controlled-three-email-test-verify: PASS");
