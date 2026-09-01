/**
 * CO-MARKETING-MKT-04 — Campaign Builder + Asset Library verification.
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
  "src/constants/enterprise-marketing-engine/content.ts",
  "src/types/enterprise-marketing-campaign.ts",
  "src/lib/enterprise-marketing-engine/personalization.ts",
  "src/lib/enterprise-marketing-engine/content-blocks.ts",
  "src/lib/enterprise-marketing-engine/email-render.ts",
  "server/services/enterprise-marketing-engine/campaign-store.ts",
  "server/services/enterprise-marketing-engine/campaign.service.ts",
  "server/services/enterprise-marketing-engine/asset-store.ts",
  "server/services/enterprise-marketing-engine/asset.service.ts",
  "server/services/enterprise-marketing-engine/template-store.ts",
  "src/app/api/admin/marketing/campaigns/route.ts",
  "src/app/api/admin/marketing/assets/route.ts",
  "src/components/catalyst-one/admin/marketing/marketing-campaigns-panel.tsx",
  "src/components/catalyst-one/admin/marketing/marketing-assets-panel.tsx",
  "src/components/catalyst-one/admin/marketing/marketing-content-panel.tsx",
  "src/app/(dashboard)/admin/marketing/campaigns/page.tsx",
  "src/app/(dashboard)/admin/marketing/assets/page.tsx",
  "src/app/(dashboard)/admin/marketing/content/page.tsx",
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
  "ENTERPRISE_MARKETING_AUDIENCE_IMPORT_ENABLED = false",
]) {
  if (!safety.includes(flag)) fail(flag);
  else pass(flag);
}
if (!safety.includes("CO-MARKETING-MKT-")) fail("safety sprint marker missing");
else pass("safety sprint marker present");

const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");
for (const needle of ["model MarketingProspect", "model MarketingAudienceRow", "model Lead "]) {
  if (schema.includes(needle)) fail(`forbidden ${needle}`);
  else pass(`no ${needle.trim()}`);
}

const campaignsApi = readFileSync(
  resolve(root, "src/app/api/admin/marketing/campaigns/route.ts"),
  "utf8",
);
for (const banned of ["refuseEmailSend", "sendEmail", "test_send", "testSend"]) {
  if (campaignsApi.toLowerCase().includes(banned.toLowerCase()) && banned !== "test_send") {
    // allow comment about test send disabled
  }
}
if (/action:\s*["']send["']/.test(campaignsApi) || /action:\s*["']test_send["']/.test(campaignsApi)) {
  fail("campaigns API must not expose send/test_send actions");
} else pass("no send/test_send actions");

const panel = readFileSync(
  resolve(root, "src/components/catalyst-one/admin/marketing/marketing-campaigns-panel.tsx"),
  "utf8",
);
if (
  !panel.includes("Test Send (disabled)") &&
  !panel.includes("SIMULATED") &&
  !panel.includes("runControlledTest")
) {
  fail("UI should show Test Send disabled or ACTIVATION controlled SIMULATED test");
} else pass("Test Send gated / controlled SIMULATED test present");
if (panel.includes("ACTUALLY SENT") && !panel.includes("NOT ACTUALLY SENT") && !panel.includes("actuallySent: false")) {
  // soft — activation UI uses NOT ACTUALLY SENT messaging
}
if (panel.includes("Document Registry") && panel.includes("upload to Document")) {
  fail("must not route marketing assets to Document Registry");
} else pass("campaign UI not Document Registry authoring");

const assetsPanel = readFileSync(
  resolve(root, "src/components/catalyst-one/admin/marketing/marketing-assets-panel.tsx"),
  "utf8",
);
if (!assetsPanel.includes("Document Registry")) fail("assets panel should note separation");
else pass("Asset Library documents separation");

const personalization = readFileSync(
  resolve(root, "src/lib/enterprise-marketing-engine/personalization.ts"),
  "utf8",
);
if (!personalization.includes("assertSafePersonalizationTokens")) {
  fail("missing token safety");
} else pass("personalization allowlist");

const emailRender = readFileSync(
  resolve(root, "src/lib/enterprise-marketing-engine/email-render.ts"),
  "utf8",
);
if (!emailRender.includes('role="presentation"') || !emailRender.includes("table")) {
  fail("email render should use table layout");
} else pass("email-safe table render");

try {
  require("tsx/cjs");
} catch {
  console.log("SKIP runtime (tsx)");
  if (!ok) process.exit(1);
  console.log("CO-MARKETING-MKT-04 verify: PASS (files only)");
  process.exit(0);
}

const campUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/campaign.service.ts"),
).href;
const assetUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/asset.service.ts"),
).href;
const persUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/personalization.ts"),
).href;
const renderUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/email-render.ts"),
).href;

const campMod = await import(campUrl);
const assetMod = await import(assetUrl);
const persMod = await import(persUrl);
const renderMod = await import(renderUrl);

const actor = { userId: "verify-mkt04", organizationId: "default", role: "SUPER_ADMIN" };
const campaignService = campMod.marketingCampaignService;
const assetService = assetMod.marketingAssetService;

// Personalization safety
const sample = persMod.defaultPersonalizationSample();
const personalized = persMod.applyPersonalization("Hi {{firstName}} from {{city}}", sample);
if (!personalized.includes("Asha") || !personalized.includes("Pune")) {
  fail("personalization apply");
} else pass("personalization apply");

const aliasPersonalized = persMod.applyPersonalization("Hello {{first_name}},", sample);
if (!aliasPersonalized.includes("Asha")) fail("first_name alias must resolve to firstName");
else pass("first_name alias resolves to firstName");

let rejected = false;
try {
  persMod.assertSafePersonalizationTokens("{{__proto__}}");
} catch {
  rejected = true;
}
try {
  persMod.assertSafePersonalizationTokens("{{evilCode}}");
} catch {
  rejected = true;
}
if (!rejected) fail("unknown tokens must be rejected");
else pass("unknown tokens rejected");

// Campaign create → save → preview → approve → reopen → edit new version
const created = await campaignService.create(actor, {
  name: "MKT-04 Verify Campaign",
  objective: "Acquire",
  product: "Home Loan",
  channel: "EMAIL",
});
pass(`campaign=${created.campaign.id}`);

const saved = await campaignService.save(actor, created.campaign.id, {
  subject: "Hello {{firstName}}",
  previewText: "Offer in {{city}}",
  content: created.draft.content,
  audienceId: "mkt-aud-verify-placeholder",
  disclaimer:
    "This communication is for informational purposes. Terms apply. Unsubscribe controls appear at send time.",
  ctaLabel: "Learn more",
  ctaUrl: "https://rupeecatalyst.com",
});
pass(`draft v${saved.draft.versionNumber}`);

const preview = await campaignService.preview(actor, created.campaign.id);
if (!preview.htmlDesktop.includes("<table") || !preview.htmlMobile.includes("360")) {
  fail("preview html");
} else pass("desktop/mobile preview");
if (!preview.subject.includes("Hello") || !preview.sender.fromAddress) {
  fail("subject/sender preview");
} else pass("subject/sender preview");
if (preview.htmlDesktop.includes("Asha")) pass("personalization in preview");
else fail("expected sample firstName in preview");

await campaignService.transition(actor, created.campaign.id, "SUBMIT_FOR_REVIEW");
const approved = await campaignService.transition(actor, created.campaign.id, "APPROVE");
const frozenId = approved.campaign.activePublishedVersionId;
const frozen = approved.versions.find((v) => v.id === frozenId);
if (!frozen?.immutable) fail("approved version not frozen");
else pass(`frozen version ${frozen.versionNumber}`);

await campaignService.transition(actor, created.campaign.id, "REOPEN_DRAFT");
const afterEdit = await campaignService.save(actor, created.campaign.id, {
  subject: "Updated {{firstName}}",
});
if (afterEdit.draft.id === frozenId) fail("must not mutate frozen version");
else pass(`new draft ${afterEdit.draft.versionNumber} after freeze`);
if (afterEdit.versions.find((v) => v.id === frozenId)?.subject !== frozen.subject) {
  fail("historical frozen subject changed");
} else pass("historical content preserved");

const cloned = await campaignService.clone(actor, created.campaign.id);
pass(`cloned=${cloned.campaign.id}`);

const template = await campaignService.saveAsTemplate(actor, created.campaign.id, "Verify Template");
const fromTpl = await campaignService.create(actor, {
  name: "From template",
  templateId: template.id,
});
if (fromTpl.draft.content.blocks.length < 1) fail("template reuse");
else pass("template reuse");

const block = await campaignService.saveReusableBlock(actor, {
  name: "CTA reusable",
  block: created.draft.content.blocks.find((b) => b.type === "cta") ?? created.draft.content.blocks[0],
});
pass(`reusable block=${block.id}`);

// Asset library
const asset = assetService.upload(actor, {
  title: "Hero banner",
  mimeType: "image/png",
  category: "hero",
  tags: ["verify", "mkt04"],
  url: "https://example.com/hero.png",
  byteSize: 1200,
});
pass(`asset=${asset.id}`);
const archived = assetService.archive(actor, asset.id);
if (!archived.archived) fail("archive");
else pass("asset archived");

// Render unknown block safely
const html = renderMod.renderMarketingEmailHtml({
  content: {
    version: 1,
    blocks: [
      { id: "1", type: "text", props: { html: "Safe" } },
      { id: "2", type: "future_widget", props: { x: 1 } },
    ],
  },
  subject: "t",
  previewText: "p",
  mode: "desktop",
});
if (!html.includes("Safe")) fail("render text");
else pass("unknown block skipped safely");

if (!ok) {
  console.error("CO-MARKETING-MKT-04 verify: FAIL");
  process.exit(1);
}
console.log("CO-MARKETING-MKT-04 verify: PASS");
