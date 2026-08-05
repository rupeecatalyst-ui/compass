/**
 * CO-LW-005 — Enterprise Lender Branding verification.
 * Ensures branding is master data, LenderLogo consumes registry, no hardcoded brand map.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const branding = read("src/constants/enterprise-lender-registry/branding-catalog.ts");
assert.match(branding, /CO_LW_005_LENDER_BRANDING_VERSION/);
assert.match(branding, /LENDER_BRANDING_CATALOG/);
assert.match(branding, /HDFC Bank Logo\.svg/);
assert.match(branding, /State Bank of India\.svg/);
assert.match(branding, /verificationStatus: \"verified\"/);
assert.match(branding, /missingLogoReason/);

const resolve = read("src/lib/enterprise-lender-registry/branding.ts");
assert.match(resolve, /resolveLenderBranding/);
assert.match(resolve, /Never invents logo/);

const logoUi = read("src/components/catalyst-one/shared/lender-logo.tsx");
assert.match(logoUi, /resolveLenderBranding/);
assert.match(logoUi, /logoUrl/);
assert.doesNotMatch(logoUi, /LENDER_BRANDS/);
assert.doesNotMatch(logoUi, /#004C8F/);

const seed = read("src/constants/enterprise-lender-registry/master-seed-catalog.ts");
assert.match(seed, /logoUrl\?:/);
assert.match(seed, /brandName\?:/);
assert.match(seed, /getLenderBrandingBySeedKey/);

const bootstrap = read("src/lib/enterprise-lender-registry/bootstrap-master.ts");
assert.match(bootstrap, /logoUrl: seed\.logoUrl/);

const repo = read("server/repositories/lender-registry/lender-registry.repository.ts");
assert.match(repo, /logoUrl: input\.logoUrl/);

const apiCreate = read("src/app/api/lender-registry/lenders/route.ts");
assert.match(apiCreate, /logoUrl: body\.logoUrl/);

const apiPatch = read("src/app/api/lender-registry/lenders/[lenderId]/route.ts");
assert.match(apiPatch, /logoUrl: body\.logoUrl/);

const published = read("src/lib/enterprise-lender-registry/published-directory.ts");
assert.match(published, /logoUrl/);
assert.match(published, /brandName/);

const lp = read(
  "src/components/catalyst-one/lending-programs-workspace/lending-programs-workspace.tsx",
);
assert.match(lp, /LenderLogo/);
assert.match(lp, /logoUrl=\{selectedLender\.logoUrl\}/);

const report = read("docs/co-lw-005/CO-LW-005-LENDER-BRANDING-READINESS-REPORT.md");
assert.match(report, /Missing Branding/);
assert.match(report, /Verified Logos/);

console.log("CO-LW-005 verify: PASS");
