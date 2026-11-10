/**
 * Admin Run Next Batch stays simulated: no SMTP and no recipient-state advance.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.ENTERPRISE_PERSISTENCE_MODE = "memory";
process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE = "memory";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const executionSource = readFileSync(
  join(root, "server/services/enterprise-marketing-engine/execution.service.ts"),
  "utf8",
);
const routeSource = readFileSync(
  join(root, "src/app/api/admin/marketing/campaigns/route.ts"),
  "utf8",
);
const runNextStart = executionSource.indexOf("async runNextBatch");
const runNextEnd = executionSource.indexOf("async runControlledTestBatch");
const runNextBody = executionSource.slice(runNextStart, runNextEnd);
assert.equal(runNextBody.includes("tickBatchInternal"), false);
assert.match(runNextBody, /simulated_action_does_not_deliver/);
assert.match(routeSource, /deliveryLabel: "SIMULATED"/);
assert.match(routeSource, /actuallySent: false/);
assert.match(routeSource, /LIVE_PROVIDER_FORBIDDEN/);
assert.match(executionSource, /isMarketingSnapshotLiveDeliveryAuthorized/);

const execution = await import(
  pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/execution.service.ts")).href
);
const campaigns = await import(
  pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/campaign.service.ts")).href
);
const delivery = await import(
  pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/email-delivery.service.ts")).href
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

assert.equal(ceilings.MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING, 2000);
assert.equal(batch.MARKETING_DEFAULT_BATCH_POLICY.batchSize, 100);
assert.equal(batch.MARKETING_DEFAULT_BATCH_POLICY.dailyMax, 500);
assert.equal(consent.defaultMarketingConsentPolicy("org-next").requireExplicitConsent, false);

let smtpCalls = 0;
const original = delivery.marketingEmailDeliveryService.deliverForExecutionClaim.bind(
  delivery.marketingEmailDeliveryService,
);
delivery.marketingEmailDeliveryService.deliverForExecutionClaim = async () => {
  smtpCalls += 1;
  throw new Error("SMTP must not be contacted by simulated Run Next Batch");
};

const actor = {
  userId: "next-batch-verify",
  organizationId: "org-next-batch-verify",
  role: "SUPER_ADMIN",
};
const created = await campaigns.marketingCampaignService.create(actor, {
  name: "Simulated next batch",
  channel: "EMAIL",
  product: "home-loan",
});
const before = execution.marketingExecutionService.getSummary(created.campaign.id);
const tick = await execution.marketingExecutionService.runNextBatch(
  created.campaign.id,
  actor.organizationId,
);
const after = execution.marketingExecutionService.getSummary(created.campaign.id);

assert.equal(tick.dryRun, true);
assert.equal(tick.liveProviderInvoked, false);
assert.equal(tick.claimed, 0);
assert.equal(tick.processed, 0);
assert.equal(tick.skippedReason, "simulated_action_does_not_deliver");
assert.equal(smtpCalls, 0);
assert.equal(after.totalBatches, before.totalBatches);
assert.deepEqual(after.ledgerCounts, before.ledgerCounts);

delivery.marketingEmailDeliveryService.deliverForExecutionClaim = original;

console.log(
  JSON.stringify({
    ok: true,
    simulated: true,
    smtpCalls,
    claimed: tick.claimed,
    processed: tick.processed,
  }),
);
