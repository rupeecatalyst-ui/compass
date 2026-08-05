import assert from "node:assert/strict";
import {
  CO_ARCH_004_MASTER_SEED_VERSION,
  LENDER_MASTER_SEED_CATALOG,
  countLenderMasterSeedByClassification,
} from "../src/constants/enterprise-lender-registry/master-seed-catalog.ts";
import {
  getBaselineCommercialProgramSeeds,
  normalizeSupportedProductCodes,
} from "../src/constants/enterprise-lender-registry/baseline-commercial-program-seed.ts";
import { CANONICAL_PRODUCT_MASTER_SEED } from "../src/constants/enterprise-product-master/canonical-catalog.ts";

const keys = LENDER_MASTER_SEED_CATALOG.map((l) => l.seedKey);
const dupKeys = [...new Set(keys.filter((k, i) => keys.indexOf(k) !== i))];
const empty = LENDER_MASTER_SEED_CATALOG.filter(
  (l) => normalizeSupportedProductCodes(l.productsSupported).length === 0,
);
const programs = getBaselineCommercialProgramSeeds();
const byClass = countLenderMasterSeedByClassification();

const report = {
  seedVersion: CO_ARCH_004_MASTER_SEED_VERSION,
  totalLendersProcessed: LENDER_MASTER_SEED_CATALOG.length,
  newLendersInCatalogue: LENDER_MASTER_SEED_CATALOG.length,
  existingLendersUpdated: "runtime — fill-missing only on seed",
  duplicateRecordsPrevented: dupKeys.length === 0,
  duplicateSeedKeys: dupKeys,
  byClassification: byClass,
  productProgrammesAssigned: programs.length,
  lendersWithProgrammes: LENDER_MASTER_SEED_CATALOG.length - empty.length,
  lendersMissingProducts: empty.map((l) => l.seedKey),
  productMasterCount: CANONICAL_PRODUCT_MASTER_SEED.length,
  targetBand: {
    min: 250,
    max: 400,
    inBand:
      LENDER_MASTER_SEED_CATALOG.length >= 250 &&
      LENDER_MASTER_SEED_CATALOG.length <= 400,
  },
  recordsRequiringManualReview: [
    "RBI registration / CIN / GSTIN enrichment (admin import — do not invent)",
    "Per-lender product truth tuning vs public offerings",
    "Baseline program commercials remain blank for administrators",
    "Apply via POST /api/product-registry/seed then POST /api/lender-registry/seed-baseline-programs",
  ],
};

assert.equal(dupKeys.length, 0, `Duplicate seedKeys: ${dupKeys.join(", ")}`);
assert.equal(empty.length, 0, `Lenders missing products: ${empty.map((l) => l.seedKey).join(", ")}`);
assert.ok(report.targetBand.inBand, `Lender count ${report.totalLendersProcessed} outside 250–400`);

console.log("CO-LR-006 Lender Master Foundation: PASS");
console.log(JSON.stringify(report, null, 2));
