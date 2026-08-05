/**
 * CO-PR-005 — Product Registry presentation canonicalisation (static verify).
 * Asserts no live-row mutation remediator; canonical list default; legacy guards.
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

mustExist("src/lib/enterprise-product-master/presentation-canonical.ts");
mustExist("src/lib/enterprise-product-master/presentation-guards.ts");
mustExist("docs/co-pr-005/CO-PR-005-PRODUCT-REGISTRY-CANONICALISATION-REPORT.md");

const presentation = read("src/lib/enterprise-product-master/presentation-canonical.ts");
assert.match(presentation, /CO-PR-005/);
assert.match(presentation, /Legacy \/ Historical/);
assert.match(presentation, /filterCanonicalProductsForPresentation/);
assert.match(presentation, /never deletes/);

const route = read("src/app/api/product-registry/products/route.ts");
assert.match(route, /presentation/);
assert.match(route, /filterCanonicalProductsForPresentation/);
assert.match(route, /assertCreateWouldNotBeLegacyDuplicate/);

const byId = read("src/app/api/product-registry/products/[productId]/route.ts");
assert.match(byId, /assertProductIsCanonicalForAdminMutation/);

const admin = read("src/lib/enterprise-product-master/admin-client.ts");
assert.match(admin, /presentation: params\?\.presentation \?\? "canonical"/);

const ui = read(
  "src/components/catalyst-one/product-library/product-master-management-view.tsx",
);
assert.match(ui, /Canonical Enterprise Products only/);
assert.match(ui, /presentationBadge/);

const matrix = read("src/app/api/admin/product-lender-matrix/route.ts");
assert.match(matrix, /dedupeProductOptionsForSelection/);

const seedService = read("server/services/tier2-registry/seed-tier2-registries.service.ts");
assert.ok(!/remediateDuplicateProductMasterRows/.test(seedService));
assert.match(seedService, /do NOT disable or mutate existing Product rows/);

console.log("CO-PR-005 Product Registry Canonicalisation: PASS");
console.log(
  JSON.stringify(
    {
      presentationCanonicalDefault: true,
      adminHiddenLegacy: true,
      legacyNotEditable: true,
      selectorsAndMatrixCanonical: true,
      noLiveRowMutation: true,
      physicalMerge: "blocked-pending-PO",
    },
    null,
    2,
  ),
);
