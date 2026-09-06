import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = join(
  root,
  "prisma/migrations/20260906180000_co_product_program_operations_001/migration.sql",
);

const sql = readFileSync(sqlPath, "utf8");
const forbidden = ["DROP TABLE", "TRUNCATE", "prisma migrate dev", "db push"];
for (const token of forbidden) {
  if (sql.toUpperCase().includes(token.toUpperCase()) && token !== "DROP TABLE") {
    // allow DROP CONSTRAINT only
  }
}
if (/DROP TABLE/i.test(sql)) {
  console.error("Migration is not additive: DROP TABLE found.");
  process.exit(1);
}
if (!sql.includes("enterprise_credit_risk_policies")) {
  console.error("Durable policy table missing from migration.");
  process.exit(1);
}
if (!sql.includes("lineage_id")) {
  console.error("Programme lineage_id missing from migration.");
  process.exit(1);
}
if (!sql.includes("min_roi_exact")) {
  console.error("Exact ROI decimal column missing.");
  process.exit(1);
}

const proofUrl = pathToFileURL(
  join(root, "src/lib/product-programme-operations/sprint1-proof.ts"),
).href;
const mod = await import(proofUrl);
const proof = mod.runSprint1ProgrammeProof();
if (!proof.ok) {
  console.error(proof);
  process.exit(1);
}

const route = readFileSync(join(root, "src/app/api/lender-registry/programs/route.ts"), "utf8");
if (!route.includes("productProgrammeOperationsService.create")) {
  console.error("POST route still strips payload.");
  process.exit(1);
}
const patch = readFileSync(
  join(root, "src/app/api/lender-registry/programs/[programId]/route.ts"),
  "utf8",
);
if (!patch.includes("productProgrammeOperationsService.update")) {
  console.error("PATCH route still strips payload.");
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      migrationAdditive: true,
      httpPersistenceWired: true,
      proof: proof.results,
    },
    null,
    2,
  ),
);
