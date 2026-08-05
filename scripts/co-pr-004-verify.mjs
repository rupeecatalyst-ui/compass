/**
 * CO-PR-004 — Enterprise Product Registry Data Integrity (static verify).
 * Asserts presentation SSOT + Production Data Protection (no live-row remediator).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function mustExist(rel) {
  assert.ok(existsSync(join(root, rel)), `Missing: ${rel}`);
}

mustExist("src/lib/enterprise-product-master/dedupe-selection.ts");
mustExist("docs/co-pr-004/CO-PR-004-PRODUCT-REGISTRY-INTEGRITY-REPORT.md");
mustExist("scripts/co-pr-004-inventory.mjs");

const catalog = read("src/constants/enterprise-product-master/canonical-catalog.ts");
assert.match(catalog, /resolveProductSelectionFamilyKey/);
assert.match(catalog, /productCodesShareSelectionFamily/);
assert.match(catalog, /HL_STD/);
assert.match(catalog, /BL_STD/);
assert.match(catalog, /LAP_STD/);
assert.match(catalog, /WC_STD/);

const dedupe = read("src/lib/enterprise-product-master/dedupe-selection.ts");
assert.match(dedupe, /CO-PR-004/);
assert.match(dedupe, /filterCanonicalProductsForPresentation/);
assert.match(dedupe, /Does not delete, disable, or rewrite/);

const presentation = read("src/lib/enterprise-product-master/presentation-canonical.ts");
assert.match(presentation, /resolveProductSelectionFamilyKey/);
assert.match(presentation, /preferCanonicalSurvivor/);
assert.match(presentation, /withCanonicalDisplayFields/);

const matrix = read("src/app/api/admin/product-lender-matrix/route.ts");
assert.match(matrix, /dedupeProductOptionsForSelection/);
assert.match(matrix, /CO-PR-004/);

const matrixUi = read(
  "src/components/catalyst-one/admin/product-lender-matrix-workspace.tsx",
);
assert.match(matrixUi, /productCodesShareSelectionFamily/);

const dualRead = read("src/lib/enterprise-tier2-ports/ports/dual-read-ports.ts");
assert.match(dualRead, /dedupeProductOptionsForSelection/);

const seed = read("server/services/tier2-registry/seed-catalog.ts");
assert.match(seed, /getCanonicalProductByCode/);
assert.match(seed, /CO-PR-004/);

const seedService = read("server/services/tier2-registry/seed-tier2-registries.service.ts");
assert.ok(
  !/remediateDuplicateProductMasterRows/.test(seedService),
  "Seed must not remediate/disable existing Product Master rows",
);
assert.match(seedService, /do NOT disable or mutate existing Product rows/);

const inventory = read("scripts/co-pr-004-inventory.mjs");
assert.match(inventory, /read-only-inventory/);
assert.match(inventory, /no-mutations/);
assert.ok(!/updateMany|deleteMany|enabled:\s*false/.test(inventory));

console.log("CO-PR-004 Product Registry Integrity: PASS");
console.log(
  JSON.stringify(
    {
      familyDedupe: true,
      matrixDedupe: true,
      dualReadDedupe: true,
      seedBlocksCanonicalLibraryDupes: true,
      noLiveRowRemediator: true,
      inventoryReadOnly: true,
      physicalMerge: "blocked-pending-PO",
    },
    null,
    2,
  ),
);
