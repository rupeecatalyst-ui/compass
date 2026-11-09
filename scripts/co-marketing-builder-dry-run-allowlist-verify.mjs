/**
 * Campaign Builder dry-run allowlist.
 * Local only. No SMTP, no database, no deploy.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.env.ENTERPRISE_MARKETING_EMAIL_MODE = "live";
process.env.ENTERPRISE_MARKETING_EXECUTION_ENABLED = "true";
process.env.ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = "true";
process.env.ENTERPRISE_MARKETING_CONTROLLED_TEST_SEND_ENABLED = "true";
process.env.ENTERPRISE_MARKETING_TEST_RECIPIENT_ALLOWLIST =
  "rahul@rupeecatalyst.com,qa@rupeecatalyst.com";

const safety = await import(
  pathToFileURL(join(root, "src/lib/enterprise-marketing-engine/test-send-safety.ts")).href
);
const allowlist = await import(
  pathToFileURL(join(root, "src/lib/enterprise-marketing-engine/test-recipient-allowlist.ts")).href
);
const dryRunPort = await import(
  pathToFileURL(
    join(root, "server/services/enterprise-marketing-engine/adapters/dry-run-email-delivery.adapter.ts"),
  ).href
);

const qa = safety.assertMarketingBuilderDryRunRecipient("  QA@RupeeCatalyst.com  ");
assert.equal(qa, "qa@rupeecatalyst.com");

assert.throws(
  () => safety.assertMarketingBuilderDryRunRecipient("stranger@gmail.com"),
  (error) => error.code === "TEST_RECIPIENT_NOT_ALLOWLISTED",
);

assert.throws(
  () => allowlist.resolveExactMarketingLiveTestRecipient("qa@rupeecatalyst.com"),
  (error) => error.code === "marketing.test.recipient_not_allowlisted",
);
assert.equal(
  allowlist.resolveExactMarketingLiveTestRecipient("rahul@rupeecatalyst.com"),
  "rahul@rupeecatalyst.com",
);

safety.resetMarketingTestSendHistory();
const recorded = safety.recordMarketingTestSendHistory({
  id: "hist-builder-dry-run",
  campaignId: "camp-builder-dry-run",
  campaignVersionId: "ver-1",
  campaignVersionNumber: 1,
  requesterUserId: "user-1",
  recipientEmail: qa,
  timestamp: "2026-11-09T00:00:00.000Z",
  adapterResult: "dry_run:SENT",
  actuallySent: false,
  dryRun: true,
  failureReason: null,
});
assert.equal(recorded.actuallySent, false);
assert.equal(recorded.dryRun, true);
assert.equal(safety.listMarketingTestSendHistory("camp-builder-dry-run").length, 1);

const port = dryRunPort.createDryRunEmailDeliveryPort();
const delivered = await port.deliver({
  idempotencyKey: "mkt-test:org:camp:ver:qa@rupeecatalyst.com",
  organizationId: "org",
  campaignId: "camp",
  campaignVersionId: "ver",
  batchId: "batch",
  recipientFingerprint: "email:qa@rupeecatalyst.com",
  recipientEmail: qa,
  sender: {
    senderIdentityId: "sender-1",
    displayName: "Rupee Catalyst",
    fromAddress: "connect@rupeecatalyst.com",
    replyTo: "connect@rupeecatalyst.com",
  },
  subject: "Dry run",
  htmlBody: "<p>Dry run</p>",
  textBody: "Dry run",
  builderDryRun: true,
});
assert.equal(delivered.dryRun, true);
assert.equal(delivered.outcome, "SENT");
assert.match(delivered.providerMessageId, /^dry-run-/);

const campaignService = readFileSync(
  join(root, "server/services/enterprise-marketing-engine/campaign.service.ts"),
  "utf8",
);
const deliveryService = readFileSync(
  join(root, "server/services/enterprise-marketing-engine/email-delivery.service.ts"),
  "utf8",
);
assert.match(campaignService, /assertMarketingBuilderDryRunRecipient\(input\.recipientEmail\)/);
assert.match(campaignService, /builderDryRun: true/);
assert.match(campaignService, /outcome:\s*delivery\.outcome/);
assert.match(campaignService, /errorMessage:\s*failureReason/);
assert.doesNotMatch(campaignService, /assertMarketingLiveTestSendAllowlistIfLive\(/);
assert.match(deliveryService, /if \(request\?\.builderDryRun\) \{\s*return createDryRunEmailDeliveryPort\(\);/);
assert.match(deliveryService, /const builderDryRun = input\.builderDryRun === true;/);
assert.match(deliveryService, /const liveSmtp =\s*!builderDryRun &&/);

const panel = readFileSync(
  join(root, "src/components/catalyst-one/admin/marketing/marketing-controlled-test-panel.tsx"),
  "utf8",
);
assert.match(panel, /MARKETING_TEST_SEND_ALLOWED_ADDRESSES/);
assert.match(panel, /action: "test_send"/);

console.log("co-marketing-builder-dry-run-allowlist-verify: pass");
