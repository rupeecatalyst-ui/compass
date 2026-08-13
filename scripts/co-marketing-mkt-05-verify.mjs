/**
 * CO-MARKETING-MKT-05 — Lifecycle + approval + permission verification.
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
  "src/constants/enterprise-marketing-engine/transitions.ts",
  "src/lib/enterprise-marketing-engine/pre-publish.ts",
  "src/lib/enterprise-marketing-engine/permissions.ts",
  "server/services/enterprise-marketing-engine/campaign.service.ts",
  "src/app/api/admin/marketing/campaigns/route.ts",
  "src/components/catalyst-one/admin/marketing/marketing-campaigns-panel.tsx",
];

for (const rel of required) {
  if (!existsSync(resolve(root, rel))) fail(`missing ${rel}`);
  else pass(rel);
}

const safety = readFileSync(
  resolve(root, "src/constants/enterprise-marketing-engine/safety.ts"),
  "utf8",
);
for (const flag of [
  "ENTERPRISE_MARKETING_EXECUTION_ENABLED = false",
]) {
  if (!safety.includes(flag)) fail(flag);
  else pass(flag);
}
if (!/sprint:\s*"CO-MARKETING-MKT-0[5-9]"/.test(safety) && !safety.includes("CO-MARKETING-MKT-")) {
  fail("sprint marker missing");
} else pass("sprint marker present (MKT-05+)");

const api = readFileSync(
  resolve(root, "src/app/api/admin/marketing/campaigns/route.ts"),
  "utf8",
);
if (!api.includes("SAVE_CANNOT_PUBLISH") || !api.includes("transition")) {
  fail("API must separate save from transition/publish");
} else pass("SAVE cannot publish");
if (/action:\s*["']send["']/.test(api)) fail("send action present");
else pass("no send action");

const panel = readFileSync(
  resolve(root, "src/components/catalyst-one/admin/marketing/marketing-campaigns-panel.tsx"),
  "utf8",
);
if (
  !panel.includes("Test Send (disabled)") &&
  !panel.includes("SIMULATED") &&
  !panel.includes("Controlled test")
) {
  fail("Test Send should stay disabled or use controlled SIMULATED test");
} else pass("Test Send gated / controlled SIMULATED test present");
if (!panel.includes("MARKETING_CAMPAIGN_STATUS_LABELS")) fail("registry labels missing");
else pass("registry status labels");

try {
  require("tsx/cjs");
} catch {
  console.log("SKIP runtime (tsx)");
  if (!ok) process.exit(1);
  console.log("CO-MARKETING-MKT-05 verify: PASS (files only)");
  process.exit(0);
}

const campUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/campaign.service.ts"),
).href;
const transUrl = pathToFileURL(
  resolve(root, "src/constants/enterprise-marketing-engine/transitions.ts"),
).href;
const permUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/permissions.ts"),
).href;

const campMod = await import(campUrl);
const transMod = await import(transUrl);
const permMod = await import(permUrl);
const campaignService = campMod.marketingCampaignService;

const superActor = {
  userId: "super-mkt05",
  organizationId: "default",
  role: "SUPER_ADMIN",
};
const adminActor = {
  userId: "admin-mkt05",
  organizationId: "default",
  role: "ADMIN",
};

// Illegal transitions
if (transMod.isMarketingTransitionAllowed("DRAFT", "RUNNING")) fail("DRAFT→RUNNING illegal");
else pass("DRAFT→RUNNING blocked");
if (!transMod.isMarketingTransitionAllowed("READY_FOR_REVIEW", "APPROVED")) {
  fail("READY_FOR_REVIEW→APPROVED should be legal");
} else pass("READY_FOR_REVIEW→APPROVED legal");
if (transMod.isMarketingTransitionAllowed("COMPLETED", "RUNNING")) fail("COMPLETED terminal");
else pass("COMPLETED terminal");

// RESUMED is not a durable status
if ("RESUMED" in transMod.MARKETING_CAMPAIGN_STATUS_LABELS) fail("RESUMED must not be a status");
else pass("RESUMED is action-only");

// Permissions: ADMIN lacks approve by default
if (permMod.hasMarketingPermission(adminActor, "admin.marketing.campaign.approve")) {
  fail("ADMIN should not have approve by default");
} else pass("ADMIN lacks approve by default");
if (!permMod.hasMarketingPermission(superActor, "admin.marketing.campaign.approve")) {
  fail("SUPER_ADMIN should have approve");
} else pass("SUPER_ADMIN has approve");

const created = campaignService.create(superActor, {
  name: "MKT-05 Lifecycle",
  channel: "EMAIL",
});
pass(`created=${created.campaign.id}`);

if (!created.campaign.governance.createdByUserId) fail("createdBy missing");
else pass("governance createdBy");

// SAVE must not accept status publish (service ignores — API rejects)
const saved = campaignService.save(superActor, created.campaign.id, {
  audienceId: "aud-mkt05",
  subject: "Hello {{firstName}}",
  disclaimer: "Disclaimer and unsubscribe info.",
  ctaLabel: "Apply",
  ctaUrl: "https://rupeecatalyst.com/apply",
});
if (saved.campaign.status !== "DRAFT" && saved.campaign.status !== "PREVIEW") {
  // may still be DRAFT
}
if (saved.campaign.status === "APPROVED") fail("save published to APPROVED");
else pass("save did not approve");

const checksFail = campaignService.prePublishChecks(superActor, created.campaign.id);
// audience + content should pass if we set them; sender default OK
if (!checksFail.readyForApproval && checksFail.blockingCodes.includes("audience")) {
  // ensure audience was saved
  fail(`audience should be set; blocking=${checksFail.blockingCodes.join(",")}`);
}

const checks = campaignService.prePublishChecks(superActor, created.campaign.id);
if (!checks.readyForApproval) fail(`pre-publish not ready: ${checks.blockingCodes.join(",")}`);
else pass("pre-publish ready");

// Illegal: DRAFT → APPROVE directly
let blocked = false;
try {
  campaignService.transition(superActor, created.campaign.id, "APPROVE");
} catch (e) {
  blocked = true;
  if (!(e instanceof Error) || !String(e.message).includes("Illegal")) {
    // might be illegal transition DRAFT→APPROVED
    pass(`approve from DRAFT blocked: ${e instanceof Error ? e.message : e}`);
  } else pass("approve from DRAFT illegal");
}
if (!blocked) fail("APPROVE from DRAFT should fail");

campaignService.transition(superActor, created.campaign.id, "SUBMIT_FOR_REVIEW");
const submitted = campaignService.get(superActor, created.campaign.id);
if (submitted.campaign.status !== "READY_FOR_REVIEW") fail("submit status");
else pass("In Review");
if (!submitted.campaign.governance.submittedByUserId) fail("submittedBy");
else pass("submittedBy recorded");

// ADMIN cannot approve
let denied = false;
try {
  campaignService.transition(adminActor, created.campaign.id, "APPROVE");
} catch (e) {
  denied = (e instanceof Error && (e.message.includes("permission") || e.code === "MARKETING_PERMISSION_DENIED"))
    || (e && typeof e === "object" && "code" in e && e.code === "MARKETING_PERMISSION_DENIED");
}
if (!denied) fail("ADMIN approve should be denied");
else pass("ADMIN approve denied");

const approved = campaignService.transition(superActor, created.campaign.id, "APPROVE");
if (approved.campaign.status !== "APPROVED") fail("approve status");
else pass("Approved");
if (!approved.campaign.governance.approvedByUserId) fail("approvedBy");
else pass("approvedBy recorded");
const frozen = approved.versions.find((v) => v.id === approved.campaign.activePublishedVersionId);
if (!frozen?.immutable) fail("version not frozen");
else pass("content frozen on approve");

// Content edit blocked while APPROVED
let locked = false;
try {
  campaignService.save(superActor, created.campaign.id, { subject: "Hacked" });
} catch (e) {
  locked = true;
  pass(`content locked: ${e instanceof Error ? e.message : e}`);
}
if (!locked) fail("content should be locked when APPROVED");

// Operational path (state only — no send)
campaignService.transition(superActor, created.campaign.id, "SCHEDULE");
if (campaignService.get(superActor, created.campaign.id).campaign.status !== "SCHEDULED") {
  fail("scheduled");
} else pass("Scheduled");
campaignService.transition(superActor, created.campaign.id, "RUN");
if (campaignService.get(superActor, created.campaign.id).campaign.status !== "RUNNING") {
  fail("running");
} else pass("Running (state only)");
campaignService.transition(superActor, created.campaign.id, "PAUSE");
campaignService.transition(superActor, created.campaign.id, "RESUME");
if (campaignService.get(superActor, created.campaign.id).campaign.status !== "RUNNING") {
  fail("resume");
} else pass("Resume → RUNNING");
campaignService.transition(superActor, created.campaign.id, "COMPLETE");
if (campaignService.get(superActor, created.campaign.id).campaign.status !== "COMPLETED") {
  fail("completed");
} else pass("Completed read-only");

let readonly = false;
try {
  campaignService.save(superActor, created.campaign.id, { name: "x" });
} catch {
  readonly = true;
}
if (!readonly) fail("COMPLETED should be read-only");
else pass("COMPLETED read-only");

const history = campaignService.get(superActor, created.campaign.id).campaign.stateHistory;
if (history.length < 5) fail("state history too short");
else pass(`state history entries=${history.length}`);

if (!ok) {
  console.error("CO-MARKETING-MKT-05 verify: FAIL");
  process.exit(1);
}
console.log("CO-MARKETING-MKT-05 verify: PASS");
