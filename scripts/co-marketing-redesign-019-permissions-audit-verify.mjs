/**
 * CO-MARKETING-REDESIGN-019 — Permissions and durable audit.
 * Local fixtures only. No send, migrate, Hostinger, commit, or deploy.
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

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "marketing-pre-staging-local-jwt-secret-aaaa";
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = "marketing-pre-staging-local-jwt-refresh-bbbb";
}

const pkg = read("package.json");
const permissionKeys = read("src/constants/enterprise-marketing-engine/permissions.ts");
const permLib = read("src/lib/enterprise-marketing-engine/permissions.ts");
const opPermSrc = read("src/lib/enterprise-marketing-engine/operation-permissions.ts");
const auditSrc = read("server/services/enterprise-marketing-engine/audit.ts");
const campaignSrc = read("server/services/enterprise-marketing-engine/campaign.service.ts");
const campaignsApi = read("src/app/api/admin/marketing/campaigns/route.ts");
const consentApi = read("src/app/api/admin/marketing/consent/route.ts");
const qualApi = read("src/app/api/admin/marketing/qualifications/route.ts");
const analyticsApi = read("src/app/api/admin/marketing/analytics/route.ts");
const senderApi = read("src/app/api/admin/marketing/sender-identities/route.ts");
const assetsApi = read("src/app/api/admin/marketing/assets/route.ts");
const safety = read("src/constants/enterprise-marketing-engine/safety.ts");
const cronSrc = read("src/lib/enterprise-marketing-engine/execution/cron-activation.ts");
const builderPage = read(
  "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
);

mustInclude(pkg, "verify:co-marketing-redesign-019");
mustInclude(safety, "ENTERPRISE_MARKETING_EXECUTION_ENABLED = false");
mustInclude(cronSrc, "MARKETING_PACING_CRON_REGISTERED = false");
mustInclude(permissionKeys, "RECIPIENT_PII_VIEW");
mustInclude(permissionKeys, "CAMPAIGN_EDIT_OWN");
mustInclude(permissionKeys, "CAMPAIGN_EDIT_ALL");
mustInclude(permissionKeys, "CAMPAIGN_SUBMIT");
mustInclude(permissionKeys, "TEMPLATE_MANAGE");
mustInclude(permissionKeys, "QUALIFICATION_REVIEW");
mustInclude(permissionKeys, "QUALIFICATION_CONVERT");
mustInclude(permissionKeys, "View Marketing");
mustInclude(permissionKeys, "View recipient information");
mustInclude(permissionKeys, "Configure sender/provider settings");
mustInclude(permLib, "CAMPAIGN_CREATE");
mustInclude(permLib, "CAMPAIGN_SUBMIT");
const adminDefaultSrc = permLib.slice(
  permLib.indexOf("const ADMIN_DEFAULT"),
  permLib.indexOf("];", permLib.indexOf("const ADMIN_DEFAULT")) + 2,
);
assert.doesNotMatch(adminDefaultSrc, /CAMPAIGN_APPROVE/);
assert.doesNotMatch(adminDefaultSrc, /CAMPAIGN_EDIT_ALL/);
assert.doesNotMatch(adminDefaultSrc, /RECIPIENT_PII_VIEW/);
assert.doesNotMatch(adminDefaultSrc, /CAMPAIGN_SCHEDULE/);
assert.doesNotMatch(adminDefaultSrc, /CAMPAIGN_RUN/);
assert.doesNotMatch(adminDefaultSrc, /CAMPAIGN_STOP/);
assert.doesNotMatch(adminDefaultSrc, /CAMPAIGN_RETRY/);
mustInclude(opPermSrc, "SUBMIT_FOR_REVIEW");
mustInclude(campaignSrc, "assertCanEditMarketingCampaign");
mustInclude(campaignSrc, "permissionForMarketingLifecycleAction");
mustInclude(campaignSrc, "TEMPLATE_MANAGE");
mustInclude(auditSrc, "correlationId");
mustInclude(auditSrc, "previousState");
mustInclude(auditSrc, "resultingState");
mustInclude(auditSrc, "[redacted]");
mustInclude(campaignsApi, "assertMarketingPermission");
mustInclude(consentApi, "assertMarketingPermission");
mustInclude(qualApi, "QUALIFICATION_REVIEW");
mustInclude(qualApi, "QUALIFICATION_CONVERT");
mustInclude(analyticsApi, "ANALYTICS_VIEW");
mustInclude(senderApi, "SENDER_MANAGE");
mustInclude(senderApi, "SENDER_APPROVE");
mustInclude(assetsApi, "ASSET_MANAGE");
assert.doesNotMatch(builderPage, /test_send/);
assert.doesNotMatch(builderPage, /run_test_batch/);
assert.doesNotMatch(builderPage, /run_next_batch/);

const permUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/permissions.ts")).href;
const keysUrl = pathToFileURL(
  resolve(root, "src/constants/enterprise-marketing-engine/permissions.ts"),
).href;
const opPermUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/operation-permissions.ts"),
).href;
const campUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/campaign.service.ts"),
).href;
const auditUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/audit.ts"))
  .href;

const perms = await import(permUrl);
const keys = await import(keysUrl);
const opPerm = await import(opPermUrl);
const campMod = await import(campUrl);
const auditMod = await import(auditUrl);

assert.equal(opPerm.marketingPermissionsAreSeparated(), true);
assert.equal(
  opPerm.permissionForMarketingLifecycleAction("SAVE"),
  opPerm.MARKETING_OPERATION_PERMISSIONS.edit,
);
assert.equal(
  opPerm.permissionForMarketingLifecycleAction("SUBMIT_FOR_REVIEW"),
  opPerm.MARKETING_OPERATION_PERMISSIONS.submit,
);
assert.equal(
  opPerm.permissionForMarketingLifecycleAction("APPROVE"),
  opPerm.MARKETING_OPERATION_PERMISSIONS.approve,
);

const required = keys.MARKETING_REQUIRED_PERMISSION_CATALOGUE;
assert.equal(required.length, 20);
for (const row of required) {
  assert.ok(keys.MARKETING_PERMISSIONS[row.key], `missing catalogue key ${row.key}`);
}

const admin = perms.resolveMarketingPermissions({ role: "ADMIN" });
assert.equal(admin.has(keys.MARKETING_PERMISSIONS.COMMAND_CENTER), true);
assert.equal(admin.has(keys.MARKETING_PERMISSIONS.CAMPAIGN_CREATE), true);
assert.equal(admin.has(keys.MARKETING_PERMISSIONS.CAMPAIGN_SUBMIT), true);
assert.equal(admin.has(keys.MARKETING_PERMISSIONS.CAMPAIGN_APPROVE), false);
assert.equal(admin.has(keys.MARKETING_PERMISSIONS.CAMPAIGN_EDIT_ALL), false);
assert.equal(admin.has(keys.MARKETING_PERMISSIONS.RECIPIENT_PII_VIEW), false);
assert.equal(admin.has(keys.MARKETING_PERMISSIONS.CAMPAIGN_SCHEDULE), false);
assert.equal(admin.has(keys.MARKETING_PERMISSIONS.CAMPAIGN_RUN), false);
assert.equal(admin.has(keys.MARKETING_PERMISSIONS.CAMPAIGN_PAUSE), false);
assert.equal(admin.has(keys.MARKETING_PERMISSIONS.CAMPAIGN_STOP), false);
assert.equal(admin.has(keys.MARKETING_PERMISSIONS.CAMPAIGN_RETRY), false);
assert.equal(admin.has(keys.MARKETING_PERMISSIONS.QUALIFICATION_CONVERT), false);
assert.equal(admin.has(keys.MARKETING_PERMISSIONS.TEMPLATE_MANAGE), false);

const superPerms = perms.resolveMarketingPermissions({ role: "SUPER_ADMIN" });
for (const key of Object.values(keys.MARKETING_PERMISSIONS)) {
  assert.equal(superPerms.has(key), true, `SUPER_ADMIN missing ${key}`);
}

const userPerms = perms.resolveMarketingPermissions({ role: "USER" });
assert.equal(userPerms.size, 0);

const grantedUser = perms.resolveMarketingPermissions({
  role: "USER",
  marketingPermissions: [keys.MARKETING_PERMISSIONS.RECIPIENT_PII_VIEW],
});
assert.equal(grantedUser.has(keys.MARKETING_PERMISSIONS.RECIPIENT_PII_VIEW), true);
assert.equal(grantedUser.has(keys.MARKETING_PERMISSIONS.CAMPAIGN_APPROVE), false);

auditMod.resetMarketingAuditEventsForTests();

const orgA = { userId: "admin-019-a", organizationId: "org-mkt-019-a", role: "ADMIN" };
const orgAPeer = { userId: "admin-019-peer", organizationId: "org-mkt-019-a", role: "ADMIN" };
const orgB = { userId: "admin-019-b", organizationId: "org-mkt-019-b", role: "ADMIN" };
const superA = { userId: "super-019-a", organizationId: "org-mkt-019-a", role: "SUPER_ADMIN" };

const created = await campMod.marketingCampaignService.create(orgA, {
  name: "019 permission campaign",
  objective: "Acquire",
  product: "Home Loan",
  channel: "EMAIL",
});
assert.equal(created.campaign.governance.createdByUserId, orgA.userId);

await campMod.marketingCampaignService.save(orgA, created.campaign.id, {
  subject: "019 subject",
});

let peerEditDenied = false;
try {
  await campMod.marketingCampaignService.save(orgAPeer, created.campaign.id, {
    subject: "peer overwrite",
  });
} catch (err) {
  peerEditDenied = err?.code === "MARKETING_PERMISSION_DENIED";
}
assert.equal(peerEditDenied, true, "peer ADMIN must not edit another creator's campaign");

let crossOrgDenied = false;
try {
  await campMod.marketingCampaignService.get(orgB, created.campaign.id);
} catch (err) {
  crossOrgDenied = err?.statusCode === 404 || err?.code === "NOT_FOUND";
}
assert.equal(crossOrgDenied, true, "organisation isolation must hide foreign campaigns");

let approveDenied = false;
try {
  await campMod.marketingCampaignService.transition(orgA, created.campaign.id, "APPROVE");
} catch (err) {
  approveDenied = err?.code === "MARKETING_PERMISSION_DENIED";
}
assert.equal(approveDenied, true, "creator ADMIN must not receive approval authority");

await campMod.marketingCampaignService.transition(orgA, created.campaign.id, "SUBMIT_FOR_REVIEW");

const events = auditMod.listMarketingAuditEventsForOrganization(orgA.organizationId);
assert.ok(events.length >= 3, "durable audit must record create/save/submit");
const saveEvent = events.find((row) => row.kind === "campaign.save");
assert.ok(saveEvent, "save audit missing");
assert.equal(saveEvent.detail.organization, orgA.organizationId);
assert.equal(saveEvent.detail.actor, orgA.userId);
assert.equal(saveEvent.detail.action, "save");
assert.equal(saveEvent.detail.objectType, "campaign");
assert.equal(saveEvent.detail.objectId, created.campaign.id);
assert.equal(saveEvent.detail.campaignId, created.campaign.id);
assert.ok(saveEvent.detail.correlationId);
assert.ok(saveEvent.detail.timestamp);
assert.equal(saveEvent.detail.previousState, "DRAFT");
assert.equal(saveEvent.detail.resultingState, "DRAFT");

const leaked = auditMod.recordMarketingAuditEvent({
  kind: "campaign.save",
  organizationId: orgA.organizationId,
  actorUserId: orgA.userId,
  action: "save",
  objectType: "campaign",
  objectId: created.campaign.id,
  campaignId: created.campaign.id,
  previousState: "DRAFT",
  resultingState: "DRAFT",
  detail: {
    apiKey: "live-secret",
    html: "<p>complete body</p>",
    password: "nopenopenope",
  },
});
assert.equal(leaked.detail.apiKey, "[redacted]");
assert.equal(leaked.detail.html, "[redacted]");
assert.equal(leaked.detail.password, "[redacted]");

const foreign = auditMod.listMarketingAuditEventsForOrganization(orgB.organizationId);
assert.equal(
  foreign.some((row) => row.detail?.campaignId === created.campaign.id),
  false,
  "audit must stay organisation-scoped",
);

assert.equal(perms.canViewMarketingRecipientPii(orgA), false);
assert.equal(perms.canViewMarketingRecipientPii(superA), true);

let templateDenied = false;
try {
  await campMod.marketingCampaignService.saveAsTemplate(orgA, created.campaign.id, "019 template");
} catch (err) {
  templateDenied = err?.code === "MARKETING_PERMISSION_DENIED";
}
assert.equal(templateDenied, true, "ADMIN must not silently receive template manage");

await campMod.marketingCampaignService.saveAsTemplate(superA, created.campaign.id, "019 template");

console.log("CO-MARKETING-REDESIGN-019 permissions audit verify: PASS");
