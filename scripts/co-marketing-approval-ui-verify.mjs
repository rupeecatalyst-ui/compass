/**
 * Campaign Builder approval / launch UI permission matrix.
 * Local fixtures only. Does not approve, schedule, send, migrate, or deploy.
 */
import assert from "node:assert/strict";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.env.ENTERPRISE_MARKETING_EMAIL_MODE = "dry_run";
process.env.ENTERPRISE_MARKETING_EXECUTION_ENABLED = "false";
process.env.ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = "false";

const shell = await import(
  pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/campaign-builder-shell.ts")).href
);
const perms = await import(
  pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/permissions.ts")).href
);

const readyDraft = {
  name: "RC Salaried Home Loan – Test 01",
  internalDescription: "",
  objective: "Lead Generation",
  channel: "EMAIL",
  ownerUserId: "owner-1",
  tags: [],
  bindingId: "bind-1",
  datasetId: "tab-1",
  audienceId: "aud-1",
  columnMapEmail: "Email",
  mappingConfirmed: true,
  snapshotStatus: "Frozen",
  filterCount: 0,
  exclusionCount: 0,
  eligibleCount: 5,
  senderName: "RC",
  senderAddress: "opportunities@rupeecatalyst.com",
  subject: "Home loan",
  preheader: "",
  templateId: "",
  messageBody: "Hello",
  personalizationSample: {},
  startAt: "2026-10-25T14:10:00.000Z",
  timezone: "Asia/Kolkata",
  batchSize: 1,
  intervalMs: 300_000,
  windowStart: "09:00",
  windowEnd: "19:00",
  dailyMax: 500,
};

const readyPrePublish = {
  readyForApproval: true,
  checks: [{ id: "audience", label: "Audience", severity: "error", passed: true, message: "Audience linked" }],
  blockingCodes: [],
};

function review(overrides) {
  return shell.composeMarketingBuilderReview({
    draft: readyDraft,
    status: "READY_FOR_REVIEW",
    actor: perms.marketingPermissionActorFromUser({ id: "u1", role: "SUPER_ADMIN", organizationId: "org-1" }),
    executionEnabled: false,
    providerConnectEnabled: false,
    prePublish: readyPrePublish,
    ...overrides,
  });
}

const fromSession = perms.marketingPermissionActorFromUser({
  id: "op-1",
  role: "SUPER_ADMIN",
  organizationId: "org-1",
});
assert.equal(fromSession.userId, "op-1");
assert.equal(fromSession.role, "SUPER_ADMIN");
assert.equal(fromSession.marketingPermissions, undefined);

const superReady = review({});
assert.equal(superReady.canApprove, true);
assert.equal(superReady.approveReason, null);
assert.equal(superReady.canLaunch, false);
assert.match(superReady.launchReason, /TEST MODE/i);

const adminReady = review({
  actor: perms.marketingPermissionActorFromUser({ id: "a1", role: "ADMIN", organizationId: "org-1" }),
});
assert.equal(adminReady.canApprove, false);
assert.match(adminReady.approveReason, /approve permission/i);
assert.equal(adminReady.canLaunch, false);
assert.match(adminReady.launchReason, /TEST MODE/i);

const unauthorised = review({
  actor: perms.marketingPermissionActorFromUser(null),
});
assert.equal(unauthorised.canApprove, false);
assert.match(unauthorised.approveReason, /approve permission/i);
assert.equal(
  perms.hasMarketingPermission(perms.marketingPermissionActorFromUser(null), "admin.marketing.campaign.approve"),
  false,
);

const employee = review({
  actor: perms.marketingPermissionActorFromUser({ id: "e1", role: "EMPLOYEE", organizationId: "org-1" }),
});
assert.equal(employee.canApprove, false);
assert.match(employee.approveReason, /approve permission/i);

const liveButUnapproved = review({
  executionEnabled: true,
  providerConnectEnabled: true,
});
assert.equal(liveButUnapproved.canApprove, true);
assert.equal(liveButUnapproved.canLaunch, false);
assert.match(liveButUnapproved.launchReason, /approved before launch/i);

const liveApprovedAdmin = review({
  status: "APPROVED",
  actor: perms.marketingPermissionActorFromUser({ id: "a1", role: "ADMIN", organizationId: "org-1" }),
  executionEnabled: true,
  providerConnectEnabled: true,
});
assert.equal(liveApprovedAdmin.canApprove, false);
assert.equal(liveApprovedAdmin.canLaunch, false);
assert.match(liveApprovedAdmin.launchReason, /schedule permission/i);

const liveApprovedSuper = review({
  status: "APPROVED",
  executionEnabled: true,
  providerConnectEnabled: true,
});
assert.equal(liveApprovedSuper.canApprove, false);
assert.match(liveApprovedSuper.approveReason, /Submit for review/i);
assert.equal(liveApprovedSuper.canLaunch, true);
assert.equal(liveApprovedSuper.launchReason, null);

const executionOnProviderOff = review({
  status: "APPROVED",
  executionEnabled: true,
  providerConnectEnabled: false,
});
assert.equal(executionOnProviderOff.canLaunch, false);
assert.match(executionOnProviderOff.launchReason, /TEST MODE/i);

const notReady = review({
  prePublish: { readyForApproval: false, checks: [], blockingCodes: ["unsubscribe"] },
  draft: { ...readyDraft, name: "" },
});
assert.equal(notReady.canApprove, false);
assert.match(notReady.approveReason, /blockers before approval/i);

console.log(
  JSON.stringify({
    ok: true,
    superAdminCanApproveInReview: true,
    adminCannotApprove: true,
    unauthorisedCannotApprove: true,
    testModeBlocksLaunch: true,
    liveGatesRequiredForLaunch: true,
    noClientPermissionOverride: true,
  }),
);
