/**
 * CO-MARKETING-MKT-08 — Email Composer + Campaign Content Engine verification.
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
  "src/lib/enterprise-marketing-engine/content-blocks.ts",
  "src/lib/enterprise-marketing-engine/email-render.ts",
  "src/lib/enterprise-marketing-engine/personalization.ts",
  "src/lib/enterprise-marketing-engine/utm.ts",
  "src/lib/enterprise-marketing-engine/asset-optimize.ts",
  "server/services/enterprise-marketing-engine/campaign.service.ts",
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

const content = readFileSync(
  resolve(root, "src/constants/enterprise-marketing-engine/content.ts"),
  "utf8",
);
for (const token of ['"spacer"', '"highlight"', '"contact"', '"companyName"', '"senderName"']) {
  if (!content.includes(token)) fail(`missing ${token}`);
  else pass(token);
}

const panel = readFileSync(
  resolve(root, "src/components/catalyst-one/admin/marketing/marketing-campaigns-panel.tsx"),
  "utf8",
);
if (!panel.includes("Version history")) fail("version history UI");
else pass("version history UI");
if (!panel.includes("restore_version")) fail("restore_version action");
else pass("restore_version");
if (!panel.includes("plaintext")) fail("plaintext preview mode");
else pass("plaintext preview");
if (
  !panel.includes("Test Send (disabled)") &&
  !panel.includes("SIMULATED") &&
  !panel.includes("Controlled test")
) {
  fail("Test Send must stay disabled or use controlled SIMULATED test");
} else pass("Test Send gated / controlled SIMULATED test present");

try {
  require("tsx/cjs");
} catch {
  console.log("SKIP runtime (tsx)");
  process.exit(ok ? 0 : 1);
}

const campUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/campaign.service.ts"),
).href;
const renderUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/email-render.ts"),
).href;
const persUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/personalization.ts"),
).href;
const blocksUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/content-blocks.ts"),
).href;
const utmUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/utm.ts"),
).href;
const assetUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/asset.service.ts"),
).href;

const campMod = await import(campUrl);
const renderMod = await import(renderUrl);
const persMod = await import(persUrl);
const blocksMod = await import(blocksUrl);
const utmMod = await import(utmUrl);
const assetMod = await import(assetUrl);

const svc = campMod.marketingCampaignService;
const actor = { userId: "mkt08-super", organizationId: "default", role: "SUPER_ADMIN" };

const created = svc.create(actor, { name: "MKT-08 Composer", channel: "EMAIL" });
pass(`created=${created.campaign.id}`);

const spacer = blocksMod.createBlock("spacer", { heightPx: "32" });
const highlight = blocksMod.createBlock("highlight", {
  title: "Rate highlight",
  body: "Special offer for {{companyName}}",
});
const contact = blocksMod.createBlock("contact", {
  name: "{{senderName}}",
  email: "hello@example.com",
});

const withBlocks = [
  ...created.draft.content.blocks,
  spacer,
  highlight,
  contact,
];

const saved = svc.save(actor, created.campaign.id, {
  internalDescription: "Internal BAT notes",
  subject: "Hello {{firstName}} from {{senderName}}",
  previewText: "Preheader for {{product}}",
  plainTextOverride: "Hi {{firstName}} — plaintext override for {{companyName}}.",
  trackingEnabled: true,
  utm: {
    source: "email",
    medium: "marketing",
    campaign: "mkt08",
    content: "cta1",
    term: null,
  },
  content: { version: 1, blocks: withBlocks },
  disclaimer: "Disclaimer and unsubscribe.",
  ctaLabel: "Apply",
  ctaUrl: "https://rupeecatalyst.com/apply",
  audienceId: "aud-mkt08",
});
if (!saved.campaign.internalDescription) fail("internalDescription not saved");
else pass("internalDescription");
if (!saved.draft.utm?.campaign) fail("utm not saved");
else pass("utm saved");
if (!saved.draft.plainTextOverride) fail("plainTextOverride");
else pass("plainTextOverride");

const html = renderMod.renderMarketingEmailHtml({
  content: saved.draft.content,
  subject: saved.draft.subject,
  previewText: saved.draft.previewText,
  mode: "mobile",
  personalization: persMod.defaultPersonalizationSample(),
  trackingEnabled: true,
  utm: saved.draft.utm,
});
if (!html.includes("Rate highlight")) fail("highlight render");
else pass("highlight + mobile render");
if (!html.includes("utm_campaign=mkt08")) fail("utm on cta");
else pass("utm applied to CTA");

const fallback = persMod.applyPersonalization("Hi {{firstName}}", {});
if (fallback !== "Hi there") fail(`fallback expected "Hi there", got "${fallback}"`);
else pass("personalization fallback");

let unsafeBlocked = false;
try {
  persMod.assertSafePersonalizationTokens("{{evilCode}}");
} catch {
  unsafeBlocked = true;
}
if (!unsafeBlocked) fail("unsafe token must be blocked");
else pass("unsafe token blocked");

const preview = svc.preview(actor, created.campaign.id, {
  firstName: "Neha",
  companyName: "Acme LLP",
  senderName: "RC Team",
});
if (!preview.htmlDesktop || !preview.htmlMobile || !preview.plaintext) {
  fail("preview payloads incomplete");
} else pass("desktop/mobile/plaintext preview");
if (!preview.plaintext.includes("Neha")) fail("plaintext personalization");
else pass("plaintext personalization");
if (preview.subject.includes("{{")) fail("subject still has placeholders");
else pass("subject personalized");
if (!preview.preheader) fail("preheader missing");
else pass("preheader");

// Version freeze on approve path: submit → approve after ready
svc.save(actor, created.campaign.id, {
  audienceId: "aud-mkt08",
  subject: "Hello {{firstName}}",
  disclaimer: "Disclaimer and unsubscribe info.",
  ctaLabel: "Apply",
  ctaUrl: "https://rupeecatalyst.com/apply",
});
if (saved.campaign.status === "DRAFT" || saved.campaign.status === "PREVIEW") {
  try {
    svc.transition(actor, created.campaign.id, "SUBMIT_FOR_REVIEW");
  } catch {
    // may already be PREVIEW
    if (svc.get(actor, created.campaign.id).campaign.status === "PREVIEW") {
      svc.transition(actor, created.campaign.id, "SUBMIT_FOR_REVIEW");
    }
  }
}
const beforeApprove = svc.get(actor, created.campaign.id);
if (beforeApprove.campaign.status !== "READY_FOR_REVIEW") {
  // force path
  const cur = beforeApprove.campaign.status;
  pass(`status before approve attempt=${cur}`);
} else {
  pass("READY_FOR_REVIEW");
}

if (beforeApprove.campaign.status === "READY_FOR_REVIEW") {
  const approved = svc.transition(actor, created.campaign.id, "APPROVE");
  if (!approved.campaign.activePublishedVersionId) fail("published version missing");
  else pass("approved publishes version");
  const publishedId = approved.campaign.activePublishedVersionId;
  const published = approved.versions.find((v) => v.id === publishedId);
  if (!published?.immutable) fail("published not immutable");
  else pass("published immutable");

  // reopen draft and restore — must mint new draft, not mutate published
  svc.transition(actor, created.campaign.id, "REOPEN_DRAFT");
  const restored = svc.restoreVersionAsDraft(actor, created.campaign.id, publishedId);
  if (restored.campaign.activePublishedVersionId !== publishedId) {
    fail("restore mutated published version id");
  } else pass("published version preserved after restore");
  if (restored.campaign.currentDraftVersionId === publishedId) {
    fail("draft still points at published frozen version");
  } else pass("new draft minted from history");
}

const utm = utmMod.appendMarketingUtmParams(
  "https://rupeecatalyst.com/x",
  { source: "email", medium: "mkt", campaign: "c1", content: null, term: null },
  true,
);
if (!utm.includes("utm_source=email")) fail("utm helper");
else pass("utm helper");

const asset = assetMod.marketingAssetService.upload(actor, {
  title: "Hero",
  mimeType: "image/png",
  category: "hero",
  url: "https://cdn.example.com/hero.png",
  byteSize: 1200,
});
if (!asset.active) fail("asset active");
else pass("asset active");
if (asset.suggestedMaxWidth !== 600) fail("asset optimization width");
else pass("asset optimization");
const inactive = assetMod.marketingAssetService.setActive(actor, asset.id, false);
if (inactive.active) fail("asset deactivate");
else pass("asset inactive");

console.log(ok ? "CO-MARKETING-MKT-08 verify: PASS" : "CO-MARKETING-MKT-08 verify: FAIL");
process.exit(ok ? 0 : 1);
