/**
 * Marketing image library refinement proof.
 * In-memory only. No production writes, sends, migrations, or imports.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "marketing-library-refine-local-jwt-secret-aaa";
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = "marketing-library-refine-local-jwt-refresh-bb";
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/asset.service.ts")).href;
const storeUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/asset-store.ts")).href;
const auditUrl = pathToFileURL(resolve(root, "server/services/enterprise-marketing-engine/audit.ts")).href;
const renderUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/email-render.ts")).href;
const pickerUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/asset-library.ts")).href;

const assetMod = await import(assetUrl);
const storeMod = await import(storeUrl);
const auditMod = await import(auditUrl);
const renderMod = await import(renderUrl);
const pickerMod = await import(pickerUrl);

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const pngBytes = Buffer.from(TINY_PNG.split(",")[1], "base64");
const pngChecksum = createHash("sha256").update(pngBytes).digest("hex");

storeMod.configureMarketingAssetStoreForTests({ pinMemory: true });
storeMod.marketingAssetStore.reset();
auditMod.resetMarketingAuditEventsForTests();

const org = {
  userId: "library-refine",
  organizationId: "org-mkt-library-refine",
  role: "SUPER_ADMIN",
};

const uploaded = [];
for (let index = 1; index <= 61; index += 1) {
  const asset = await assetMod.marketingAssetService.upload(org, {
    title: `Library image ${index}`,
    mimeType: index === 61 ? "image/png" : "image/jpeg",
    category: "hero",
    assetType: "image",
    productCategory: index === 61 ? "Home Loan" : "General",
    tags: [index === 61 ? "collection:festive" : "collection:home-loans"],
    url: index === 61 ? TINY_PNG : `https://example.com/library-fixture/${index}.jpg`,
    byteSize: index === 61 ? pngBytes.length : 120 + index,
    altText: index === 61 || index === 2 ? `Picture ${index}` : "",
    rights:
      index === 61
        ? {
            sourceUrl: "https://example.com/rights/61",
            license: "Original",
            commercialEmail: "yes",
            attribution: "Rupee Catalyst",
            restrictions: "Email only",
            evidenceReference: "RC-LIB-61",
          }
        : undefined,
  });
  assert.equal(asset.approvalStatus, "DRAFT", `image ${index} must stay draft`);
  uploaded.push(asset);
}
assert.equal(uploaded.length, 61);
assert.equal(uploaded[60].name, "Library image 61");
assert.equal(uploaded[60].rights.commercialEmail, "yes");
assert.equal(uploaded[60].rights.evidenceReference, "RC-LIB-61");

const listed = await assetMod.marketingAssetService.list(org);
assert.ok(listed.length >= 61, "the library must accept a 61st image");
assert.equal(listed.every((asset) => asset.approvalStatus === "DRAFT"), true);

let duplicateBlocked = false;
try {
  await assetMod.marketingAssetService.upload(org, {
    title: "Duplicate of 1",
    mimeType: "image/jpeg",
    category: "hero",
    url: "https://example.com/library-fixture/1.jpg",
    byteSize: 121,
    altText: "Duplicate",
  });
} catch (err) {
  duplicateBlocked = err?.code === "ASSET_DUPLICATE";
}
assert.equal(duplicateBlocked, true, "checksum duplicate must be refused");

const draftPicker = pickerMod.filterApprovedMarketingPickerImages(listed, { collection: "festive" });
assert.equal(draftPicker.length, 0, "draft images must not appear in the picker");

let selectBlocked = false;
try {
  await assetMod.marketingAssetService.selectForCampaign(org, uploaded[60].id);
} catch (err) {
  selectBlocked = err?.code === "ASSET_NOT_APPROVED";
}
assert.equal(selectBlocked, true);
assert.equal(await storeMod.marketingAssetStore.getPublicImage(uploaded[60].id, uploaded[60].checksum), null);

let missingAltBlocked = false;
try {
  await assetMod.marketingAssetService.setApproval(org, uploaded[0].id, "PENDING_REVIEW");
  await assetMod.marketingAssetService.setApproval(org, uploaded[0].id, "APPROVED");
} catch (err) {
  missingAltBlocked = err?.code === "ASSET_ALT_TEXT_REQUIRED";
}
assert.equal(missingAltBlocked, true, "approval still requires alt text");
assert.equal((await assetMod.marketingAssetService.get(org, uploaded[0].id)).approvalStatus, "PENDING_REVIEW");

const rejected = await assetMod.marketingAssetService.setApproval(org, uploaded[1].id, "PENDING_REVIEW");
assert.equal(rejected.approvalStatus, "PENDING_REVIEW");
const rejectedAsset = await assetMod.marketingAssetService.setApproval(org, uploaded[1].id, "REJECTED");
assert.equal(rejectedAsset.approvalStatus, "REJECTED");

const reviewed = await assetMod.marketingAssetService.setApproval(org, uploaded[60].id, "PENDING_REVIEW");
assert.equal(reviewed.approvalStatus, "PENDING_REVIEW");
const approved = await assetMod.marketingAssetService.setApproval(org, uploaded[60].id, "APPROVED");
assert.equal(approved.approvalStatus, "APPROVED");
assert.equal(approved.checksum, pngChecksum);

const audits = auditMod.listMarketingAuditEventsForOrganization(org.organizationId, 20);
assert.ok(
  audits.some((event) => event.kind === "asset.approval" && event.detail?.resultingState === "APPROVED"),
  "approval must be audited",
);
assert.ok(
  audits.some((event) => event.kind === "asset.approval" && event.detail?.resultingState === "REJECTED"),
  "rejection must be audited",
);

const pickerAssets = pickerMod.filterApprovedMarketingPickerImages(
  await assetMod.marketingAssetService.list(org),
  { search: "Library image 61", collection: "festive", productCategory: "Home Loan" },
);
assert.equal(pickerAssets.length, 1);
assert.equal(pickerAssets[0].id, approved.id);
assert.equal(pickerMod.filterApprovedMarketingPickerImages(pickerAssets, { collection: "home-loans" }).length, 0);

const selected = await assetMod.marketingAssetService.selectForCampaign(org, approved.id);
const html = renderMod.renderMarketingEmailHtml({
  content: {
    version: 1,
    blocks: [
      {
        id: "picked",
        type: "image",
        props: { assetId: selected.assetId, url: selected.url, alt: selected.alt },
      },
    ],
  },
  subject: "Library check",
  previewText: "Preview",
  personalization: {},
});
assert.ok(html.includes(`src="${selected.url}"`), "template preview must use the approved image URL");
assert.ok(html.includes("Picture 61"), "template preview must keep the alt text");
assert.equal(html.includes("data:image"), false);

const beforeBytes = await storeMod.marketingAssetStore.getPublicImage(approved.id, approved.checksum);
assert.ok(beforeBytes?.bytes.length);
let replaceBlocked = false;
try {
  await assetMod.marketingAssetService.replace(org, approved.id, {
    url: TINY_PNG.replace("A", "B"),
    mimeType: "image/png",
    byteSize: 80,
    altText: "Replacement",
  });
} catch (err) {
  replaceBlocked = err?.code === "ASSET_REPLACE_FORBIDDEN";
}
assert.equal(replaceBlocked, true, "an approved image cannot be replaced");
const after = await assetMod.marketingAssetService.get(org, approved.id);
assert.equal(after.checksum, approved.checksum);
assert.equal(after.approvalStatus, "APPROVED");
assert.equal(after.previewUrl, approved.previewUrl);
const afterBytes = await storeMod.marketingAssetStore.getPublicImage(after.id, after.checksum);
assert.equal(afterBytes?.bytes.length, beforeBytes.bytes.length);

let rejectApprovedBlocked = false;
try {
  await assetMod.marketingAssetService.setApproval(org, approved.id, "REJECTED");
} catch (err) {
  rejectApprovedBlocked = err?.code === "ASSET_APPROVAL_LOCKED";
}
assert.equal(rejectApprovedBlocked, true, "an approved image cannot be rejected");
const stillApproved = await assetMod.marketingAssetService.get(org, approved.id);
assert.equal(stillApproved.approvalStatus, "APPROVED");
assert.equal(stillApproved.id, approved.id);
assert.equal(stillApproved.checksum, approved.checksum);
assert.equal(stillApproved.previewUrl, approved.previewUrl);

const archivedApproved = await assetMod.marketingAssetService.archive(org, approved.id);
assert.equal(archivedApproved.archived, true);
assert.equal(archivedApproved.approvalStatus, "APPROVED");
assert.equal(archivedApproved.id, approved.id);
assert.equal(archivedApproved.checksum, approved.checksum);
const archivedBytes = await storeMod.marketingAssetStore.getPublicImage(
  archivedApproved.id,
  archivedApproved.checksum,
);
assert.equal(archivedBytes?.bytes.length, beforeBytes.bytes.length, "archived approved image keeps its checksum URL");
assert.equal(
  pickerMod.filterApprovedMarketingPickerImages([archivedApproved], {}).length,
  0,
  "the picker must exclude archived images",
);

const draftRejection = await assetMod.marketingAssetService.setApproval(org, uploaded[2].id, "REJECTED");
assert.equal(draftRejection.approvalStatus, "REJECTED");

const legacyOrg = "org-mkt-library-legacy";
const legacyId = "mkt-asset-legacy-array";
let legacyWrites = 0;
const legacyRow = {
  id: legacyId,
  organizationId: legacyOrg,
  name: "Legacy approved photograph",
  title: "Legacy approved photograph",
  assetType: "image",
  category: "hero",
  mimeType: "image/png",
  storageProvider: "fixture",
  storageRef: "fixture://marketing-assets/legacy/v1",
  previewUrl: TINY_PNG,
  byteSize: pngBytes.length,
  width: 1,
  height: 1,
  uploadedByUserId: "legacy",
  uploadedAt: new Date("2026-10-01T00:00:00.000Z"),
  tagsJson: ["collection:home-loans", "legacy"],
  productCategory: "Home Loan",
  approvalStatus: "APPROVED",
  altText: "Legacy home",
  archived: false,
  currentVersionNumber: 1,
  checksum: pngChecksum,
  createdAt: new Date("2026-10-01T00:00:00.000Z"),
  updatedAt: new Date("2026-10-01T00:00:00.000Z"),
  versions: [],
};
storeMod.configureMarketingAssetStoreForTests({
  pinMemory: false,
  forcePrisma: true,
  prismaDelegate: {
    async findMany(args) {
      return args.where.organizationId === legacyOrg ? [legacyRow] : [];
    },
    async findFirst(args) {
      return args.where.id === legacyId ? legacyRow : null;
    },
    async findUnique(args) {
      return args.where.id === legacyId ? legacyRow : null;
    },
    async upsert() {
      legacyWrites += 1;
      throw new Error("legacy approved bytes must not be rewritten");
    },
  },
  versionDelegate: {
    async upsert() {
      legacyWrites += 1;
      throw new Error("legacy version rows must not be rewritten");
    },
  },
});
storeMod.marketingAssetStore.reset();

const legacy = await assetMod.marketingAssetService.get(
  { userId: "library-refine", organizationId: legacyOrg, role: "SUPER_ADMIN" },
  legacyId,
);
assert.deepEqual(legacy.tags, ["collection:home-loans", "legacy"]);
assert.equal(legacy.rights.sourceUrl, "");
assert.equal(legacy.approvalStatus, "APPROVED");
const legacyBytes = await storeMod.marketingAssetStore.getPublicImage(legacy.id, legacy.checksum);
assert.equal(legacyBytes?.bytes.length, pngBytes.length);
let legacyReplaceBlocked = false;
try {
  await assetMod.marketingAssetService.replace(
    { userId: "library-refine", organizationId: legacyOrg, role: "SUPER_ADMIN" },
    legacy.id,
    { url: "https://example.com/new-legacy.png", mimeType: "image/png", byteSize: 40, altText: "New" },
  );
} catch (err) {
  legacyReplaceBlocked = err?.code === "ASSET_REPLACE_FORBIDDEN";
}
assert.equal(legacyReplaceBlocked, true);
assert.equal(legacyWrites, 0);
assert.equal(legacyRow.previewUrl, TINY_PNG);
assert.equal(legacyRow.checksum, pngChecksum);
const legacyBytesAfter = await storeMod.marketingAssetStore.getPublicImage(legacy.id, pngChecksum);
assert.equal(legacyBytesAfter?.bytes.length, pngBytes.length);

storeMod.configureMarketingAssetStoreForTests({ pinMemory: true });
storeMod.marketingAssetStore.reset();

console.log(
  JSON.stringify({
    proof: "marketing-asset-library-refinement",
    uploaded: 61,
    approved: approved.id,
    historicalChecksum: pngChecksum,
    legacyTags: "string-array",
  }),
);
