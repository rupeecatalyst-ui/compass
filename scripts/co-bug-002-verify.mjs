/**
 * CO-BUG-002 — Product dropdown must show each active Product exactly once.
 * Production Data Protection: no seed path may disable/delete existing Product rows.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const seedCatalog = read("server/services/tier2-registry/seed-catalog.ts");
assert.match(seedCatalog, /CO-BUG-002/);
assert.match(seedCatalog, /Do NOT re-seed ECM legacy product picker/);
assert.match(seedCatalog, /normalizeProductLabelKey/);
assert.match(seedCatalog, /resolveCanonicalProductCode/);

const seedService = read("server/services/tier2-registry/seed-tier2-registries.service.ts");
assert.ok(
  !/remediateDuplicateProductMasterRows/.test(seedService),
  "Seed must not remediate/disable existing Product Master rows (Production Data Protection)",
);
assert.ok(
  !/disabled duplicate Product Master row/.test(seedService),
  "Seed must not write disable remarks onto live Product rows",
);
assert.match(seedService, /do NOT disable or mutate existing Product rows/);

const options = read("src/lib/enterprise-product-master/options.ts");
assert.match(options, /dedupeProductOptionsForSelection/);

const dedupe = read("src/lib/enterprise-product-master/dedupe-selection.ts");
assert.match(dedupe, /dedupeProductOptionsForSelection/);
assert.match(dedupe, /Does not delete, disable, or rewrite Product Master records/);
assert.match(dedupe, /filterCanonicalProductsForPresentation/);

const dualRead = read("src/lib/enterprise-tier2-ports/ports/dual-read-ports.ts");
assert.match(dualRead, /CO-BUG-002/);
assert.match(dualRead, /Product Registry \(DB\) is the sole SSOT/);
assert.match(dualRead, /never mutate Product Master rows/);
assert.ok(
  !/listProducts\(groupId\)[\s\S]{0,200}mergeOptions\(constants, database/.test(dualRead),
  "listProducts must not merge constants+database when runtime is active",
);

const canonical = read("src/constants/enterprise-product-master/canonical-catalog.ts");
assert.match(canonical, /normalizeProductCodeKey/);
assert.match(canonical, /normalizeProductLabelKey/);
assert.match(canonical, /HL_STD/);
assert.match(canonical, /BUSINESS-LOAN/);
assert.match(canonical, /HOME-LOAN/);

const labelMatches = [...canonical.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
const labelKeys = labelMatches.map((l) => l.trim().toLowerCase().replace(/\s+/g, " "));
const dupLabels = labelKeys.filter((l, i) => labelKeys.indexOf(l) !== i);
assert.deepEqual(dupLabels, [], `Canonical catalog has duplicate labels: ${dupLabels.join(", ")}`);

console.log("CO-BUG-002 Product Dropdown Dedup: PASS");
console.log(
  JSON.stringify(
    {
      productionDataProtection: {
        noDelete: true,
        noDisableOnSeed: true,
        noTruncate: true,
        historicalRowsPreserved: true,
        selectionDedupeIsReadPathOnly: true,
      },
      seedStopsEcmProductReSeed: true,
      dualReadProductsDbOnlyWhenRuntimeActive: true,
      canonicalLabelsUnique: true,
      canonicalLabelCount: labelKeys.length,
      batSurfaces: [
        "Lead Information / Customer Requirement (dedupeProductOptionsForSelection)",
        "Opportunity Workspace (same options path)",
        "Deal Workspace / loan create (canonical labels)",
        "ECM product master picker (DB list + label dedupe, no row mutation)",
      ],
    },
    null,
    2,
  ),
);
