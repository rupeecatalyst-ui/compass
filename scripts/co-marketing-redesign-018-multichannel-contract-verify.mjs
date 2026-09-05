/**
 * CO-MARKETING-REDESIGN-018 — Multichannel campaign contracts without activation.
 * Local fixtures only. No send, migrate, commit, or deploy.
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
const settingsPage = read(
  "src/components/catalyst-one/admin/marketing/marketing-settings-panel.tsx",
);
const permLib = read("src/lib/enterprise-marketing-engine/permissions.ts");
const gates = read("scripts/co-marketing-redesign-pre-staging-gates.mjs");
const monitoring010 = read("src/lib/enterprise-marketing-engine/monitoring.ts");
const explorer010 = read("src/lib/enterprise-marketing-engine/recipient-explorer.ts");
const evaluateSrc = read("src/lib/enterprise-marketing-engine/qualification/evaluate.ts");
const inboxSrc = read("src/lib/enterprise-marketing-engine/qualification/inbox-boundary.ts");
const composeSrc = read("src/lib/enterprise-marketing-engine/attribution/compose-attribution.ts");
const responsesUi = read("src/components/catalyst-one/admin/marketing/marketing-responses-panel.tsx");
const typesSrc = read("src/types/enterprise-marketing-channel-contract.ts");
const contractConst = read("src/constants/enterprise-marketing-engine/channel-contracts.ts");
const contractLib = read("src/lib/enterprise-marketing-engine/channel-contracts.ts");
const lifecycle = read("src/constants/enterprise-marketing-engine/lifecycle.ts");
const eligibility = read("src/constants/enterprise-marketing-engine/whatsapp-delivery.ts");
const smsPort = read("src/lib/enterprise-marketing-engine/ports/sms-delivery.port.ts");
const messengerPort = read("src/lib/enterprise-marketing-engine/ports/messenger-delivery.port.ts");
const landingPort = read("src/lib/enterprise-marketing-engine/ports/landing-page.port.ts");
const disabledPorts = read("src/lib/enterprise-marketing-engine/disabled-ports.ts");
const safetyLib = read("src/lib/enterprise-marketing-engine/safety.ts");

mustInclude(pkg, "verify:co-marketing-redesign-018");
mustInclude(gates, "verify:co-marketing-redesign-018");
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
mustInclude(monitoring010, 'unavailableMarketingMetric("Not connected")');
mustInclude(explorer010, "maskMarketingRecipientEmail");
mustInclude(evaluateSrc, 'intent === "open" || input.intent === "click"');
mustInclude(inboxSrc, "openClickDoesNotCreateContact");
mustInclude(responsesUi, "do not create a Contact or Opportunity");
mustInclude(composeSrc, "composeMarketingAttributionDashboard");
mustInclude(lifecycle, '["EMAIL", "WHATSAPP", "DIGITAL"]');
mustInclude(eligibility, "enabled: true");
mustInclude(eligibility, "requiresApprovedTemplate: true");
mustInclude(typesSrc, '"SMS"');
mustInclude(typesSrc, '"MESSENGER"');
mustInclude(typesSrc, '"DIGITAL_ADS"');
mustInclude(typesSrc, '"LANDING_PAGE"');
mustInclude(typesSrc, "omitsEmailSubject");
mustInclude(typesSrc, "sharedQualification: true");
mustInclude(typesSrc, "sharedAttribution: true");
mustInclude(typesSrc, "sharedApproval: true");
mustInclude(typesSrc, "sharedAudit: true");
mustInclude(contractConst, 'productSurface: "operational"');
mustInclude(contractConst, 'productSurface: "not_configured"');
mustInclude(contractConst, "MARKETING_WHATSAPP_OPT_IN_REQUIRED = true");
mustInclude(contractConst, "gsm7Single: 160");
mustInclude(contractConst, "unicodeSingle: 70");
mustInclude(contractLib, "assertMarketingNonEmailProviderExecute");
mustInclude(smsPort, "MarketingSmsDeliveryPort");
mustInclude(messengerPort, "MarketingMessengerDeliveryPort");
mustInclude(landingPort, "MarketingLandingPagePort");
mustInclude(disabledPorts, 'blocked("sms.delivery")');
mustInclude(disabledPorts, 'blocked("messenger.delivery")');
mustInclude(disabledPorts, 'blocked("landing_page.publish")');
mustInclude(safetyLib, "refuseSmsSend");
mustInclude(safetyLib, "assertWhatsAppDeliveryAllowed");
mustInclude(builderPage, "MARKETING_CHANNEL_NOT_CONFIGURED_LABEL");
mustInclude(builderPage, 'if (value === "EMAIL") setChannel("EMAIL")');
mustInclude(builderPage, 'htmlFor="mkt-builder-subject"');
mustInclude(builderPage, 'htmlFor="mkt-builder-preheader"');
mustInclude(builderPage, "Message editor");
mustInclude(builderPage, 'channel === "EMAIL"');
mustInclude(builderPage, 'data-mkt-channel-surface="not_configured"');
mustInclude(settingsPage, "Campaign channels");
mustInclude(settingsPage, "MARKETING_CHANNEL_NOT_CONFIGURED_LABEL");
assert.doesNotMatch(builderPage, /Approved WhatsApp template/);
assert.doesNotMatch(contractLib, /liveProviderExecute:\s*true/);

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
process.env.ENTERPRISE_MARKETING_EMAIL_MODE = process.env.ENTERPRISE_MARKETING_EMAIL_MODE || "dry_run";
process.env.ENTERPRISE_MARKETING_WHATSAPP_MODE = process.env.ENTERPRISE_MARKETING_WHATSAPP_MODE || "dry_run";

const kinds = ["EMAIL", "WHATSAPP", "SMS", "MESSENGER", "DIGITAL_ADS", "LANDING_PAGE"];

const contractUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/channel-contracts.ts"),
).href;
const constUrl = pathToFileURL(
  resolve(root, "src/constants/enterprise-marketing-engine/channel-contracts.ts"),
).href;
const safetyUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/safety.ts")).href;
const disabledUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/disabled-ports.ts"),
).href;
const shellUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/campaign-builder-shell.ts"),
).href;
const evaluateUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/qualification/evaluate.ts"),
).href;
const inboxUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/qualification/inbox-boundary.ts"),
).href;

const {
  emptyMarketingChannelContent,
  marketingChannelContentHasSubject,
  marketingChannelContentHasPreheader,
  estimateMarketingSmsSegments,
  marketingWhatsAppTemplateReadyForSend,
  previewMarketingChannelContent,
  assertMarketingNonEmailProviderExecute,
  assertSmsDeliveryAllowed,
  assertMessengerDeliveryAllowed,
  assertLandingPageExecuteAllowed,
  assertDigitalAdsExecuteAllowed,
  marketingChannelLiveProviderCanExecute,
  marketingChannelCanExecuteAsProduct,
  marketingChannelContract,
} = await import(contractUrl);
const {
  MARKETING_CHANNEL_CONTRACTS,
  MARKETING_CHANNEL_NOT_CONFIGURED_LABEL,
  MARKETING_CAMPAIGN_CHANNEL_KINDS,
  MARKETING_WHATSAPP_OPT_IN_REQUIRED,
} = await import(constUrl);
const {
  assertEmailDeliveryAllowed,
  assertWhatsAppDeliveryAllowed,
  refuseEmailSend,
  refuseWhatsAppSend,
  refuseSmsSend,
  refuseMessengerSend,
  refuseLandingPagePublish,
  refuseDigitalLaunch,
  EnterpriseMarketingSafetyError,
} = await import(safetyUrl);
const {
  disabledMarketingSmsDeliveryPort,
  disabledMarketingMessengerDeliveryPort,
  disabledMarketingLandingPagePort,
  disabledMarketingDigitalChannelPort,
  disabledMarketingWhatsAppChannelPort,
} = await import(disabledUrl);
const { validateMarketingBuilderStep } = await import(shellUrl);
const { evaluateMarketingQualificationState } = await import(evaluateUrl);
const { canCreateContactFromQualificationState } = await import(inboxUrl);

assert.deepEqual([...MARKETING_CAMPAIGN_CHANNEL_KINDS], kinds);

for (const kind of kinds) {
  const contract = MARKETING_CHANNEL_CONTRACTS[kind];
  assert.equal(contract.sharedBasics, true, `${kind} sharedBasics`);
  assert.equal(contract.sharedAudience, true, `${kind} sharedAudience`);
  assert.equal(contract.sharedApproval, true, `${kind} sharedApproval`);
  assert.equal(contract.sharedAudit, true, `${kind} sharedAudit`);
  assert.equal(contract.sharedQualification, true, `${kind} sharedQualification`);
  assert.equal(contract.sharedAttribution, true, `${kind} sharedAttribution`);
  assert.equal(contract.delivery.liveProviderExecute, false, `${kind} liveProviderExecute`);
  assert.equal(contract.sender.credentialsForbidden, true, `${kind} credentialsForbidden`);
  assert.equal(marketingChannelLiveProviderCanExecute(kind), false, `${kind} live execute`);
  assert.equal(marketingChannelContract(kind).kind, kind);
}

assert.equal(MARKETING_CHANNEL_CONTRACTS.EMAIL.productSurface, "operational");
assert.equal(MARKETING_CHANNEL_CONTRACTS.EMAIL.content.omitsEmailSubject, false);
assert.equal(MARKETING_CHANNEL_CONTRACTS.WHATSAPP.productSurface, "not_configured");
assert.equal(MARKETING_CHANNEL_CONTRACTS.WHATSAPP.content.omitsEmailSubject, true);
assert.equal(MARKETING_CHANNEL_CONTRACTS.WHATSAPP.content.omitsEmailPreheader, true);
assert.equal(MARKETING_CHANNEL_CONTRACTS.SMS.content.omitsEmailSubject, true);
assert.equal(MARKETING_WHATSAPP_OPT_IN_REQUIRED, true);
assert.equal(MARKETING_CHANNEL_CONTRACTS.WHATSAPP.consent.optInRequired, true);
assert.equal(MARKETING_CHANNEL_CONTRACTS.WHATSAPP.limits.rules.requiresApprovedTemplate, true);

assert.equal(marketingChannelCanExecuteAsProduct("EMAIL"), true);
assert.equal(marketingChannelCanExecuteAsProduct("WHATSAPP"), false);
assert.equal(marketingChannelCanExecuteAsProduct("SMS"), false);
assert.equal(marketingChannelCanExecuteAsProduct("MESSENGER"), false);
assert.equal(marketingChannelCanExecuteAsProduct("DIGITAL_ADS"), false);
assert.equal(marketingChannelCanExecuteAsProduct("LANDING_PAGE"), false);

const emailContent = emptyMarketingChannelContent("EMAIL");
const waContent = emptyMarketingChannelContent("WHATSAPP");
const smsContent = emptyMarketingChannelContent("SMS");
assert.equal(emailContent.kind, "EMAIL");
assert.equal("subject" in emailContent, true);
assert.equal("preheader" in emailContent, true);
assert.equal(marketingChannelContentHasSubject(emailContent), true);
assert.equal(marketingChannelContentHasPreheader(emailContent), true);
assert.equal("subject" in waContent, false);
assert.equal("preheader" in waContent, false);
assert.equal(marketingChannelContentHasSubject(waContent), false);
assert.equal("subject" in smsContent, false);
assert.equal("preheader" in smsContent, false);
assert.equal(waContent.optInRequired, true);
assert.equal(smsContent.templateRef, null);
assert.equal(smsContent.complianceRef, null);

assert.equal(
  marketingWhatsAppTemplateReadyForSend({
    approvalState: "DRAFT",
    optInRequired: true,
    category: "MARKETING",
  }),
  false,
);
assert.equal(
  marketingWhatsAppTemplateReadyForSend({
    approvalState: "APPROVED",
    optInRequired: true,
    category: "MARKETING",
  }),
  true,
);
assert.equal(
  marketingWhatsAppTemplateReadyForSend({
    approvalState: "APPROVED",
    optInRequired: true,
    category: "UTILITY",
  }),
  true,
);
assert.equal(
  marketingWhatsAppTemplateReadyForSend({
    approvalState: "APPROVED",
    optInRequired: true,
    category: "AUTHENTICATION",
  }),
  false,
);
assert.equal(
  marketingWhatsAppTemplateReadyForSend({
    approvalState: "APPROVED",
    optInRequired: false,
    category: "MARKETING",
  }),
  false,
);

const shortSms = estimateMarketingSmsSegments("Hello RC");
assert.equal(shortSms.encoding, "gsm7");
assert.equal(shortSms.segments, 1);
const unicodeSms = estimateMarketingSmsSegments("नमस्ते");
assert.equal(unicodeSms.encoding, "unicode");
assert.equal(unicodeSms.segments, 1);

assert.equal(previewMarketingChannelContent(emailContent).mode, "email_html");
assert.equal(previewMarketingChannelContent(waContent).label, MARKETING_CHANNEL_NOT_CONFIGURED_LABEL);
assert.equal(previewMarketingChannelContent(smsContent).label, MARKETING_CHANNEL_NOT_CONFIGURED_LABEL);
assert.equal(
  previewMarketingChannelContent(emptyMarketingChannelContent("MESSENGER")).label,
  MARKETING_CHANNEL_NOT_CONFIGURED_LABEL,
);

assert.doesNotThrow(() => assertEmailDeliveryAllowed());
assert.doesNotThrow(() => assertWhatsAppDeliveryAllowed());
assert.doesNotThrow(() => assertMarketingNonEmailProviderExecute("EMAIL"));
assert.throws(
  () => assertMarketingNonEmailProviderExecute("WHATSAPP"),
  (err) => err instanceof EnterpriseMarketingSafetyError,
);
assert.throws(() => assertSmsDeliveryAllowed(), (err) => err instanceof EnterpriseMarketingSafetyError);
assert.throws(() => assertMessengerDeliveryAllowed(), (err) => err instanceof EnterpriseMarketingSafetyError);
assert.throws(() => assertLandingPageExecuteAllowed(), (err) => err instanceof EnterpriseMarketingSafetyError);
assert.throws(() => assertDigitalAdsExecuteAllowed(), (err) => err instanceof EnterpriseMarketingSafetyError);
assert.throws(() => refuseEmailSend(), (err) => err instanceof EnterpriseMarketingSafetyError);
assert.throws(() => refuseWhatsAppSend(), (err) => err instanceof EnterpriseMarketingSafetyError);
assert.throws(() => refuseSmsSend(), (err) => err instanceof EnterpriseMarketingSafetyError);
assert.throws(() => refuseMessengerSend(), (err) => err instanceof EnterpriseMarketingSafetyError);
assert.throws(() => refuseLandingPagePublish(), (err) => err instanceof EnterpriseMarketingSafetyError);
assert.throws(() => refuseDigitalLaunch(), (err) => err instanceof EnterpriseMarketingSafetyError);

await assert.rejects(
  () =>
    disabledMarketingSmsDeliveryPort.deliver({
      idempotencyKey: "018",
      organizationId: "org-018",
      campaignId: "camp-018",
      recipientFingerprint: "sms:fixture",
      body: "hello",
    }),
  (err) => err instanceof EnterpriseMarketingSafetyError,
);
await assert.rejects(
  () =>
    disabledMarketingMessengerDeliveryPort.deliver({
      idempotencyKey: "018",
      organizationId: "org-018",
      campaignId: "camp-018",
      recipientFingerprint: "msg:fixture",
    }),
  (err) => err instanceof EnterpriseMarketingSafetyError,
);
await assert.rejects(
  () => disabledMarketingLandingPagePort.publish({ campaignId: "camp-018", pagePath: "/x" }),
  (err) => err instanceof EnterpriseMarketingSafetyError,
);
await assert.rejects(
  () =>
    disabledMarketingDigitalChannelPort.syncCampaign({
      campaignId: "camp-018",
      campaignVersionId: "v1",
      externalAccountRef: "acct",
      payload: {},
    }),
  (err) => err instanceof EnterpriseMarketingSafetyError,
);
await assert.rejects(
  () => disabledMarketingWhatsAppChannelPort.send({}),
  (err) => err instanceof EnterpriseMarketingSafetyError,
);

const emailDraft = {
  name: "018 Email",
  internalDescription: "",
  objective: "",
  channel: "EMAIL",
  ownerUserId: "",
  tags: [],
  bindingId: "",
  datasetId: "",
  audienceId: "",
  columnMapEmail: "",
  mappingConfirmed: false,
  snapshotStatus: "Unavailable",
  filterCount: 0,
  exclusionCount: 0,
  eligibleCount: null,
  senderName: "",
  senderAddress: "",
  subject: "",
  preheader: "",
  templateId: "",
  messageBody: "",
  personalizationSample: {},
  startAt: "",
  timezone: "Asia/Kolkata",
  batchSize: 100,
  intervalMs: 3_600_000,
  windowStart: "09:00",
  windowEnd: "19:00",
  dailyMax: 500,
};
assert.equal(validateMarketingBuilderStep(1, emailDraft).ok, true);
assert.equal(validateMarketingBuilderStep(1, { ...emailDraft, channel: "WHATSAPP" }).ok, false);
assert.match(
  validateMarketingBuilderStep(1, { ...emailDraft, channel: "DIGITAL" }).message,
  /Not configured/,
);

assert.equal(evaluateMarketingQualificationState({ intent: "open" }), "ENGAGED");
assert.equal(evaluateMarketingQualificationState({ intent: "click" }), "ENGAGED");
assert.equal(canCreateContactFromQualificationState("ENGAGED"), false);

console.log("CO-MARKETING-REDESIGN-018 PASS");
