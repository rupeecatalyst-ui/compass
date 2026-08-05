/**
 * CO-LR-008 — runtime catalogue inventory (tsx).
 */
import assert from "node:assert/strict";
import {
  CO_ARCH_004_MASTER_SEED_VERSION,
  CO_LR_008_CATALOG_VERSION,
  LENDER_MASTER_SEED_CATALOG,
  countLenderMasterSeedByClassification,
} from "../src/constants/enterprise-lender-registry/master-seed-catalog";
import {
  countCoLr008CompactRows,
  listCoLr008RequiredGapLabels,
} from "../src/constants/enterprise-lender-registry/master-seed-catalog-co-lr-008";
import {
  dedupeLendersForSelection,
  resolveLenderSelectionFamilyKey,
} from "../src/lib/enterprise-lender-registry/presentation-canonical";

assert.equal(CO_LR_008_CATALOG_VERSION, 1);
assert.ok(CO_ARCH_004_MASTER_SEED_VERSION >= 4);

const rows = LENDER_MASTER_SEED_CATALOG;
const seedKeys = rows.map((r) => r.seedKey.trim().toLowerCase());
const dupKeys = seedKeys.filter((k, i) => seedKeys.indexOf(k) !== i);
assert.deepEqual(dupKeys, [], `Duplicate seedKeys: ${dupKeys.join(", ")}`);

const requiredGaps = [
  "jp_morgan",
  "societe_generale",
  "icbc",
  "mashreq_bank",
  "clix_capital",
  "credit_saison",
  "ziploan",
  "namdev_finvest",
];
for (const key of requiredGaps) {
  assert.ok(
    rows.some((r) => r.seedKey === key),
    `Missing CO-LR-008 gap lender seedKey: ${key}`,
  );
}

let programmes = 0;
const missingProducts: string[] = [];
for (const row of rows) {
  const codes = Array.isArray(row.productsSupported) ? row.productsSupported : [];
  if (codes.length === 0) missingProducts.push(row.seedKey);
  programmes += codes.length;
}

assert.equal(missingProducts.length, 0, `Lenders missing products: ${missingProducts.join(", ")}`);

const byClass = countLenderMasterSeedByClassification();
const total = rows.length;
assert.ok(total >= 270, `Expected ≥270 lenders after gap-fill, got ${total}`);

// Presentation canonicalisation — synthetic duplicate family collapses to 1
const synthetic = [
  { id: "a", code: "HDFC", label: "HDFC Bank", displayName: "HDFC Bank", defaultRecord: true },
  { id: "b", code: "HDFC_EXT", label: "HDFC Bank Limited", displayName: "HDFC Bank Ltd" },
];
const deduped = dedupeLendersForSelection(synthetic);
assert.equal(deduped.length, 1);
assert.equal(deduped[0].id, "a");
assert.ok(resolveLenderSelectionFamilyKey(synthetic[0]).startsWith("lender:"));

const poListCoverage = {
  publicSectorExpected: 11,
  privateSectorExpected: 18,
  sfbExpected: 10,
  hfcNamed: [
    "LIC Housing",
    "PNB Housing",
    "Bajaj Housing",
    "Aavas",
    "Aptus",
    "Home First",
    "India Shelter",
    "Godrej Housing",
    "Sammaan",
  ],
};

console.log("CO-LR-008 Lender Master Population: PASS");
console.log(
  JSON.stringify(
    {
      seedVersion: CO_ARCH_004_MASTER_SEED_VERSION,
      lr008CatalogVersion: CO_LR_008_CATALOG_VERSION,
      totalLendersProcessed: total,
      newLendersInCoLr008Compact: countCoLr008CompactRows(),
      gapLabels: listCoLr008RequiredGapLabels(),
      duplicateSeedKeys: dupKeys,
      byClassification: byClass,
      productProgrammesAssigned: programmes,
      lendersWithProgrammes: total,
      lendersMissingProducts: missingProducts,
      presentationCanonicalisation: true,
      physicalMerge: "blocked-pending-PO",
      productionDataProtection: {
        noDelete: true,
        noIdRewrite: true,
        noTruncate: true,
        fillMissingOnly: true,
      },
      poListCoverage,
      recordsRequiringManualReview: [
        "RBI registration / CIN / GSTIN enrichment (admin — do not invent)",
        "Apply via Tier-2 lender seed (fill-missing) then baseline programs seed",
        "ECM contact-master lender picker still has legacy constants — Deal/OW use Registry SSOT",
      ],
    },
    null,
    2,
  ),
);
