/**
 * CO-ARCH-001-I3 — Reference Master seed runner (Infrastructure).
 */
import { seedReferenceMasters } from "@server/services/reference-master/seed-reference-masters.service";
import { countExpectedReferenceMasterSeeds } from "@server/services/reference-master/seed-catalog";

async function main() {
  console.log("\n=== CO-ARCH-001-I3 Reference Master Seed ===\n");
  console.log(`Expected catalog rows: ${countExpectedReferenceMasterSeeds()}`);

  const result = await seedReferenceMasters();

  console.log(`Organization : ${result.organizationId}`);
  console.log(`Actor        : ${result.actorId}`);
  console.log(`Created      : ${result.created}`);
  console.log(`Updated      : ${result.updated}`);
  console.log(`Skipped      : ${result.skipped}`);
  console.log("\nBy domain:");
  for (const [domain, stats] of Object.entries(result.byDomain)) {
    console.log(
      `  ${domain.padEnd(22)} +${stats.created} ~${stats.updated} =${stats.skipped}`,
    );
  }
  console.log("\n=== Seed complete ===\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
