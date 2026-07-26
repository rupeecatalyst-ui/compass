/**
 * CO-ARCH-004 — Enterprise Lender Registry Master Data Foundation verify.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function assertExists(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error(`MISSING: ${rel}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`OK: ${rel}`);
  return true;
}

function assertContains(rel, snippets) {
  const full = path.join(root, rel);
  const text = fs.readFileSync(full, "utf8");
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      console.error(`FAIL: ${rel} missing "${snippet}"`);
      process.exitCode = 1;
      return false;
    }
  }
  console.log(`OK: ${rel} content checks`);
  return true;
}

const files = [
  "src/constants/enterprise-lender-registry/master-seed-catalog.ts",
  "src/lib/enterprise-lender-registry/codes.ts",
  "src/lib/enterprise-lender-registry/normalize.ts",
  "src/lib/enterprise-lender-registry/merge.ts",
  "src/lib/enterprise-lender-registry/validation.ts",
  "src/lib/enterprise-lender-registry/auto-populate.ts",
  "src/lib/enterprise-lender-registry/bootstrap-master.ts",
  "src/lib/enterprise-lender-registry/published-directory.ts",
  "prisma/migrations/20260721250000_co_arch_004_lender_master_foundation/migration.sql",
  "docs/co-arch-001/CO-ARCH-004-ENTERPRISE-LENDER-REGISTRY-MASTER.md",
];

for (const file of files) assertExists(file);

assertContains("src/constants/enterprise-lender-registry/master-seed-catalog.ts", [
  "State Bank of India",
  "HDFC Bank Limited",
  "AU Small Finance Bank",
  "LIC Housing Finance",
  "Bajaj Finance Limited",
  "Saraswat Cooperative Bank",
  "public_sector_bank",
  "private_sector_bank",
  "small_finance_bank",
  "housing_finance_company",
  "cooperative_bank",
]);

assertContains("src/lib/enterprise-lender-registry/codes.ts", [
  "LND",
  "formatLenderCode",
  "allocateLenderCode",
]);

assertContains("src/components/catalyst-one/execution/lender-pipeline-board.tsx", [
  "listPublishedLenderDisplayNames",
  "findPublishedLenderByDisplayName",
  "lenderCode",
]);

assertContains("src/lib/enterprise-lender-workspace/select-lender.ts", [
  "buildLenderMasterSnapshot",
  "lenderCode",
]);

assertContains("src/components/catalyst-one/lender-registry-admin/lender-registry-admin-workspace.tsx", [
  "Seed / Refresh Master",
  "bootstrapLenderMaster",
]);

assertContains("prisma/schema.prisma", [
  "LenderMasterClassification",
  "legalName",
  "customerCarePhone",
]);

// Catalog size floor (baseline + nationally relevant)
const catalog = fs.readFileSync(
  path.join(root, "src/constants/enterprise-lender-registry/master-seed-catalog.ts"),
  "utf8",
);
const seedKeyCount = (catalog.match(/seedKey:/g) || []).length;
if (seedKeyCount < 70) {
  console.error(`FAIL: expected >= 70 seed lenders, found ${seedKeyCount}`);
  process.exitCode = 1;
} else {
  console.log(`OK: master seed catalog size ${seedKeyCount}`);
}

if (process.exitCode) {
  console.error("\nCO-ARCH-004 LENDER MASTER VERIFY FAILED");
  process.exit(1);
}

console.log("\nCO-ARCH-004 LENDER MASTER VERIFY PASSED");
