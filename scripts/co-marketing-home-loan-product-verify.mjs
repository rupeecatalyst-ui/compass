/**
 * Home Loan campaign product persistence and dry-run consistency.
 * In-memory fixtures only. No SMTP, migration, or customer delivery.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.ENTERPRISE_PERSISTENCE_MODE = "memory";
process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE = "memory";
delete process.env.ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED;
delete process.env.ENTERPRISE_MARKETING_EXECUTION_ENABLED;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function load(rel) {
  return import(pathToFileURL(resolve(root, rel)).href);
}

const campaignSource = readFileSync(
  join(root, "server/services/enterprise-marketing-engine/campaign.service.ts"),
  "utf8",
);
assert.equal(campaignSource.includes('product: campaign.product || "home-loan"'), false);
assert.ok(campaignSource.includes("product: campaign.product,"));
assert.ok(campaignSource.includes("builderDryRun: true"));

const [campaigns, delivery, prePublish, health, content, ceilings, batch, consent] = await Promise.all([
  load("server/services/enterprise-marketing-engine/campaign.service.ts"),
  load("server/services/enterprise-marketing-engine/email-delivery.service.ts"),
  load("src/lib/enterprise-marketing-engine/pre-publish.ts"),
  load("src/lib/enterprise-marketing-engine/operational-health.ts"),
  load("src/lib/enterprise-marketing-engine/content-blocks.ts"),
  load("src/constants/enterprise-marketing-engine/hostinger-smtp.ts"),
  load("src/constants/enterprise-marketing-engine/execution.ts"),
  load("src/lib/enterprise-marketing-engine/consent-policy.ts"),
]);

assert.equal(ceilings.MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING, 2000);
assert.equal(batch.MARKETING_DEFAULT_BATCH_POLICY.batchSize, 100);
assert.equal(batch.MARKETING_DEFAULT_BATCH_POLICY.dailyMax, 500);
assert.equal(consent.defaultMarketingConsentPolicy("org-hl").requireExplicitConsent, false);

const actor = {
  userId: "hl-product-verify",
  organizationId: "org-hl-product-verify",
  role: "SUPER_ADMIN",
};
const service = campaigns.marketingCampaignService;

const created = await service.create(actor, {
  name: "Home Loan product verify",
  channel: "EMAIL",
  product: "home-loan",
});
assert.equal(created.campaign.product, "home-loan");

const reloaded = await service.get(actor, created.campaign.id);
assert.equal(reloaded.campaign.product, "home-loan");

const edited = await service.save(actor, created.campaign.id, {
  name: "Home Loan product verify edited",
  product: "home-loan",
  internalDescription: "Later edit keeps the product",
});
assert.equal(edited.campaign.product, "home-loan");
assert.equal(edited.campaign.name, "Home Loan product verify edited");

const retained = await service.save(actor, created.campaign.id, {
  objective: "Acquire",
});
assert.equal(retained.campaign.product, "home-loan");
const retainedRead = await service.get(actor, created.campaign.id);
assert.equal(retainedRead.campaign.product, "home-loan");

const emptyProduct = await service.create(actor, {
  name: "Missing product",
  channel: "EMAIL",
});
const invalidProduct = await service.create(actor, {
  name: "Invalid product",
  channel: "EMAIL",
  product: "personal-loan",
});

for (const row of [emptyProduct, invalidProduct]) {
  const checks = await service.prePublishChecks(actor, row.campaign.id);
  assert.equal(checks.readyForApproval, false);
  assert.ok(checks.blockingCodes.includes("product"));
}

const validChecks = prePublish.runMarketingPrePublishChecks({
  campaign: {
    ...retainedRead.campaign,
    audienceId: "aud-hl",
    product: "Home Loan",
  },
  version: {
    ...retainedRead.draft,
    subject: "Hello",
    ctaLabel: "Apply",
    ctaUrl: "https://rupeecatalyst.com/home-loan",
    content: content.createEmptyContentDocument(),
  },
});
assert.equal(validChecks.checks.find((check) => check.id === "product")?.passed, true);

const version = {
  ...retainedRead.draft,
  subject: "Your Home Loan",
  previewText: "A note",
  ctaLabel: "Continue",
  ctaUrl: "https://rupeecatalyst.com/home-loan",
  content: content.createEmptyContentDocument(),
  trackingEnabled: false,
};

async function claim(product, key) {
  return delivery.marketingEmailDeliveryService.deliverForExecutionClaim({
    organizationId: actor.organizationId,
    campaignId: created.campaign.id,
    campaignVersionId: version.id,
    batchId: `dry-${key}`,
    idempotencyKey: `hl-product-${key}`,
    recipientFingerprint: "email:qa.home.loan.verify@rupeecatalyst.com",
    recipientEmail: "qa.home.loan.verify@rupeecatalyst.com",
    version,
    row: { Email: "qa.home.loan.verify@rupeecatalyst.com", firstName: "QA" },
    trackingEnabled: false,
    product,
    campaignName: created.campaign.name,
    controlledTestSend: true,
    builderDryRun: true,
  });
}

for (const product of [null, "", "personal-loan"]) {
  const rejected = await claim(product, `bad-${String(product)}`);
  assert.equal(rejected.delivery.outcome, "FAILED");
  assert.equal(rejected.delivery.errorCode, "marketing.campaign.product_invalid");
  assert.equal(rejected.delivery.dryRun, true);
  assert.equal(rejected.countsAsProcessed, false);
}

const accepted = await claim("home-loan", "good");
assert.equal(accepted.delivery.dryRun, true);
assert.equal(accepted.delivery.outcome, "SENT");
assert.match(accepted.delivery.providerMessageId ?? "", /^dry-run-/);

const healthOff = await health.composeMarketingOperationalHealth({
  organizationId: actor.organizationId,
  productionLiveEnabled: false,
});
assert.equal(healthOff.liveSend, false);
assert.equal(healthOff.dryRun, true);
assert.equal(healthOff.providerAvailability.value, "unavailable");
assert.equal(healthOff.providerAvailability.note.includes("Fixture adapters only"), false);
assert.match(healthOff.providerAvailability.note, /Provider-connect flag is off/);

const healthOn = await health.composeMarketingOperationalHealth({
  organizationId: actor.organizationId,
  productionLiveEnabled: true,
});
assert.equal(healthOn.liveSend, false);
assert.equal(healthOn.dryRun, true);
assert.match(healthOn.providerAvailability.note, /Production Marketing mode is on/);
assert.equal(healthOn.providerAvailability.note.includes("Fixture adapters only"), false);

console.log(
  JSON.stringify({
    ok: true,
    savedProduct: retainedRead.campaign.product,
    dryRun: accepted.delivery.outcome,
    smtp: false,
  }),
);
