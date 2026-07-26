/**
 * CO-ARCH-001 Wave 4 — Tier 2 registry seed runner.
 */
import { seedTier2Registries } from "@server/services/tier2-registry/seed-tier2-registries.service";
import { countExpectedTier2Seeds } from "@server/services/tier2-registry/seed-catalog";

function printBlock(
  title: string,
  counts: { created: number; updated: number; skipped: number },
) {
  console.log(
    `  ${title.padEnd(22)} +${counts.created} ~${counts.updated} =${counts.skipped}`,
  );
}

async function main() {
  console.log("\n=== CO-ARCH-001 Wave 4 Tier 2 Registry Seed ===\n");
  const expected = countExpectedTier2Seeds();
  console.log("Expected catalog rows:");
  console.log(
    `  product ${expected.productCategories}/${expected.productGroups}/${expected.products}`,
  );
  console.log(
    `  document ${expected.documentTypes}/${expected.documentDefinitions}`,
  );
  console.log(
    `  lender ${expected.lenderCategories}/${expected.lenders}/${expected.programs}`,
  );
  console.log("");

  const result = await seedTier2Registries();

  console.log(`Organization : ${result.organizationId}`);
  console.log(`Actor        : ${result.actorId}`);
  console.log("\nProduct registry:");
  printBlock("categories", result.product.categories);
  printBlock("groups", result.product.groups);
  printBlock("products", result.product.products);
  console.log("\nDocument registry:");
  printBlock("types", result.document.types);
  printBlock("definitions", result.document.definitions);
  console.log("\nLender registry:");
  printBlock("categories", result.lender.categories);
  printBlock("lenders", result.lender.lenders);
  printBlock("programs", result.lender.programs);
  console.log("\n=== Seed complete ===\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

