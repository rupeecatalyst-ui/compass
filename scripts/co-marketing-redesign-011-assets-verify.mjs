/**
 * CO-MARKETING-REDESIGN-011 — Marketing Asset Library.
 * Local fixtures only. No send, migrate, Hostinger upload, commit, or deploy.
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
const safety = read("src/constants/enterprise-marketing-engine/safety.ts");
const cronSrc = read("src/lib/enterprise-marketing-engine/execution/cron-activation.ts");
const schema = read("prisma/schema.prisma");
const migration = read(
  "prisma/migrations/20260905120000_co_marketing_redesign_durable_foundation/migration.sql",
);
const executionConst = read("src/constants/enterprise-marketing-engine/execution.ts");
const assetConst = read("src/constants/enterprise-marketing-engine/assets.ts");
const mimeSrc = read("src/lib/enterprise-marketing-engine/asset-mime.ts");
const fixtureSrc = read("src/lib/enterprise-marketing-engine/asset-fixture-storage.ts");
const altSrc = read("src/lib/enterprise-marketing-engine/asset-alt-text.ts");
const usageSrc = read("src/lib/enterprise-marketing-engine/asset-usage.ts");
const librarySrc = read("src/lib/enterprise-marketing-engine/asset-library.ts");
const storeSrc = read("server/services/enterprise-marketing-engine/asset-store.ts");
const serviceSrc = read("server/services/enterprise-marketing-engine/asset.service.ts");
const apiSrc = read("src/app/api/admin/marketing/assets/route.ts");
const panelSrc = read(
  "src/components/catalyst-one/admin/marketing/marketing-assets-panel.tsx",
);
const editorSrc = read(
  "src/components/catalyst-one/admin/marketing/marketing-visual-email-editor.tsx",
);
const prePublish = read("src/lib/enterprise-marketing-engine/pre-publish.ts");
const disabledSrc = read("src/lib/enterprise-marketing-engine/disabled-ports.ts");
const builderPage = read(
  "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx",
);
const orgSrc = read("server/services/enterprise-marketing-engine/organization.ts");

mustInclude(pkg, "verify:co-marketing-redesign-011");
mustInclude(safety, "marketingGateEnabled(process.env.ENTERPRISE_MARKETING_EXECUTION_ENABLED)");
mustInclude(cronSrc, "MARKETING_PACING_CRON_REGISTERED = false");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_SIZE = 100");
mustInclude(executionConst, "MARKETING_DEFAULT_BATCH_INTERVAL_MS = 60 * 60 * 1000");
assert.doesNotMatch(schema, /model\s+Lead\b/);
assert.doesNotMatch(schema, /model\s+MarketingProspect\b/);
assert.doesNotMatch(migration, /Lead\b/);
mustInclude(migration, "Do not apply without explicit Product Owner approval");
mustInclude(migration, "enterprise_marketing_assets");
mustInclude(migration, "enterprise_marketing_asset_versions");
mustInclude(migration, 'REFERENCES "organizations"("id")');
mustInclude(assetConst, 'MARKETING_ASSET_STORAGE_PROVIDER = "fixture"');
mustInclude(assetConst, "MARKETING_ASSET_DOCUMENT_REGISTRY_NOTICE");
mustInclude(assetConst, "image/svg+xml");
mustInclude(mimeSrc, "ASSET_DANGEROUS_TYPE");
mustInclude(assetConst, "fixture://marketing-assets");
mustInclude(fixtureSrc, "ASSET_EXTERNAL_UPLOAD_FORBIDDEN");
mustInclude(altSrc, "ASSET_ALT_TEXT_REQUIRED");
mustInclude(usageSrc, 'kind: "campaign"');
mustInclude(usageSrc, 'kind: "template"');
mustInclude(usageSrc, "ASSET_DELETE_FORBIDDEN");
mustInclude(librarySrc, "filterMarketingAssetLibrary");
mustInclude(storeSrc, 'trimmed === "default"');
mustInclude(storeSrc, "createMarketingScopedId");
assert.doesNotMatch(storeSrc, /mkt-asset-\$\{organizationId\}-\$\{Date\.now\(\)\}/);
mustInclude(serviceSrc, 'trimmed === "default"');
mustInclude(serviceSrc, "forbidDestructiveMarketingAssetDelete");
mustInclude(apiSrc, "resolveMarketingOrganizationId");
mustInclude(apiSrc, "fromMarketingUnknownError");
mustInclude(apiSrc, 'action === "delete"');
mustInclude(apiSrc, 'action === "select_for_campaign"');
mustInclude(panelSrc, "Document Registry");
mustInclude(panelSrc, "Select for campaign");
mustInclude(panelSrc, "mkt-asset-card");
mustInclude(panelSrc, "Usage history");
mustInclude(editorSrc, "Browse Asset Library");
mustInclude(prePublish, "Images require accessibility alt text before campaign approval");
mustInclude(disabledSrc, 'blocked("asset.put")');
mustInclude(orgSrc, 'organizationId === "default"');
assert.doesNotMatch(serviceSrc, /disabledMarketingAssetStoragePort/);
assert.doesNotMatch(storeSrc, /disabledMarketingAssetStoragePort\.put/);
mustInclude(storeSrc, "ASSET_EXTERNAL_UPLOAD_FORBIDDEN");
mustInclude(storeSrc, "hostinger");
mustInclude(storeSrc, "enterpriseMarketingAsset");
mustInclude(storeSrc, "ASSET_PERSISTENCE_FAILED");
mustInclude(storeSrc, "buildMarketingAssetPublicUrl");
mustInclude(assetConst, "MARKETING_ASSET_PUBLIC_PATH_PREFIX");
assert.doesNotMatch(builderPage, /test_send/);
assert.doesNotMatch(builderPage, /run_test_batch/);
assert.doesNotMatch(builderPage, /run_next_batch/);
assert.doesNotMatch(panelSrc, /uploadDocumentToRegistry/);
assert.doesNotMatch(serviceSrc, /EnterpriseTransactionDocument/);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "marketing-pre-staging-local-jwt-secret-aaaa";
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = "marketing-pre-staging-local-jwt-refresh-bbbb";
}

const mimeUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/asset-mime.ts")).href;
const fixtureUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/asset-fixture-storage.ts"),
).href;
const altUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/asset-alt-text.ts")).href;
const prePubUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/pre-publish.ts")).href;
const assetUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/asset.service.ts"),
).href;
const storeUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/asset-store.ts"),
).href;
const campUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/campaign.service.ts"),
).href;
const tplUrl = pathToFileURL(
  resolve(root, "server/services/enterprise-marketing-engine/template-store.ts"),
).href;
const disabledUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/disabled-ports.ts"),
).href;

const mimeMod = await import(mimeUrl);
const fixtureMod = await import(fixtureUrl);
const altMod = await import(altUrl);
const prePubMod = await import(prePubUrl);
const assetMod = await import(assetUrl);
const storeMod = await import(storeUrl);
const campMod = await import(campUrl);
const tplMod = await import(tplUrl);
const disabledMod = await import(disabledUrl);

storeMod.configureMarketingAssetStoreForTests({ pinMemory: true });
storeMod.marketingAssetStore.reset();

const orgA = {
  userId: "verify-011-a",
  organizationId: "org-mkt-011-a",
  role: "SUPER_ADMIN",
};
const orgB = {
  userId: "verify-011-b",
  organizationId: "org-mkt-011-b",
  role: "SUPER_ADMIN",
};

assert.equal(mimeMod.isAllowedMarketingAssetMime("image/png"), true);
assert.equal(mimeMod.isAllowedMarketingAssetMime("application/pdf"), true);
assert.equal(mimeMod.isAllowedMarketingAssetMime("video/mp4"), true);
assert.equal(mimeMod.isAllowedMarketingAssetMime("image/svg+xml"), false);
assert.equal(mimeMod.isAllowedMarketingAssetMime("text/html"), false);
assert.equal(mimeMod.isAllowedMarketingAssetMime("application/javascript"), false);
assert.equal(mimeMod.isAllowedMarketingAssetMime("application/octet-stream"), false);
assert.throws(
  () => mimeMod.assertSafeMarketingAssetUpload({ mimeType: "text/html", filename: "page.html" }),
  (err) => err?.code === "ASSET_UNSUPPORTED_MIME" || err?.code === "ASSET_DANGEROUS_TYPE",
);
assert.throws(
  () => mimeMod.assertSafeMarketingAssetUpload({ mimeType: "image/png", filename: "payload.exe" }),
  (err) => err?.code === "ASSET_DANGEROUS_TYPE",
);

let defaultRejected = false;
try {
  await assetMod.marketingAssetService.list({ userId: "x", organizationId: "default", role: "SUPER_ADMIN" });
} catch (err) {
  defaultRejected = err?.code === "ORGANIZATION_REQUIRED";
}
assert.equal(defaultRejected, true, "default org must be rejected");

const png = await assetMod.marketingAssetService.upload(orgA, {
  title: "Home loan banner",
  mimeType: "image/png",
  category: "banner",
  tags: ["verify", "011"],
  url: "https://example.com/banner.png",
  byteSize: 1200,
  altText: "",
  productCategory: "Home Loan",
  assetType: "campaign_banner",
});
assert.equal(png.organizationId, orgA.organizationId);
assert.equal(png.storageProvider, "fixture");
assert.ok(png.storageRef.startsWith("fixture://marketing-assets/"));
assert.equal(png.assetType, "campaign_banner");
assert.equal(png.approvalStatus, "DRAFT");
assert.equal(png.archived, false);
assert.equal(png.uploadedByUserId, orgA.userId);
assert.ok(png.uploadedAt);

const hiddenFromB = await assetMod.marketingAssetService.list(orgB);
assert.equal(
  hiddenFromB.some((asset) => asset.id === png.id),
  false,
  "org B must not see org A assets",
);

let crossOrg = false;
try {
  await assetMod.marketingAssetService.get(orgB, png.id);
} catch (err) {
  crossOrg = err?.statusCode === 404 || err?.code === "NOT_FOUND";
}
assert.equal(crossOrg, true, "cross-org get must fail");

let dangerousUpload = false;
try {
  await assetMod.marketingAssetService.upload(orgA, {
    title: "script",
    mimeType: "application/javascript",
    category: "other",
    url: "https://example.com/x.js",
    byteSize: 20,
  });
} catch (err) {
  dangerousUpload = err?.code === "ASSET_UNSUPPORTED_MIME" || err?.code === "ASSET_DANGEROUS_TYPE";
}
assert.equal(dangerousUpload, true, "dangerous MIME must be rejected");

let hostingerBlocked = false;
try {
  await assetMod.marketingAssetService.upload(orgA, {
    title: "hosted",
    mimeType: "image/png",
    category: "banner",
    url: "https://files.hostinger.com/marketing/banner.png",
    byteSize: 40,
  });
} catch (err) {
  hostingerBlocked = err?.code === "ASSET_EXTERNAL_UPLOAD_FORBIDDEN";
}
assert.equal(hostingerBlocked, true, "Hostinger URL must be rejected");

const pdf = await assetMod.marketingAssetService.upload(orgA, {
  title: "Approved collateral",
  mimeType: "application/pdf",
  category: "other",
  url: "https://example.com/collateral.pdf",
  byteSize: 800,
  assetType: "pdf",
  productCategory: "LAP",
});
assert.equal(pdf.assetType, "pdf");

const video = await assetMod.marketingAssetService.upload(orgA, {
  title: "Social video reference",
  mimeType: "video/mp4",
  category: "product",
  url: "https://example.com/creative.mp4",
  byteSize: 900,
  assetType: "video",
  productCategory: "Personal Loan",
});
assert.equal(video.assetType, "video");

const replaced = await assetMod.marketingAssetService.replace(orgA, png.id, {
  url: "https://example.com/banner-v2.png",
  mimeType: "image/png",
  byteSize: 1400,
  altText: "Home loan offer banner",
});
assert.equal(replaced.currentVersionNumber, 2);
assert.ok(replaced.versions.length >= 2);

const created = await campMod.marketingCampaignService.create(orgA, {
  name: "011 usage campaign",
  objective: "Acquire",
  product: "Home Loan",
  channel: "EMAIL",
});
await campMod.marketingCampaignService.save(orgA, created.campaign.id, {
  content: {
    version: 1,
    blocks: [
      {
        id: "blk-011-image",
        type: "image",
        props: { assetId: png.id, url: replaced.url, alt: "Home loan offer banner" },
      },
      ...created.draft.content.blocks,
    ],
  },
});
tplMod.marketingTemplateStore.save({
  organizationId: orgA.organizationId,
  name: "011 template",
  channel: "EMAIL",
  subject: "Hello",
  previewText: "Preview",
  content: {
    version: 1,
    blocks: [
      {
        id: "tpl-img",
        type: "logo",
        props: { assetId: png.id, url: replaced.url, alt: "Logo" },
      },
    ],
  },
  category: "organisation",
  status: "DRAFT",
  origin: "organisation",
});

const withUsage = await assetMod.marketingAssetService.get(orgA, png.id);
assert.ok(
  withUsage.usageReferences.some((ref) => ref.kind === "campaign" && ref.id === created.campaign.id),
  "campaign usage missing",
);
assert.ok(
  withUsage.usageReferences.some((ref) => ref.kind === "template"),
  "template usage missing",
);

let deleteBlocked = false;
try {
  assetMod.marketingAssetService.delete(orgA, png.id);
} catch (err) {
  deleteBlocked = err?.code === "ASSET_DELETE_FORBIDDEN";
}
assert.equal(deleteBlocked, true, "delete must be forbidden");

const archived = await assetMod.marketingAssetService.archive(orgA, png.id);
assert.equal(archived.archived, true);
assert.ok(archived.usageReferences.length > 0, "archive must keep usage history");

const missingAlt = altMod.collectMarketingImageBlocksMissingAlt({
  version: 1,
  blocks: [{ id: "img-empty", type: "image", props: { url: "https://example.com/x.png", alt: "" } }],
});
assert.deepEqual(missingAlt, ["img-empty"]);

const campaignStub = {
  audienceId: "aud-011",
  sender: { fromName: "RC", fromAddress: "campaigns@example.com" },
  schedulePlaceholder: { enabled: false, notes: "" },
  routingPlaceholder: { mode: "USER" },
  notificationPlaceholder: { inApp: true, email: false, whatsapp: false },
};
const versionStub = {
  subject: "Hello",
  previewText: "Hi",
  ctaLabel: "Go",
  ctaUrl: "https://rupeecatalyst.com",
  content: {
    version: 1,
    blocks: [
      { id: "h", type: "header", props: { title: "Hi" } },
      { id: "t", type: "text", props: { html: "Body" } },
      { id: "c", type: "cta", props: { label: "Go", url: "https://rupeecatalyst.com" } },
      { id: "u", type: "unsubscribe", props: { label: "Unsubscribe", href: "{{unsubscribeUrl}}" } },
      { id: "i", type: "image", props: { url: replaced.url, alt: "" } },
    ],
  },
};
const blocked = prePubMod.runMarketingPrePublishChecks({
  campaign: campaignStub,
  version: versionStub,
});
assert.equal(blocked.readyForApproval, false);
assert.ok(blocked.blockingCodes.includes("alt_text"));

versionStub.content.blocks.find((block) => block.id === "i").props.alt = "Accessible banner";
const allowed = prePubMod.runMarketingPrePublishChecks({
  campaign: campaignStub,
  version: versionStub,
});
assert.equal(allowed.readyForApproval, true);

const scheduledWithoutNotes = prePubMod.runMarketingPrePublishChecks({
  campaign: {
    ...campaignStub,
    schedulePlaceholder: { enabled: true, startAt: "2026-10-27T09:00:00.000Z" },
  },
  version: versionStub,
});
assert.equal(
  scheduledWithoutNotes.checks.find((check) => check.id === "scheduling")?.passed,
  true,
  "enabled schedule with startAt must not require notes",
);
assert.equal(scheduledWithoutNotes.blockingCodes.includes("scheduling"), false);

const scheduledWithoutStart = prePubMod.runMarketingPrePublishChecks({
  campaign: {
    ...campaignStub,
    schedulePlaceholder: { enabled: true, startAt: null, notes: "operator note" },
  },
  version: versionStub,
});
assert.equal(
  scheduledWithoutStart.checks.find((check) => check.id === "scheduling")?.passed,
  false,
  "enabled schedule still requires a start time",
);
assert.equal(
  scheduledWithoutStart.checks.find((check) => check.id === "scheduling")?.message,
  "Schedule enabled but start time missing",
);

let assetApproveBlocked = false;
try {
  await storeMod.marketingAssetStore.setApproval(pdf.id, orgA.organizationId, "APPROVED");
  const imageNoAlt = await assetMod.marketingAssetService.upload(orgA, {
    title: "No alt",
    mimeType: "image/jpeg",
    category: "hero",
    url: "https://example.com/no-alt.jpg",
    byteSize: 100,
    altText: "",
  });
  await assetMod.marketingAssetService.setApproval(orgA, imageNoAlt.id, "APPROVED");
} catch (err) {
  assetApproveBlocked = err?.code === "ASSET_ALT_TEXT_REQUIRED";
}
assert.equal(assetApproveBlocked, true, "image approval requires alt text");

let putCalled = false;
try {
  await disabledMod.disabledMarketingAssetStoragePort.put({
    organizationId: orgA.organizationId,
    filename: "x.png",
    mimeType: "image/png",
    bytes: new Uint8Array([1, 2, 3]),
  });
  putCalled = true;
} catch {
  putCalled = false;
}
assert.equal(putCalled, false, "live asset.put must remain blocked");

const selected = await assetMod.marketingAssetService.selectForCampaign(orgA, pdf.id);
assert.equal(selected.assetId, pdf.id);
assert.equal(selected.organizationId, orgA.organizationId);

const listed = await assetMod.marketingAssetService.list(orgA, {
  includeArchived: true,
  search: "collateral",
  assetType: "pdf",
  productCategory: "LAP",
});
assert.equal(listed.some((asset) => asset.id === pdf.id), true);

const frozenNow = 1_725_000_000_000;
const originalNow = Date.now;
Date.now = () => frozenNow;
try {
  const sameMsIds = [];
  for (let i = 0; i < 8; i += 1) {
    const sameMs = await assetMod.marketingAssetService.upload(orgA, {
      title: `Same-ms fixture ${i}`,
      mimeType: "image/png",
      category: "banner",
      url: `https://example.com/same-ms-${i}.png`,
      byteSize: 200 + i,
      altText: `Same millisecond banner ${i}`,
    });
    sameMsIds.push(sameMs.id);
  }
  assert.equal(new Set(sameMsIds).size, sameMsIds.length, "same-ms asset IDs must be unique");
  assert.equal(
    sameMsIds.includes(`mkt-asset-${orgA.organizationId}-${frozenNow}`),
    false,
    "Date.now() alone must not be the asset identifier",
  );
  const deterministic = await storeMod.marketingAssetStore.upsert({
    organizationId: orgA.organizationId,
    id: "mkt-asset-fixed-011",
    title: "Deterministic fixture",
    mimeType: "image/png",
    category: "banner",
    url: "https://example.com/deterministic.png",
    byteSize: 180,
    altText: "Deterministic banner",
  });
  assert.equal(deterministic.id, "mkt-asset-fixed-011");
} finally {
  Date.now = originalNow;
}

const visualUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/visual-editor.ts"),
).href;
const renderUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/email-render.ts"),
).href;
const publicUrlModUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/asset-public-url.ts"),
).href;
const visualMod = await import(visualUrl);
const renderMod = await import(renderUrl);
const publicUrlMod = await import(publicUrlModUrl);

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const stripped = visualMod.sanitizeMarketingContentDocument({
  version: 1,
  blocks: [{ id: "logo-data", type: "logo", props: { url: TINY_PNG, alt: "Rupee Catalyst" } }],
});
assert.equal(stripped.blocks[0].props.url, "", "data: URLs must still be sanitised away");

const logo = await assetMod.marketingAssetService.upload(orgA, {
  title: "Official Rupee Catalyst logo",
  name: "Official Rupee Catalyst logo",
  mimeType: "image/png",
  category: "logo",
  assetType: "logo",
  url: TINY_PNG,
  byteSize: 70,
  altText: "Rupee Catalyst",
  productCategory: "Home Loan",
});
assert.equal(logo.url.startsWith("data:"), false, "uploaded logo must not expose a data URL");
assert.match(logo.url, /^https?:\/\//);
assert.ok(logo.url.includes("/api/marketing/public-assets/"));
assert.ok(logo.storageRef.startsWith("fixture://marketing-assets/"));

const selectedLogo = await assetMod.marketingAssetService.selectForCampaign(orgA, logo.id);
assert.equal(selectedLogo.url, logo.url);
assert.equal(selectedLogo.url.startsWith("data:"), false);

const picked = visualMod.sanitizeMarketingContentDocument({
  version: 1,
  blocks: [
    {
      id: "logo-https",
      type: "logo",
      props: { assetId: selectedLogo.assetId, url: selectedLogo.url, alt: selectedLogo.alt },
    },
  ],
});
assert.equal(picked.blocks[0].props.url, selectedLogo.url, "https logo URL must survive sanitisation");

const deliveryHtml = renderMod.renderMarketingEmailHtml({
  content: picked,
  subject: "Home Loan",
  previewText: "Preview",
  personalization: {},
});
assert.ok(deliveryHtml.includes(`src="${selectedLogo.url}"`), "delivery HTML must include the public logo URL");
assert.equal(deliveryHtml.includes("data:image"), false, "delivery HTML must not inline data: image URLs");

assert.equal(
  await storeMod.marketingAssetStore.getPublicImage(logo.id, logo.checksum),
  null,
  "DRAFT images must not be served anonymously",
);
const approvedLogo = await assetMod.marketingAssetService.setApproval(orgA, logo.id, "APPROVED");
assert.equal(approvedLogo.approvalStatus, "APPROVED");
assert.equal(approvedLogo.checksum.length, 64, "checksum must be full SHA-256 of image bytes");
const publicBytes = await storeMod.marketingAssetStore.getPublicImage(approvedLogo.id, approvedLogo.checksum);
assert.ok(publicBytes, "approved image bytes must be served");
assert.equal(publicBytes.mimeType, "image/png");
assert.ok(publicBytes.bytes.length > 0);
const wrongChecksum = await storeMod.marketingAssetStore.getPublicImage(approvedLogo.id, "deadbeef");
assert.equal(wrongChecksum, null, "checksum mismatch must 404");
const archivedLogo = await assetMod.marketingAssetService.archive(orgA, approvedLogo.id);
assert.equal(
  await storeMod.marketingAssetStore.getPublicImage(archivedLogo.id, archivedLogo.checksum),
  null,
  "archived images must not be served anonymously",
);

const sanitisedDraft = visualMod.sanitizeMarketingContentDocument({
  version: 1,
  blocks: [
    {
      id: "blk-logo",
      type: "logo",
      props: { assetId: logo.id, url: TINY_PNG, alt: "Rupee Catalyst" },
    },
  ],
});
assert.equal(sanitisedDraft.blocks[0].props.url, "", "Save Draft must strip data: URLs");
assert.equal(sanitisedDraft.blocks[0].props.assetId, logo.id);
const reopenedDoc = await storeMod.marketingAssetStore.hydrateContentUrls(
  sanitisedDraft,
  orgA.organizationId,
);
assert.equal(reopenedDoc.blocks[0].props.url, logo.url, "reopen must restore the public logo URL from assetId");
const previewHtml = renderMod.renderMarketingEmailHtml({
  content: reopenedDoc,
  subject: "Home Loan",
  previewText: "Preview",
  personalization: {},
});
assert.ok(previewHtml.includes(`src="${logo.url}"`), "preview HTML must include the public logo URL");

function createMemoryAssetPrisma() {
  const assetRows = new Map();
  const versionRows = new Map();
  function versionKey(assetId, versionNumber) {
    return `${assetId}:${versionNumber}`;
  }
  function withVersions(row) {
    const versions = [...versionRows.values()].filter((item) => item.assetId === row.id);
    return { ...row, versions };
  }
  return {
    assets: {
      async findMany({ where }) {
        return [...assetRows.values()]
          .filter((row) => row.organizationId === where.organizationId)
          .map(withVersions);
      },
      async findFirst({ where }) {
        const row = [...assetRows.values()].find(
          (item) => item.id === where.id && (!where.organizationId || item.organizationId === where.organizationId),
        );
        return row ? withVersions(row) : null;
      },
      async findUnique({ where }) {
        const row = assetRows.get(where.id);
        return row ? withVersions(row) : null;
      },
      async upsert({ where, create, update }) {
        const prev = assetRows.get(where.id);
        const next = prev ? { ...prev, ...update, id: where.id } : { ...create };
        assetRows.set(where.id, next);
        return withVersions(next);
      },
    },
    versions: {
      async upsert({ where, create, update }) {
        const key = versionKey(where.assetId_versionNumber.assetId, where.assetId_versionNumber.versionNumber);
        const prev = versionRows.get(key);
        const next = prev ? { ...prev, ...update } : { ...create };
        versionRows.set(key, next);
        return next;
      },
    },
  };
}

const memoryPrisma = createMemoryAssetPrisma();
storeMod.configureMarketingAssetStoreForTests({
  pinMemory: false,
  forcePrisma: true,
  prismaDelegate: memoryPrisma.assets,
  versionDelegate: memoryPrisma.versions,
});
storeMod.marketingAssetStore.reset();

const durableLogo = await assetMod.marketingAssetService.upload(orgA, {
  title: "Durable official logo",
  mimeType: "image/png",
  category: "logo",
  assetType: "logo",
  url: TINY_PNG,
  byteSize: 70,
  altText: "Rupee Catalyst",
});
assert.equal(durableLogo.id.startsWith("mkt-asset-"), true);
await assetMod.marketingAssetService.setApproval(orgA, durableLogo.id, "APPROVED");
storeMod.marketingAssetStore.reset();
const reloaded = await assetMod.marketingAssetService.get(orgA, durableLogo.id);
assert.equal(reloaded.id, durableLogo.id);
assert.equal(reloaded.url.includes("/api/marketing/public-assets/"), true);
assert.equal(reloaded.altText, "Rupee Catalyst");
assert.equal(reloaded.approvalStatus, "APPROVED");
const reloadedBytes = await storeMod.marketingAssetStore.getPublicImage(reloaded.id, reloaded.checksum);
assert.ok(reloadedBytes?.bytes.length > 0, "durable payload must survive memory reset");

assert.equal(publicUrlMod.isMarketingAssetDataUrl(TINY_PNG), true);
assert.equal(publicUrlMod.isMarketingAssetDataUrl(reloaded.url), false);

storeMod.configureMarketingAssetStoreForTests({ pinMemory: true });
storeMod.marketingAssetStore.reset();

console.log("CO-MARKETING-REDESIGN-011 assets verify: PASS");
