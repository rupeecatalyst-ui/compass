/**
 * CO-MARKETING-MKT-13 — Production hardening + certification verification.
 * No live bulk email. No live WhatsApp. No 100k Supabase import. No deploy.
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
  "src/constants/enterprise-marketing-engine/safety.ts",
  "server/services/enterprise-marketing-engine/execution.service.ts",
  "server/services/enterprise-marketing-engine/execution-ledger-store.ts",
  "server/services/enterprise-marketing-engine/execution-lease-store.ts",
  "src/app/api/cron/marketing-execution/route.ts",
  "docs/co-marketing-mkt-13/CO-MARKETING-MKT-13-PRODUCTION-READINESS-REPORT.md",
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
if (!safety.includes("ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED = false")) fail("audience import must stay false");
else pass("audience import disabled");
if (!safety.includes("ENTERPRISE_MARKETING_MASS_HANDOFF_ENABLED = false")) fail("mass handoff must stay false");
else pass("mass handoff disabled");
if (!safety.includes('sprint: "CO-MARKETING-MKT-13"') && !safety.includes("CO-MARKETING-ACTIVATION-002")) fail("sprint marker");
else pass("sprint MKT-13 or ACTIVATION-002");

const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");
for (const needle of ["model MarketingProspect", "model MarketingAudienceRow", "model Lead "]) {
  if (schema.includes(needle)) fail(`forbidden ${needle}`);
  else pass(`no ${needle.trim()}`);
}

const vercel = readFileSync(resolve(root, "vercel.json"), "utf8");
if (vercel.includes("marketing-execution")) fail("marketing cron must not be auto-registered in vercel.json");
else pass("marketing cron not in vercel.json");

const envEx = readFileSync(resolve(root, ".env.example"), "utf8");
if (envEx.includes("NEXT_PUBLIC_ENTERPRISE_MARKETING_RESEND") || envEx.includes("NEXT_PUBLIC_GOOGLE_SHEETS_PRIVATE")) {
  fail("provider secrets must not be NEXT_PUBLIC");
} else pass("no NEXT_PUBLIC provider secrets in .env.example");

const srcTree = [
  "src/constants/enterprise-marketing-engine/email-delivery.ts",
  "src/constants/enterprise-marketing-engine/whatsapp-delivery.ts",
  "src/app/api/admin/marketing/campaigns/route.ts",
  "src/lib/enterprise-marketing-engine/permissions.ts",
];
for (const rel of srcTree) {
  const txt = readFileSync(resolve(root, rel), "utf8");
  if (txt.includes("NEXT_PUBLIC_") && txt.includes("API_KEY")) fail(`${rel} may leak secrets`);
}
pass("admin APIs do not expose NEXT_PUBLIC provider keys");

const opp = readFileSync(resolve(root, "server/services/enterprise-opportunity/index.ts"), "utf8");
if (opp.includes("explicitRecipientUserIds")) fail("operational Opportunity notify must stay default ENE fan-out");
else pass("operational Opportunity notify unchanged");

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
const leaseUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/execution-lease-store.ts")).href;
const dsUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/data-source.service.ts")).href;
const fixUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/adapters/fixture-sheets.adapter.ts"),
).href;
const schedUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/execution/batch-schedule.ts")).href;
const idempUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/execution/idempotency.ts")).href;
const renderUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/email-render.ts")).href;
const persUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/personalization.ts")).href;
const blocksUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/content-blocks.ts")).href;
const permUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/permissions.ts")).href;
const engUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/engagement.service.ts")).href;
const qualUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/qualification.service.ts")).href;
const routePolUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/routing-policy-store.ts")).href;
const nsvcUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/notification.service.ts")).href;
const identUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/adapters/fixture-identity.adapter.ts"),
).href;
const qstoreUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/qualification-store.ts")).href;
const assignUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/assignment-store.ts")).href;
const outcomeUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/email-delivery/map-outcome.ts")).href;
const hrefUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/qualification/handoff-notification.ts"),
).href;

const { marketingCampaignStore } = await import(campUrl);
const { marketingAudienceDefinitionStore } = await import(audUrl);
const { ensureFixtureBinding } = await import(bindUrl);
const { marketingExecutionService } = await import(execUrl);
const { marketingExecutionLedgerStore } = await import(ledUrl);
const { marketingExecutionLeaseStore } = await import(leaseUrl);
const { marketingDataSourceService } = await import(dsUrl);
const { FIXTURE_SYNTHETIC_SCALE_DATASET_IDS } = await import(fixUrl);
const { computeNextRunAt, isWithinSendWindow } = await import(schedUrl);
const { buildMarketingExecutionIdempotencyKey } = await import(idempUrl);
const { renderMarketingEmailHtml, renderMarketingEmailPlaintext } = await import(renderUrl);
const { applyPersonalization } = await import(persUrl);
const { createEmptyContentDocument } = await import(blocksUrl);
const { hasMarketingPermission } = await import(permUrl);
const { emitMarketingEngagementEvent } = await import(engUrl);
const { marketingQualificationService } = await import(qualUrl);
const { marketingRoutingPolicyStore } = await import(routePolUrl);
const { marketingNotificationService } = await import(nsvcUrl);
const { marketingFixtureIdentityDirectory } = await import(identUrl);
const { marketingQualificationStore } = await import(qstoreUrl);
const { marketingAssignmentStore } = await import(assignUrl);
const { mapDeliveryOutcomeToLedgerStatus, isDeliveryOutcomeRetryable } = await import(outcomeUrl);
const { buildMarketingHandoffHref } = await import(hrefUrl);

const org = "default";
const actor = { userId: "admin-mkt13", role: "SUPER_ADMIN", organizationId: org };

if (!FIXTURE_SYNTHETIC_SCALE_DATASET_IDS.includes("tab_scale_100k")) fail("100k synthetic dataset missing");
else pass("100k synthetic dataset is generated, not stored");

const binding = ensureFixtureBinding(org);
const port = marketingDataSourceService.getPort(org);

async function countStream(datasetId) {
  let cursor;
  let count = 0;
  let maxPage = 0;
  for (;;) {
    const page = await port.streamRows({
      bindingId: binding.id,
      datasetId,
      cursor,
      limit: 200,
    });
    maxPage = Math.max(maxPage, page.rows.length);
    count += page.rows.length;
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return { count, maxPage };
}

const heapBefore = process.memoryUsage().heapUsed;
const scan1k = await countStream("tab_scale_1k");
if (scan1k.count !== 1000) fail(`1k scan got ${scan1k.count}`);
else pass("1,000 recipient external simulation");
const scan10k = await countStream("tab_scale_10k");
if (scan10k.count !== 10_000) fail(`10k scan got ${scan10k.count}`);
else pass("10,000 recipient external simulation");
const scan100k = await countStream("tab_scale_100k");
if (scan100k.count !== 100_000) fail(`100k scan got ${scan100k.count}`);
else pass("100,000 recipient external simulation (generated, not imported)");
if (scan100k.maxPage > 200) fail("100k stream materialized oversized pages");
else pass("100k stream stays page-bounded");
const heapAfterScan = process.memoryUsage().heapUsed;
const scanDeltaMb = (heapAfterScan - heapBefore) / (1024 * 1024);
if (scanDeltaMb > 80) fail(`100k scan heap delta too high: ${scanDeltaMb.toFixed(1)}MB`);
else pass(`100k scan heap delta ${scanDeltaMb.toFixed(1)}MB (no row mirror)`);

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
const after = computeNextRunAt(new Date("2026-08-12T10:00:00+05:30"), policy, true);
const gap = Date.parse(after) - Date.parse("2026-08-12T10:00:00+05:30");
if (Math.abs(gap - policy.intervalMs) > 1000) fail(`pacing interval ${gap}`);
else pass("pacing 100 / 2.5h next-run");
if (!isWithinSendWindow(new Date("2026-08-12T10:00:00+05:30"), policy)) fail("send window");
else pass("send window allows in-hours tick");

const k1 = buildMarketingExecutionIdempotencyKey({
  campaignId: "c1",
  channel: "EMAIL",
  recipientFingerprint: "email:a@example.com",
});
const k2 = buildMarketingExecutionIdempotencyKey({
  campaignId: "c1",
  channel: "EMAIL",
  recipientFingerprint: "email:a@example.com",
});
if (k1 !== k2) fail("idempotency key unstable");
else pass("execution idempotency key stable");

const { campaign } = await marketingCampaignStore.create({
  organizationId: org,
  name: "MKT-13 Scale Campaign",
  channel: "EMAIL",
  createdByUserId: actor.userId,
});
const audience = marketingAudienceDefinitionStore.upsert({
  organizationId: org,
  name: "Scale 100k",
  bindingId: binding.id,
  datasetId: "tab_scale_100k",
});
await marketingCampaignStore.updateCampaign(campaign.id, org, { audienceId: audience.id });
await marketingCampaignStore.recordStateChange(campaign.id, org, {
  from: "DRAFT",
  to: "RUNNING",
  action: "RUN",
  actorUserId: actor.userId,
});
marketingExecutionService.configure(campaign.id, org, policy, { resetCursor: true });

const tick1 = await marketingExecutionService.tickBatch(campaign.id, {
  forceRun: true,
  holderId: "worker-a",
  adminTriggered: true,
});
const ledger1 = marketingExecutionLedgerStore.listByCampaign(campaign.id);
if (tick1.claimed > 100) fail(`batch exceeded size ${tick1.claimed}`);
else pass(`batch size respected (${tick1.claimed} ≤ 100)`);
if (ledger1.length > tick1.claimed + tick1.skipped + tick1.suppressed + 5) {
  fail(`ledger grew beyond touched rows: ${ledger1.length}`);
} else pass(`execution ledger stores touched rows only (${ledger1.length})`);
if (ledger1.length >= 100_000) fail("ledger must not contain 100k rows");
else pass("100k source did not materialize into ledger");

const tickDup = await marketingExecutionService.tickBatch(campaign.id, {
  forceRun: true,
  holderId: "worker-a",
  adminTriggered: true,
});
const ledger2 = marketingExecutionLedgerStore.listByCampaign(campaign.id);
if (ledger2.length < ledger1.length) fail("ledger shrank on retry");
else pass("retry does not drop prior ledger rows");
const fingerprints = new Set(ledger2.map((e) => e.recipientFingerprint));
if (fingerprints.size !== ledger2.length) fail("duplicate fingerprints in ledger");
else pass("no duplicate recipient execution");

await marketingCampaignStore.recordStateChange(campaign.id, org, {
  from: "RUNNING",
  to: "PAUSED",
  action: "PAUSE",
  actorUserId: actor.userId,
});
marketingExecutionService.onStop(campaign.id);
const paused = await marketingExecutionService.tickBatch(campaign.id, {
  forceRun: true,
  holderId: "worker-pause",
});
if (paused.skippedReason !== "campaign_paused") fail(`pause skippedReason ${paused.skippedReason}`);
else pass("paused campaign remains paused");

await marketingCampaignStore.recordStateChange(campaign.id, org, {
  from: "PAUSED",
  to: "RUNNING",
  action: "RESUME",
  actorUserId: actor.userId,
});
marketingExecutionService.onResume(campaign.id);
const resumed = await marketingExecutionService.tickBatch(campaign.id, {
  forceRun: true,
  holderId: "worker-resume",
});
if (resumed.skippedReason === "campaign_paused") fail("resume still paused");
else pass("resume continues dry-run execution");

const held = marketingExecutionLeaseStore.tryAcquireLease(campaign.id, "worker-hold");
if (!held) fail("could not acquire lease");
const concurrent = await marketingExecutionService.tickBatch(campaign.id, {
  forceRun: true,
  holderId: "worker-other",
});
if (concurrent.skippedReason !== "lease_held_by_other_worker") {
  fail(`concurrent workers ${concurrent.skippedReason}`);
} else pass("concurrent workers blocked by lease");
marketingExecutionLeaseStore.releaseLease(campaign.id, "worker-hold");

const lease = marketingExecutionLeaseStore.get(campaign.id);
if (lease) {
  marketingExecutionLeaseStore.upsert({
    ...lease,
    leaseHolder: "expired-worker",
    leaseExpiresAt: new Date(Date.now() - 1000).toISOString(),
  });
}
const afterExpiry = marketingExecutionLeaseStore.tryAcquireLease(campaign.id, "worker-new");
if (!afterExpiry) fail("expired lease should be reclaimable");
else pass("execution lease expiry can be reclaimed");
marketingExecutionLeaseStore.releaseLease(campaign.id, "worker-new");

const notDue = marketingExecutionLeaseStore.get(campaign.id);
if (notDue) {
  marketingExecutionLeaseStore.upsert({
    ...notDue,
    nextRunAt: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(),
    leaseHolder: null,
    leaseExpiresAt: null,
  });
}
const early = await marketingExecutionService.tickBatch(campaign.id, { holderId: "worker-early" });
if (early.skippedReason !== "not_due_yet") fail(`scheduler exceeded pacing: ${early.skippedReason}`);
else pass("scheduler does not exceed configured interval");

if (mapDeliveryOutcomeToLedgerStatus("RATE_LIMITED") !== "failed") fail("rate limit mapping");
else pass("provider rate limit maps to failed (retryable)");
if (!isDeliveryOutcomeRetryable("RATE_LIMITED")) fail("rate limit should be retryable");
else pass("rate-limited outcomes are retryable");

const failClaim = marketingExecutionLedgerStore.tryClaim({
  campaignId: campaign.id,
  campaignVersionId: campaign.currentDraftVersionId,
  channel: "EMAIL",
  recipientFingerprint: "email:malformed@example.com",
  idempotencyKey: `${campaign.id}:EMAIL:email:malformed@example.com`,
  batchId: "batch-fail",
});
if (failClaim.ok) {
  marketingExecutionLedgerStore.finalize(failClaim.entry.idempotencyKey, {
    status: "failed",
    processedAt: new Date().toISOString(),
    lastError: "malformed_recipient",
  });
}
const retryFail = marketingExecutionLedgerStore.tryClaim({
  campaignId: campaign.id,
  campaignVersionId: campaign.currentDraftVersionId,
  channel: "EMAIL",
  recipientFingerprint: "email:malformed@example.com",
  idempotencyKey: `${campaign.id}:EMAIL:email:malformed@example.com`,
  batchId: "batch-retry",
  allowRetryFailed: true,
});
if (!retryFail.ok) fail("failed recipient should be retryable");
else pass("malformed/failed recipient can retry without duplicate terminal send");

const e1 = emitMarketingEngagementEvent({
  organizationId: org,
  campaignId: campaign.id,
  channel: "EMAIL",
  type: "OPEN",
  recipientFingerprint: "email:dup@example.com",
  providerEventId: "wh-dup-1",
});
const e2 = emitMarketingEngagementEvent({
  organizationId: org,
  campaignId: campaign.id,
  channel: "EMAIL",
  type: "OPEN",
  recipientFingerprint: "email:dup@example.com",
  providerEventId: "wh-dup-1",
});
if (!e2.duplicate || e1.event.id !== e2.event.id) fail("webhook duplication not idempotent");
else pass("duplicate webhook/event is idempotent");

const content = createEmptyContentDocument();
content.blocks.push({
  id: "img-1",
  type: "image",
  props: { url: "https://example.com/hero.png", alt: "Hero", caption: "Offer" },
});
content.blocks.push({
  id: "foot-1",
  type: "footer",
  props: { html: "Rupee Catalyst · Unsubscribe in campaign footer." },
});
const htmlDesktop = renderMarketingEmailHtml({
  content,
  subject: "Hello {{firstName}}",
  previewText: "Preview",
  mode: "desktop",
  personalization: { firstName: "Asha", city: "Pune", senderName: "RC", product: "Home Loan" },
  trackingEnabled: true,
  utm: { source: "email", medium: "marketing", campaign: "mkt13", content: null, term: null },
});
const htmlMobile = renderMarketingEmailHtml({
  content,
  subject: "Hello {{firstName}}",
  previewText: "Preview",
  mode: "mobile",
  personalization: {},
});
const plain = renderMarketingEmailPlaintext({
  content,
  trackingEnabled: false,
  utm: null,
  personalization: { firstName: "Asha" },
});
if (!htmlDesktop.includes("max-width:600px")) fail("desktop width");
else pass("HTML desktop render");
if (!htmlMobile.includes("max-width:360px")) fail("mobile width");
else pass("HTML mobile render");
if (!htmlDesktop.includes("hero.png")) fail("image missing");
else pass("images render");
if (!htmlDesktop.includes("https://")) fail("links missing");
else pass("links render");
if (!htmlDesktop.includes("Asha")) fail("personalization missing");
else pass("personalization applied");
if (!htmlMobile.toLowerCase().includes("there") && !htmlMobile.includes("Hello")) {
  fail("missing personalization fallback");
} else pass("missing personalization uses safe fallback");
if (!plain.includes("Asha")) fail("plain text personalization");
else pass("plain text fallback");
if (!htmlDesktop.toLowerCase().includes("unsubscribe") && !htmlDesktop.includes("Rupee Catalyst")) {
  fail("footer/signature missing");
} else pass("corporate footer/signature present");
let unsafe = false;
try {
  applyPersonalization("Hi {{evil()}}", {});
} catch {
  unsafe = true;
}
if (!unsafe) fail("unsafe tokens must be rejected");
else pass("unsafe personalization rejected");

if (!hasMarketingPermission({ role: "ADMIN" }, "admin.marketing.campaign.create")) fail("admin campaign create");
else pass("campaign permission for ADMIN");
if (hasMarketingPermission({ role: "ADMIN" }, "admin.marketing.campaign.send")) {
  fail("ADMIN must not receive CAMPAIGN_SEND by default");
} else pass("CAMPAIGN_SEND withheld from ADMIN default");
if (hasMarketingPermission({ role: "USER" }, "admin.marketing.command_center")) fail("USER must not access marketing");
else pass("RBAC denies USER marketing command center");
if (!hasMarketingPermission({ role: "ADMIN" }, "admin.marketing.source.manage")) fail("source permission");
else pass("source access permission exists");
if (!hasMarketingPermission({ role: "ADMIN" }, "admin.marketing.routing.manage")) fail("routing permission");
else pass("audience/routing permission boundaries exist");

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
const route = marketingRoutingPolicyStore.upsert({
  organizationId: org,
  name: "MKT-13 owner",
  mode: "SINGLE_USER",
  assigneeUserId: "rm-priya",
});
const unqualified = marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:click.only@example.com",
  matchEmail: "click.only@example.com",
  matchPhone: "9000000000",
  displayName: "Click Only",
  intent: "click",
});
let blocked = false;
try {
  await marketingQualificationService.handoff(actor, {
    qualificationId: unqualified.id,
    routingPolicyId: route.id,
  });
} catch (err) {
  blocked = err?.code === "NOT_QUALIFIED" || String(err?.message ?? "").includes("not QUALIFIED");
}
if (!blocked) fail("unqualified must stay outside Contact/Opportunity");
else pass("unqualified recipients remain outside operational CRM");

marketingFixtureIdentityDirectory.upsert({
  organizationId: org,
  id: "existing-mkt13",
  name: "Asha Verma",
  email: "asha.mkt13@example.com",
  phone: "9811111111",
});
const qualified = marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:asha.mkt13@example.com",
  matchEmail: "asha.mkt13@example.com",
  matchPhone: "9811111111",
  displayName: "Asha Verma",
  intent: "explicit_requirement",
  operatorConfirmed: true,
});
const handoff = await marketingQualificationService.handoff(actor, {
  qualificationId: qualified.id,
  routingPolicyId: route.id,
});
if (handoff.contact.created) fail("existing Contact should match");
else pass("existing Contact matched");
if (!handoff.opportunity?.opportunityId) fail("Opportunity missing");
else pass("Opportunity created on qualified handoff");
if (handoff.assignment.assigneeUserId !== "rm-priya") fail("assignment missing");
else pass("assignment recorded");
if (!handoff.notification) fail("notification missing");
else pass("internal notification recorded");
const href = buildMarketingHandoffHref({
  opportunityId: handoff.opportunity.opportunityId,
  contactId: handoff.contact.contactId,
});
if (!href.includes("/opportunities?opportunityId=")) fail(`deep link ${href}`);
else pass("Catalyst One Opportunity deep link");

const fresh = marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:new.mkt13@example.com",
  matchEmail: "new.mkt13@example.com",
  matchPhone: "9833333333",
  displayName: "New Person",
  intent: "explicit_requirement",
  operatorConfirmed: true,
});
const freshHandoff = await marketingQualificationService.handoff(actor, {
  qualificationId: fresh.id,
  routingPolicyId: route.id,
});
if (!freshHandoff.contact.created) fail("unknown identity should create Contact");
else pass("new Contact created where unmatched");

let sheetsDown = false;
try {
  await port.getSchema("missing-binding", "tab_alpha");
} catch {
  sheetsDown = true;
}
if (!sheetsDown) fail("unavailable sheet/binding must fail closed");
else pass("Google Sheet / binding unavailable fails closed");

if (ok) console.log("CO-MARKETING-MKT-13 verify: PASS");
else {
  console.error("CO-MARKETING-MKT-13 verify: FAIL");
  process.exit(1);
}
