/**
 * CO-MARKETING-MKT-10 — Campaign analytics + engagement intelligence verification.
 * No live providers. No audience mirror. No deploy.
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

process.env.ENTERPRISE_MARKETING_SHEETS_MODE = "fixture";
process.env.ENTERPRISE_MARKETING_HANDOFF_MODE = "fixture";
process.env.ENTERPRISE_MARKETING_EMAIL_MODE = "dry_run";
process.env.ENTERPRISE_MARKETING_WHATSAPP_MODE = "dry_run";

const required = [
  "src/types/enterprise-marketing-analytics.ts",
  "src/lib/enterprise-marketing-engine/analytics/derive-campaign-analytics.ts",
  "src/lib/enterprise-marketing-engine/analytics/time-range.ts",
  "server/services/enterprise-marketing-engine/analytics.service.ts",
  "server/services/enterprise-marketing-engine/engagement.service.ts",
  "server/services/enterprise-marketing-engine/engagement-event-store.ts",
  "src/app/api/admin/marketing/analytics/route.ts",
  "src/components/catalyst-one/admin/marketing/marketing-analytics-panel.tsx",
  "src/components/catalyst-one/admin/marketing/marketing-engagement-panel.tsx",
  "docs/co-marketing-mkt-10/CO-MARKETING-MKT-10-IMPLEMENTATION-REPORT.md",
];
for (const rel of required) {
  if (!existsSync(resolve(root, rel))) fail(`missing ${rel}`);
  else pass(rel);
}

const safety = readFileSync(resolve(root, "src/constants/enterprise-marketing-engine/safety.ts"), "utf8");
if (!safety.includes("ENTERPRISE_MARKETING_EXECUTION_ENABLED = false")) fail("live execution must stay false");
else pass("live execution disabled");
if (!safety.includes("ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false")) fail("provider connect must stay false");
else pass("provider connect disabled");

const analyticsPage = readFileSync(
  resolve(root, "src/app/(dashboard)/admin/marketing/analytics/page.tsx"),
  "utf8",
);
if (analyticsPage.includes("MarketingPlaceholderPanel")) fail("analytics page still placeholder");
else pass("analytics page uses functional panel");
const engagementPage = readFileSync(
  resolve(root, "src/app/(dashboard)/admin/marketing/engagement/page.tsx"),
  "utf8",
);
if (engagementPage.includes("MarketingPlaceholderPanel")) fail("engagement page still placeholder");
else pass("engagement page uses functional panel");

const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");
for (const needle of ["model MarketingAudienceRow", "model MarketingProspect", "model Lead "]) {
  if (schema.includes(needle)) fail(`forbidden ${needle}`);
  else pass(`no ${needle.trim()}`);
}

try {
  require("tsx/cjs");
} catch {
  console.log("SKIP runtime (tsx)");
  process.exit(ok ? 0 : 1);
}

const campUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/campaign-store.ts")).href;
const audUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/audience-definition-store.ts")).href;
const bindUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/binding-store.ts")).href;
const execUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/execution.service.ts")).href;
const ledUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/execution-ledger-store.ts")).href;
const engUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/engagement.service.ts")).href;
const engStoreUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/engagement-event-store.ts")).href;
const analyticsUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/analytics.service.ts")).href;
const deriveUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/analytics/derive-campaign-analytics.ts"),
).href;
const timeUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/analytics/time-range.ts")).href;
const permUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/permissions.ts")).href;
const fixUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/adapters/fixture-sheets.adapter.ts"),
).href;
const dsUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/data-source.service.ts")).href;
const suppressUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/suppression-store.ts")).href;
const qualUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/qualification.service.ts")).href;
const qstoreUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/qualification-store.ts")).href;
const routePolUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/routing-policy-store.ts")).href;
const assignUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/assignment-store.ts")).href;
const identUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/adapters/fixture-identity.adapter.ts"),
).href;
const nsvcUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/notification.service.ts")).href;

const { marketingCampaignStore } = await import(campUrl);
const { marketingAudienceDefinitionStore } = await import(audUrl);
const { ensureFixtureBinding } = await import(bindUrl);
const { marketingExecutionService } = await import(execUrl);
const { marketingExecutionLedgerStore } = await import(ledUrl);
const { emitMarketingEngagementEvent } = await import(engUrl);
const { marketingEngagementEventStore } = await import(engStoreUrl);
const { marketingAnalyticsService } = await import(analyticsUrl);
const { assertAnalyticsDoesNotInventUnsupportedZeros } = await import(deriveUrl);
const { resolveMarketingAnalyticsTimeRange } = await import(timeUrl);
const { hasMarketingPermission } = await import(permUrl);
const { FIXTURE_SYNTHETIC_SCALE_DATASET_IDS } = await import(fixUrl);
const { marketingDataSourceService } = await import(dsUrl);
const { marketingSuppressionStore } = await import(suppressUrl);
const { marketingQualificationService } = await import(qualUrl);
const { marketingQualificationStore } = await import(qstoreUrl);
const { marketingRoutingPolicyStore } = await import(routePolUrl);
const { marketingAssignmentStore } = await import(assignUrl);
const { marketingFixtureIdentityDirectory } = await import(identUrl);
const { marketingNotificationService } = await import(nsvcUrl);

const org = "default";
const actor = { userId: "admin-mkt10", role: "SUPER_ADMIN", organizationId: org };
const admin = { userId: "admin-mkt10", role: "ADMIN", organizationId: org };
const user = { userId: "user-mkt10", role: "USER", organizationId: org };

if (!FIXTURE_SYNTHETIC_SCALE_DATASET_IDS.includes("tab_scale_1k")) fail("1k synthetic missing");
else pass("synthetic scale datasets present");

const binding = ensureFixtureBinding(org);
marketingEngagementEventStore.resetOrganization(org);
marketingQualificationStore.resetOrganization(org);
marketingRoutingPolicyStore.resetOrganization(org);
marketingAssignmentStore.resetAll();
marketingFixtureIdentityDirectory.resetOrganization(org);
marketingNotificationService.resetTestState();
marketingNotificationService.configurePort({
  async notifyAssignee(request) {
    return {
      notificationId: `ene-${request.qualificationId}`,
      duplicate: false,
      channelResults: [{ channel: "in_app", status: "SENT" }],
    };
  },
});

const rangeDefault = resolveMarketingAnalyticsTimeRange({});
if (rangeDefault.preset !== "last_7_days") fail(`default preset ${rangeDefault.preset}`);
else pass("default time filter last_7_days");

const { campaign } = await marketingCampaignStore.create({
  organizationId: org,
  name: "MKT-10 Analytics Campaign",
  channel: "EMAIL",
  createdByUserId: actor.userId,
});
const audience = marketingAudienceDefinitionStore.upsert({
  organizationId: org,
  name: "Scale 1k Analytics",
  bindingId: binding.id,
  datasetId: "tab_scale_1k",
});
await marketingCampaignStore.updateCampaign(campaign.id, org, { audienceId: audience.id });
await marketingCampaignStore.recordStateChange(campaign.id, org, {
  from: "DRAFT",
  to: "RUNNING",
  action: "RUN",
  actorUserId: actor.userId,
});

const policy = {
  batchSize: 100,
  intervalMs: 2.5 * 60 * 60 * 1000,
  dailyMax: 500,
  sendWindowStart: "00:00",
  sendWindowEnd: "23:59",
  timezone: "Asia/Kolkata",
  startAt: null,
  endAt: null,
};
marketingExecutionService.configure(campaign.id, org, policy, { resetCursor: true });
const tick = await marketingExecutionService.tickBatch(campaign.id, {
  forceRun: true,
  holderId: "worker-mkt10",
  adminTriggered: true,
});
if (tick.claimed < 1) fail(`expected dry-run claims, got ${tick.claimed}`);
else pass(`execution totals claimed=${tick.claimed}`);

const ledger = marketingExecutionLedgerStore.listByCampaign(campaign.id);
if (ledger.length < tick.claimed) fail("ledger missing touched rows");
else pass(`execution ledger rows=${ledger.length}`);

const firstFp = ledger[0]?.recipientFingerprint;
if (!firstFp) fail("missing fingerprint");
else {
  emitMarketingEngagementEvent({
    organizationId: org,
    campaignId: campaign.id,
    channel: "EMAIL",
    type: "SENT",
    recipientFingerprint: firstFp,
    idempotencyKey: ledger[0].idempotencyKey,
  });
  emitMarketingEngagementEvent({
    organizationId: org,
    campaignId: campaign.id,
    channel: "EMAIL",
    type: "FAILED",
    recipientFingerprint: "email:fail.mkt10@example.com",
    providerEventId: "fail-1",
  });
  emitMarketingEngagementEvent({
    organizationId: org,
    campaignId: campaign.id,
    channel: "EMAIL",
    type: "SUPPRESSED",
    recipientFingerprint: "email:suppress.mkt10@example.com",
    providerEventId: "sup-1",
  });
  emitMarketingEngagementEvent({
    organizationId: org,
    campaignId: campaign.id,
    channel: "EMAIL",
    type: "UNSUBSCRIBED",
    recipientFingerprint: "email:unsub.mkt10@example.com",
    providerEventId: "unsub-1",
  });
  const e1 = emitMarketingEngagementEvent({
    organizationId: org,
    campaignId: campaign.id,
    channel: "EMAIL",
    type: "OPENED",
    recipientFingerprint: firstFp,
    providerEventId: "open-dup-1",
  });
  const e2 = emitMarketingEngagementEvent({
    organizationId: org,
    campaignId: campaign.id,
    channel: "EMAIL",
    type: "OPENED",
    recipientFingerprint: firstFp,
    providerEventId: "open-dup-1",
  });
  if (!e2.duplicate || e1.event.id !== e2.event.id) fail("event idempotency broken");
  else pass("event idempotency");
}

marketingSuppressionStore.upsert({
  organizationId: org,
  fingerprint: "email:unsub.ledger@example.com",
  reason: "UNSUBSCRIBE",
});

const route = marketingRoutingPolicyStore.upsert({
  organizationId: org,
  name: "MKT-10 owner",
  mode: "SINGLE_USER",
  assigneeUserId: "rm-analytics",
});
const qualified = marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:qualify.mkt10@example.com",
  matchEmail: "qualify.mkt10@example.com",
  matchPhone: "9822222222",
  displayName: "Qualify Person",
  intent: "explicit_requirement",
  operatorConfirmed: true,
});
const handoff = await marketingQualificationService.handoff(actor, {
  qualificationId: qualified.id,
  routingPolicyId: route.id,
});
if (!handoff.opportunity?.opportunityId) fail("handoff opportunity missing");
else pass("qualification + handoff recorded");

const dash = await marketingAnalyticsService.getDashboard(actor, { preset: "last_30_days" });
if (dash.sprint !== "CO-MARKETING-MKT-10") fail("sprint marker");
else pass("dashboard sprint MKT-10");
if (dash.commandCenter.campaigns < 1) fail("campaign totals");
else pass("campaign totals");
if (dash.commandCenter.recipientsProcessed < 1) fail("execution/processed totals");
else pass("recipients processed");
if (dash.commandCenter.sent.availability !== "available" || (dash.commandCenter.sent.value ?? 0) < 1) {
  fail(`sent metrics ${JSON.stringify(dash.commandCenter.sent)}`);
} else pass("sent metrics");
if (dash.commandCenter.failed.availability !== "available") fail("failed metrics");
else pass("failure metrics");
if (dash.commandCenter.suppression.availability !== "available") fail("suppression metrics");
else pass("suppression");
if (dash.commandCenter.unsubscribed.availability !== "available") fail("unsubscribe metrics");
else pass("unsubscribe");
if (
  dash.commandCenter.qualifiedResponses.availability !== "available" ||
  (dash.commandCenter.qualifiedResponses.value ?? 0) < 1
) {
  fail("qualification metrics");
} else pass("qualification");
if (
  dash.commandCenter.handoffOpportunities.availability !== "available" ||
  (dash.commandCenter.handoffOpportunities.value ?? 0) < 1
) {
  fail("handoff metrics");
} else pass("handoff");

if (dash.commandCenter.delivered.availability !== "unavailable" || dash.commandCenter.delivered.value !== null) {
  fail(`delivered must be unavailable without inventing zero: ${JSON.stringify(dash.commandCenter.delivered)}`);
} else pass("unavailable delivered (no invented zero)");
if (dash.commandCenter.opened.availability === "unavailable" && dash.commandCenter.opened.value !== null) {
  fail("opened unavailable must not have numeric value");
} else if (dash.commandCenter.opened.availability === "ingested" || dash.commandCenter.opened.availability === "unavailable") {
  pass("opened not presented as invented available zero");
} else fail(`unexpected opened ${JSON.stringify(dash.commandCenter.opened)}`);

try {
  assertAnalyticsDoesNotInventUnsupportedZeros(dash);
  pass("no invented unsupported zeros");
} catch (err) {
  fail(err instanceof Error ? err.message : "invented zeros");
}

if (!dash.funnel?.length) fail("funnel missing");
else pass(`funnel stages=${dash.funnel.length}`);
if (!dash.sourceAnalysis.some((r) => r.dimension === "campaign")) fail("source analysis campaign");
else pass("source analysis");
if (!dash.channelAnalysis.some((r) => r.channel === "EMAIL")) fail("channel analysis");
else pass("channel analysis");

const today = await marketingAnalyticsService.getDashboard(actor, { preset: "today" });
const last30 = await marketingAnalyticsService.getDashboard(actor, { preset: "last_30_days" });
if (today.range.preset !== "today" || last30.range.preset !== "last_30_days") fail("time filter presets");
else pass("time filters");

const engagement = marketingAnalyticsService.listEngagement(actor, {
  preset: "last_30_days",
  page: 1,
  pageSize: 20,
});
if (engagement.total < 1) fail("engagement list empty");
else pass(`engagement pagination total=${engagement.total} pageSize=${engagement.rows.length}`);
if (engagement.rows.some((r) => /@/.test(r.fingerprintPreview) && !r.fingerprintPreview.includes("***"))) {
  fail("engagement exposed raw email");
} else pass("engagement fingerprints redacted");

const drill = marketingAnalyticsService.listExecutionDrilldown(actor, {
  campaignId: campaign.id,
  preset: "last_30_days",
  page: 1,
  pageSize: 20,
});
if (drill.total < 1) fail("execution drilldown empty");
else pass(`execution drilldown total=${drill.total}`);

if (hasMarketingPermission(user, "admin.marketing.analytics.view")) fail("USER must not view analytics");
else pass("permission boundary denies USER");
let denied = false;
try {
  await marketingAnalyticsService.getDashboard(user, { preset: "today" });
} catch (err) {
  denied = err?.code === "MARKETING_PERMISSION_DENIED" || String(err?.message ?? "").includes("permission");
}
if (!denied) fail("USER dashboard must fail closed");
else pass("permission boundary enforced on service");
if (!hasMarketingPermission(admin, "admin.marketing.analytics.view")) fail("ADMIN analytics view");
else pass("ADMIN may view analytics");

const port = marketingDataSourceService.getPort(org);
for (const [id, label, expected] of [
  ["tab_scale_1k", "1k", 1000],
  ["tab_scale_10k", "10k", 10_000],
  ["tab_scale_100k", "100k", 100_000],
]) {
  const estimate = await port.estimateAudience(binding.id, id);
  if (estimate.dataRowEstimate !== expected) fail(`${label} estimate ${estimate.dataRowEstimate}`);
  else pass(`synthetic ${label} estimate without row mirror`);
}

const aud100k = marketingAudienceDefinitionStore.upsert({
  organizationId: org,
  name: "Scale 100k Analytics Estimate",
  bindingId: binding.id,
  datasetId: "tab_scale_100k",
});
const { campaign: camp100k } = await marketingCampaignStore.create({
  organizationId: org,
  name: "MKT-10 100k Estimate Campaign",
  channel: "EMAIL",
  createdByUserId: actor.userId,
});
await marketingCampaignStore.updateCampaign(camp100k.id, org, { audienceId: aud100k.id });
const dash100k = await marketingAnalyticsService.getDashboard(actor, {
  preset: "last_30_days",
  campaignId: camp100k.id,
});
const row100k = dash100k.campaigns.find((c) => c.campaignId === camp100k.id);
if (row100k?.audienceEstimate !== 100_000) fail(`100k audienceEstimate ${row100k?.audienceEstimate}`);
else pass("100k streamed dataset analysed via estimate metadata (not mirrored)");
if (marketingExecutionLedgerStore.listByCampaign(camp100k.id).length !== 0) {
  fail("100k campaign must not auto-materialize ledger");
} else pass("100k campaign has no auto-imported ledger rows");

if (ok) console.log("CO-MARKETING-MKT-10 verify: PASS");
else {
  console.error("CO-MARKETING-MKT-10 verify: FAIL");
  process.exit(1);
}
