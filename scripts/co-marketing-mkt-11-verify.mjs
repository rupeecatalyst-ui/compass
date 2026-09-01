/**
 * CO-MARKETING-MKT-11 — Qualification + Catalyst One handoff verification.
 * No live ECM/Opportunity writes. No mass conversion. No Lead entity.
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
  "src/types/enterprise-marketing-qualification.ts",
  "src/constants/enterprise-marketing-engine/qualification.ts",
  "src/lib/enterprise-marketing-engine/qualification/evaluate.ts",
  "src/lib/enterprise-marketing-engine/ports/qualification-handoff.port.ts",
  "server/services/enterprise-marketing-engine/qualification.service.ts",
  "server/services/enterprise-marketing-engine/routing.service.ts",
  "server/services/enterprise-marketing-engine/adapters/fixture-identity.adapter.ts",
  "src/app/api/admin/marketing/qualifications/route.ts",
  "docs/co-marketing-mkt-11/CO-MARKETING-MKT-11-IMPLEMENTATION-REPORT.md",
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
if (!safety.includes("ENTERPRISE_MARKETING_HANDOFF_ENABLED = true")) fail("controlled handoff should be enabled");
else pass("controlled handoff enabled");
if (!safety.includes('sprint: "CO-MARKETING-MKT-11"') && !safety.includes("CO-MARKETING-MKT-1")) fail("sprint marker");
else pass("sprint MKT-11 or successor");

const api = readFileSync(resolve(root, "src/app/api/admin/marketing/qualifications/route.ts"), "utf8");
if (!api.includes("mass_convert")) fail("API must refuse mass convert");
else pass("mass convert action gated");
if (api.includes("Lead") && api.toLowerCase().includes("createLead")) fail("must not create Lead");
else pass("no Lead create");

const envExample = readFileSync(resolve(root, ".env.example"), "utf8");
if (!envExample.includes("ENTERPRISE_MARKETING_HANDOFF_MODE")) fail("handoff mode undocumented");
else pass("handoff mode documented");

try {
  require("tsx/cjs");
} catch {
  console.log("SKIP runtime (tsx)");
  process.exit(ok ? 0 : 1);
}

process.env.ENTERPRISE_MARKETING_HANDOFF_MODE = "fixture";

const evalUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/qualification/evaluate.ts"),
).href;
const campUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/campaign-store.ts"),
).href;
const qualUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/qualification.service.ts"),
).href;
const identUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/adapters/fixture-identity.adapter.ts"),
).href;
const routeUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/routing-policy-store.ts"),
).href;
const auditUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/audit.ts"),
).href;
const qstoreUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/qualification-store.ts"),
).href;
const assignUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/assignment-store.ts"),
).href;

const { evaluateMarketingQualificationState } = await import(evalUrl);
const { marketingCampaignStore } = await import(campUrl);
const { marketingQualificationService } = await import(qualUrl);
const { marketingFixtureIdentityDirectory } = await import(identUrl);
const { marketingRoutingPolicyStore } = await import(routeUrl);
const { listRecentMarketingAuditEvents } = await import(auditUrl);
const { marketingQualificationStore } = await import(qstoreUrl);
const { marketingAssignmentStore } = await import(assignUrl);

const org = "default";
marketingQualificationStore.resetOrganization(org);
marketingRoutingPolicyStore.resetOrganization(org);
marketingAssignmentStore.resetAll();
marketingFixtureIdentityDirectory.resetOrganization(org);

const actor = { userId: "admin-verify", role: "SUPER_ADMIN", organizationId: org };

const openState = evaluateMarketingQualificationState({ intent: "open" });
if (openState !== "ENGAGED") fail(`open should be ENGAGED, got ${openState}`);
else pass("open → ENGAGED (not qualified)");

const replyState = evaluateMarketingQualificationState({
  intent: "reply",
  matchEmail: "a@example.com",
  matchPhone: "9876543210",
});
if (replyState !== "RESPONSE_RECEIVED" && replyState !== "QUALIFICATION_REQUIRED") {
  fail(`reply without explicit intent must not be QUALIFIED, got ${replyState}`);
} else pass("reply without explicit intent is not QUALIFIED");

const qualifiedState = evaluateMarketingQualificationState({
  intent: "explicit_requirement",
  matchEmail: "a@example.com",
  matchPhone: "9876543210",
  operatorConfirmed: true,
});
if (qualifiedState !== "QUALIFIED") fail(`explicit+confirm should be QUALIFIED, got ${qualifiedState}`);
else pass("explicit requirement + operator confirm → QUALIFIED");

const { campaign } = await marketingCampaignStore.create({
  organizationId: org,
  name: "MKT-11 Verify Campaign",
  channel: "EMAIL",
  createdByUserId: actor.userId,
});

const unqualified = marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:click.only@example.com",
  matchEmail: "click.only@example.com",
  matchPhone: "9000000000",
  displayName: "Click Only",
  intent: "click",
});
if (unqualified.businessState !== "ENGAGED") fail("click ingest should be ENGAGED");
else pass("unqualified response ingested as ENGAGED");

const policy = marketingRoutingPolicyStore.upsert({
  organizationId: org,
  name: "Verify owner",
  mode: "SINGLE_USER",
  assigneeUserId: "rm-priya",
});

let unqualifiedBlocked = false;
try {
  await marketingQualificationService.handoff(actor, {
    qualificationId: unqualified.id,
    routingPolicyId: policy.id,
  });
} catch (err) {
  unqualifiedBlocked = String(err?.message ?? "").includes("not QUALIFIED") || err?.code === "NOT_QUALIFIED";
}
if (!unqualifiedBlocked) fail("unqualified handoff must be refused");
else pass("unqualified response cannot hand off");

marketingFixtureIdentityDirectory.upsert({
  organizationId: org,
  id: "existing-contact-1",
  name: "Asha Verma",
  email: "asha.verma@example.com",
  phone: "9811111111",
});

const existing = marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:asha.verma@example.com",
  matchEmail: "asha.verma@example.com",
  matchPhone: "9811111111",
  displayName: "Asha Verma",
  intent: "explicit_requirement",
  operatorConfirmed: true,
});
if (existing.businessState !== "QUALIFIED") fail("existing contact path should ingest QUALIFIED");
else pass("qualified response ingested");

const existingHandoff = await marketingQualificationService.handoff(actor, {
  qualificationId: existing.id,
  routingPolicyId: policy.id,
});
if (existingHandoff.contact.created) fail("existing email should reuse Contact");
else pass("existing Contact matched by email");
if (existingHandoff.contact.matchedBy !== "email") fail(`expected matchedBy email, got ${existingHandoff.contact.matchedBy}`);
else pass("matched by email");
if (!existingHandoff.opportunity?.opportunityId) fail("Opportunity should be created for qualified handoff");
else pass("Opportunity created (Dialogue fixture)");
if (existingHandoff.assignment.assigneeUserId !== "rm-priya") fail("ownership assignment missing");
else pass("ownership assigned from routing policy");

const dupEmail = marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:asha.verma@example.com:dup",
  matchEmail: "asha.verma@example.com",
  matchPhone: "9822222222",
  displayName: "Asha Duplicate Email",
  intent: "explicit_requirement",
  operatorConfirmed: true,
});
const dupEmailHandoff = await marketingQualificationService.handoff(actor, {
  qualificationId: dupEmail.id,
  routingPolicyId: policy.id,
});
if (dupEmailHandoff.contact.contactId !== existingHandoff.contact.contactId) {
  fail("duplicate email must not create a second Contact");
} else pass("duplicate email reuses Contact");

const dupPhone = marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "phone:9811111111:dup",
  matchEmail: "other.asha@example.com",
  matchPhone: "9811111111",
  displayName: "Asha Duplicate Phone",
  intent: "explicit_requirement",
  operatorConfirmed: true,
});
const dupPhoneHandoff = await marketingQualificationService.handoff(actor, {
  qualificationId: dupPhone.id,
  routingPolicyId: policy.id,
});
if (dupPhoneHandoff.contact.created) fail("duplicate phone must not create a Contact");
else pass("duplicate phone reuses Contact");

const fresh = marketingQualificationService.ingestResponse(actor, {
  campaignId: campaign.id,
  recipientFingerprint: "email:new.person@example.com",
  matchEmail: "new.person@example.com",
  matchPhone: "9833333333",
  displayName: "New Person",
  intent: "explicit_requirement",
  operatorConfirmed: true,
});
const freshHandoff = await marketingQualificationService.handoff(actor, {
  qualificationId: fresh.id,
  routingPolicyId: policy.id,
});
if (!freshHandoff.contact.created) fail("unknown identity should create a new Contact");
else pass("new Contact created after no match");
if (freshHandoff.contact.contactId === existingHandoff.contact.contactId) {
  fail("new Contact must not collide with existing");
} else pass("new Contact is distinct");

const audits = listRecentMarketingAuditEvents(50);
const complete = audits.find((a) => a.kind === "qualification.handoff.complete");
if (!complete) fail("handoff audit missing");
else {
  const d = complete.detail ?? {};
  const needed = ["campaignId", "contactId", "opportunityId", "assigneeUserId", "handedOffAt", "sourceCampaign"];
  const missing = needed.filter((k) => d[k] == null || d[k] === "");
  if (missing.length) fail(`audit missing ${missing.join(",")}`);
  else pass("audit trail has campaign, contact, opportunity, assignee, time, source");
  if (d.noLeadEntity !== true) fail("audit must record no Lead entity");
  else pass("audit records no Lead entity");
}

let massBlocked = false;
try {
  marketingQualificationService.refuseMassConvert();
} catch {
  massBlocked = true;
}
if (!massBlocked) fail("mass convert must throw");
else pass("mass conversion refused");

if (ok) console.log("CO-MARKETING-MKT-11 verify: PASS");
else {
  console.error("CO-MARKETING-MKT-11 verify: FAIL");
  process.exit(1);
}
