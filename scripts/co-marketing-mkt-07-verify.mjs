/**
 * CO-MARKETING-MKT-07 — Email delivery port + dry-run provider verification.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);

let ok = true;
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  ok = false;
}
function pass(msg) {
  console.log(`OK: ${msg}`);
}

const required = [
  "src/types/enterprise-marketing-email-delivery.ts",
  "src/constants/enterprise-marketing-engine/email-delivery.ts",
  "src/lib/enterprise-marketing-engine/ports/email-delivery.port.ts",
  "src/lib/enterprise-marketing-engine/email-delivery/validate-request.ts",
  "server/services/enterprise-marketing-engine/email-delivery.service.ts",
  "server/services/enterprise-marketing-engine/adapters/dry-run-email-delivery.adapter.ts",
  "server/services/enterprise-marketing-engine/sender-identity-store.ts",
  "src/app/api/admin/marketing/sender-identities/route.ts",
];

for (const rel of required) {
  if (!existsSync(resolve(root, rel))) fail(`missing ${rel}`);
  else pass(rel);
}

const safety = readFileSync(
  resolve(root, "src/constants/enterprise-marketing-engine/safety.ts"),
  "utf8",
);
for (const flag of [
  "ENTERPRISE_MARKETING_EXECUTION_ENABLED = false",
  "ENTERPRISE_MARKETING_EXECUTION_DRY_RUN_ENABLED = true",
]) {
  if (!safety.includes(flag)) fail(flag);
  else pass(flag);
}
if (!safety.includes("CO-MARKETING-MKT-")) fail("sprint marker missing");
else pass("sprint marker present (MKT-07+)");

const senderApi = readFileSync(
  resolve(root, "src/app/api/admin/marketing/sender-identities/route.ts"),
  "utf8",
);
if (!senderApi.includes("SECRETS_NOT_ALLOWED")) fail("API must reject credential payloads");
else pass("secrets rejected in sender API");
if (senderApi.includes("smtpPassword") && senderApi.includes("apiKey")) pass("secret field guards present");
else fail("secret field guards");

const envExample = readFileSync(resolve(root, ".env.example"), "utf8");
if (!envExample.includes("ENTERPRISE_MARKETING_EMAIL_MODE")) fail("env example missing EMAIL_MODE");
else pass("env EMAIL_MODE documented");

try {
  require("tsx/cjs");
} catch {
  console.log("SKIP runtime (tsx)");
  process.exit(ok ? 0 : 1);
}

process.env.ENTERPRISE_MARKETING_EMAIL_MODE = "dry_run";

const deliveryUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/email-delivery.service.ts"),
).href;
const senderUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/sender-identity-store.ts"),
).href;
const recordUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/delivery-record-store.ts"),
).href;

const deliveryMod = await import(deliveryUrl);
const senderMod = await import(senderUrl);
const recordMod = await import(recordUrl);
const svc = deliveryMod.marketingEmailDeliveryService;
const senderStore = senderMod.marketingSenderIdentityStore;
const recordStore = recordMod.marketingEmailDeliveryRecordStore;

const org = "mkt07-verify";
const sender = senderStore.getDefaultActive(org);
if (!sender) fail("default sender identity");
else pass(`default sender=${sender.fromAddress}`);

const baseRequest = {
  idempotencyKey: "mkt07:test:001",
  organizationId: org,
  campaignId: "camp-mkt07",
  campaignVersionId: "ver-mkt07",
  batchId: "batch-mkt07-1",
  recipientFingerprint: "email:test@example.com",
  recipientEmail: "test@example.com",
  sender: {
    senderIdentityId: sender.id,
    displayName: sender.displayName,
    fromAddress: sender.fromAddress,
    replyTo: sender.replyTo,
  },
  subject: "Hello",
  htmlBody: "<p>Hello</p>",
  textBody: "Hello",
};

recordStore.resetCampaign?.("camp-mkt07");

const sent = await svc.deliver(baseRequest);
if (sent.outcome !== "SENT" || !sent.dryRun) fail(`dry-run send expected SENT, got ${sent.outcome}`);
else pass("dry-run delivery SENT");

const dup = await svc.deliver(baseRequest);
if (!dup.duplicate) fail("duplicate request must be detected");
else pass("duplicate idempotency");

const malformed = await svc.deliver({
  ...baseRequest,
  idempotencyKey: "mkt07:test:malformed",
  recipientEmail: "not-an-email",
});
if (malformed.outcome !== "BLOCKED" && malformed.outcome !== "FAILED") {
  fail(`malformed email expected BLOCKED/FAILED, got ${malformed.outcome}`);
} else pass("malformed email blocked");

const missingSender = await svc.deliver({
  ...baseRequest,
  idempotencyKey: "mkt07:test:nosender",
  sender: {
    senderIdentityId: "",
    displayName: "",
    fromAddress: "",
    replyTo: null,
  },
});
if (missingSender.outcome !== "FAILED" && missingSender.outcome !== "BLOCKED") {
  fail(`missing sender expected failure, got ${missingSender.outcome}`);
} else pass("missing sender rejected");

const retryFail = await svc.deliver({
  ...baseRequest,
  idempotencyKey: "mkt07:test:retry",
  recipientEmail: "retry-fail@example.com",
  recipientFingerprint: "email:retry-fail@example.com",
});
if (retryFail.outcome !== "RETRYABLE_FAILURE") fail(`retryable expected, got ${retryFail.outcome}`);
else pass("retryable failure simulation");

const rateLimit = await svc.deliver({
  ...baseRequest,
  idempotencyKey: "mkt07:test:rate",
  recipientEmail: "rate-limit@example.com",
});
if (rateLimit.outcome !== "RATE_LIMITED") fail(`rate limit expected, got ${rateLimit.outcome}`);
else pass("rate limit simulation");

const permanent = await svc.deliver({
  ...baseRequest,
  idempotencyKey: "mkt07:test:perm",
  recipientEmail: "permanent-fail@example.com",
});
if (permanent.outcome !== "PERMANENT_FAILURE") fail(`permanent expected, got ${permanent.outcome}`);
else pass("permanent failure simulation");

const blocked = await svc.deliver({
  ...baseRequest,
  idempotencyKey: "mkt07:test:blocked",
  recipientEmail: "blocked@example.com",
});
if (blocked.outcome !== "BLOCKED") fail(`blocked expected, got ${blocked.outcome}`);
else pass("blocked simulation");

const mode = svc.getMode();
if (mode.executionEnabled !== false) fail("execution must stay disabled");
else pass("execution disabled");
if (mode.liveSendAuthorized !== false) fail("live send must not be authorized");
else pass("live send not authorized");

const publicDto = senderStore.toPublicDto(sender);
if (JSON.stringify(publicDto).includes("password") || JSON.stringify(publicDto).includes("apiKey")) {
  fail("public DTO leaked secret-like fields");
} else pass("sender DTO has no secrets");

console.log(ok ? "CO-MARKETING-MKT-07 verify: PASS" : "CO-MARKETING-MKT-07 verify: FAIL");
process.exit(ok ? 0 : 1);
