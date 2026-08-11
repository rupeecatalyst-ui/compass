/**
 * CO-MASTER-REGION-001 — Enterprise Region Master standardization (static verify).
 * No live employee / lender data mutation.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

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

const EXPECTED_IDS = ["north", "south", "east", "west"];
const EXPECTED_LABELS = ["North", "South", "East", "West"];

// 1) Enterprise Region Master SSOT — exactly four values
const master = read("src/constants/enterprise-region-master/index.ts");
assertIncludes(
  "src/constants/enterprise-region-master/index.ts",
  [
    'id: "north"',
    'id: "south"',
    'id: "east"',
    'id: "west"',
    'label: "North"',
    'label: "South"',
    'label: "East"',
    'label: "West"',
    "ENTERPRISE_REGION_MASTER_IDS",
    "normalizeEnterpriseRegionId",
    "LEGACY_REGION_ID_ALIASES",
  ],
  "ssot",
);
for (const legacy of [
  '"hdfc-west"',
  '"sbi-west"',
  '"icici-west"',
  '"axis-west"',
  '"kotak-west"',
  '"bajaj-west"',
]) {
  assert.ok(
    master.includes(legacy),
    `legacy alias map must include ${legacy} for display remap only`,
  );
}

// 2) ECM masters consume Enterprise Region Master — no lender-scoped catalog rows
assertIncludes(
  "src/constants/enterprise-contact-master/masters.ts",
  [
    "listEnterpriseRegionMasterOptions",
    'domain === "region"',
    "getEnterpriseRegionLabel",
    "normalizeEnterpriseRegionId",
  ],
  "ecm-masters",
);
assertNotIncludes(
  "src/constants/enterprise-contact-master/masters.ts",
  [
    'id: "hdfc-west"',
    'id: "sbi-west"',
    'id: "icici-west"',
    'id: "hdfc-south"',
  ],
  "ecm-masters-no-dupes",
);

// Region catalog block must map from listEnterpriseRegionMasterOptions
const mastersSrc = read("src/constants/enterprise-contact-master/masters.ts");
const regionCatalogMatch = mastersSrc.match(
  /region:\s*listEnterpriseRegionMasterOptions\(\)[\s\S]*?\],/,
);
assert.ok(regionCatalogMatch, "ECM region catalog must come from Enterprise Region Master");

// 3) Lender Employee Workspace wires Region → City → Branch
assertIncludes(
  "src/components/catalyst-one/enterprise-lender-directory/eld-employee-slide-over.tsx",
  [
    'domain="region"',
    "normalizeEnterpriseRegionId",
    "regionId: id, cityId: \"\", branchId: \"\"",
    "BankerCitySelect",
    "BankerBranchSelect",
    "regionId={activeDraft.regionId}",
  ],
  "employee-slide-over",
);

assertIncludes(
  "src/components/catalyst-one/contacts/banker-lender-registry-fields.tsx",
  [
    "getEnterpriseRegionStateCodes",
    "normalizeEnterpriseRegionId",
    "Select Region first",
    "Select City first",
  ],
  "city-branch-cascade",
);

// Contact Role Workspace must pass regionId (CO-CONTACT-REGION-001)
assertIncludes(
  "src/components/catalyst-one/contacts/contact-workspace-modal.tsx",
  [
    'regionId={roleCode === "lender_employee" ? values.region : undefined}',
    "BankerCitySelect",
    "BankerBranchSelect",
  ],
  "contact-role-workspace-region",
);

// 4) Admin Geography → Regions
assertIncludes(
  "src/app/(dashboard)/admin/geography/regions/page.tsx",
  ["EnterpriseRegionMasterAdmin"],
  "admin-page",
);
assertIncludes(
  "src/constants/administration-console.ts",
  ["Geography · Regions", "ADMIN_GEOGRAPHY_REGIONS"],
  "admin-nav",
);
assertIncludes(
  "src/constants/routes.ts",
  ['ADMIN_GEOGRAPHY_REGIONS: "/admin/geography/regions"'],
  "routes",
);

// 5) Compose / save normalize without bulk-mutating live data at read time
assertIncludes(
  "src/lib/enterprise-lender-directory/compose-employees.ts",
  ["normalizeEnterpriseRegionId", "getEnterpriseRegionLabel"],
  "compose",
);
assertIncludes(
  "src/lib/enterprise-lender-directory/save-lender-employee.ts",
  ["normalizeEnterpriseRegionId"],
  "save-canonical-on-edit",
);

// 6) Count region entries between ENTERPRISE_REGION_MASTER and LEGACY aliases
const start = master.indexOf("export const ENTERPRISE_REGION_MASTER");
const end = master.indexOf("export const LEGACY_REGION_ID_ALIASES");
assert.ok(start >= 0 && end > start, "ENTERPRISE_REGION_MASTER block must exist");
const arrayBody = master.slice(start, end);
const labelHits = EXPECTED_LABELS.map(
  (l) => (arrayBody.match(new RegExp(`label: "${l}",`, "g")) || []).length,
);
assert.deepEqual(
  labelHits,
  [1, 1, 1, 1],
  `SSOT must declare each label exactly once; got ${JSON.stringify(
    Object.fromEntries(EXPECTED_LABELS.map((l, i) => [l, labelHits[i]])),
  )}`,
);
const idHits = EXPECTED_IDS.map(
  (id) => (arrayBody.match(new RegExp(`\\bid: "${id}"`, "g")) || []).length,
);
assert.deepEqual(
  idHits,
  [1, 1, 1, 1],
  `SSOT must declare each id exactly once; got ${JSON.stringify(
    Object.fromEntries(EXPECTED_IDS.map((id, i) => [id, idHits[i]])),
  )}`,
);

console.log("CO-MASTER-REGION-001 verify: PASS");
console.log("  Region SSOT: North · South · East · West (exactly 4)");
console.log("  ECM masters + ELD employee UI consume Enterprise Region Master");
console.log("  Admin: /admin/geography/regions");
console.log("  Live employee bulk mutation: none (canonical only on operator save)");
