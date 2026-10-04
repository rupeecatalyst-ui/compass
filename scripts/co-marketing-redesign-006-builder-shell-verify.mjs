/**
 * CO-MARKETING-REDESIGN-006 — Full-page Campaign Builder shell.
 * Local fixtures only. No send, migrate, commit, or deploy.
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
const routes = read("src/constants/routes.ts");
const stepsSrc = read("src/constants/enterprise-marketing-engine/campaign-builder.ts");
const builderPage = read(
  "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
);
const entrySrc = read("src/components/catalyst-one/admin/marketing/marketing-campaigns-panel.tsx");
const workspacePage = read(
  "src/app/(dashboard)/admin/marketing/campaigns/[campaignId]/page.tsx",
);
const campaignsPage = read("src/app/(dashboard)/admin/marketing/campaigns/page.tsx");
const registryPage = read("src/app/(dashboard)/admin/marketing/registry/page.tsx");

mustInclude(pkg, "verify:co-marketing-redesign-006");
mustInclude(routes, "ADMIN_MARKETING_REGISTRY: \"/admin/marketing/registry\"");
mustInclude(routes, "ADMIN_MARKETING_CAMPAIGNS: \"/admin/marketing/campaigns\"");
mustInclude(workspacePage, "MarketingCampaignBuilderPage");
mustInclude(campaignsPage, "MarketingCampaignsPanel");
mustInclude(registryPage, "MarketingCampaignRegistryPanel");
mustInclude(entrySrc, "marketingCampaignBuilderHref");
mustInclude(entrySrc, "Open Campaign Registry");
mustInclude(builderPage, "Exit to Campaign Registry");
mustInclude(builderPage, "Save Draft");
mustInclude(builderPage, "Continue");
mustInclude(builderPage, "Back");
mustInclude(builderPage, "beforeunload");
mustInclude(builderPage, "MARKETING_BUILDER_UNSAVED_TITLE");
mustInclude(stepsSrc, "Unsaved changes");
mustInclude(builderPage, "Restoring campaign draft");
mustInclude(builderPage, "mkt-builder-rail");
mustInclude(builderPage, "Campaign name");
mustInclude(builderPage, "Internal description");
mustInclude(builderPage, "Authorised workbook");
mustInclude(builderPage, "Worksheet tab");
mustInclude(builderPage, "Confirm mapping");
mustInclude(builderPage, "Filters");
mustInclude(builderPage, "Exclusions");
mustInclude(builderPage, "Eligibility preview");
mustInclude(builderPage, "Snapshot");
mustInclude(builderPage, "Sender name");
mustInclude(builderPage, "Subject");
mustInclude(builderPage, "Preheader");
mustInclude(builderPage, "Message editor");
mustInclude(builderPage, "Available mapped variables");
mustInclude(builderPage, "Resolved sample preview");
mustInclude(builderPage, "Unresolved");
mustInclude(builderPage, "Timezone");
mustInclude(builderPage, "Batch size");
mustInclude(builderPage, "Daily cap");
mustInclude(builderPage, "First batch");
mustInclude(builderPage, "Completion estimate");
mustInclude(builderPage, "Approve");
mustInclude(builderPage, "Schedule / Launch");
mustInclude(builderPage, "disabled");
assert.doesNotMatch(builderPage, /test_send/);
assert.doesNotMatch(builderPage, /run_test_batch/);
assert.doesNotMatch(builderPage, /run_next_batch/);
assert.doesNotMatch(builderPage, /Bitrix/);
assert.doesNotMatch(builderPage, /240px/);
assert.doesNotMatch(entrySrc, /240px/);

const expectedTitles = [
  "Basics",
  "Audience",
  "Channel & Message",
  "Personalisation",
  "Schedule & Delivery",
  "Review & Launch",
];
let cursor = 0;
for (const title of expectedTitles) {
  const idx = stepsSrc.indexOf(`title: "${title}"`, cursor);
  assert.ok(idx >= 0, `step title missing or out of order: ${title}`);
  cursor = idx + 1;
}

const shellUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/campaign-builder-shell.ts"),
).href;
const shell = await import(shellUrl);

assert.deepEqual(shell.marketingBuilderStepTitles(), expectedTitles);
assert.equal(shell.isMarketingBuilderSendForbiddenOnStep(1), true);
assert.equal(shell.isMarketingBuilderSendForbiddenOnStep(5), true);
assert.equal(shell.isMarketingBuilderSendForbiddenOnStep(6), false);

const blank = {
  name: "",
  internalDescription: "",
  objective: "",
  channel: "EMAIL",
  ownerUserId: "",
  tags: [],
  bindingId: "",
  datasetId: "",
  audienceId: "",
  columnMapEmail: "",
  mappingConfirmed: false,
  snapshotStatus: "Unavailable",
  filterCount: 0,
  exclusionCount: 0,
  eligibleCount: null,
  senderName: "",
  senderAddress: "",
  subject: "",
  preheader: "",
  templateId: "",
  messageBody: "",
  personalizationSample: {},
  startAt: "",
  timezone: "Asia/Kolkata",
  batchSize: 100,
  intervalMs: 3_600_000,
  windowStart: "09:00",
  windowEnd: "19:00",
  dailyMax: 500,
};

assert.equal(shell.validateMarketingBuilderStep(1, blank).ok, false);
const named = { ...blank, name: "Professionals nurture" };
assert.equal(shell.validateMarketingBuilderStep(1, named).ok, true);
assert.equal(shell.validateMarketingBuilderStep(2, named).ok, false);

const readyAudience = {
  ...named,
  bindingId: "bind-1",
  datasetId: "tab-1",
  columnMapEmail: "Email",
  mappingConfirmed: true,
};
assert.equal(shell.validateMarketingBuilderStep(2, readyAudience).ok, true);
assert.equal(shell.validateMarketingBuilderStep(3, readyAudience).ok, false);

const readyMessage = {
  ...readyAudience,
  senderName: "RC",
  senderAddress: "n@example.com",
  subject: "Hello {{firstName}}",
  messageBody: "Hi {{firstName}} in {{city}}",
};
assert.equal(shell.validateMarketingBuilderStep(3, readyMessage).ok, true);
assert.equal(shell.validateMarketingBuilderStep(5, readyMessage).ok, true);

const payload = shell.marketingBuilderDraftSavePayload("c1", readyMessage);
assert.equal(payload.action, "save");
assert.equal(payload.campaignId, "c1");
assert.equal("status" in payload, false);
assert.equal("lifecycleAction" in payload, false);
shell.assertMarketingBuilderDraftSaveDoesNotSend(payload);
assert.throws(() =>
  shell.assertMarketingBuilderDraftSaveDoesNotSend({ action: "save", status: "RUNNING" }),
);
assert.throws(() => shell.assertMarketingBuilderDraftSaveDoesNotSend({ action: "transition" }));

const saved = shell.fingerprintMarketingBuilderDraft(readyMessage);
assert.equal(shell.isMarketingBuilderDraftDirty(saved, readyMessage), false);
assert.equal(shell.isMarketingBuilderDraftDirty(saved, { ...readyMessage, name: "Changed" }), true);

const estimate = shell.estimateMarketingDeliveryPlan({
  startAt: "2026-09-05T09:00:00.000Z",
  batchSize: 100,
  intervalMs: 3_600_000,
  dailyMax: 500,
  eligibleCount: 250,
});
assert.equal(estimate.firstBatch, "2026-09-05T09:00:00.000Z");
assert.match(estimate.batchCount, /^3 /);
assert.equal(estimate.completionEstimate, "2026-09-05T11:00:00.000Z");

const unavailable = shell.estimateMarketingDeliveryPlan({
  startAt: "",
  batchSize: 100,
  intervalMs: 3_600_000,
  dailyMax: 500,
  eligibleCount: null,
});
assert.equal(unavailable.batchCount, "Unavailable");

const review = shell.composeMarketingBuilderReview({
  draft: readyMessage,
  status: "DRAFT",
  actor: { role: "ADMIN" },
  executionEnabled: false,
  prePublish: { readyForApproval: false, checks: [], blockingCodes: [] },
});
assert.equal(review.canLaunch, false);
assert.match(review.launchReason, /TEST MODE/i);
assert.equal(review.canApprove, false);

assert.ok(
  shell
    .unresolvedPersonalisationTokens({
      subject: "Hi {{firstName}}",
      preheader: "",
      messageBody: "",
      mappedVariables: [],
    })
    .includes("firstName"),
);

assert.notEqual("/admin/marketing/registry", "/admin/marketing/campaigns");
mustInclude(stepsSrc, "marketingCampaignBuilderHref");

console.log(
  JSON.stringify(
    {
      ok: true,
      stepOrder: expectedTitles,
      registryRoute: "/admin/marketing/registry",
      builderEntryRoute: "/admin/marketing/campaigns",
      builderWorkspaceRoute: "/admin/marketing/campaigns/:campaignId",
      draftSaveAction: payload.action,
      sendForbiddenOnSteps1to5: true,
      unsavedGuard: true,
      validationGates: true,
    },
    null,
    2,
  ),
);
