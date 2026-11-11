/**
 * In-process marketing scheduler must obey the pacing activation boundary.
 * No SMTP, customer delivery, or production-mode change.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schedulerSource = readFileSync(
  join(root, "server/services/enterprise-marketing-engine/production-scheduler.ts"),
  "utf8",
);
const activationSource = readFileSync(
  join(root, "src/lib/enterprise-marketing-engine/execution/cron-activation.ts"),
  "utf8",
);
assert.match(schedulerSource, /isMarketingPacingCronActivated/);
assert.ok(
  schedulerSource.indexOf("if (!deps.isActivated())") < schedulerSource.indexOf("deps.runDue()"),
);
assert.match(schedulerSource, /NODE_ENV !== "production"/);
assert.match(activationSource, /MARKETING_PACING_CRON_REGISTERED = false/);

const scheduler = await import(
  pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/production-scheduler.ts")).href
);
const cron = await import(
  pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/execution/cron-activation.ts")).href
);
const ceilings = await import(
  pathToFileURL(resolve(root, "src/constants/enterprise-marketing-engine/hostinger-smtp.ts")).href
);
const batch = await import(
  pathToFileURL(resolve(root, "src/constants/enterprise-marketing-engine/execution.ts")).href
);
const consent = await import(
  pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/consent-policy.ts")).href
);

assert.equal(cron.isMarketingPacingCronActivated(), false);
assert.equal(ceilings.MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING, 15000);
assert.equal(batch.MARKETING_DEFAULT_BATCH_POLICY.batchSize, 100);
assert.equal(batch.MARKETING_DEFAULT_BATCH_POLICY.dailyMax, 500);
assert.equal(consent.defaultMarketingConsentPolicy("org-scheduler").requireExplicitConsent, false);

const real = await scheduler.tickMarketingProductionScheduler();
assert.equal(real, "not_activated");

const inactive = { productionLive: 0, runDue: 0 };
const inactiveResult = await scheduler.tickMarketingProductionScheduler({
  isActivated: () => false,
  productionLive: async () => {
    inactive.productionLive += 1;
    return true;
  },
  runDue: async () => {
    inactive.runDue += 1;
    return { processed: 0, results: [] };
  },
});
assert.equal(inactiveResult, "not_activated");
assert.equal(inactive.productionLive, 0);
assert.equal(inactive.runDue, 0);

const productionOff = { runDue: 0 };
const productionOffResult = await scheduler.tickMarketingProductionScheduler({
  isActivated: () => true,
  productionLive: async () => false,
  runDue: async () => {
    productionOff.runDue += 1;
    return { processed: 0, results: [] };
  },
});
assert.equal(productionOffResult, "production_off");
assert.equal(productionOff.runDue, 0);

const authorised = { runDue: 0 };
const authorisedResult = await scheduler.tickMarketingProductionScheduler({
  isActivated: () => true,
  productionLive: async () => true,
  runDue: async () => {
    authorised.runDue += 1;
    return { processed: 0, results: [] };
  },
});
assert.equal(authorisedResult, "executed");
assert.equal(authorised.runDue, 1);

console.log(
  JSON.stringify({
    ok: true,
    inactive: "not_activated",
    authorisedMockedRunDue: authorised.runDue,
    customerDelivery: false,
  }),
);
