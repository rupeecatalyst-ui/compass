/**
 * CO-LENDER-HIERARCHY-REMEDIATION-001 — static verification (no live data mutation).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assertNotIncludes(rel, needles, label) {
  const src = read(rel);
  for (const n of needles) {
    assert.ok(!src.includes(n), `${label}: ${rel} must not contain ${JSON.stringify(n)}`);
  }
}

function assertIncludes(rel, needles, label) {
  const src = read(rel);
  for (const n of needles) {
    assert.ok(src.includes(n), `${label}: ${rel} must contain ${JSON.stringify(n)}`);
  }
}

// Compose is ECM-based
assertIncludes(
  "src/lib/enterprise-lender-directory/compose-hierarchy.ts",
  ["composeEldLenderHierarchyForest", "reportingManagerContactId"],
  "compose",
);

// Hierarchy lib retired localStorage writes
const hierarchyLib = read("src/lib/enterprise-lender-workspace/hierarchy.ts");
assert.ok(
  !hierarchyLib.includes("localStorage.setItem"),
  "hierarchy.ts must not write localStorage",
);
assert.ok(
  hierarchyLib.includes("RETIRED_ELW_HIERARCHY_STORAGE_KEY") ||
    hierarchyLib.includes("retired"),
  "hierarchy.ts must mark storage retired",
);

// Chart uses ECM actions
assertIncludes(
  "src/components/catalyst-one/enterprise-lender-workspace/eld-hierarchy-chart.tsx",
  [
    "createLenderEmployeeForInstitution",
    "assignExistingContactToInstitution",
    "setBankerReportingManager",
    "reports_to",
  ],
  "chart",
);

// Slide-over uses shared employee load
assertIncludes(
  "src/components/catalyst-one/enterprise-lender-directory/eld-slide-over.tsx",
  [
    "loadEldLenderEmployeeContacts",
    "composeEldLenderHierarchyForest",
    "subscribeEcmContactRegistry",
    "EldHierarchyChart",
  ],
  "slide-over",
);

assertNotIncludes(
  "src/components/catalyst-one/enterprise-lender-directory/eld-slide-over.tsx",
  ["deriveElwHierarchy", "assignElwHierarchyContact"],
  "slide-over-no-legacy",
);

assert.equal(
  read("src/constants/enterprise-lender-workspace/hierarchy.ts").includes(
    "vice_president",
  ),
  false,
  "hardcoded ranks must be emptied",
);

console.log("CO-LENDER-HIERARCHY-REMEDIATION-001 verify: PASS");
