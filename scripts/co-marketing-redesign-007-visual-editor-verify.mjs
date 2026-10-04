/**
 * CO-MARKETING-REDESIGN-007 — Visual template gallery + block email editor.
 * Local fixtures only. No send, migrate, commit, or deploy.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function mustInclude(haystack, needle, label = needle) {
  assert.ok(haystack.includes(needle), `missing ${label}`);
}

const pkg = read("package.json");
const contentConst = read("src/constants/enterprise-marketing-engine/content.ts");
const prePublish = read("src/lib/enterprise-marketing-engine/pre-publish.ts");
const editorSrc = read("src/lib/enterprise-marketing-engine/visual-editor.ts");
const renderSrc = read("src/lib/enterprise-marketing-engine/email-render.ts");
const sanitizeSrc = read("src/lib/enterprise-marketing-engine/html-sanitize.ts");
const gallerySrc = read("src/lib/enterprise-marketing-engine/template-gallery.ts");
const storeSrc = read("server/services/enterprise-marketing-engine/template-store.ts");
const builderPage = read(
  "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
);
const galleryUi = read(
  "src/components/catalyst-one/admin/marketing/marketing-template-gallery.tsx",
);
const editorUi = read(
  "src/components/catalyst-one/admin/marketing/marketing-visual-email-editor.tsx",
);
const migration = read(
  "prisma/migrations/20260905120000_co_marketing_redesign_durable_foundation/migration.sql",
);
const schema = read("prisma/schema.prisma");

mustInclude(pkg, "verify:co-marketing-redesign-007");
mustInclude(contentConst, "MARKETING_VISUAL_EDITOR_PALETTE");
mustInclude(contentConst, "MARKETING_UNSUBSCRIBE_BLOCK_TYPE");
mustInclude(contentConst, "MARKETING_HTML_SOURCE_MODE_DEFAULT = false");
mustInclude(contentConst, '"columns"');
mustInclude(contentConst, '"social"');
mustInclude(contentConst, '"unsubscribe"');
mustInclude(editorSrc, "hasMarketingUnsubscribeBlock");
mustInclude(editorSrc, "reorderMarketingBlock");
mustInclude(editorSrc, "duplicateMarketingBlock");
mustInclude(editorSrc, "deleteMarketingBlock");
mustInclude(renderSrc, 'case "unsubscribe"');
mustInclude(renderSrc, 'data-marketing-unsubscribe="true"');
mustInclude(sanitizeSrc, "sanitizeMarketingRichText");
mustInclude(gallerySrc, "Blank email");
mustInclude(gallerySrc, "Saved organisation templates");
mustInclude(gallerySrc, "Approved standard templates");
mustInclude(gallerySrc, "Recently used templates");
mustInclude(galleryUi, "Use Template");
mustInclude(galleryUi, "Preview");
mustInclude(editorUi, "MARKETING_HTML_SOURCE_MODE_DEFAULT");
mustInclude(editorUi, "HTML source");
mustInclude(builderPage, "MarketingVisualEmailEditor");
mustInclude(builderPage, "MarketingTemplateGallery");
mustInclude(builderPage, "Message editor");
mustInclude(builderPage, "mkt-builder-message");
mustInclude(builderPage, "Save as template");
const versioningSrc = read("src/lib/enterprise-marketing-engine/template-versioning.ts");
mustInclude(versioningSrc, "buildMarketingTemplateVersion");
mustInclude(versioningSrc, "parentTemplateId");
mustInclude(storeSrc, "buildMarketingTemplateVersion");
mustInclude(storeSrc, "listDurable");
mustInclude(schema, "EnterpriseMarketingContentTemplate");
mustInclude(migration, "enterprise_marketing_content_templates");
mustInclude(migration, "Do not apply without explicit Product Owner approval");
mustInclude(prePublish, "hasMarketingUnsubscribeBlock");
assert.doesNotMatch(prePublish, /t.includes\("unsubscrib"\)/);
assert.doesNotMatch(prePublish, /t.includes\("disclaimer"\)/);
assert.doesNotMatch(builderPage, /test_send/);
assert.doesNotMatch(editorUi, /Bitrix/);
assert.doesNotMatch(galleryUi, /https:\/\/images\./);

const visualUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/visual-editor.ts")).href;
const renderUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/email-render.ts")).href;
const sanitizeUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/html-sanitize.ts")).href;
const galleryUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/template-gallery.ts")).href;
const blocksUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/content-blocks.ts")).href;
const preUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/pre-publish.ts")).href;
const versioningUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/template-versioning.ts"),
).href;

const visual = await import(visualUrl);
const render = await import(renderUrl);
const sanitize = await import(sanitizeUrl);
const gallery = await import(galleryUrl);
const blocks = await import(blocksUrl);
const pre = await import(preUrl);
const versioning = await import(versioningUrl);

let doc = blocks.createEmptyContentDocument();
assert.equal(visual.hasMarketingUnsubscribeBlock(doc), true, "blank document must include unsubscribe block");
assert.ok(doc.blocks.some((b) => b.type === "header"));
assert.ok(doc.blocks.some((b) => b.type === "text"));
assert.ok(doc.blocks.some((b) => b.type === "cta"));

const htmlA = render.renderMarketingEmailHtml({
  content: doc,
  subject: "Hello",
  previewText: "Preview",
  mode: "desktop",
});
const htmlB = render.renderMarketingEmailHtml({
  content: doc,
  subject: "Hello",
  previewText: "Preview",
  mode: "desktop",
});
assert.equal(htmlA, htmlB, "renderer must be deterministic");
for (const block of doc.blocks) {
  assert.equal(htmlA.includes(block.id), false, `HTML must not emit block id ${block.id}`);
}
assert.equal(/<script/i.test(htmlA), false);
assert.ok(htmlA.includes('data-marketing-unsubscribe="true"'));

const dirty = visual.updateMarketingBlock(doc, doc.blocks.find((b) => b.type === "text").id, {
  html: '<p>Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>',
});
const sanitisedText = dirty.blocks.find((b) => b.type === "text").props.html;
assert.equal(/<script/i.test(String(sanitisedText)), false);
assert.equal(/javascript:/i.test(String(sanitisedText)), false);
sanitize.assertMarketingHtmlIsSafe(String(sanitisedText));
const sanitisedHtml = render.renderMarketingEmailHtml({
  content: dirty,
  subject: "Hello",
  previewText: "Preview",
  mode: "desktop",
});
assert.equal(/<script/i.test(sanitisedHtml), false, "scripts must not survive render");
assert.equal(/javascript:/i.test(sanitisedHtml), false, "javascript URLs must not survive render");

const from = 0;
const to = 2;
const reordered = visual.reorderMarketingBlock(doc, from, to);
assert.notEqual(reordered.blocks.map((b) => b.type).join(","), doc.blocks.map((b) => b.type).join(","));
assert.equal(reordered.blocks.length, doc.blocks.length);

const duplicated = visual.duplicateMarketingBlock(doc, doc.blocks[1].id);
assert.equal(duplicated.blocks.length, doc.blocks.length + 1);
const deleted = visual.deleteMarketingBlock(duplicated, duplicated.blocks[1].id);
assert.equal(deleted.blocks.length, duplicated.blocks.length - 1);

const footerOnly = {
  version: 1,
  blocks: [
    { id: "f1", type: "footer", props: { text: "Please unsubscribe from this list" } },
    { id: "t1", type: "text", props: { html: "Hello" } },
    { id: "c1", type: "cta", props: { label: "Apply", url: "https://rupeecatalyst.com/apply" } },
  ],
};
assert.equal(visual.hasMarketingUnsubscribeBlock(footerOnly), false);
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
const version = {
  id: "v1",
  campaignId: "c1",
  versionNumber: 1,
  immutable: false,
  subject: "Hello",
  previewText: "Hi",
  content: footerOnly,
  trackingEnabled: false,
  createdAt: "2026-09-05T00:00:00.000Z",
  updatedAt: "2026-09-05T00:00:00.000Z",
};
const blocked = pre.runMarketingPrePublishChecks({ campaign, version });
assert.equal(blocked.checks.some((c) => c.id === "unsubscribe" && c.passed === false), true);
assert.ok(blocked.blockingCodes.includes("unsubscribe"));

const withUnsub = {
  ...version,
  content: doc,
  ctaLabel: "Apply",
  ctaUrl: "https://rupeecatalyst.com/apply",
};
const readyish = pre.runMarketingPrePublishChecks({ campaign, version: withUnsub });
assert.equal(readyish.checks.find((c) => c.id === "unsubscribe")?.passed, true);

const orgA = versioning.buildMarketingTemplateVersion(
  {
    organizationId: "org-a",
    name: "Org welcome",
    channel: "EMAIL",
    subject: "Hi",
    previewText: "Hi",
    content: doc,
    category: "organisation",
    origin: "organisation",
    now: "2026-09-05T01:00:00.000Z",
  },
  null,
);
assert.equal(orgA.versionNumber, 1);
assert.equal(orgA.parentTemplateId, null);
const orgA2 = versioning.buildMarketingTemplateVersion(
  {
    id: orgA.id,
    organizationId: "org-a",
    name: "Org welcome edited",
    channel: "EMAIL",
    subject: "Hi again",
    previewText: "Hi",
    content: doc,
    now: "2026-09-05T01:01:00.000Z",
  },
  orgA,
);
assert.equal(orgA2.id, orgA.id);
assert.equal(orgA2.versionNumber, 2);
const approved = versioning.buildMarketingTemplateVersion(
  {
    id: orgA.id,
    organizationId: "org-a",
    name: "Org welcome approved",
    channel: "EMAIL",
    subject: "Hi",
    previewText: "Hi",
    content: doc,
    status: "APPROVED",
    immutable: true,
    now: "2026-09-05T01:02:00.000Z",
  },
  orgA2,
);
const forked = versioning.buildMarketingTemplateVersion(
  {
    id: approved.id,
    organizationId: "org-a",
    name: "Org welcome v3",
    channel: "EMAIL",
    subject: "Hi v3",
    previewText: "Hi",
    content: doc,
    now: "2026-09-05T01:03:00.000Z",
  },
  approved,
);
assert.notEqual(forked.id, approved.id);
assert.equal(forked.parentTemplateId, approved.id);
assert.equal(forked.versionNumber, approved.versionNumber + 1);
assert.throws(() =>
  versioning.buildMarketingTemplateVersion(
    {
      id: approved.id,
      organizationId: "org-b",
      name: "Stolen",
      channel: "EMAIL",
      subject: "Hi",
      previewText: "Hi",
      content: doc,
    },
    approved,
  ),
);

const saved = [
  { ...approved, lastUsedAt: "2026-09-05T01:04:00.000Z" },
  forked,
];
const foreign = versioning.buildMarketingTemplateVersion(
  {
    organizationId: "org-b",
    name: "Other org",
    channel: "EMAIL",
    subject: "Hi",
    previewText: "Hi",
    content: doc,
    category: "organisation",
    origin: "organisation",
  },
  null,
);

const sections = gallery.composeMarketingTemplateGallery({
  organizationId: "org-a",
  saved: [...saved, foreign],
});
assert.deepEqual(
  sections.map((s) => s.title),
  ["Blank email", "Saved organisation templates", "Approved standard templates", "Recently used templates"],
);
assert.equal(sections[0].cards.length, 1);
assert.ok(sections[2].cards.length >= 1);
assert.ok(sections[2].cards.every((card) => visual.hasMarketingUnsubscribeBlock(card.template.content)));
assert.ok(sections[1].cards.some((card) => card.id === orgA.id || card.template.parentTemplateId === orgA.id || card.id === forked.id));
assert.equal(sections[1].cards.some((card) => card.id === foreign.id), false);
assert.ok(sections[3].cards.some((card) => card.id === approved.id));

const used = gallery.applyMarketingGalleryTemplate(sections[0].cards[0].template);
assert.equal(used.hasUnsubscribe, true);

console.log(
  JSON.stringify(
    {
      ok: true,
      structuredSchema: true,
      deterministicRenderer: true,
      sanitisation: true,
      reorder: true,
      duplicateDelete: true,
      templateVersioning: {
        v1: orgA.versionNumber,
        v2: orgA2.versionNumber,
        forkedFrom: forked.parentTemplateId,
        forkVersion: forked.versionNumber,
      },
      unsubscribeEnforced: true,
      footerHeuristicRejected: true,
      liveSend: false,
      migrationUnapplied: true,
    },
    null,
    2,
  ),
);
