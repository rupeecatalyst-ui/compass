/**
 * Marketing email template personalisation + CTA persistence.
 * Local fixtures only. No send, migrate, campaign mutation, or deploy.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const pkg = read("package.json");
assert.ok(pkg.includes("verify:co-marketing-email-template-cta-personalisation"));

const editorUi = read("src/components/catalyst-one/admin/marketing/marketing-visual-email-editor.tsx");
assert.ok(editorUi.includes("approvalStatus: asset.approvalStatus"));
assert.ok(editorUi.includes('label="Button label"'));
assert.ok(editorUi.includes('label="URL"'));

const campaignService = read("server/services/enterprise-marketing-engine/campaign.service.ts");
assert.ok(campaignService.includes("extractCtaFieldsFromContent"));
assert.ok(campaignService.includes("overlayCta"));
assert.doesNotMatch(campaignService, /ENTERPRISE_MARKETING_EXECUTION_ENABLED\s*=\s*true/);

const builderPage = read(
  "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
);
assert.ok(builderPage.includes("sampleRecipients"));
assert.ok(builderPage.includes('action: "preview"'));
assert.ok(builderPage.includes("onUse={(next) =>"));
assert.doesNotMatch(builderPage, /Use Template[\s\S]{0,40}useEffect/);

const personalizationUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/personalization.ts"),
).href;
const catalogueUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/personalisation-catalogue.ts"),
).href;
const blocksUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/content-blocks.ts")).href;
const visualUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/visual-editor.ts")).href;
const renderUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/email-render.ts")).href;
const previewUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/preview-workspace.ts")).href;
const galleryUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/template-gallery.ts")).href;
const utmUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/utm.ts")).href;

const personalization = await import(personalizationUrl);
const catalogue = await import(catalogueUrl);
const blocks = await import(blocksUrl);
const visual = await import(visualUrl);
const render = await import(renderUrl);
const preview = await import(previewUrl);
const gallery = await import(galleryUrl);
const utm = await import(utmUrl);

const rahul = personalization.resolvePersonalizationValues({ fullName: "Rahul Kapoor" });
assert.equal(rahul.firstName, "Rahul");
assert.equal(rahul.lastName, "Kapoor");
assert.equal(personalization.applyPersonalization("Dear {{firstName}},", rahul), "Dear Rahul,");
assert.equal(
  personalization.applyPersonalization("Dear {{firstName}},", { fullName: "Rahul Kapoor" }),
  "Dear Rahul,",
);

const missing = personalization.resolvePersonalizationValues({});
assert.equal(missing.firstName, "Customer");
assert.equal(personalization.applyPersonalization("Dear {{firstName}},", {}), "Dear Customer,");
assert.equal(personalization.applyPersonalization("Dear {{firstName}},", { firstName: "   " }), "Dear Customer,");

const previewResolved = catalogue.resolvePersonalisationWithFallbacks({ fullName: "Rahul Kapoor" });
assert.deepEqual(previewResolved.firstName, rahul.firstName);
assert.equal(
  personalization.applyPersonalization("Dear {{firstName}},", previewResolved),
  personalization.applyPersonalization("Dear {{firstName}},", { fullName: "Rahul Kapoor" }),
);

const projected = catalogue.projectAllowlistedSampleValues({ name: "Rahul Kapoor" });
assert.equal(projected.firstName, "Rahul");
assert.notEqual(projected.firstName, "Rahul Kapoor");

let doc = blocks.createEmptyContentDocument();
const cta = doc.blocks.find((block) => block.type === "cta");
assert.ok(cta);
const edited = visual.updateMarketingBlock(doc, cta.id, {
  label: "Discover My Advantage",
  url: "https://rupeecatalyst.com/home-loan",
});
const extracted = blocks.extractCtaFieldsFromContent(edited);
assert.equal(extracted.label, "Discover My Advantage");
assert.equal(extracted.url, "https://rupeecatalyst.com/home-loan");

const staleOverlay = blocks.syncCampaignFormFieldsIntoContent(edited, {
  ctaLabel: "Learn more",
  ctaUrl: "https://rupeecatalyst.com",
  overlayCta: false,
});
assert.equal(blocks.extractCtaFieldsFromContent(staleOverlay).label, "Discover My Advantage");
assert.equal(blocks.extractCtaFieldsFromContent(staleOverlay).url, "https://rupeecatalyst.com/home-loan");

const reloaded = visual.sanitizeMarketingContentDocument(edited);
assert.equal(blocks.extractCtaFieldsFromContent(reloaded).label, "Discover My Advantage");
assert.equal(blocks.extractCtaFieldsFromContent(reloaded).url, "https://rupeecatalyst.com/home-loan");

const htmlDesktop = render.renderMarketingEmailHtml({
  content: edited,
  subject: "Dear {{firstName}},",
  previewText: "Home loan",
  mode: "desktop",
  personalization: rahul,
});
const htmlMobile = render.renderMarketingEmailHtml({
  content: edited,
  subject: "Dear {{firstName}},",
  previewText: "Home loan",
  mode: "mobile",
  personalization: rahul,
});
assert.ok(htmlDesktop.includes("Discover My Advantage"));
assert.ok(htmlMobile.includes("Discover My Advantage"));
assert.ok(htmlDesktop.includes("https://rupeecatalyst.com/home-loan"));
assert.ok(htmlMobile.includes("https://rupeecatalyst.com/home-loan"));
assert.equal(htmlDesktop.includes("Dear Rahul"), true);
assert.equal(htmlMobile.includes("Dear Rahul"), true);
assert.ok(htmlDesktop.includes('data-marketing-unsubscribe="true"'));
assert.ok(htmlMobile.includes('data-marketing-unsubscribe="true"'));

const inspection = preview.inspectMarketingPreviewWorkspace({
  content: edited,
  htmlDesktop,
  htmlMobile,
});
assert.ok(inspection.linkInventory.some((link) => link.kind === "cta" && link.href === "https://rupeecatalyst.com/home-loan"));
assert.ok(inspection.linkInventory.some((link) => link.kind === "unsubscribe"));
assert.equal(inspection.unsubscribeVerified, true);

const tracked = utm.appendMarketingUtmParams(
  "https://rupeecatalyst.com/home-loan",
  { source: "email", medium: "marketing", campaign: "rc-salaried-hl-test-01" },
  true,
);
assert.ok(tracked.startsWith("https://rupeecatalyst.com/home-loan"));
assert.ok(tracked.includes("utm_campaign=rc-salaried-hl-test-01"));

const galleryApplied = gallery.applyMarketingGalleryTemplate(gallery.blankMarketingEmailTemplate());
assert.equal(galleryApplied.content.blocks.find((block) => block.type === "cta")?.props.label, "Learn more");
const afterGalleryEdit = visual.updateMarketingBlock(
  galleryApplied.content,
  galleryApplied.content.blocks.find((block) => block.type === "cta").id,
  { label: "Discover My Advantage", url: "https://rupeecatalyst.com/home-loan" },
);
assert.equal(blocks.extractCtaFieldsFromContent(afterGalleryEdit).label, "Discover My Advantage");
assert.equal(
  gallery.blankMarketingEmailTemplate().content.blocks.find((block) => block.type === "cta")?.props.label,
  "Learn more",
);

const previousCampaign = blocks.createEmptyContentDocument();
assert.equal(blocks.extractCtaFieldsFromContent(previousCampaign).url, "https://rupeecatalyst.com");
assert.equal(blocks.extractCtaFieldsFromContent(previousCampaign).label, "Learn more");

console.log("co-marketing-email-template-cta-personalisation: PASS");
