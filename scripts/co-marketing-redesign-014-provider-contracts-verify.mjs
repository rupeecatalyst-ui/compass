/**
 * CO-MARKETING-REDESIGN-014 — Provider-neutral email adapter and webhook contracts.
 * Local fixtures only. No send, DNS, migrate, Hostinger, commit, or deploy.
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
const contractConst = read("src/constants/enterprise-marketing-engine/provider-contracts.ts");
const contractLib = read("src/lib/enterprise-marketing-engine/provider-contracts.ts");
const portSrc = read("src/lib/enterprise-marketing-engine/ports/email-provider.port.ts");
const adapterSrc = read(
  "server/services/enterprise-marketing-engine/adapters/fixture-email-provider.adapter.ts",
);
const serviceSrc = read("server/services/enterprise-marketing-engine/provider-webhook.service.ts");
const storeSrc = read("server/services/enterprise-marketing-engine/provider-webhook-store.ts");
const disabledSrc = read("src/lib/enterprise-marketing-engine/disabled-ports.ts");
const builderPage = read(
  "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
);
const permLib = read("src/lib/enterprise-marketing-engine/permissions.ts");
const gates = read("scripts/co-marketing-redesign-pre-staging-gates.mjs");
const typesSrc = read("src/types/enterprise-marketing-provider-contracts.ts");

mustInclude(pkg, "verify:co-marketing-redesign-014");
mustInclude(gates, "verify:co-marketing-redesign-014");
mustInclude(safety, "ENTERPRISE_MARKETING_EXECUTION_ENABLED = false");
mustInclude(safety, "ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false");
mustInclude(cronSrc, "MARKETING_PACING_CRON_REGISTERED = false");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_SIZE = 100");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_INTERVAL_MS = 60 * 60 * 1000");
assert.doesNotMatch(schema, /model\s+Lead\b/);
assert.doesNotMatch(schema, /model\s+MarketingProspect\b/);
assert.doesNotMatch(migration, /Lead\b/);
mustInclude(migration, "Do not apply without explicit Product Owner approval");
mustInclude(migration, "enterprise_marketing_provider_webhook_events");
mustInclude(migration, 'REFERENCES "organizations"("id")');
mustInclude(contractConst, "internal_test");
mustInclude(contractConst, "production");
mustInclude(contractConst, "delivery_status");
mustInclude(typesSrc, "recipientLedgerId");
mustInclude(typesSrc, "unsubscribeIdentity");
mustInclude(typesSrc, "preheader");
mustInclude(typesSrc, "renderedHtml");
mustInclude(typesSrc, "safeTextAlternative");
mustInclude(typesSrc, "retryEligible");
mustInclude(portSrc, "verifyWebhookSignature");
mustInclude(adapterSrc, "fixture_dry_run");
mustInclude(adapterSrc, "networkCalls: 0");
mustInclude(adapterSrc, "MARKETING_PROVIDER_LIVE_DISABLED");
mustInclude(contractConst, "LIVE_PROVIDER_DISABLED");
mustInclude(serviceSrc, "ORG_ISOLATION");
mustInclude(storeSrc, "rememberSend");
mustInclude(disabledSrc, "email.provider.live");
mustInclude(contractLib, "marketingWebhookQualifiesRecipient");
mustInclude(typesSrc, "qualifiesRecipient");
assert.doesNotMatch(adapterSrc, /fetch\(/);
assert.doesNotMatch(adapterSrc, /https\./);
assert.doesNotMatch(adapterSrc, /dns\.lookup/);
assert.doesNotMatch(serviceSrc, /fetch\(/);
assert.doesNotMatch(serviceSrc, /https\./);
assert.doesNotMatch(builderPage, /test_send/);
assert.doesNotMatch(builderPage, /run_test_batch/);
assert.doesNotMatch(builderPage, /run_next_batch/);

const adminDefault = permLib.slice(
  permLib.indexOf("const ADMIN_DEFAULT"),
  permLib.indexOf("export function resolveMarketingPermissions"),
);
assert.equal(adminDefault.includes("CAMPAIGN_APPROVE"), false);
assert.equal(adminDefault.includes("CAMPAIGN_SEND"), false);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "marketing-pre-staging-local-jwt-secret-aaaa";
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = "marketing-pre-staging-local-jwt-refresh-bbbb";
}

let fetchCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  fetchCalls += 1;
  return originalFetch(...args);
};

const serviceUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/provider-webhook.service.ts"),
).href;
const adapterUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/adapters/fixture-email-provider.adapter.ts"),
).href;
const storeUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/provider-webhook-store.ts"),
).href;
const suppressionUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/suppression-store.ts"),
).href;
const engagementUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/engagement-event-store.ts"),
).href;
const libUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/provider-contracts.ts"))
  .href;
const disabledUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/disabled-ports.ts"))
  .href;

const serviceMod = await import(serviceUrl);
const adapterMod = await import(adapterUrl);
const storeMod = await import(storeUrl);
const suppressionMod = await import(suppressionUrl);
const engagementMod = await import(engagementUrl);
const libMod = await import(libUrl);
const disabledMod = await import(disabledUrl);

serviceMod.marketingProviderContractService.reset();
suppressionMod.marketingSuppressionStore.reset();
engagementMod.marketingEngagementEventStore.resetOrganization("org-mkt-014-a");
engagementMod.marketingEngagementEventStore.resetOrganization("org-mkt-014-b");

function sendRequest(overrides = {}) {
  return {
    sendMode: "internal_test",
    organizationId: "org-mkt-014-a",
    campaignId: "camp-014",
    campaignVersionId: "ver-014",
    recipientLedgerId: "ledger-014-nisha",
    idempotencyKey: "mkt-014:nisha:001",
    sender: {
      senderIdentityId: "sender-014",
      displayName: "Rupee Catalyst Campaigns",
      fromAddress: "campaigns@example.com",
      replyTo: "champion@example.com",
    },
    replyTo: "champion@example.com",
    subject: "Home loan review",
    preheader: "A short preheader",
    renderedHtml: "<p>Hello</p>",
    safeTextAlternative: "Hello",
    unsubscribeIdentity: "email:nisha.rao@example.com",
    tracking: {
      enabled: true,
      campaignId: "camp-014",
      campaignVersionId: "ver-014",
      batchId: "batch-014",
      recipientFingerprint: "email:nisha.rao@example.com",
    },
    ...overrides,
  };
}

const accepted = await serviceMod.marketingProviderContractService.send(sendRequest());
assert.equal(accepted.decision, "accepted");
assert.equal(accepted.providerStatus, "ACCEPTED");
assert.equal(accepted.dryRun, true);
assert.equal(accepted.simulated, true);
assert.equal(accepted.networkCalls, 0);
assert.equal(accepted.duplicate, false);
assert.ok(accepted.providerMessageId);
assert.equal(libMod.marketingProviderAcceptanceIsDelivery(accepted.providerStatus), false);
const intentBeforeDelivery = storeMod.marketingProviderWebhookStore.getIntentByMessageId(
  accepted.providerMessageId,
);
assert.equal(intentBeforeDelivery.deliveredAt, null);

const duplicateSend = await serviceMod.marketingProviderContractService.send(sendRequest());
assert.equal(duplicateSend.duplicate, true);
assert.equal(duplicateSend.providerMessageId, accepted.providerMessageId);

const production = await serviceMod.marketingProviderContractService.send(
  sendRequest({ sendMode: "production", idempotencyKey: "mkt-014:prod:001" }),
);
assert.equal(production.decision, "rejected");
assert.equal(production.failureCategory, "LIVE_PROVIDER_DISABLED");
assert.equal(production.retryEligible, false);
assert.equal(production.networkCalls, 0);

function webhookBody(event) {
  return JSON.stringify(event);
}

const deliveryEvent = {
  providerEventId: "wh-014-delivery-1",
  type: "delivery_status",
  providerMessageId: accepted.providerMessageId,
  organizationId: "org-mkt-014-a",
  campaignId: "camp-014",
  campaignVersionId: "ver-014",
  recipientLedgerId: "ledger-014-nisha",
  recipientFingerprint: "email:nisha.rao@example.com",
  occurredAt: "2026-09-05T03:00:00.000Z",
};
const deliveryRaw = webhookBody(deliveryEvent);
const deliverySig = adapterMod.signMarketingFixtureWebhook(deliveryRaw);
const delivered = serviceMod.marketingProviderContractService.ingestWebhook({
  claimedOrganizationId: "org-mkt-014-a",
  rawBody: deliveryRaw,
  signature: deliverySig,
});
assert.equal(delivered.accepted, true);
assert.equal(delivered.events[0].engagementType, "DELIVERED");
assert.equal(delivered.events[0].qualifiesRecipient, false);
assert.ok(storeMod.marketingProviderWebhookStore.getIntentByMessageId(accepted.providerMessageId).deliveredAt);

let missingSig = false;
try {
  serviceMod.marketingProviderContractService.ingestWebhook({
    claimedOrganizationId: "org-mkt-014-a",
    rawBody: deliveryRaw,
    signature: null,
  });
} catch (err) {
  missingSig = err?.code === "WEBHOOK_SIGNATURE_MISSING";
}
assert.equal(missingSig, true);

let invalidSig = false;
try {
  serviceMod.marketingProviderContractService.ingestWebhook({
    claimedOrganizationId: "org-mkt-014-a",
    rawBody: deliveryRaw,
    signature: "fixture-v1:deadbeef",
  });
} catch (err) {
  invalidSig = err?.code === "WEBHOOK_SIGNATURE_INVALID";
}
assert.equal(invalidSig, true);

const dupDelivery = serviceMod.marketingProviderContractService.ingestWebhook({
  claimedOrganizationId: "org-mkt-014-a",
  rawBody: deliveryRaw,
  signature: deliverySig,
});
assert.equal(dupDelivery.duplicate, true);
assert.equal(dupDelivery.events[0].occurredAt, delivered.events[0].occurredAt);

const openEvent = {
  ...deliveryEvent,
  providerEventId: "wh-014-open-1",
  type: "open",
  occurredAt: "2026-09-05T02:00:00.000Z",
};
const openRaw = webhookBody(openEvent);
serviceMod.marketingProviderContractService.ingestWebhook({
  claimedOrganizationId: "org-mkt-014-a",
  rawBody: openRaw,
  signature: adapterMod.signMarketingFixtureWebhook(openRaw),
});
assert.equal(libMod.marketingWebhookQualifiesRecipient("open"), false);
assert.equal(libMod.marketingOpenClickIsQualification(), false);

const clickEvent = {
  ...deliveryEvent,
  providerEventId: "wh-014-click-1",
  type: "click",
  occurredAt: "2026-09-05T04:00:00.000Z",
};
const clickRaw = webhookBody(clickEvent);
serviceMod.marketingProviderContractService.ingestWebhook({
  claimedOrganizationId: "org-mkt-014-a",
  rawBody: clickRaw,
  signature: adapterMod.signMarketingFixtureWebhook(clickRaw),
});

const replyEvent = {
  ...deliveryEvent,
  providerEventId: "wh-014-reply-1",
  type: "reply",
  repliesSupported: true,
  occurredAt: "2026-09-05T04:30:00.000Z",
};
const replyRaw = webhookBody(replyEvent);
const replied = serviceMod.marketingProviderContractService.ingestWebhook({
  claimedOrganizationId: "org-mkt-014-a",
  rawBody: replyRaw,
  signature: adapterMod.signMarketingFixtureWebhook(replyRaw),
});
assert.equal(replied.events[0].engagementType, "REPLIED");
assert.equal(replied.events[0].qualifiesRecipient, false);
assert.equal(serviceMod.marketingProviderContractService.port().repliesSupported, true);

const unsubEvent = {
  ...deliveryEvent,
  providerEventId: "wh-014-unsub-1",
  type: "unsubscribe",
  occurredAt: "2026-09-05T05:00:00.000Z",
};
const unsubRaw = webhookBody(unsubEvent);
serviceMod.marketingProviderContractService.ingestWebhook({
  claimedOrganizationId: "org-mkt-014-a",
  rawBody: unsubRaw,
  signature: adapterMod.signMarketingFixtureWebhook(unsubRaw),
});
const dupUnsub = serviceMod.marketingProviderContractService.ingestWebhook({
  claimedOrganizationId: "org-mkt-014-a",
  rawBody: unsubRaw,
  signature: adapterMod.signMarketingFixtureWebhook(unsubRaw),
});
assert.equal(dupUnsub.duplicate, true);

const bounceSend = await serviceMod.marketingProviderContractService.send(
  sendRequest({
    idempotencyKey: "mkt-014:bounce:001",
    recipientLedgerId: "ledger-014-bounce",
    unsubscribeIdentity: "email:bounce.case@example.com",
    tracking: {
      enabled: true,
      campaignId: "camp-014",
      campaignVersionId: "ver-014",
      batchId: "batch-014",
      recipientFingerprint: "email:bounce.case@example.com",
    },
  }),
);
const complaintSend = await serviceMod.marketingProviderContractService.send(
  sendRequest({
    idempotencyKey: "mkt-014:complaint:001",
    recipientLedgerId: "ledger-014-complaint",
    unsubscribeIdentity: "email:complaint.case@example.com",
    tracking: {
      enabled: true,
      campaignId: "camp-014",
      campaignVersionId: "ver-014",
      batchId: "batch-014",
      recipientFingerprint: "email:complaint.case@example.com",
    },
  }),
);

const bounceEvent = {
  providerEventId: "wh-014-bounce-1",
  type: "bounce",
  bounceKind: "hard",
  providerMessageId: bounceSend.providerMessageId,
  organizationId: "org-mkt-014-a",
  campaignId: "camp-014",
  campaignVersionId: "ver-014",
  recipientLedgerId: "ledger-014-bounce",
  recipientFingerprint: "email:bounce.case@example.com",
  occurredAt: "2026-09-05T05:10:00.000Z",
};
const bounceRaw = webhookBody(bounceEvent);
const bounceIngest = serviceMod.marketingProviderContractService.ingestWebhook({
  claimedOrganizationId: "org-mkt-014-a",
  rawBody: bounceRaw,
  signature: adapterMod.signMarketingFixtureWebhook(bounceRaw),
});
assert.equal(bounceSend.decision, "accepted", bounceSend.failureCategory);
assert.equal(bounceIngest.events[0]?.suppressionKind, "HARD_BOUNCE");
assert.equal(bounceIngest.events[0]?.duplicate, false);

const complaintEvent = {
  providerEventId: "wh-014-complaint-1",
  type: "complaint",
  providerMessageId: complaintSend.providerMessageId,
  organizationId: "org-mkt-014-a",
  campaignId: "camp-014",
  campaignVersionId: "ver-014",
  recipientLedgerId: "ledger-014-complaint",
  recipientFingerprint: "email:complaint.case@example.com",
  occurredAt: "2026-09-05T05:20:00.000Z",
};
const complaintRaw = webhookBody(complaintEvent);
serviceMod.marketingProviderContractService.ingestWebhook({
  claimedOrganizationId: "org-mkt-014-a",
  rawBody: complaintRaw,
  signature: adapterMod.signMarketingFixtureWebhook(complaintRaw),
});

const rows = suppressionMod.marketingSuppressionStore.list("org-mkt-014-a");
const nishaUnsub = rows.filter(
  (row) => row.fingerprint === "email:nisha.rao@example.com" && row.kind === "UNSUBSCRIBED",
);
assert.equal(nishaUnsub.length, 1);
assert.ok(
  rows.some((row) => row.fingerprint.includes("bounce.case") && row.kind === "HARD_BOUNCE"),
  `bounce missing: ${rows.map((row) => `${row.fingerprint}:${row.kind}`).join(" | ")}`,
);
assert.ok(
  rows.some((row) => row.fingerprint === "email:complaint.case@example.com" && row.kind === "SPAM_COMPLAINT"),
);

const otherOrgRows = suppressionMod.marketingSuppressionStore.list("org-mkt-014-b");
assert.equal(
  otherOrgRows.some((row) => row.fingerprint === "email:nisha.rao@example.com"),
  false,
);

let isolated = false;
try {
  serviceMod.marketingProviderContractService.ingestWebhook({
    claimedOrganizationId: "org-mkt-014-b",
    rawBody: unsubRaw,
    signature: adapterMod.signMarketingFixtureWebhook(unsubRaw),
  });
} catch (err) {
  isolated = err?.code === "ORG_ISOLATION_VIOLATION";
}
assert.equal(isolated, true);

const chronology = storeMod.marketingProviderWebhookStore.list("org-mkt-014-a");
assert.ok(chronology.length >= 4);
for (let i = 1; i < chronology.length; i += 1) {
  assert.ok(chronology[i].occurredAt >= chronology[i - 1].occurredAt);
}
assert.equal(
  libMod.marketingProviderEventChronologyPreserved({
    previousOccurredAt: delivered.events[0].occurredAt,
    previousRecordedAt: delivered.events[0].recordedAt,
    nextOccurredAt: dupDelivery.events[0].occurredAt,
    nextRecordedAt: dupDelivery.events[0].recordedAt,
    duplicate: true,
  }),
  true,
);

const redacted = libMod.redactMarketingProviderPayload({
  providerEventId: "x",
  apiKey: "should-not-store",
  password: "should-not-store",
});
assert.equal(redacted.apiKey, "[redacted]");
assert.equal(redacted.password, "[redacted]");
assert.equal(JSON.stringify(delivered.events[0]).includes("password"), false);

let liveBlocked = false;
try {
  await disabledMod.disabledMarketingLiveEmailProviderPort.send(sendRequest());
} catch {
  liveBlocked = true;
}
assert.equal(liveBlocked, true);

assert.equal(fetchCalls, 0);
globalThis.fetch = originalFetch;

console.log("CO-MARKETING-REDESIGN-014 provider contracts verify: PASS");
