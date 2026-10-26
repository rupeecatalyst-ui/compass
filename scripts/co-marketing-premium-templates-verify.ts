/**
 * Local proof for the 12 premium email starters.
 * Writes HTML previews. Does not send, publish, migrate, or touch a campaign version.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { applyMarketingAssetToImageBlock } from "../src/lib/enterprise-marketing-engine/asset-select";
import { attributeHomeLoanCampaignDestination } from "../src/lib/enterprise-marketing-engine/campaign-entry-gate";
import { renderMarketingEmailHtml } from "../src/lib/enterprise-marketing-engine/email-render";
import { MARKETING_PREMIUM_EMAIL_TEMPLATES } from "../src/lib/enterprise-marketing-engine/premium-email-templates";
import { MARKETING_STANDARD_EMAIL_TEMPLATES } from "../src/lib/enterprise-marketing-engine/standard-email-templates";
import {
  applyMarketingGalleryTemplate,
  composeMarketingTemplateGallery,
  resolveMarketingGalleryTemplate,
} from "../src/lib/enterprise-marketing-engine/template-gallery";
import {
  assertMarketingUnsubscribePresent,
  reorderMarketingBlock,
  updateMarketingBlock,
} from "../src/lib/enterprise-marketing-engine/visual-editor";
import { withCampaignEntryCtas } from "../src/lib/product-journey/campaign-entry-url";

const outDir = path.resolve("docs/marketing-email-template-previews");
const logo = "https://catalyst-one.rupeecatalyst.com/brand/rupee-catalyst-logo.png";
const forbidden = [
  /\d+(?:\.\d+)?\s*%/,
  /pre-approved/i,
  /you qualify/i,
  /guaranteed approval/i,
  /lowest rate/i,
  /you are approved/i,
  /sanctioned/i,
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(MARKETING_PREMIUM_EMAIL_TEMPLATES.length === 12, "expected 12 premium templates");
assert(MARKETING_STANDARD_EMAIL_TEMPLATES.length === 2, "standard catalogue changed");

const gallery = composeMarketingTemplateGallery({ organizationId: "org-local", saved: [] });
const premium = gallery.find((section) => section.id === "premium");
const standard = gallery.find((section) => section.id === "standard");
assert(premium?.cards.length === 12, "gallery premium section");
assert(standard?.cards.length === 2, "gallery standard section");
assert(standard?.cards.every((card) => card.status === "APPROVED"), "standard approval status");
assert(premium?.cards.every((card) => card.status === "DRAFT" && card.description), "premium starters stay drafts");

const fingerprints = new Set<string>();
const previews: string[] = [];

for (const template of MARKETING_PREMIUM_EMAIL_TEMPLATES) {
  const copy = JSON.stringify(template);
  for (const pattern of forbidden) {
    assert(!pattern.test(copy), `${template.id} matched ${pattern}`);
  }
  assert(template.content.blocks.some((block) => block.type === "unsubscribe"), `${template.id} unsubscribe`);
  assert(template.content.blocks.some((block) => block.type === "disclaimer"), `${template.id} disclaimer`);
  assert(template.content.blocks.some((block) => block.type === "logo"), `${template.id} logo`);
  assert(template.immutable === true, `${template.id} catalogue row is immutable`);
  const fingerprint = template.content.blocks
    .map((block) => `${block.type}:${String(block.props.background ?? "")}:${String(block.props.title ?? block.props.label ?? "")}`)
    .join("|");
  assert(!fingerprints.has(fingerprint), `${template.id} is not visually distinct`);
  fingerprints.add(fingerprint);

  const html = renderMarketingEmailHtml({
    content: template.content,
    subject: template.subject,
    previewText: template.previewText,
    mode: "desktop",
    personalization: {
      firstName: "Asha",
      senderName: "Meera Shah",
      city: "Pune",
      product: "Home Loan",
      companyName: "Northwind Traders",
    },
  });
  const mobile = renderMarketingEmailHtml({
    content: template.content,
    subject: template.subject,
    previewText: template.previewText,
    mode: "mobile",
  });
  assert(html.includes('width="600"'), `${template.id} desktop width`);
  assert(html.includes("<table"), `${template.id} table`);
  assert(!html.includes("APPROVED PHOTOGRAPH"), `${template.id} internal image instruction`);
  assert(html.includes("color:#475569"), `${template.id} disclaimer contrast`);
  assert(html.includes(logo), `${template.id} official logo`);
  assert(html.includes("Unsubscribe"), `${template.id} unsubscribe label`);
  assert(html.includes("not a loan sanction"), `${template.id} disclaimer`);
  assert(html.includes("<!--[if mso]>"), `${template.id} outlook comment`);
  assert(!/position\s*:\s*absolute/i.test(html), `${template.id} absolute positioning`);
  assert(!/position\s*:\s*fixed/i.test(html), `${template.id} fixed positioning`);
  assert(!html.includes("unsplash.com"), `${template.id} stock photo`);
  assert(!html.includes("javascript:"), `${template.id} javascript url`);
  assert(mobile.includes('width="360"') || mobile.includes("max-width:360px"), `${template.id} mobile width`);
  for (const block of template.content.blocks) {
    const background = block.props.background;
    if (typeof background === "string" && background) {
      assert(html.includes(`bgcolor="${background}"`), `${template.id} solid fallback ${background}`);
    }
  }
  const file = `${String(previews.length + 1).padStart(2, "0")}-${template.id.replace("mkt-tpl-premium-", "")}.html`;
  previews.push(file);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, file), html, "utf8");
}

const welcome = MARKETING_STANDARD_EMAIL_TEMPLATES[0];
const welcomeHtml = renderMarketingEmailHtml({
  content: welcome.content,
  subject: welcome.subject,
  previewText: welcome.previewText,
  mode: "desktop",
});
assert(welcomeHtml.includes("A note from Rupee Catalyst"), "welcome heading");
assert(welcomeHtml.includes("#0f766e"), "welcome button colour");
assert(!welcomeHtml.includes("#0b1f33"), "welcome gained a premium band");
assert(welcomeHtml.includes('style="padding:16px 24px;" align="left"') || welcomeHtml.includes('align="left"'), "welcome header still aligned");

const invitation = MARKETING_PREMIUM_EMAIL_TEMPLATES.find((row) => row.id === "mkt-tpl-premium-invitation");
assert(invitation, "invitation");
const before = JSON.stringify(invitation.content);
const selected = applyMarketingGalleryTemplate(invitation);
const header = selected.content.blocks.find((block) => block.type === "header");
const button = selected.content.blocks.find((block) => block.type === "cta");
assert(header && button, "invitation blocks");
let draft = updateMarketingBlock(selected.content, header.id, { title: "Edited invitation", background: "#134e4a" });
draft = updateMarketingBlock(draft, button.id, { label: "Begin the session" });
draft = reorderMarketingBlock(draft, 0, 1);
const saved = JSON.parse(JSON.stringify(draft)) as typeof draft;
const reopened = JSON.parse(JSON.stringify(saved)) as typeof draft;
assert(JSON.stringify(invitation.content) === before, "catalogue mutated");
assert(reopened.blocks.some((block) => block.props.title === "Edited invitation"), "edit did not survive reopen");
assert(reopened.blocks.some((block) => block.props.label === "Begin the session"), "cta edit did not survive reopen");
assert(reopened.blocks[0]?.type === "header", "drag reorder did not survive reopen");
assert(resolveMarketingGalleryTemplate(invitation.id, "org-local", [])?.content.blocks[0]?.type === "logo", "resolver returned the edited copy");

const missing = attributeHomeLoanCampaignDestination({
  intendedUrl: "https://www.rupeecatalyst.com/apply/home-loan",
  campaignToken: "",
  product: "home-loan",
});
assert(missing.ok === false, "missing token must fail closed");
const attributed = attributeHomeLoanCampaignDestination({
  intendedUrl: "https://www.rupeecatalyst.com/apply/home-loan",
  campaignToken: "snapshot-recipient-opaque",
  product: "home-loan",
});
assert(attributed.ok && attributed.url?.includes("campaign=snapshot-recipient-opaque"), "attribution url");
const rewritten = withCampaignEntryCtas(selected.content, attributed.url ?? "");
const rewrittenCta = rewritten.blocks.find((block) => block.type === "cta");
const sourceCta = invitation.content.blocks.find((block) => block.type === "cta");
assert(String(rewrittenCta?.props.url).includes("campaign=snapshot-recipient-opaque"), "forked cta attributed");
assert(!String(sourceCta?.props.url).includes("campaign="), "catalogue cta gained a token");
const plain = renderMarketingEmailHtml({
  content: invitation.content,
  subject: invitation.subject,
  previewText: invitation.previewText,
  mode: "desktop",
});
assert(!plain.includes("campaign="), "renderer must not invent campaign attribution");

const banking = MARKETING_PREMIUM_EMAIL_TEMPLATES.find((template) => template.id === "mkt-tpl-premium-banking");
const hero = MARKETING_PREMIUM_EMAIL_TEMPLATES.find((template) => template.id === "mkt-tpl-premium-hero");
const benefits = MARKETING_PREMIUM_EMAIL_TEMPLATES.find((template) => template.id === "mkt-tpl-premium-benefits");
const business = MARKETING_PREMIUM_EMAIL_TEMPLATES.find((template) => template.id === "mkt-tpl-premium-business");
assert(banking && hero && benefits && business, "priority templates");
const bankingHtml = renderMarketingEmailHtml({
  content: banking.content,
  subject: banking.subject,
  previewText: banking.previewText,
  mode: "desktop",
});
assert(bankingHtml.includes("One conversation") && bankingHtml.includes('bgcolor="#0b1f33"'), "banking cards");
assert(!bankingHtml.includes("border-left:4px solid"), "banking no longer a callout stack");
const heroHtml = renderMarketingEmailHtml({
  content: hero.content,
  subject: hero.subject,
  previewText: hero.previewText,
  mode: "desktop",
});
assert(heroHtml.includes("A property, seen in context"), "hero caption");
const heroWithImage = updateMarketingBlock(hero.content, "hero-image", {
  url: "https://example.com/property.png",
});
const heroImageHtml = renderMarketingEmailHtml({
  content: heroWithImage,
  subject: hero.subject,
  previewText: hero.previewText,
  mode: "desktop",
});
assert(heroImageHtml.includes('alt="Property photograph"'), "hero alt");
const heroBlocked = updateMarketingBlock(hero.content, "hero-image", { url: "" });
const heroBlockedHtml = renderMarketingEmailHtml({
  content: heroBlocked,
  subject: hero.subject,
  previewText: hero.previewText,
  mode: "desktop",
});
assert(heroBlockedHtml.includes("A property, seen in context"), "empty hero keeps a solid caption");
assert((heroBlockedHtml.match(/<img /g) ?? []).length === 1, "empty hero does not add a photograph");
const replaced = applyMarketingAssetToImageBlock(
  { url: "", alt: "Property photograph", assetId: "" },
  {
    assetId: "asset-approved",
    organizationId: "org-local",
    url: "https://example.com/approved-property.png",
    alt: "Approved property photograph",
    assetType: "image",
    name: "Property",
    approvalStatus: "APPROVED",
  },
);
assert(replaced.url === "https://example.com/approved-property.png", "image replacement");
assert(replaced.alt === "Approved property photograph", "replacement alt");
const unsafe = updateMarketingBlock(benefits.content, "ben-1", { background: "#ff00ff" });
const unsafeHtml = renderMarketingEmailHtml({
  content: unsafe,
  subject: benefits.subject,
  previewText: benefits.previewText,
  mode: "desktop",
});
assert(!unsafeHtml.includes("#ff00ff"), "unsafe background dropped");
const businessHtml = renderMarketingEmailHtml({
  content: business.content,
  subject: business.subject,
  previewText: business.previewText,
  mode: "desktop",
});
assert(businessHtml.includes("color:#ccfbf1"), "dark card badge contrast");
assert(businessHtml.includes('bgcolor="#f8fafc"'), "business light middle card");
const withoutUnsubscribe = {
  version: 1 as const,
  blocks: invitation.content.blocks.filter((block) => block.type !== "unsubscribe"),
};
let unsubscribeBlocked = false;
try {
  assertMarketingUnsubscribePresent(withoutUnsubscribe);
} catch {
  unsubscribeBlocked = true;
}
assert(unsubscribeBlocked, "unsubscribe remains mandatory");

const logoFile = readFileSync(path.resolve("public/brand/rupee-catalyst-logo.png"));
assert(logoFile.length === 178641, "official logo byte length changed");
assert(logoFile[0] === 0x89 && logoFile[1] === 0x50 && logoFile[2] === 0x4e && logoFile[3] === 0x47, "official logo is not a PNG");

const index = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Premium email starters</title>
<style>body{font-family:Arial,sans-serif;margin:24px;background:#f8fafc;color:#0f172a}iframe{width:640px;height:760px;border:1px solid #e2e8f0;background:#fff;margin:12px 0}</style>
</head><body><h1>12 premium email starters</h1><p>Design previews only. Not approved campaigns.</p>
${previews
  .map(
    (file, index) =>
      `<h2>${index + 1}. ${MARKETING_PREMIUM_EMAIL_TEMPLATES[index].name}</h2><p>${MARKETING_PREMIUM_EMAIL_TEMPLATES[index].description}</p><iframe title="${file}" src="${file}"></iframe>`,
  )
  .join("\n")}
</body></html>`;
writeFileSync(path.join(outDir, "index.html"), index, "utf8");

async function proveDraftSave(): Promise<void> {
  if (process.env.DATABASE_URL || process.env.DIRECT_URL) {
    throw new Error("BLOCKED: a database URL is set. Refusing the campaign draft test.");
  }
  process.env.ENTERPRISE_PERSISTENCE_MODE = "memory";

  const { marketingCampaignService } = await import(
    "../server/services/enterprise-marketing-engine/campaign.service"
  );
  const { marketingCampaignStore } = await import(
    "../server/services/enterprise-marketing-engine/campaign-store"
  );
  const actor = {
    userId: "template-review",
    organizationId: "org-template-review",
    role: "ADMIN",
  };
  const catalogueBefore = JSON.stringify(MARKETING_PREMIUM_EMAIL_TEMPLATES);
  const created = await marketingCampaignService.create(actor, {
    name: "Template review draft",
    product: "home-loan",
    channel: "EMAIL",
  });
  const original = created.draft;
  if (!original || original.immutable !== false) throw new Error("new campaign draft");
  await marketingCampaignService.save(actor, created.campaign.id, {
    subject: "Original subject",
    previewText: "Original preview",
    content: {
      version: 1,
      blocks: [
        {
          id: "keep",
          type: "text",
          props: { html: "Approved version sentence." },
        },
        {
          id: "keep-unsub",
          type: "unsubscribe",
          props: { label: "Unsubscribe", href: "{{unsubscribeUrl}}" },
        },
      ],
    },
  });
  const frozen = await marketingCampaignStore.freezeVersion(original.id, "APPROVED");
  const frozenBefore = JSON.stringify(frozen.content);
  const starter = applyMarketingGalleryTemplate(invitation);
  const cta = starter.content.blocks.find((block) => block.type === "cta");
  const edited = reorderMarketingBlock(
    updateMarketingBlock(starter.content, cta?.id ?? "", {
      label: "Review only",
      background: "#f8fafc",
    }),
    1,
    3,
  );
  await marketingCampaignService.save(actor, created.campaign.id, {
    subject: "Starter draft",
    content: edited,
  });
  const reopened = await marketingCampaignService.get(actor, created.campaign.id);
  const versions = await marketingCampaignStore.listVersions(created.campaign.id);
  const stillFrozen = versions.find((version) => version.id === frozen.id);
  if (stillFrozen?.immutable !== true) throw new Error("approved version stayed frozen");
  if (JSON.stringify(stillFrozen?.content) !== frozenBefore) throw new Error("approved version content unchanged");
  if (reopened.draft?.id === frozen.id) throw new Error("starter save opened a new draft");
  if (!reopened.draft?.content.blocks.some((block) => block.props.label === "Review only")) {
    throw new Error("reopened draft kept the edit");
  }
  if (JSON.stringify(MARKETING_PREMIUM_EMAIL_TEMPLATES) !== catalogueBefore) {
    throw new Error("gallery original unchanged");
  }
  const reopenedAgain = await marketingCampaignService.get(actor, created.campaign.id);
  if (reopenedAgain.draft?.id !== reopened.draft?.id) throw new Error("second open returns the same draft");
}

proveDraftSave()
  .then(() => {
    console.log(
      JSON.stringify({
        proof: "premium-email-templates",
        count: 12,
        previews: previews.length,
        edit: "asset-replace-background-text-cta-reorder",
        draft: "memory-campaign-api-save-reopen",
        approvedVersionUntouched: true,
        attribution: "token-required",
      }),
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
