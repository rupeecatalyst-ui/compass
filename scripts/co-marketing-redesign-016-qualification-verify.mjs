/**
 * CO-MARKETING-REDESIGN-016 — Qualification Inbox and fixture Contact → Opportunity handoff.
 * Local fixtures only. No production Contact/Opportunity writes. No migrate, send, commit, or deploy.
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
const evaluateSrc = read("src/lib/enterprise-marketing-engine/qualification/evaluate.ts");
const inboxSrc = read("src/lib/enterprise-marketing-engine/qualification/inbox-boundary.ts");
const inboxComposeSrc = read("src/lib/enterprise-marketing-engine/qualification/inbox.ts");
const inboxUi = read("src/components/catalyst-one/admin/marketing/marketing-responses-panel.tsx");
const identitySrc = read(
  "server/services/enterprise-marketing-engine/adapters/fixture-identity.adapter.ts",
);
const opportunitySrc = read(
  "server/services/enterprise-marketing-engine/adapters/fixture-opportunity.adapter.ts",
);
const serviceSrc = read("server/services/enterprise-marketing-engine/qualification.service.ts");
const liveIdentity = read(
  "server/services/enterprise-marketing-engine/adapters/live-identity.adapter.ts",
);

mustInclude(pkg, "verify:co-marketing-redesign-016");
mustInclude(gates, "verify:co-marketing-redesign-016");
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
mustInclude(evaluateSrc, 'intent === "delivered"');
mustInclude(evaluateSrc, 'intent === "landing_page"');
mustInclude(inboxSrc, "openClickDoesNotCreateContact");
mustInclude(inboxSrc, "neverOverwriteWithBlanks");
mustInclude(inboxSrc, "noLeadEntity");
mustInclude(inboxComposeSrc, "composeMarketingQualificationInbox");
mustInclude(inboxComposeSrc, "MARKETING_GENUINE_RESPONSE_INTENTS");
mustInclude(inboxUi, "do not create a Contact or Opportunity");
mustInclude(inboxUi, "Qualification Inbox");
mustInclude(identitySrc, "fillMissingMarketingContactIdentity");
mustInclude(opportunitySrc, "snapshotRecipientId");
mustInclude(serviceSrc, "noLeadEntity: true");
mustInclude(liveIdentity, "createLiveIdentityResolutionPort");

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

const evaluateUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/qualification/evaluate.ts"),
).href;
const inboxBoundUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/qualification/inbox-boundary.ts"),
).href;
const fillUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/qualification/identity-fill.ts"),
).href;
const identUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/adapters/fixture-identity.adapter.ts"),
).href;
const oppUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/adapters/fixture-opportunity.adapter.ts"),
).href;
const campUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/campaign-store.ts"),
).href;
const qualUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/qualification.service.ts"),
).href;
const qstoreUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/qualification-store.ts"),
).href;
const routeUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/routing-policy-store.ts"),
).href;
const auditUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/audit.ts")).href;
const assignUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/assignment-store.ts"),
).href;

const { evaluateMarketingQualificationState, canHandoffMarketingQualification } = await import(evaluateUrl);
const {
  marketingOpenOrClickQualifies,
  canCreateContactFromQualificationState,
  canCreateOpportunityFromQualificationState,
  marketingIntentCreatesCrmRecords,
  marketingEngagementOnlyIntent,
} = await import(inboxBoundUrl);
const { fillMissingMarketingContactIdentity } = await import(fillUrl);
const { marketingFixtureIdentityDirectory, createFixtureIdentityResolutionPort } = await import(identUrl);
const { marketingFixtureOpportunityDirectory } = await import(oppUrl);
const { marketingCampaignStore } = await import(campUrl);
const { marketingQualificationService } = await import(qualUrl);
const { marketingQualificationStore } = await import(qstoreUrl);
const { marketingRoutingPolicyStore } = await import(routeUrl);
const { listRecentMarketingAuditEvents } = await import(auditUrl);
const { marketingAssignmentStore } = await import(assignUrl);

assert.equal(evaluateMarketingQualificationState({ intent: "open" }), "ENGAGED");
assert.equal(evaluateMarketingQualificationState({ intent: "click" }), "ENGAGED");
assert.equal(evaluateMarketingQualificationState({ intent: "delivered" }), "ENGAGED");
assert.equal(evaluateMarketingQualificationState({ intent: "landing_page" }), "ENGAGED");
assert.equal(marketingOpenOrClickQualifies("open"), false);
assert.equal(marketingOpenOrClickQualifies("click"), false);
assert.equal(canHandoffMarketingQualification("ENGAGED"), false);
assert.equal(canCreateContactFromQualificationState("ENGAGED"), false);
assert.equal(canCreateOpportunityFromQualificationState("ENGAGED"), false);
assert.equal(marketingIntentCreatesCrmRecords("open"), false);
assert.equal(marketingEngagementOnlyIntent("delivered"), true);
assert.equal(marketingEngagementOnlyIntent("callback_request"), false);

const replyState = evaluateMarketingQualificationState({
  intent: "reply",
  matchEmail: "a@example.com",
});
assert.notEqual(replyState, "QUALIFIED");

const callbackState = evaluateMarketingQualificationState({
  intent: "callback_request",
  matchEmail: "a@example.com",
});
assert.notEqual(callbackState, "QUALIFIED");

assert.equal(
  evaluateMarketingQualificationState({
    intent: "manual_qualification",
    matchEmail: "a@example.com",
    operatorConfirmed: true,
  }),
  "QUALIFIED",
);

const blankGuard = fillMissingMarketingContactIdentity(
  { name: "Ada Sharma", email: "ada@example.com", phone: "9811111111" },
  { name: "", email: "", phone: "9000000000" },
);
assert.equal(blankGuard.next.name, "Ada Sharma");
assert.equal(blankGuard.next.email, "ada@example.com");
assert.equal(blankGuard.next.phone, "9811111111");
assert.equal(blankGuard.overwroteExisting, false);
assert.deepEqual(blankGuard.filledFields, []);

const fillPhone = fillMissingMarketingContactIdentity(
  { name: "Ada Sharma", email: "ada@example.com", phone: null },
  { name: "", email: null, phone: "9000000000" },
);
assert.equal(fillPhone.next.phone, "9000000000");
assert.equal(fillPhone.next.name, "Ada Sharma");
assert.deepEqual(fillPhone.filledFields, ["phone"]);

const org = "org-016";
marketingQualificationStore.resetOrganization(org);
marketingRoutingPolicyStore.resetOrganization(org);
marketingAssignmentStore.resetAll();
marketingFixtureIdentityDirectory.resetOrganization(org);
marketingFixtureOpportunityDirectory.reset();

const actor = { userId: "admin-016", role: "SUPER_ADMIN", organizationId: org };
assert.equal(marketingQualificationService.getMode().handoffMode, "fixture");
assert.equal(marketingQualificationService.getMode().noLeadEntity, true);

const { campaign } = await marketingCampaignStore.create({
  organizationId: org,
  name: "016 Inbox Campaign",
  channel: "EMAIL",
  createdByUserId: actor.userId,
});

const beforeOpen = marketingFixtureIdentityDirectory.list(org).length;
const opened = await marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:open.only@example.com",
  matchEmail: "open.only@example.com",
  displayName: "Open Only",
  intent: "open",
  sourceTabName: "Master",
});
assert.equal(opened.businessState, "ENGAGED");
assert.equal(marketingFixtureIdentityDirectory.list(org).length, beforeOpen);

const clicked = await marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:click.only@example.com",
  matchEmail: "click.only@example.com",
  intent: "click",
});
assert.equal(clicked.businessState, "ENGAGED");

const delivered = await marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:delivered.only@example.com",
  matchEmail: "delivered.only@example.com",
  intent: "delivered",
});
assert.equal(delivered.businessState, "ENGAGED");

const landing = await marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:landing.only@example.com",
  matchEmail: "landing.only@example.com",
  intent: "landing_page",
});
assert.equal(landing.businessState, "ENGAGED");

const listed = marketingQualificationService.list(actor);
assert.equal(
  listed.inbox.some((row) => row.id === opened.id || row.id === clicked.id || row.id === delivered.id || row.id === landing.id),
  false,
);

const genuine = await marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:reply.one@example.com",
  matchEmail: "reply.one@example.com",
  displayName: "Reply One",
  intent: "reply",
  sourceTabName: "Master",
  responseSummary: "Asked for a callback on Home Loan",
  product: "Home Loan",
  snapshotId: "snap-016",
  snapshotRecipientId: "rcpt-016",
});
assert.notEqual(genuine.businessState, "QUALIFIED");
assert.equal(genuine.inboxStatus, "NEW");
const afterGenuine = marketingQualificationService.list(actor);
const genuineRow = afterGenuine.inbox.find((row) => row.id === genuine.id);
assert.ok(genuineRow, "genuine reply must appear in Qualification Inbox");
assert.equal(genuineRow.sourceTabName, "Master");
assert.equal(genuineRow.productInterest, "Home Loan");
assert.equal(genuineRow.nextAction, "review");
assert.equal(
  afterGenuine.inbox.some(
    (row) => row.id === opened.id || row.id === clicked.id || row.id === delivered.id || row.id === landing.id,
  ),
  false,
);

marketingFixtureIdentityDirectory.upsert({
  organizationId: org,
  id: "existing-016",
  name: "Ada Sharma",
  email: "ada.sharma@example.com",
  phone: null,
});

const policy = marketingRoutingPolicyStore.upsert({
  organizationId: org,
  name: "016 owner",
  mode: "SINGLE_USER",
  assigneeUserId: "rm-016",
});

const qualified = await marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:ada.sharma@example.com",
  matchEmail: "ada.sharma@example.com",
  matchPhone: "9000000016",
  displayName: "",
  intent: "manual_qualification",
  operatorConfirmed: true,
  sourceTabName: "Master",
  snapshotId: "snap-016",
  snapshotRecipientId: "rcpt-ada",
  product: "Home Loan",
});
assert.equal(qualified.businessState, "QUALIFIED");
assert.equal(qualified.duplicateMatch?.result, "existing_contact");

const handoff = await marketingQualificationService.handoff(actor, {
  qualificationId: qualified.id,
  routingPolicyId: policy.id,
});
assert.equal(handoff.contact.created, false);
assert.equal(handoff.contact.contactId, "existing-016");
assert.equal(handoff.contact.overwroteExisting, false);
assert.ok((handoff.contact.filledFields ?? []).includes("phone"));
const reused = marketingFixtureIdentityDirectory.get("existing-016");
assert.equal(reused?.name, "Ada Sharma");
assert.equal(reused?.email, "ada.sharma@example.com");
assert.equal(reused?.phone, "9000000016");
assert.equal(handoff.opportunity?.created, true);
assert.equal(handoff.opportunity?.campaignId, campaign.id);
assert.equal(handoff.opportunity?.snapshotId, "snap-016");
assert.equal(handoff.opportunity?.snapshotRecipientId, "rcpt-ada");
assert.equal(handoff.assignment.assigneeUserId, "rm-016");

const storedOpp = marketingFixtureOpportunityDirectory.get(handoff.opportunity.opportunityId);
assert.equal(storedOpp?.campaignId, campaign.id);
assert.equal(storedOpp?.snapshotId, "snap-016");
assert.equal(storedOpp?.recipientFingerprint, "email:ada.sharma@example.com");

const second = await marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:ada.sharma@example.com:dup",
  matchEmail: "ada.sharma@example.com",
  displayName: "Ada Duplicate",
  intent: "campaign_form",
  sourceTabName: "Master",
});
assert.equal(second.duplicateMatch?.result, "existing_response");
assert.equal(second.inboxStatus, "DUPLICATE");

const secondHandoff = await marketingQualificationService.handoff(actor, {
  qualificationId: (
    await marketingQualificationService.setBusinessState(actor, second.id, "QUALIFIED")
  ).id,
  routingPolicyId: policy.id,
});
assert.equal(secondHandoff.contact.contactId, "existing-016");
assert.equal(secondHandoff.opportunity?.created, false);
assert.equal(secondHandoff.opportunity?.opportunityId, handoff.opportunity.opportunityId);
assert.equal(secondHandoff.opportunity?.snapshotId, "snap-016");
assert.equal(second.snapshotId, "snap-016");

const identity = createFixtureIdentityResolutionPort();
const openAttempt = await identity.matchOrCreate({
  organizationId: org,
  actorUserId: actor.userId,
  name: "Should Not Matter",
  email: "ada.sharma@example.com",
  phone: "",
});
assert.equal(openAttempt.created, false);
assert.equal(openAttempt.overwroteExisting, false);
assert.equal(marketingFixtureIdentityDirectory.get("existing-016")?.name, "Ada Sharma");

const audits = listRecentMarketingAuditEvents(80);
const complete = audits.find(
  (event) =>
    event.kind === "qualification.handoff.complete" &&
    event.organizationId === org &&
    event.detail?.qualificationId === qualified.id,
);
assert.ok(complete);
assert.equal(complete.detail.noLeadEntity, true);
assert.equal(complete.detail.campaignId, campaign.id);
assert.equal(complete.detail.snapshotId, "snap-016");
assert.equal(complete.detail.snapshotRecipientId, "rcpt-ada");
assert.equal(complete.detail.assigneeUserId, "rm-016");
assert.equal(complete.detail.overwroteExisting, false);
assert.equal(complete.detail.filledFields?.includes("phone"), true);

console.log("CO-MARKETING-REDESIGN-016 PASS");
