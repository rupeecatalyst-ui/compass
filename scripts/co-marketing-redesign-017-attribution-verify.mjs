/**
 * CO-MARKETING-REDESIGN-017 — Campaign attribution from response to revenue.
 * Local fixtures only. No production Opportunity/Deal/Accounting writes. No migrate, commit, or deploy.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function mustInclude(haystack, needle, label = needle) {
  assert.ok(haystack.includes(needle), `missing ${label}`);
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
      walk(abs, acc);
    } else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) {
      acc.push(abs);
    }
  }
  return acc;
}

const pkg = read("package.json");
const safety = read("src/constants/enterprise-marketing-engine/safety.ts");
const cronSrc = read("src/lib/enterprise-marketing-engine/execution/cron-activation.ts");
const schema = read("prisma/schema.prisma");
const executionConst = read("src/constants/enterprise-marketing-engine/execution.ts");
const builderPage = read(
  "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
);
const permLib = read("src/lib/enterprise-marketing-engine/permissions.ts");
const gates = read("scripts/co-marketing-redesign-pre-staging-gates.mjs");
const monitoring010 = read("src/lib/enterprise-marketing-engine/monitoring.ts");
const explorer010 = read("src/lib/enterprise-marketing-engine/recipient-explorer.ts");
const evaluateSrc = read("src/lib/enterprise-marketing-engine/qualification/evaluate.ts");
const inboxSrc = read("src/lib/enterprise-marketing-engine/qualification/inbox-boundary.ts");
const composeSrc = read("src/lib/enterprise-marketing-engine/attribution/compose-attribution.ts");
const rulesSrc = read("src/constants/enterprise-marketing-engine/attribution.ts");
const liveSsot = read(
  "server/services/enterprise-marketing-engine/adapters/live-attribution-ssot.adapter.ts",
);
const fixtureSsot = read(
  "server/services/enterprise-marketing-engine/adapters/fixture-attribution-ssot.adapter.ts",
);
const serviceSrc = read("server/services/enterprise-marketing-engine/attribution.service.ts");
const apiRoute = read("src/app/api/admin/marketing/attribution/route.ts");
const ui = read("src/components/catalyst-one/admin/marketing/marketing-attribution-panel.tsx");
const nav = read("src/constants/enterprise-marketing-engine/navigation.ts");
const routes = read("src/constants/routes.ts");
const responsesUi = read("src/components/catalyst-one/admin/marketing/marketing-responses-panel.tsx");

mustInclude(pkg, "verify:co-marketing-redesign-017");
mustInclude(gates, "verify:co-marketing-redesign-017");
mustInclude(safety, "ENTERPRISE_MARKETING_EXECUTION_ENABLED = false");
mustInclude(safety, "ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false");
mustInclude(safety, 'ENTERPRISE_MARKETING_HANDOFF_MODE ?? "fixture"');
mustInclude(safety, "ENTERPRISE_MARKETING_MASS_HANDOFF_ENABLED = false");
mustInclude(cronSrc, "MARKETING_PACING_CRON_REGISTERED = false");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_SIZE = 100");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_INTERVAL_MS = 60 * 60 * 1000");
assert.doesNotMatch(schema, /model\s+Lead\b/);
assert.doesNotMatch(schema, /model\s+MarketingProspect\b/);
assert.doesNotMatch(builderPage, /test_send/);
assert.doesNotMatch(builderPage, /run_test_batch/);
assert.doesNotMatch(builderPage, /run_next_batch/);
mustInclude(monitoring010, 'unavailableMarketingMetric("Not connected")');
mustInclude(explorer010, "maskMarketingRecipientEmail");
mustInclude(evaluateSrc, 'intent === "open" || input.intent === "click"');
mustInclude(inboxSrc, "openClickDoesNotCreateContact");
mustInclude(responsesUi, "do not create a Contact or Opportunity");
mustInclude(composeSrc, "Never treats Opportunity value as recognised revenue");
mustInclude(composeSrc, "marketingRevenueCopiedFromOpportunityValue");
mustInclude(rulesSrc, "neverInferRevenueFromOpportunityValue");
mustInclude(rulesSrc, "roiUnavailableUnlessCostAndRevenue");
mustInclude(liveSsot, "Must never create");
mustInclude(fixtureSsot, "Never writes to Prisma");
mustInclude(serviceSrc, "Does not create Opportunity");
mustInclude(apiRoute, "fromMarketingUnknownError");
mustInclude(ui, "Unavailable");
mustInclude(ui, "Campaign attribution");
mustInclude(nav, 'id: "attribution"');
mustInclude(routes, "ADMIN_MARKETING_ATTRIBUTION");

const adminDefault = permLib.slice(
  permLib.indexOf("const ADMIN_DEFAULT"),
  permLib.indexOf("export function resolveMarketingPermissions"),
);
assert.equal(adminDefault.includes("CAMPAIGN_APPROVE"), false);
assert.equal(adminDefault.includes("CAMPAIGN_SEND"), false);
assert.equal(adminDefault.includes("CAMPAIGN_RETRY"), false);

const secretLeak = /[?&](password|passwd|secret|token)=/i;
for (const abs of [...walk(join(root, "scripts")), ...walk(join(root, "src/app/api/admin/marketing"))]) {
  const rel = abs.slice(root.length + 1).replaceAll("\\", "/");
  if (!rel.includes("co-marketing") && !rel.includes("src/app/api/admin/marketing")) continue;
  const src = readFileSync(abs, "utf8");
  assert.doesNotMatch(src, secretLeak, `credential query-string leak in ${rel}`);
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "marketing-pre-staging-local-jwt-secret-aaaa";
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = "marketing-pre-staging-local-jwt-refresh-bbbb";
}
process.env.ENTERPRISE_MARKETING_HANDOFF_MODE = "fixture";

const composeUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/attribution/compose-attribution.ts"),
).href;
const qstoreUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/qualification-store.ts"),
).href;
const attrUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/attribution.service.ts"),
).href;
const ssotUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/adapters/fixture-attribution-ssot.adapter.ts"),
).href;
const identUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/adapters/fixture-identity.adapter.ts"),
).href;
const oppUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/adapters/fixture-opportunity.adapter.ts"),
).href;

const {
  composeMarketingAttributionDashboard,
  computeMarketingCampaignRoi,
  marketingRevenueCopiedFromOpportunityValue,
} = await import(composeUrl);
const { marketingQualificationStore } = await import(qstoreUrl);
const { marketingAttributionService } = await import(attrUrl);
const { marketingFixtureAttributionSsot } = await import(ssotUrl);
const { marketingFixtureIdentityDirectory } = await import(identUrl);
const { marketingFixtureOpportunityDirectory } = await import(oppUrl);

const org = "org-017";
const now = "2026-09-05T04:00:00.000Z";

function campaignRow(id, name = "017 Attribution") {
  return {
    id,
    organizationId: org,
    name,
    product: "Home Loan",
    channel: "EMAIL",
    sender: { fromName: "RC", fromAddress: "campaigns@example.com" },
    status: "DRAFT",
    currentDraftVersionId: `${id}-draft`,
    schedulePlaceholder: { enabled: false },
    routingPlaceholder: { mode: "SINGLE_USER", ownerUserId: "rm-017" },
    notificationPlaceholder: { inApp: true, email: false, whatsapp: false },
    governance: {
      createdByUserId: "admin-017",
      modifiedByUserId: "admin-017",
      submittedByUserId: null,
      approvedByUserId: null,
      scheduledByUserId: null,
      submittedAt: null,
      approvedAt: null,
      scheduledAt: null,
    },
    stateHistory: [],
    createdAt: now,
    updatedAt: now,
  };
}

function recipient(id, campaignId, fingerprint) {
  return {
    id,
    organizationId: org,
    snapshotId: "snap-017",
    campaignId,
    sourceWorkbookId: "wb",
    sourceTabId: "tab",
    sourceTabName: "Master",
    sourceRowNumber: 2,
    sourceStableKey: id,
    recipientFingerprint: fingerprint,
    normalizedEmail: fingerprint.replace("email:", ""),
    assignedBatchNumber: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function qualification(partial) {
  return {
    id: "q-017",
    organizationId: org,
    campaignId: "camp-017",
    campaignName: "017 Attribution",
    channel: "EMAIL",
    recipientFingerprint: "email:ada@example.com",
    intent: "manual_qualification",
    businessState: "HANDED_OFF",
    processState: "HANDOFF_COMPLETE",
    snapshotId: "snap-017",
    snapshotRecipientId: "rcpt-ada",
    contactId: "ct-ada",
    contactCreated: false,
    opportunityId: "opp-017",
    opportunityCreated: true,
    assigneeUserId: "rm-017",
    product: "Home Loan",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

const roiMissing = computeMarketingCampaignRoi({ cost: null, recognisedRevenue: 100 });
assert.equal(roiMissing.availability, "unavailable");
assert.equal(roiMissing.reason, "Unavailable");
assert.equal(computeMarketingCampaignRoi({ cost: 100, recognisedRevenue: null }).reason, "Unavailable");

assert.equal(marketingRevenueCopiedFromOpportunityValue(5_000_000, 5_000_000), true);
assert.equal(marketingRevenueCopiedFromOpportunityValue(5_000_000, 1_200_000), false);

const campaign = campaignRow("camp-017");
const base = {
  organizationId: org,
  campaigns: [campaign],
  snapshotRecipients: [
    recipient("rcpt-ada", "camp-017", "email:ada@example.com"),
    recipient("rcpt-open", "camp-017", "email:open.only@example.com"),
  ],
  qualifications: [
    qualification({
      id: "q-open",
      recipientFingerprint: "email:open.only@example.com",
      snapshotRecipientId: "rcpt-open",
      intent: "open",
      businessState: "ENGAGED",
      processState: "NEW",
      contactId: null,
      opportunityId: null,
      opportunityCreated: false,
      contactCreated: undefined,
    }),
    qualification({
      id: "q-ada",
      recipientFingerprint: "email:ada@example.com",
      snapshotRecipientId: "rcpt-ada",
    }),
    qualification({
      id: "q-ada-dup",
      recipientFingerprint: "email:ada@example.com:dup",
      snapshotRecipientId: null,
      opportunityCreated: false,
      contactCreated: false,
    }),
  ],
  opportunities: [
    {
      id: "opp-017",
      requiredAmount: 5_000_000,
      amountProvenance: "persisted",
      product: "Home Loan",
      ownerUserId: "rm-017",
      campaignId: "some-other-campaign",
    },
  ],
  deals: [],
  accounting: [],
  campaignCosts: [],
  accountingAvailable: true,
};

const dashboard = composeMarketingAttributionDashboard(base);
assert.equal(dashboard.attributedRecipients.value, 3);
assert.equal(dashboard.qualifiedResponses.value, 2);
assert.equal(dashboard.opportunitiesCreated.value, 1);
assert.equal(dashboard.totalOpportunityValue.value, 5_000_000);
assert.equal(dashboard.dealsCreated.value, 0);
assert.equal(dashboard.recognisedRevenue.availability, "unavailable");
assert.equal(dashboard.recognisedRevenue.reason, "Unavailable");
assert.equal(dashboard.campaignRoi.reason, "Unavailable");
assert.equal(dashboard.campaignCost.reason, "Unavailable");
assert.equal(
  marketingRevenueCopiedFromOpportunityValue(
    dashboard.totalOpportunityValue.value,
    dashboard.recognisedRevenue.value,
  ),
  false,
);
assert.notEqual(dashboard.recognisedRevenue.value, dashboard.totalOpportunityValue.value);

const adaRow = dashboard.rows.find((row) => row.qualificationId === "q-ada");
assert.equal(adaRow?.originalCampaignId, "camp-017");
assert.equal(adaRow?.campaignId, "camp-017");

const draftOnly = composeMarketingAttributionDashboard({
  ...base,
  opportunities: [{ id: "opp-017", requiredAmount: 5_000_000, amountProvenance: "draft" }],
});
assert.equal(draftOnly.totalOpportunityValue.reason, "Unavailable");
assert.equal(draftOnly.recognisedRevenue.reason, "Unavailable");

const withDeal = composeMarketingAttributionDashboard({
  ...base,
  deals: [
    {
      id: "deal-017",
      opportunityId: "opp-017",
      stage: "disbursed",
      disbursedAmount: 4_800_000,
      disbursedConfirmed: true,
    },
  ],
  accounting: [],
  campaignCosts: [{ campaignId: "camp-017", costAmount: 200_000 }],
});
assert.equal(withDeal.dealsCreated.value, 1);
assert.equal(withDeal.disbursedAmount.value, 4_800_000);
assert.equal(withDeal.campaignCost.value, 200_000);
assert.equal(withDeal.recognisedRevenue.reason, "Unavailable");
assert.equal(withDeal.campaignRoi.reason, "Unavailable");
assert.notEqual(withDeal.disbursedAmount.value, withDeal.totalOpportunityValue.value);

const recognised = composeMarketingAttributionDashboard({
  ...base,
  deals: [
    {
      id: "deal-017",
      opportunityId: "opp-017",
      stage: "disbursed",
      disbursedAmount: 4_800_000,
      disbursedConfirmed: true,
    },
  ],
  accounting: [{ dealId: "deal-017", recognisedRevenue: 1_200_000, confirmed: true }],
  campaignCosts: [{ campaignId: "camp-017", costAmount: 200_000 }],
});
assert.equal(recognised.recognisedRevenue.value, 1_200_000);
assert.equal(recognised.campaignRoi.value, 500);
assert.notEqual(recognised.recognisedRevenue.value, recognised.totalOpportunityValue.value);

const productFilter = composeMarketingAttributionDashboard({
  ...base,
  filters: { product: "LAP" },
});
assert.equal(productFilter.qualifiedResponses.value, 0);

const ownerFilter = composeMarketingAttributionDashboard({
  ...base,
  filters: { ownerUserId: "rm-017" },
});
assert.equal(ownerFilter.qualifiedResponses.value, 2);

const dateFilter = composeMarketingAttributionDashboard({
  ...base,
  filters: { from: "2026-09-06T00:00:00.000Z", to: "2026-09-07T00:00:00.000Z" },
});
assert.equal(dateFilter.attributedRecipients.value, 0);

marketingQualificationStore.resetOrganization(org);
marketingFixtureAttributionSsot.reset();
marketingFixtureIdentityDirectory.resetOrganization(org);
marketingFixtureOpportunityDirectory.reset();

marketingQualificationStore.create({
  organizationId: org,
  campaignId: "camp-svc-017",
  campaignName: "017 Service Attribution",
  channel: "EMAIL",
  recipientFingerprint: "email:service@example.com",
  intent: "manual_qualification",
  businessState: "HANDED_OFF",
  processState: "HANDOFF_COMPLETE",
  snapshotId: "snap-017-svc",
  snapshotRecipientId: "rcpt-svc",
  contactId: "ct-svc",
  contactCreated: true,
  opportunityId: "opp-svc-017",
  opportunityCreated: true,
  assigneeUserId: "rm-017",
  product: "Home Loan",
});
marketingFixtureAttributionSsot.upsertOpportunity({
  id: "opp-svc-017",
  requiredAmount: 3_000_000,
  amountProvenance: "persisted",
  product: "Home Loan",
  ownerUserId: "rm-017",
});
const identityBefore = marketingFixtureIdentityDirectory.list(org).length;
const opportunityBefore = marketingFixtureOpportunityDirectory.list().length;
const serviceDash = await marketingAttributionService.getDashboard(
  { userId: "admin-017", role: "SUPER_ADMIN", organizationId: org },
  { campaignId: "camp-svc-017" },
);
assert.equal(serviceDash.opportunitiesCreated.value, 1);
assert.equal(serviceDash.totalOpportunityValue.value, 3_000_000);
assert.equal(serviceDash.recognisedRevenue.reason, "Unavailable");
assert.equal(serviceDash.campaignRoi.reason, "Unavailable");
assert.equal(marketingFixtureIdentityDirectory.list(org).length, identityBefore);
assert.equal(marketingFixtureOpportunityDirectory.list().length, opportunityBefore);

console.log("CO-MARKETING-REDESIGN-017 PASS");
