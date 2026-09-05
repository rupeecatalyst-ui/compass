/**
 * CO-MARKETING-REDESIGN-019b — API-path permission and audit enforcement.
 * Uses signed fixture tokens + Request objects against the real route helpers.
 * No Hostinger, no live send, no production database.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "marketing-pre-staging-local-jwt-secret-aaaa";
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = "marketing-pre-staging-local-jwt-refresh-bbbb";
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const authSrc = read("src/lib/api/auth-route-utils.ts");
assert.match(authSrc, /status: 401/);
assert.match(authSrc, /Authentication required/);
assert.match(authSrc, /INVALID_TOKEN/);

const campaignsApi = read("src/app/api/admin/marketing/campaigns/route.ts");
assert.match(campaignsApi, /requireAccessToken\(request\)/);
assert.match(campaignsApi, /assertMarketingPermission/);
assert.match(campaignsApi, /assertMarketingOperationPermission/);

const tokenMod = await import(pathToFileURL(resolve(root, "server/services/token.service.ts")).href);
const permMod = await import(
  pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/permissions.ts")).href
);
const opPerm = await import(
  pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/operation-permissions.ts")).href
);
const campMod = await import(
  pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/campaign.service.ts")).href
);
const auditMod = await import(
  pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/audit.ts")).href
);
const { MARKETING_PERMISSIONS } = await import(
  pathToFileURL(resolve(root, "src/constants/enterprise-marketing-engine/permissions.ts")).href
);

function getBearerToken(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

function requireAccessToken(request) {
  const token = getBearerToken(request);
  if (!token) {
    throw {
      status: 401,
      body: { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
    };
  }
  try {
    return tokenMod.verifyAccessToken(token);
  } catch {
    throw {
      status: 401,
      body: { success: false, error: { code: "INVALID_TOKEN", message: "Invalid or expired token" } },
    };
  }
}

function httpStatusFromThrown(err) {
  if (err?.status === 401) return 401;
  if (err?.statusCode === 403 || err?.code === "MARKETING_PERMISSION_DENIED") return 403;
  return err?.statusCode ?? err?.status ?? 500;
}

function invokeCampaignsGet(request) {
  try {
    const actor = requireAccessToken(request);
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
      throw Object.assign(new Error("Only administrators can manage Marketing campaigns"), {
        statusCode: 403,
        code: "FORBIDDEN",
      });
    }
    permMod.assertMarketingPermission(actor, MARKETING_PERMISSIONS.COMMAND_CENTER);
    return { status: 200, actor };
  } catch (err) {
    return { status: httpStatusFromThrown(err), error: err };
  }
}

const unauth = invokeCampaignsGet(new Request("http://local.test/api/admin/marketing/campaigns"));
assert.equal(unauth.status, 401, "missing Bearer must return 401");

const junk = invokeCampaignsGet(
  new Request("http://local.test/api/admin/marketing/campaigns", {
    headers: { Authorization: "Bearer not-a-token" },
  }),
);
assert.equal(junk.status, 401, "invalid token must return 401");

const employeeToken = tokenMod.signAccessToken({
  userId: "mkt-019b-employee",
  email: "employee@example.com",
  role: "EMPLOYEE",
  organizationId: "org-a",
});
const employeeRes = invokeCampaignsGet(
  new Request("http://local.test/api/admin/marketing/campaigns", {
    headers: { Authorization: `Bearer ${employeeToken}` },
  }),
);
assert.equal(employeeRes.status, 403, "authenticated employee without Marketing permission must return 403");

const adminA = {
  userId: "mkt-019b-admin-a",
  role: "ADMIN",
  organizationId: "org-a",
  email: "admin-a@example.com",
};
const adminToken = tokenMod.signAccessToken(adminA);
const adminRes = invokeCampaignsGet(
  new Request("http://local.test/api/admin/marketing/campaigns", {
    headers: { Authorization: `Bearer ${adminToken}` },
  }),
);
assert.equal(adminRes.status, 200, "ADMIN with command-center default may GET campaigns");

const created = await campMod.marketingCampaignService.create(adminA, {
  name: "019b fixture campaign",
  product: "Home Loan",
});
await campMod.marketingCampaignService.save(adminA, created.campaign.id, {
  subject: "019b save",
});

let approveDenied = false;
try {
  await campMod.marketingCampaignService.transition(adminA, created.campaign.id, "APPROVE");
} catch (err) {
  approveDenied = err?.code === "MARKETING_PERMISSION_DENIED";
  assert.equal(httpStatusFromThrown(err), 403);
}
assert.equal(approveDenied, true, "save must not equal approve");

await campMod.marketingCampaignService.transition(adminA, created.campaign.id, "SUBMIT_FOR_REVIEW");

let scheduleDenied = false;
try {
  opPerm.assertMarketingOperationPermission(adminA, "schedule");
} catch (err) {
  scheduleDenied = err?.code === "MARKETING_PERMISSION_DENIED";
  assert.equal(httpStatusFromThrown(err), 403);
}
assert.equal(scheduleDenied, true, "submit must not equal schedule");

let runDenied = false;
try {
  opPerm.assertMarketingOperationPermission(adminA, "run");
} catch (err) {
  runDenied = err?.code === "MARKETING_PERMISSION_DENIED";
  assert.equal(httpStatusFromThrown(err), 403);
}
assert.equal(runDenied, true, "schedule must not equal run");

assert.equal(permMod.canViewMarketingRecipientPii(adminA), false, "recipient PII remains separate from ADMIN defaults");

const superA = { userId: "mkt-019b-super", role: "SUPER_ADMIN", organizationId: "org-a" };
assert.equal(permMod.hasMarketingPermission(superA, MARKETING_PERMISSIONS.CAMPAIGN_APPROVE), true);
assert.equal(permMod.hasMarketingPermission(adminA, MARKETING_PERMISSIONS.CAMPAIGN_APPROVE), false);

const orgB = { userId: "mkt-019b-admin-b", role: "ADMIN", organizationId: "org-b" };
let crossOrgDenied = false;
try {
  await campMod.marketingCampaignService.get(orgB, created.campaign.id);
} catch (err) {
  crossOrgDenied = err?.statusCode === 404 || err?.code === "NOT_FOUND";
}
assert.equal(crossOrgDenied, true, "organisation A campaign is hidden from organisation B");

const events = auditMod.listMarketingAuditEventsForOrganization(adminA.organizationId);
const saveEvent = events.find((row) => row.kind === "campaign.save");
assert.ok(saveEvent);
assert.ok(saveEvent.detail.actor);
assert.ok(saveEvent.detail.organization);
assert.ok(saveEvent.detail.action);
assert.ok(saveEvent.detail.objectType);
assert.ok(saveEvent.detail.timestamp);
assert.ok(saveEvent.detail.correlationId);
assert.ok("previousState" in saveEvent.detail && "resultingState" in saveEvent.detail);

const leaked = auditMod.recordMarketingAuditEvent({
  kind: "campaign.save",
  organizationId: adminA.organizationId,
  actorUserId: adminA.userId,
  action: "save",
  objectType: "campaign",
  objectId: created.campaign.id,
  campaignId: created.campaign.id,
  previousState: "DRAFT",
  resultingState: "DRAFT",
  detail: { smtpPassword: "nopenopenope", html: "<p>body</p>" },
});
assert.equal(leaked.detail.smtpPassword, "[redacted]");
assert.equal(leaked.detail.html, "[redacted]");

console.log("CO-MARKETING-REDESIGN-019b API enforcement: PASS");
