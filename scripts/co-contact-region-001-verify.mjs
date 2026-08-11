/**
 * CO-CONTACT-REGION-001 — Restore Region in Contact Role Workspace lender hierarchy.
 * Static gates only — no live data mutation · no deploy.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

function assertIncludes(rel, needles, label) {
  const src = read(rel);
  for (const n of needles) {
    assert.ok(src.includes(n), `${label}: ${rel} must contain ${JSON.stringify(n)}`);
  }
}

function assertNotIncludes(rel, needles, label) {
  const src = read(rel);
  for (const n of needles) {
    assert.ok(!src.includes(n), `${label}: ${rel} must not contain ${JSON.stringify(n)}`);
  }
}

// 1) Banker role template — Region immediately after Institution, mandatory MIR
const template = read("src/constants/enterprise-contact-master/role-templates.ts");
const bankerBlock = template.slice(
  template.indexOf('roleCode: "lender_employee"'),
  template.indexOf('roleCode: "partner"'),
);
assert.ok(bankerBlock.length > 200, "lender_employee template block must exist");

const regionIdx = bankerBlock.indexOf('key: "region"');
const cityIdx = bankerBlock.indexOf('key: "city"');
const branchIdx = bankerBlock.indexOf('key: "branch"');
const institutionIdx = bankerBlock.indexOf('key: "institution"');
assert.ok(institutionIdx >= 0 && regionIdx > institutionIdx, "Region must follow Institution");
assert.ok(cityIdx > regionIdx, "City must follow Region");
assert.ok(branchIdx > cityIdx, "Branch must follow City");

const regionField = bankerBlock.slice(regionIdx, cityIdx);
assert.match(regionField, /mandatory:\s*true/, "Region must be mandatory");
assert.match(regionField, /masterDomain:\s*"region"/);
assert.match(regionField, /parentFieldKey:\s*"institution"/);

const cityField = bankerBlock.slice(cityIdx, branchIdx);
assert.match(cityField, /parentFieldKey:\s*"region"/, "City parent must be Region");
assert.match(cityField, /mandatory:\s*true/);

const branchField = bankerBlock.slice(branchIdx, bankerBlock.indexOf('key: "designation"'));
assert.match(branchField, /parentFieldKey:\s*"city"/, "Branch parent must be City");

assertIncludes(
  "src/constants/enterprise-contact-master/role-templates.ts",
  ["Institution → Region → City → Branch"],
  "template-copy",
);
assertNotIncludes(
  "src/constants/enterprise-contact-master/role-templates.ts",
  ["Org path: Institution → City → Branch."],
  "no-skip-region-copy",
);

// 2) Contact Role Workspace wires regionId into City / Branch selects + cascade clears
assertIncludes(
  "src/components/catalyst-one/contacts/contact-workspace-modal.tsx",
  [
    'regionId={roleCode === "lender_employee" ? values.region : undefined}',
    "BankerCitySelect",
    "BankerBranchSelect",
    "Institution, Region, City, Branch",
  ],
  "contact-workspace",
);

const modal = read("src/components/catalyst-one/contacts/contact-workspace-modal.tsx");
assert.match(modal, /regionId=\{roleCode === "lender_employee" \? values\.region : undefined\}/);
assert.match(modal, /institutionId=\{[\s\S]*?values\.institution/);
assert.match(modal, /key === "institution"[\s\S]*?current\.region = ""/);
assert.match(modal, /key === "region"[\s\S]*?current\.city = ""/);
assert.match(modal, /key === "city"[\s\S]*?current\.branch = ""/);
assert.ok(
  !modal.includes("Org path: Institution → City → Branch"),
  "modal must not advertise City-before-Region path",
);

// 3) Shared Banker selects enforce Region before City / City before Branch
assertIncludes(
  "src/components/catalyst-one/contacts/banker-lender-registry-fields.tsx",
  [
    "Select Region first",
    "Select City first",
    "normalizeEnterpriseRegionId",
    "getEnterpriseRegionStateCodes",
    "Institution → Region → City → Branch",
  ],
  "banker-selects",
);

// 4) ELD employee slide-over already has Region; institution change clears region
assertIncludes(
  "src/components/catalyst-one/enterprise-lender-directory/eld-employee-slide-over.tsx",
  [
    'domain="region"',
    "regionId={activeDraft.regionId}",
    'regionId: ""',
    "BankerCitySelect",
    "BankerBranchSelect",
  ],
  "eld-employee",
);

// 5) Banker hierarchy SSOT comment unchanged
assertIncludes(
  "src/lib/enterprise-contact-master/banker-hierarchy.ts",
  ["Institution → Region → City → Branch", 'region: "region"'],
  "banker-hierarchy-ssot",
);

// 6) Docs present
for (const rel of [
  "docs/co-contact-region-001/CO-CONTACT-REGION-001-ROOT-CAUSE-ANALYSIS.md",
  "docs/co-contact-region-001/CO-CONTACT-REGION-001-VALIDATION-REPORT.md",
  "docs/co-contact-region-001/CO-CONTACT-REGION-001-BUSINESS-CERTIFICATION-REPORT.md",
]) {
  assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
}

console.log("CO-CONTACT-REGION-001 verify: PASS");
console.log("  Contact Role Workspace: Institution → Region → City → Branch");
console.log("  Region mandatory · City filtered by Region · Branch gated on City");
console.log("  ELD employee workspace cascade aligned");
console.log("  Deploy: deferred pending Product Owner approval");
