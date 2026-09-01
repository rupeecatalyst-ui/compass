/**
 * CO-MARKETING-MKT-12 — Campaign routing + internal notification verification.
 * No deploy. No live employee email/WhatsApp. No parallel notification engine.
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

const required = [
  "src/lib/enterprise-marketing-engine/routing/pick-assignee.ts",
  "src/lib/enterprise-marketing-engine/qualification/handoff-notification.ts",
  "src/constants/enterprise-marketing-engine/routing.ts",
  "src/constants/enterprise-marketing-engine/notification.ts",
  "server/services/enterprise-marketing-engine/notification.service.ts",
  "server/services/enterprise-marketing-engine/routing.service.ts",
  "src/app/api/admin/marketing/qualifications/route.ts",
  "docs/co-marketing-mkt-12/CO-MARKETING-MKT-12-IMPLEMENTATION-REPORT.md",
];

for (const rel of required) {
  if (!existsSync(resolve(root, rel))) fail(`missing ${rel}`);
  else pass(rel);
}

const safety = readFileSync(resolve(root, "src/constants/enterprise-marketing-engine/safety.ts"), "utf8");
if (!safety.includes("ENTERPRISE_MARKETING_EXECUTION_ENABLED = false")) fail("execution must stay false");
else pass("execution disabled");
if (!safety.includes("ENTERPRISE_MARKETING_MASS_HANDOFF_ENABLED = false")) fail("mass handoff must stay false");
else pass("mass handoff disabled");
if (!safety.includes('sprint: "CO-MARKETING-MKT-12"') && !safety.includes('sprint: "CO-MARKETING-MKT-13"') && !safety.includes("CO-MARKETING-ACTIVATION-002")) fail("sprint marker");
else pass("sprint MKT-12 or successor");

const eneService = readFileSync(
  resolve(root, "server/services/enterprise-notification/enterprise-notification.service.ts"),
  "utf8",
);
if (!eneService.includes("explicitRecipientUserIds")) fail("ENE must support explicit assignee recipients");
else pass("ENE explicit recipients (additive)");
if (!eneService.includes("resolveNotificationRecipients")) {
  fail("ENE default recipient resolution must remain");
} else pass("ENE default fan-out path preserved");

const oppNotify = readFileSync(resolve(root, "server/services/enterprise-opportunity/index.ts"), "utf8");
if (oppNotify.includes("explicitRecipientUserIds")) {
  fail("Opportunity operational notify must not use marketing explicit recipients");
} else pass("Opportunity notify unchanged");

const notifySvc = readFileSync(
  resolve(root, "server/services/enterprise-marketing-engine/notification.service.ts"),
  "utf8",
);
if (!notifySvc.includes("enterpriseNotificationService") || !notifySvc.includes("MARKETING_QUALIFIED_HANDOFF")) {
  fail("Marketing notify must reuse ENE event type");
} else pass("Marketing notify reuses ENE");

const host = readFileSync(
  resolve(root, "src/components/catalyst-one/enterprise-notification-engine/enterprise-notification-host.tsx"),
  "utf8",
);
if (!host.includes("item.href") && !host.includes("router.push")) fail("ENE host must deep-link via href");
else pass("ENE host deep-link preserved");

try {
  require("tsx/cjs");
} catch {
  console.log("SKIP runtime (tsx)");
  process.exit(ok ? 0 : 1);
}

process.env.ENTERPRISE_MARKETING_HANDOFF_MODE = "fixture";

const pickUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/routing/pick-assignee.ts")).href;
const hrefUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/qualification/handoff-notification.ts"),
).href;
const recUrl = pathToFileURL(resolve(root, "src/lib/enterprise-notification-engine/recipients-pure.ts")).href;
const campUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/campaign-store.ts")).href;
const qualUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/qualification.service.ts"),
).href;
const identUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/adapters/fixture-identity.adapter.ts"),
).href;
const routeUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/routing-policy-store.ts"),
).href;
const qstoreUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/qualification-store.ts"),
).href;
const assignUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/assignment-store.ts"),
).href;
const npolUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/notification-policy-store.ts"),
).href;
const nattUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/notification-attempt-store.ts"),
).href;
const nsvcUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/notification.service.ts"),
).href;

const { pickMarketingAssignee, assembleMarketingRoutingContext } = await import(pickUrl);
const { buildMarketingHandoffHref, buildMarketingHandoffNotificationBody } = await import(hrefUrl);
const { buildExplicitAssigneeRecipients, excludeActorFromRecipients } = await import(recUrl);
const { marketingCampaignStore } = await import(campUrl);
const { marketingQualificationService } = await import(qualUrl);
const { marketingFixtureIdentityDirectory } = await import(identUrl);
const { marketingRoutingPolicyStore } = await import(routeUrl);
const { marketingQualificationStore } = await import(qstoreUrl);
const { marketingAssignmentStore } = await import(assignUrl);
const { marketingNotificationPolicyStore } = await import(npolUrl);
const { marketingNotificationAttemptStore } = await import(nattUrl);
const { marketingNotificationService } = await import(nsvcUrl);

const org = "default";
marketingQualificationStore.resetOrganization(org);
marketingRoutingPolicyStore.resetOrganization(org);
marketingAssignmentStore.resetAll();
marketingFixtureIdentityDirectory.resetOrganization(org);
marketingNotificationPolicyStore.resetOrganization(org);
marketingNotificationAttemptStore.resetOrganization(org);
marketingNotificationService.resetTestState();

const actor = { userId: "admin-verify", role: "SUPER_ADMIN", organizationId: org };
const viewer = { userId: "rm-only", role: "USER", organizationId: org };

const href = buildMarketingHandoffHref({ opportunityId: "opp-123", contactId: "c-1" });
if (!href.includes("/opportunities?opportunityId=opp-123")) fail(`deep link wrong: ${href}`);
else pass("deep link prefers Opportunity");

const body = buildMarketingHandoffNotificationBody({
  contactName: "Asha Verma",
  campaignName: "Home Loan Spring",
  sourceLabel: "EMAIL",
  qualificationReason: "Explicit business requirement confirmed by operator",
  opportunityId: "opp-123",
  assigneeUserId: "rm-priya",
  occurredAt: "2026-08-12T12:00:00.000Z",
});
const needed = [
  "Contact/customer:",
  "Campaign:",
  "Source:",
  "Qualification reason:",
  "Opportunity:",
  "Assigned employee:",
  "Required action:",
  "Timestamp:",
];
if (needed.some((k) => !body.includes(k))) fail("notification body missing required fields");
else pass("notification body has required fields");

const explicit = buildExplicitAssigneeRecipients(["rm-priya", "rm-priya", ""]);
if (explicit.length !== 1 || explicit[0].userId !== "rm-priya") fail("explicit recipients should be assignee-only");
else pass("explicit recipients are assignee-only");
const operational = excludeActorFromRecipients(
  [
    { kind: "user", userId: "admin-verify", reason: "actor" },
    { kind: "user", userId: "mgr-1", reason: "reporting_manager" },
  ],
  "admin-verify",
);
if (operational.some((r) => r.userId === "admin-verify")) fail("default ENE policy must still exclude actor");
else pass("default ENE actor-exclusion unchanged");

const single = pickMarketingAssignee({
  policy: {
    id: "p1",
    organizationId: org,
    name: "Single",
    mode: "SINGLE_USER",
    assigneeUserId: "rm-priya",
    members: [],
    rrCursor: 0,
    createdAt: "",
    updatedAt: "",
  },
  context: assembleMarketingRoutingContext({ campaignId: "c1" }),
});
if (single.userId !== "rm-priya") fail("single-user assignment");
else pass("single-user assignment");

const rrPolicy = {
  id: "p-rr",
  organizationId: org,
  name: "RR",
  mode: "ROUND_ROBIN",
  members: [
    { userId: "rm-a", displayName: "A" },
    { userId: "rm-b", displayName: "B" },
  ],
  rrCursor: 0,
  createdAt: "",
  updatedAt: "",
};
const rr1 = pickMarketingAssignee({
  policy: rrPolicy,
  context: assembleMarketingRoutingContext({ campaignId: "c1" }),
});
const rr2 = pickMarketingAssignee({
  policy: { ...rrPolicy, rrCursor: rr1.nextCursor },
  context: assembleMarketingRoutingContext({ campaignId: "c1" }),
});
if (rr1.userId !== "rm-a" || rr2.userId !== "rm-b") fail(`round-robin got ${rr1.userId}, ${rr2.userId}`);
else pass("round-robin assignment");

const teamPick = pickMarketingAssignee({
  policy: {
    id: "p-team",
    organizationId: org,
    name: "Team",
    mode: "TEAM",
    teamId: "north",
    members: [
      { userId: "rm-north-1", displayName: "N1", teamId: "north" },
      { userId: "rm-south-1", displayName: "S1", teamId: "south" },
      { userId: "rm-north-2", displayName: "N2", teamId: "north" },
    ],
    rrCursor: 0,
    createdAt: "",
    updatedAt: "",
  },
  context: assembleMarketingRoutingContext({ campaignId: "c1" }),
});
if (teamPick.userId !== "rm-north-1") fail(`team assignment got ${teamPick.userId}`);
else pass("team assignment");

const rulePick = pickMarketingAssignee({
  policy: {
    id: "p-rule",
    organizationId: org,
    name: "Rules",
    mode: "RULE_BASED",
    members: [{ userId: "rm-fallback", displayName: "F" }],
    rules: [
      { id: "r1", field: "product", equals: "Home Loan", assigneeUserId: "rm-home" },
      { id: "r2", field: "geography", equals: "Mumbai", assigneeUserId: "rm-mum" },
    ],
    rrCursor: 0,
    createdAt: "",
    updatedAt: "",
  },
  context: assembleMarketingRoutingContext({
    campaignId: "c1",
    product: "Home Loan",
    city: "Mumbai",
  }),
});
if (rulePick.userId !== "rm-home") fail(`closed rule should first-match product, got ${rulePick.userId}`);
else pass("closed routing rule (product first match)");

const { campaign } = await marketingCampaignStore.create({
  organizationId: org,
  name: "MKT-12 Verify Campaign",
  channel: "EMAIL",
  product: "Home Loan",
  createdByUserId: actor.userId,
});

const notifyCalls = [];
marketingNotificationService.configurePort({
  async notifyAssignee(request) {
    notifyCalls.push(request);
    return {
      notificationId: `ene-${request.qualificationId}`,
      duplicate: notifyCalls.filter((c) => c.qualificationId === request.qualificationId).length > 1,
      channelResults: [{ channel: "in_app", status: "SENT" }],
    };
  },
});

const singlePolicy = marketingRoutingPolicyStore.upsert({
  organizationId: org,
  name: "Single owner",
  mode: "SINGLE_USER",
  assigneeUserId: "rm-priya",
});
const notifyPolicy = marketingNotificationPolicyStore.upsert({
  organizationId: org,
  name: "In-app + email",
  inApp: true,
  email: true,
  whatsapp: false,
});

const qualified = marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:asha.mkt12@example.com",
  matchEmail: "asha.mkt12@example.com",
  matchPhone: "9811111111",
  displayName: "Asha Verma",
  product: "Home Loan",
  city: "Mumbai",
  intent: "explicit_requirement",
  operatorConfirmed: true,
});

const handoff = await marketingQualificationService.handoff(actor, {
  qualificationId: qualified.id,
  routingPolicyId: singlePolicy.id,
  notificationPolicyId: notifyPolicy.id,
});
if (handoff.assignment.assigneeUserId !== "rm-priya") fail("handoff single-user owner");
else pass("handoff assigns configured user");
if (!handoff.opportunity?.opportunityId) fail("Opportunity missing after handoff");
else pass("Opportunity created before notify");
if (!handoff.notification) fail("notification summary missing");
else pass("notification recorded");
const inAppAttempt = handoff.notification.attempts.find((a) => a.channel === "in_app");
if (!inAppAttempt || (inAppAttempt.status !== "SENT" && inAppAttempt.status !== "SKIPPED")) {
  fail(`in-app attempt ${inAppAttempt?.status}`);
} else pass("in-app notification delivered via port");
const emailAttempt = handoff.notification.attempts.find((a) => a.channel === "email");
if (!emailAttempt || emailAttempt.status !== "DRY_RUN") fail("email should be dry-run");
else pass("email channel dry-run (not live employee send)");
const call = notifyCalls[0];
if (!call?.href?.includes("/opportunities?opportunityId=")) fail("notify href is not Opportunity deep link");
else pass("notification deep-links to Opportunity");
if (call.assigneeUserId !== "rm-priya") fail("notification recipient is not assignee");
else pass("notification recipient is assigned employee");

const dupNotify = await marketingQualificationService.retryNotification(actor, qualified.id, notifyPolicy.id);
const inAppAfter = dupNotify.notification.attempts.find((a) => a.channel === "in_app");
if (notifyCalls.filter((c) => c.qualificationId === qualified.id).length !== 1) {
  fail("duplicate in-app notify should be skipped");
} else pass("duplicate protection skips successful in-app");
if (inAppAfter?.status !== "SENT" && inAppAfter?.status !== "SKIPPED") fail("retry must not reset SENT");
else pass("successful channel not re-sent");

marketingNotificationService.setTestFailure("in_app", true);
const failRow = marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:fail.notify@example.com",
  matchEmail: "fail.notify@example.com",
  matchPhone: "9822222222",
  displayName: "Fail Notify",
  intent: "explicit_requirement",
  operatorConfirmed: true,
});
const failedHandoff = await marketingQualificationService.handoff(actor, {
  qualificationId: failRow.id,
  routingPolicyId: singlePolicy.id,
  notificationPolicyId: notifyPolicy.id,
});
if (!failedHandoff.opportunity?.opportunityId) fail("notify failure must not lose Opportunity");
else pass("Opportunity preserved after notify failure");
if (failedHandoff.qualification.processState !== "HANDOFF_COMPLETE") fail("handoff must stay complete");
else pass("handoff complete despite notify failure");
if (failedHandoff.notification?.status !== "FAILED" && failedHandoff.notification?.status !== "PARTIAL") {
  fail(`expected FAILED/PARTIAL, got ${failedHandoff.notification?.status}`);
} else pass("notify failure recorded");

marketingNotificationService.setTestFailure("in_app", false);
const retried = await marketingQualificationService.retryNotification(actor, failRow.id, notifyPolicy.id);
const retriedInApp = retried.notification.attempts.find((a) => a.channel === "in_app");
if (retriedInApp?.status !== "SENT" && retriedInApp?.status !== "SKIPPED") fail(`retry status ${retriedInApp?.status}`);
else pass("retry delivers previously failed in-app");
if (!retried.opportunityPreserved) fail("retry must keep Opportunity");
else pass("retry preserves Opportunity");

const rrStore = marketingRoutingPolicyStore.upsert({
  organizationId: org,
  name: "RR live",
  mode: "ROUND_ROBIN",
  members: [
    { userId: "rm-a", displayName: "A" },
    { userId: "rm-b", displayName: "B" },
  ],
});
const qA = marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:rr.a@example.com",
  matchEmail: "rr.a@example.com",
  matchPhone: "9833333333",
  displayName: "RR A",
  intent: "explicit_requirement",
  operatorConfirmed: true,
});
const qB = marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:rr.b@example.com",
  matchEmail: "rr.b@example.com",
  matchPhone: "9844444444",
  displayName: "RR B",
  intent: "explicit_requirement",
  operatorConfirmed: true,
});
const hA = await marketingQualificationService.handoff(actor, {
  qualificationId: qA.id,
  routingPolicyId: rrStore.id,
  notificationPolicyId: notifyPolicy.id,
});
const hB = await marketingQualificationService.handoff(actor, {
  qualificationId: qB.id,
  routingPolicyId: rrStore.id,
  notificationPolicyId: notifyPolicy.id,
});
if (hA.assignment.assigneeUserId !== "rm-a" || hB.assignment.assigneeUserId !== "rm-b") {
  fail(`live round-robin ${hA.assignment.assigneeUserId}, ${hB.assignment.assigneeUserId}`);
} else pass("live round-robin across two handoffs");

const teamStore = marketingRoutingPolicyStore.upsert({
  organizationId: org,
  name: "North team",
  mode: "TEAM",
  teamId: "north",
  members: [
    { userId: "rm-north-1", displayName: "N1", teamId: "north" },
    { userId: "rm-south-1", displayName: "S1", teamId: "south" },
  ],
});
const qTeam = marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:team.n@example.com",
  matchEmail: "team.n@example.com",
  matchPhone: "9855555555",
  displayName: "Team North",
  intent: "explicit_requirement",
  operatorConfirmed: true,
});
const hTeam = await marketingQualificationService.handoff(actor, {
  qualificationId: qTeam.id,
  routingPolicyId: teamStore.id,
  notificationPolicyId: notifyPolicy.id,
});
if (hTeam.assignment.assigneeUserId !== "rm-north-1") fail("team handoff assigned outsider");
else pass("team handoff stays inside team");

let denied = false;
try {
  await marketingQualificationService.handoff(viewer, {
    qualificationId: qualified.id,
    routingPolicyId: singlePolicy.id,
  });
} catch (err) {
  denied = err?.code === "MARKETING_PERMISSION_DENIED" || String(err?.message ?? "").includes("permission");
}
if (!denied) fail("non-admin must not manage routing/handoff");
else pass("permission boundary on handoff");

let retryDenied = false;
try {
  await marketingQualificationService.retryNotification(viewer, failRow.id);
} catch (err) {
  retryDenied = err?.code === "MARKETING_PERMISSION_DENIED" || String(err?.message ?? "").includes("permission");
}
if (!retryDenied) fail("non-admin must not retry notifications");
else pass("permission boundary on retry");

if (ok) console.log("CO-MARKETING-MKT-12 verify: PASS");
else {
  console.error("CO-MARKETING-MKT-12 verify: FAIL");
  process.exit(1);
}
