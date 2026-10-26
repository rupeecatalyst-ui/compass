/**
 * Employee image-library rules. No database, send, or deploy.
 */
import assert from "node:assert/strict";
import { assertMarketingAssetApprovalTransition } from "../src/lib/enterprise-marketing-engine/asset-approval-transition";
import { findMarketingAssetChecksumDuplicate } from "../src/lib/enterprise-marketing-engine/asset-checksum";
import {
  marketingImageCropRect,
  marketingImageOutputSize,
} from "../src/lib/enterprise-marketing-engine/asset-image-prepare";
import {
  parseMarketingAssetTagsJson,
  serializeMarketingAssetTagsJson,
} from "../src/lib/enterprise-marketing-engine/asset-rights";

const legacy = parseMarketingAssetTagsJson(["collection:home-loans"]);
assert.deepEqual(legacy.tags, ["collection:home-loans"]);
assert.equal(legacy.rights.license, "");
assert.deepEqual(serializeMarketingAssetTagsJson(legacy.tags, legacy.rights), ["collection:home-loans"]);

const withRights = serializeMarketingAssetTagsJson(["collection:festive"], {
  sourceUrl: "https://example.com/license",
  license: "Original",
  commercialEmail: "yes",
  attribution: "",
  restrictions: "Email only",
  evidenceReference: "RC-AUTH-1",
});
const readBack = parseMarketingAssetTagsJson(withRights);
assert.equal(readBack.rights.sourceUrl, "https://example.com/license");
assert.equal(readBack.rights.commercialEmail, "yes");
assert.equal(readBack.rights.evidenceReference, "RC-AUTH-1");
assert.equal(readBack.rights.restrictions, "Email only");
assert.deepEqual(readBack.tags, ["collection:festive"]);

const legacyObject = parseMarketingAssetTagsJson({
  tags: ["collection:home-loans"],
  rights: { source: "https://legacy.example/photo", license: "Paid" },
});
assert.equal(legacyObject.rights.sourceUrl, "https://legacy.example/photo");
assert.equal(legacyObject.rights.license, "Paid");
assert.equal(legacyObject.tags[0], "collection:home-loans");

assert.throws(
  () => assertMarketingAssetApprovalTransition("DRAFT", "APPROVED"),
  (err: { code?: string }) => err?.code === "ASSET_APPROVAL_TRANSITION",
);
assert.doesNotThrow(() => assertMarketingAssetApprovalTransition("DRAFT", "PENDING_REVIEW"));
assert.doesNotThrow(() => assertMarketingAssetApprovalTransition("PENDING_REVIEW", "APPROVED"));
assert.doesNotThrow(() => assertMarketingAssetApprovalTransition("DRAFT", "REJECTED"));
assert.throws(
  () => assertMarketingAssetApprovalTransition("APPROVED", "REJECTED"),
  (err: { code?: string }) => err?.code === "ASSET_APPROVAL_LOCKED",
);

const duplicate = findMarketingAssetChecksumDuplicate(
  [
    {
      id: "a",
      organizationId: "org",
      checksum: "abc",
      name: "Home exterior",
      approvalStatus: "APPROVED",
      archived: false,
    },
  ],
  { organizationId: "org", checksum: "abc" },
);
assert.equal(duplicate?.name, "Home exterior");
assert.equal(
  findMarketingAssetChecksumDuplicate(
    [
      {
        id: "a",
        organizationId: "org",
        checksum: "abc",
        name: "Home exterior",
        approvalStatus: "APPROVED",
        archived: false,
      },
    ],
    { organizationId: "org", checksum: "abc", exceptId: "a" },
  ),
  null,
);

const hero = marketingImageCropRect(2000, 1000, "hero", "center");
assert.equal(hero.sh, 1000);
assert.ok(hero.sw < 2000);
const tall = marketingImageCropRect(900, 1600, "card", "bottom");
assert.equal(tall.sw, 900);
assert.equal(tall.sh, 900);
assert.equal(tall.sy, 700);
assert.deepEqual(marketingImageOutputSize(2400, 1200), { width: 1200, height: 600 });

console.log(JSON.stringify({ proof: "marketing-asset-library-employee-upload" }));
