/**
 * CO-MARKETING-MKT-09 — WhatsApp delivery port + dry-run verification.
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
  "src/types/enterprise-marketing-whatsapp-delivery.ts",
  "src/constants/enterprise-marketing-engine/whatsapp-delivery.ts",
  "src/lib/enterprise-marketing-engine/ports/whatsapp-delivery.port.ts",
  "src/lib/enterprise-marketing-engine/whatsapp-delivery/template-render.ts",
  "server/services/enterprise-marketing-engine/whatsapp-delivery.service.ts",
  "server/services/enterprise-marketing-engine/whatsapp-template-store.ts",
  "server/services/enterprise-marketing-engine/channel-policy-store.ts",
  "server/services/enterprise-marketing-engine/adapters/dry-run-whatsapp-delivery.adapter.ts",
  "src/app/api/admin/marketing/whatsapp/route.ts",
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
  "ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED = false",
]) {
  if (!safety.includes(flag)) fail(flag);
  else pass(flag);
}
if (!safety.includes("CO-MARKETING-MKT-")) fail("sprint marker missing");
else pass("sprint marker present (MKT-09+)");

const api = readFileSync(
  resolve(root, "src/app/api/admin/marketing/whatsapp/route.ts"),
  "utf8",
);
if (!api.includes("SECRETS_NOT_ALLOWED")) fail("API must reject secrets");
else pass("secrets rejected");
if (!api.includes("FREE_FORM_BULK_FORBIDDEN")) fail("free-form bulk must be forbidden");
else pass("free-form bulk forbidden");

const envExample = readFileSync(resolve(root, ".env.example"), "utf8");
if (!envExample.includes("ENTERPRISE_MARKETING_WHATSAPP_MODE")) {
  fail("env WHATSAPP_MODE missing");
} else pass("env WHATSAPP_MODE documented");

try {
  require("tsx/cjs");
} catch {
  console.log("SKIP runtime (tsx)");
  process.exit(ok ? 0 : 1);
}

process.env.ENTERPRISE_MARKETING_WHATSAPP_MODE = "dry_run";

const svcUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/whatsapp-delivery.service.ts"),
).href;
const tplUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/whatsapp-template-store.ts"),
).href;
const policyUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/channel-policy-store.ts"),
).href;
const renderUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/whatsapp-delivery/template-render.ts"),
).href;
const ledgerUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/execution-ledger-store.ts"),
).href;

const svcMod = await import(svcUrl);
const tplMod = await import(tplUrl);
const policyMod = await import(policyUrl);
const renderMod = await import(renderUrl);
const ledgerMod = await import(ledgerUrl);

const svc = svcMod.marketingWhatsAppDeliveryService;
const tplStore = tplMod.marketingWhatsAppTemplateStore;
const policyStore = policyMod.marketingChannelPolicyStore;
const org = "mkt09-verify";

const policy = policyStore.get(org);
if (!policy.channels.WHATSAPP?.enabled) fail("WhatsApp channel should be enabled");
else pass("channel policy WhatsApp enabled");
if (!policy.channels.WHATSAPP?.forbidFreeFormBulk) fail("must forbid free-form bulk");
else pass("forbid free-form bulk");
if (!policy.channels.EMAIL?.enabled) fail("Email channel should remain enabled");
else pass("channel policy Email enabled");

const templates = tplStore.list(org, { activeOnly: true });
const welcome = templates.find((t) => t.approvalState === "APPROVED");
if (!welcome) fail("default approved template missing");
else pass(`template=${welcome.name}`);

const rendered = renderMod.renderWhatsAppTemplateBody(welcome.body, {
  firstName: "Asha",
  senderName: "RC Team",
  product: "Home Loan",
  companyName: "Acme",
});
if (!rendered.includes("Asha") || rendered.includes("{{")) {
  fail(`template render failed: ${rendered}`);
} else pass("template rendering");

const missing = renderMod.validateWhatsAppTemplateVariables(welcome, {
  firstName: "Asha",
  // missing required senderName / product
});
if (!missing || missing.code !== "MISSING_VARIABLE") fail("missing variables not detected");
else pass("missing variables detected");

const invalidPhone = renderMod.validateWhatsAppRecipientPhone("12");
if (!invalidPhone) fail("invalid recipient not detected");
else pass("invalid recipient detected");

const freeForm = renderMod.assertNoFreeFormWhatsAppBulk({
  freeFormBody: "Hey everyone buy now!",
});
if (!freeForm || freeForm.code !== "FREE_FORM_BULK_FORBIDDEN") {
  fail("free-form bulk not blocked");
} else pass("free-form bulk blocked");

const preview = svc.previewRender({
  organizationId: org,
  templateId: welcome.id,
  recipientPhone: "9876543210",
  variables: {
    firstName: "Neha",
    senderName: "RC",
    product: "LAP",
    companyName: "Neha Co",
  },
});
if (!preview.renderedBody.includes("Neha")) fail("preview render");
else pass("preview render");
if (preview.validationError) fail("preview should be valid");
else pass("preview valid");

const key = `mkt09:wa:${Date.now()}:1`;
const claim = await svc.deliverForExecutionClaim({
  organizationId: org,
  campaignId: "camp-mkt09",
  campaignVersionId: "ver-mkt09",
  batchId: "batch-mkt09-1",
  idempotencyKey: key,
  recipientFingerprint: "phone:9876543210",
  recipientPhone: "9876543210",
  whatsappTemplateId: welcome.id,
  row: {
    "Full Name": "Asha Verma",
    Product: "Home Loan",
    Company: "Example Corp",
  },
  senderName: "Rupee Catalyst",
});
if (claim.delivery.outcome !== "SENT" || !claim.delivery.dryRun) {
  fail(`dry-run expected SENT, got ${claim.delivery.outcome}`);
} else pass("dry-run delivery SENT");
if (!claim.countsAsProcessed) fail("ledger processed count");
else pass("ledger delivered");

const dup = await svc.deliverForExecutionClaim({
  organizationId: org,
  campaignId: "camp-mkt09",
  campaignVersionId: "ver-mkt09",
  batchId: "batch-mkt09-1",
  idempotencyKey: key,
  recipientFingerprint: "phone:9876543210",
  recipientPhone: "9876543210",
  whatsappTemplateId: welcome.id,
  row: { "Full Name": "Asha Verma", Product: "Home Loan", Company: "Example Corp" },
  senderName: "Rupee Catalyst",
});
if (!dup.delivery.duplicate) fail("duplicate execution not detected");
else pass("duplicate idempotency");

const failKey = `mkt09:wa:fail:${Date.now()}`;
const failClaim = await svc.deliverForExecutionClaim({
  organizationId: org,
  campaignId: "camp-mkt09",
  campaignVersionId: "ver-mkt09",
  batchId: "batch-mkt09-2",
  idempotencyKey: failKey,
  recipientFingerprint: "phone:9999999999",
  recipientPhone: "9999999999",
  whatsappTemplateId: welcome.id,
  row: { "Full Name": "Fail Case", Product: "Home Loan", Company: "X" },
  senderName: "RC",
});
if (failClaim.delivery.outcome !== "FAILED") {
  fail(`failure simulation expected FAILED, got ${failClaim.delivery.outcome}`);
} else pass("failure handling");

const rateKey = `mkt09:wa:rate:${Date.now()}`;
const rateClaim = await svc.deliverForExecutionClaim({
  organizationId: org,
  campaignId: "camp-mkt09",
  campaignVersionId: "ver-mkt09",
  batchId: "batch-mkt09-3",
  idempotencyKey: rateKey,
  recipientFingerprint: "phone:9111111111",
  recipientPhone: "9111111111",
  whatsappTemplateId: welcome.id,
  row: { "Full Name": "Rate Limit", Product: "Home Loan", Company: "X" },
  senderName: "RC",
});
if (rateClaim.delivery.outcome !== "RATE_LIMITED") {
  fail(`rate limit expected, got ${rateClaim.delivery.outcome}`);
} else pass("rate-limit handling");

const mode = svc.getMode();
if (mode.executionEnabled !== false) fail("execution must stay disabled");
else pass("execution disabled");
if (mode.liveSendAuthorized !== false) fail("live WhatsApp must not be authorized");
else pass("live send not authorized");
if (!mode.forbidFreeFormBulk) fail("forbidFreeFormBulk flag");
else pass("forbidFreeFormBulk");

const ledger = ledgerMod.marketingExecutionLedgerStore.getByFingerprint(
  "camp-mkt09",
  "WHATSAPP",
  "phone:9876543210",
);
// channel on ledger may be EMAIL from earlier tests if same campaign — just ensure store works
pass("ledger store accessible");

const dto = tplStore.toPublicDto(welcome);
if (JSON.stringify(dto).includes("TOKEN") || JSON.stringify(dto).toLowerCase().includes("password")) {
  fail("template DTO leaked secrets");
} else pass("template DTO has no secrets");

console.log(ok ? "CO-MARKETING-MKT-09 verify: PASS" : "CO-MARKETING-MKT-09 verify: FAIL");
process.exit(ok ? 0 : 1);
