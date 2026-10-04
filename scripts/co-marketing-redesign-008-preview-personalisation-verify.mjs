/**
 * CO-MARKETING-REDESIGN-008 — Personalisation catalogue, preview workspace, dry-run test send.
 * Local fixtures only. No send, migrate, commit, or deploy.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

process.env.ENTERPRISE_MARKETING_EMAIL_MODE = "dry_run";
process.env.ENTERPRISE_MARKETING_EXECUTION_ENABLED = "false";

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function mustInclude(haystack, needle, label = needle) {
  assert.ok(haystack.includes(needle), `missing ${label}`);
}

const pkg = read("package.json");
const catalogueSrc = read("src/lib/enterprise-marketing-engine/personalisation-catalogue.ts");
const previewSrc = read("src/lib/enterprise-marketing-engine/preview-workspace.ts");
const testSrc = read("src/lib/enterprise-marketing-engine/test-send-safety.ts");
const prePublish = read("src/lib/enterprise-marketing-engine/pre-publish.ts");
const builderPage = read(
  "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
);
const testPanel = read(
  "src/components/catalyst-one/admin/marketing/marketing-controlled-test-panel.tsx",
);
const previewUi = read(
  "src/components/catalyst-one/admin/marketing/marketing-preview-workspace.tsx",
);
const campaignService = read("server/services/enterprise-marketing-engine/campaign.service.ts");
const contentConst = read("src/constants/enterprise-marketing-engine/content.ts");
const personConst = read("src/constants/enterprise-marketing-engine/personalisation.ts");

mustInclude(pkg, "verify:co-marketing-redesign-008");
mustInclude(catalogueSrc, "buildMarketingPersonalisationCatalogue");
mustInclude(catalogueSrc, "inspectMarketingPersonalisationUsage");
mustInclude(previewSrc, "inspectMarketingPreviewWorkspace");
mustInclude(previewSrc, "audience_preview");
mustInclude(testSrc, "actuallySent: false");
mustInclude(testSrc, "assertMarketingInternalTestRecipient");
mustInclude(prePublish, 'id: "personalisation"');
mustInclude(builderPage, "Available mapped variables");
mustInclude(builderPage, "Resolved sample preview");
mustInclude(builderPage, "Unresolved");
mustInclude(builderPage, "MarketingPreviewWorkspace");
mustInclude(builderPage, "MarketingControlledTestPanel");
mustInclude(builderPage, "mkt-production-lane");
mustInclude(previewUi, "Desktop view");
mustInclude(previewUi, "Mobile view");
mustInclude(previewUi, "Link inventory");
mustInclude(previewUi, "Missing-image warning");
mustInclude(previewUi, "Unsubscribe verification");
mustInclude(testPanel, "No real email was delivered");
mustInclude(testPanel, "mkt-test-lane");
mustInclude(testPanel, "action: \"test_send\"");
mustInclude(campaignService, "forceMarketingTestSendNotActuallySent");
mustInclude(campaignService, "MARKETING_TEST_SEND_DRY_RUN_NOTICE");
mustInclude(personConst, "rupeecatalyst.com");
mustInclude(contentConst, 'lastName: "Customer"');
assert.doesNotMatch(builderPage, /test_send/);
assert.doesNotMatch(builderPage, /run_test_batch/);
assert.doesNotMatch(catalogueSrc, /vars.push\("mobile"\)/);
assert.doesNotMatch(catalogueSrc, /vars.push\("email"\)/);

const catalogueUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/personalisation-catalogue.ts"),
).href;
const previewUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/preview-workspace.ts")).href;
const testUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/test-send-safety.ts")).href;
const preUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/pre-publish.ts")).href;
const renderUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/email-render.ts")).href;
const blocksUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/content-blocks.ts")).href;
const personalizationUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/personalization.ts"),
).href;

const catalogue = await import(catalogueUrl);
const preview = await import(previewUrl);
const testSend = await import(testUrl);
const pre = await import(preUrl);
const render = await import(renderUrl);
const blocks = await import(blocksUrl);
const personalization = await import(personalizationUrl);

testSend.resetMarketingTestSendHistory();

const sensitiveMap = {
  email: "Email",
  name: "Full Name",
  mobile: "Phone",
  location: "City",
  productInterest: "Profession",
  consent: "Consent",
  sourceStableKey: "External Key",
  extras: { secret: "SSN" },
};
const entries = catalogue.buildMarketingPersonalisationCatalogue({
  columnMap: sensitiveMap,
  mappingConfirmed: true,
  senderName: "RC Campaigns",
});
const tokens = entries.map((row) => row.token);
assert.equal(tokens.includes("mobile"), false, "mobile must not be auto-exposed");
assert.equal(tokens.includes("email"), false, "email must not be a merge variable");
assert.equal(tokens.includes("consent"), false);
assert.ok(tokens.includes("firstName"));
assert.ok(tokens.includes("fullName"));
assert.ok(tokens.includes("city"));
assert.ok(tokens.includes("product"));
assert.ok(tokens.includes("senderName"));
assert.equal(
  tokens.includes("secret"),
  false,
  "non-allowlisted extras must not become variables",
);

const projected = catalogue.projectAllowlistedSampleValues({
  name: "Asha Verma",
  location: "Pune",
  productInterest: "Home Loan",
  extras: { mobile: "9999999999", lastName: "Shah" },
});
assert.equal(projected.mobile, undefined);
assert.equal(projected.firstName, "Asha");
assert.equal(projected.city, "Pune");
assert.equal(projected.product, "Home Loan");
assert.notEqual(projected.lastName, "9999999999");

const missing = personalization.applyPersonalization("Hello {{firstName}} in {{city}}", {});
assert.match(missing, /there/);
assert.match(missing, /your city/);

const unsupported = catalogue.inspectMarketingPersonalisationUsage({
  subject: "Hi {{ssn}} {{firstName}}",
  preheader: "",
  messageBody: "",
  mappedVariables: ["firstName"],
  mappingConfirmed: true,
});
assert.ok(unsupported.unsupportedTokens.includes("ssn"));
assert.equal(unsupported.blocking, true);

const unresolved = catalogue.inspectMarketingPersonalisationUsage({
  subject: "Hi {{firstName}}",
  preheader: "{{city}}",
  content: {
    version: 1,
    blocks: [{ id: "t1", type: "text", props: { html: "Secret {{mobile}}" } }],
  },
  mappedVariables: [],
  mappingConfirmed: true,
});
assert.ok(unresolved.unresolvedTokens.includes("firstName"));
assert.ok(unresolved.unsupportedTokens.includes("mobile"));
assert.equal(unresolved.blocking, true);

const campaign = {
  id: "c1",
  organizationId: "org-1",
  name: "Nurture",
  audienceId: "aud-1",
  channel: "EMAIL",
  sender: { fromName: "RC", fromAddress: "n@example.com" },
  status: "DRAFT",
  currentDraftVersionId: "v1",
  schedulePlaceholder: { enabled: false },
  routingPlaceholder: { mode: "UNCONFIGURED" },
  notificationPlaceholder: { inApp: false, email: false, whatsapp: false },
  governance: {
    createdByUserId: "u1",
    modifiedByUserId: null,
    submittedByUserId: null,
    approvedByUserId: null,
    scheduledByUserId: null,
    submittedAt: null,
    approvedAt: null,
    scheduledAt: null,
  },
  stateHistory: [],
  createdAt: "2026-09-05T00:00:00.000Z",
  updatedAt: "2026-09-05T00:00:00.000Z",
};
const doc = blocks.createEmptyContentDocument();
const version = {
  id: "v1",
  campaignId: "c1",
  versionNumber: 1,
  immutable: false,
  subject: "Hello {{firstName}}",
  previewText: "Hi {{city}}",
  content: doc,
  trackingEnabled: false,
  ctaLabel: "Apply",
  ctaUrl: "https://rupeecatalyst.com/apply",
  createdAt: "2026-09-05T00:00:00.000Z",
  updatedAt: "2026-09-05T00:00:00.000Z",
};
const blocked = pre.runMarketingPrePublishChecks({
  campaign,
  version,
  columnMap: { email: "Email" },
  mappingConfirmed: true,
});
assert.equal(blocked.checks.some((c) => c.id === "personalisation" && c.passed === false), true);
assert.ok(blocked.blockingCodes.includes("personalisation"));

const mappedReady = pre.runMarketingPrePublishChecks({
  campaign,
  version,
  columnMap: {
    email: "Email",
    name: "Full Name",
    location: "City",
    productInterest: "Profession",
  },
  mappingConfirmed: true,
});
assert.equal(mappedReady.checks.find((c) => c.id === "personalisation")?.passed, true);

const htmlDesktop = render.renderMarketingEmailHtml({
  content: doc,
  subject: "Hello",
  previewText: "Preview",
  mode: "desktop",
});
const htmlMobile = render.renderMarketingEmailHtml({
  content: doc,
  subject: "Hello",
  previewText: "Preview",
  mode: "mobile",
});
preview.assertMarketingDesktopMobileRender(htmlDesktop, htmlMobile);
const inspection = preview.inspectMarketingPreviewWorkspace({
  content: doc,
  htmlDesktop,
  htmlMobile,
});
assert.equal(inspection.unsubscribeVerified, true);
assert.ok(inspection.linkInventory.some((link) => link.kind === "cta"));
assert.ok(inspection.linkInventory.some((link) => link.kind === "unsubscribe"));

const withMissingImage = {
  ...doc,
  blocks: [
    ...doc.blocks,
    { id: "img-missing", type: "image", props: { url: "", alt: "Offer" } },
  ],
};
const missingImage = preview.inspectMarketingPreviewWorkspace({
  content: withMissingImage,
  htmlDesktop,
  htmlMobile,
});
assert.ok(missingImage.missingImageWarnings.length >= 1);

assert.equal(testSend.isMarketingInternalTestRecipient("qa@rupeecatalyst.com"), true);
assert.equal(testSend.isMarketingInternalTestRecipient("user@gmail.com"), false);
assert.throws(() => testSend.assertMarketingInternalTestRecipient("user@gmail.com"));
assert.throws(() => testSend.assertMarketingTestSendConfirmed({ confirmed: false }));
assert.equal(testSend.forceMarketingTestSendNotActuallySent(), false);
testSend.assertMarketingTestSendDryRunOnly({ dryRun: true });
assert.throws(() => testSend.assertMarketingTestSendDryRunOnly({ dryRun: false }));

const history = testSend.recordMarketingTestSendHistory({
  id: "hist-1",
  campaignId: "c1",
  campaignVersionId: "v1",
  campaignVersionNumber: 3,
  requesterUserId: "u1",
  recipientEmail: "qa@rupeecatalyst.com",
  timestamp: "2026-09-05T04:00:00.000Z",
  adapterResult: "dry_run:SENT",
  failureReason: null,
  actuallySent: true,
  dryRun: false,
});
assert.equal(history.actuallySent, false);
assert.equal(history.dryRun, true);
assert.match(history.notice, /No real email was delivered/i);
assert.equal(testSend.listMarketingTestSendHistory("c1")[0].actuallySent, false);

const sample = preview.pickAudiencePreviewSample(
  [
    {
      id: "row:4",
      sourceRowNumber: 4,
      label: "Row 4 · Asha Verma · Pune",
      values: { firstName: "Asha", fullName: "Asha Verma", city: "Pune" },
      source: "audience_preview",
    },
  ],
  "row:4",
);
assert.equal(sample?.values.firstName, "Asha");
const unavailable = preview.describeMarketingPreviewSample({ sample: null, senderName: "RC" });
assert.equal(unavailable.available, false);
assert.equal(unavailable.source, "unavailable");
assert.notEqual(unavailable.values.firstName, "Asha");

const inserted = catalogue.insertPersonalisationTokenIntoDocument(doc, "company");
assert.equal(JSON.stringify(doc).includes("{{company}}"), false);
assert.match(JSON.stringify(inserted), /\{\{company\}\}/);

console.log(
  JSON.stringify(
    {
      ok: true,
      allowlisting: true,
      fallbackResolution: true,
      unresolvedBlocksApproval: true,
      desktopMobileRender: true,
      testProductionSeparated: true,
      dryRunOnly: true,
      actuallySent: false,
    },
    null,
    2,
  ),
);
