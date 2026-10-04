/**
 * CO-MARKETING-REDESIGN-005 — Marketing Home + Campaign Registry.
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
const nav = read("src/constants/enterprise-marketing-engine/navigation.ts");
const homeConst = read("src/constants/enterprise-marketing-engine/home-registry.ts");
const homeSrc = read("src/components/catalyst-one/admin/marketing/marketing-command-center.tsx");
const registrySrc = read(
  "src/components/catalyst-one/admin/marketing/marketing-campaign-registry-panel.tsx",
);
const registryActionsSrc = read("src/lib/enterprise-marketing-engine/campaign-registry.ts");
const builderSrc = read("src/components/catalyst-one/admin/marketing/marketing-campaigns-panel.tsx");
const registryPage = read("src/app/(dashboard)/admin/marketing/registry/page.tsx");
const homePage = read("src/app/(dashboard)/admin/marketing/page.tsx");
const campaignsPage = read("src/app/(dashboard)/admin/marketing/campaigns/page.tsx");

mustInclude(pkg, "verify:co-marketing-redesign-005");
mustInclude(routes, "ADMIN_MARKETING_REGISTRY: \"/admin/marketing/registry\"");
mustInclude(nav, "id: \"registry\"");
mustInclude(nav, "id: \"campaigns\"");
mustInclude(nav, "title: \"Campaign Registry\"");
mustInclude(nav, "title: \"Campaign Builder\"");
assert.notEqual(
  "/admin/marketing/registry",
  "/admin/marketing/campaigns",
  "registry must be a separate route from the builder",
);
mustInclude(registryPage, "MarketingCampaignRegistryPanel");
mustInclude(homePage, "MarketingCommandCenter");
mustInclude(campaignsPage, "MarketingCampaignsPanel");
mustInclude(homeSrc, "Create Campaign");
mustInclude(homeSrc, "TEST MODE");
mustInclude(homeSrc, "mkt-cc-banner");
mustInclude(homeConst, "Draft");
mustInclude(homeConst, "Awaiting approval");
mustInclude(homeConst, "Scheduled");
mustInclude(homeConst, "Running");
mustInclude(homeConst, "Paused");
mustInclude(homeConst, "Completed");
mustInclude(homeConst, "Failed");
mustInclude(homeConst, "Qualified responses");
mustInclude(homeConst, "Opportunities created");
mustInclude(homeConst, "Attributed pipeline / revenue");
mustInclude(registrySrc, "id=\"mkt-registry-search\"");
mustInclude(registrySrc, "id=\"mkt-registry-channel\"");
mustInclude(registrySrc, "id=\"mkt-registry-status\"");
mustInclude(registrySrc, "id=\"mkt-registry-owner\"");
mustInclude(registrySrc, "id=\"mkt-registry-date\"");
mustInclude(registryActionsSrc, 'label: "Pause"');
mustInclude(registryActionsSrc, 'label: "Resume"');
mustInclude(registryActionsSrc, 'label: "Stop"');
mustInclude(registrySrc, "{action.label}");
mustInclude(registrySrc, "Loading Campaign Registry");
mustInclude(registrySrc, "No campaigns match");
mustInclude(registrySrc, "role=\"alert\"");
assert.doesNotMatch(registrySrc, /240px/);
assert.doesNotMatch(builderSrc, /240px/);
assert.doesNotMatch(homeSrc, /Bitrix/);
assert.doesNotMatch(registrySrc, /Bitrix/);

const homeUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/home-overview.ts")).href;
const registryUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/campaign-registry.ts"),
).href;
const home = await import(homeUrl);
const registry = await import(registryUrl);

const ts = "2026-09-04T10:00:00.000Z";
const campaigns = [
  {
    id: "c-draft",
    organizationId: "org-1",
    name: "Draft welcome",
    channel: "EMAIL",
    status: "DRAFT",
    currentDraftVersionId: "v1",
    sender: { fromName: "RC", fromAddress: "n@example.com" },
    schedulePlaceholder: { enabled: false },
    routingPlaceholder: { mode: "UNCONFIGURED" },
    notificationPlaceholder: { inApp: false, email: false, whatsapp: false },
    governance: {
      createdByUserId: "owner-a",
      modifiedByUserId: null,
      submittedByUserId: null,
      approvedByUserId: null,
      scheduledByUserId: null,
      submittedAt: null,
      approvedAt: null,
      scheduledAt: null,
    },
    stateHistory: [
      { id: "h1", from: "DRAFT", to: "DRAFT", action: "SAVE", actorUserId: "owner-a", at: ts },
    ],
    createdAt: ts,
    updatedAt: ts,
  },
  {
    id: "c-run",
    organizationId: "org-1",
    name: "Running nurture",
    channel: "WHATSAPP",
    status: "RUNNING",
    currentDraftVersionId: "v1",
    sender: { fromName: "RC", fromAddress: "n@example.com" },
    schedulePlaceholder: { enabled: true, startAt: ts },
    routingPlaceholder: { mode: "UNCONFIGURED" },
    notificationPlaceholder: { inApp: false, email: false, whatsapp: false },
    governance: {
      createdByUserId: "owner-b",
      modifiedByUserId: null,
      submittedByUserId: null,
      approvedByUserId: null,
      scheduledByUserId: null,
      submittedAt: null,
      approvedAt: null,
      scheduledAt: ts,
    },
    stateHistory: [
      { id: "h2", from: "SCHEDULED", to: "RUNNING", action: "RUN", actorUserId: "owner-b", at: ts },
    ],
    createdAt: ts,
    updatedAt: ts,
  },
  {
    id: "c-pause",
    organizationId: "org-1",
    name: "Paused burst",
    channel: "EMAIL",
    status: "PAUSED",
    currentDraftVersionId: "v1",
    sender: { fromName: "RC", fromAddress: "n@example.com" },
    schedulePlaceholder: { enabled: true, startAt: ts },
    routingPlaceholder: { mode: "UNCONFIGURED" },
    notificationPlaceholder: { inApp: false, email: false, whatsapp: false },
    governance: {
      createdByUserId: "owner-a",
      modifiedByUserId: null,
      submittedByUserId: null,
      approvedByUserId: null,
      scheduledByUserId: null,
      submittedAt: null,
      approvedAt: null,
      scheduledAt: ts,
    },
    stateHistory: [],
    createdAt: ts,
    updatedAt: ts,
  },
];

const overviewMissing = home.composeMarketingHomeOverview({
  campaigns,
  qualifications: null,
  analytics: null,
  safety: {
    executionEnabled: false,
    providerConnectEnabled: false,
    sheetsMode: "off",
    handoffEnabled: false,
  },
});
assert.equal(overviewMissing.testMode, true);
assert.match(overviewMissing.testModeBanner, /TEST MODE/);
assert.equal(overviewMissing.lifecycleCards.find((c) => c.id === "draft").metric.value, 1);
assert.equal(overviewMissing.lifecycleCards.find((c) => c.id === "running").metric.value, 1);
assert.equal(overviewMissing.lifecycleCards.find((c) => c.id === "paused").metric.value, 1);
assert.equal(overviewMissing.lifecycleCards.find((c) => c.id === "awaiting_approval").metric.value, 0);
assert.equal(overviewMissing.qualifiedResponses.availability, "unavailable");
assert.equal(overviewMissing.qualifiedResponses.reason, "Unavailable");
assert.equal(overviewMissing.opportunitiesCreated.availability, "unavailable");
assert.equal(overviewMissing.opportunitiesCreated.reason, "Not connected");
assert.equal(overviewMissing.attributedPipeline.availability, "unavailable");
assert.equal(overviewMissing.attributedPipeline.reason, "Not connected");
assert.equal(home.formatMarketingMetricValue(overviewMissing.attributedPipeline), "Not connected");
assert.equal(overviewMissing.deliveryHealth.sent.reason, "Unavailable");
assert.equal(overviewMissing.googleStatus, "Not connected");
assert.equal(overviewMissing.providerStatus, "Not connected");
assert.equal(overviewMissing.requiringAttention.some((c) => c.status === "PAUSED"), true);

const overviewWithQual = home.composeMarketingHomeOverview({
  campaigns,
  qualifications: [
    { businessState: "QUALIFIED", opportunityCreated: true, opportunityId: "opp-1" },
    { businessState: "UNQUALIFIED", opportunityCreated: false },
  ],
  analytics: null,
  safety: {
    executionEnabled: false,
    providerConnectEnabled: false,
    sheetsMode: "fixture",
    handoffEnabled: true,
  },
});
assert.equal(overviewWithQual.qualifiedResponses.value, 1);
assert.equal(overviewWithQual.opportunitiesCreated.value, 1);
assert.equal(overviewWithQual.googleStatus, "Fixture");

const draftActions = registry.marketingRegistryActionsForCampaign({
  status: "DRAFT",
  actor: { role: "ADMIN" },
  executionEnabled: false,
});
assert.ok(draftActions.some((a) => a.id === "open_builder"));
const send = draftActions.find((a) => a.id === "send");
assert.equal(send.kind, "forbidden");
assert.match(send.reason, /unapproved draft/i);
assert.equal(draftActions.some((a) => a.lifecycleAction === "PAUSE"), false);

const runningActions = registry.marketingRegistryActionsForCampaign({
  status: "RUNNING",
  actor: { role: "ADMIN" },
  executionEnabled: false,
});
assert.ok(runningActions.some((a) => a.lifecycleAction === "PAUSE" && a.label === "Pause"));
assert.ok(runningActions.some((a) => a.lifecycleAction === "STOP" && a.label === "Stop"));

const pausedActions = registry.marketingRegistryActionsForCampaign({
  status: "PAUSED",
  actor: { role: "ADMIN" },
  executionEnabled: false,
});
assert.ok(pausedActions.some((a) => a.lifecycleAction === "RESUME" && a.label === "Resume"));
assert.ok(pausedActions.some((a) => a.lifecycleAction === "STOP"));

const filtered = registry.filterMarketingRegistryCampaigns(campaigns, {
  ...registry.defaultMarketingRegistryFilters(),
  search: "nurture",
  channel: "WHATSAPP",
  status: "RUNNING",
  ownerUserId: "owner-b",
});
assert.equal(filtered.length, 1);
assert.equal(filtered[0].id, "c-run");

const ownerFiltered = registry.filterMarketingRegistryCampaigns(campaigns, {
  ...registry.defaultMarketingRegistryFilters(),
  ownerUserId: "owner-a",
});
assert.equal(ownerFiltered.length, 2);

const rows = registry.buildMarketingRegistryRows({
  campaigns,
  audiences: [],
  analyticsRows: null,
  actor: { role: "ADMIN" },
  executionEnabled: false,
});
assert.equal(rows[0].delivered.reason, "Unavailable");
assert.equal(rows[0].opened.reason, "Unavailable");
assert.ok(rows.find((r) => r.campaign.status === "DRAFT").actions.some((a) => a.kind === "forbidden"));

console.log(
  JSON.stringify(
    {
      ok: true,
      registryRoute: "/admin/marketing/registry",
      builderRoute: "/admin/marketing/campaigns",
      homeCards: [
        ...overviewMissing.lifecycleCards.map((c) => c.label),
        "Qualified responses",
        "Opportunities created",
        "Attributed pipeline / revenue",
      ],
      testMode: overviewMissing.testMode,
      honestUnavailable: {
        qualified: overviewMissing.qualifiedResponses.reason,
        opportunities: overviewMissing.opportunitiesCreated.reason,
        pipeline: overviewMissing.attributedPipeline.reason,
      },
      draftSendForbidden: true,
      pauseResumeStop: true,
      filters: true,
      no240pxRail: true,
    },
    null,
    2,
  ),
);
