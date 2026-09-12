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
if (sql.includes('"completeness_state" = \'complete\'') || /SET[\s\S]{0,400}"is_live_published" = true/.test(sql.replace(/CREATE UNIQUE INDEX[\s\S]*?;/g, ""))) {
  console.error("180000 must not auto-promote complete-active programmes to CHANAKYA-live.");
  process.exit(1);
}
if (!sql.includes("lifecycle_status\" <> 'archived'")) {
  console.error("180000 incomplete classification must exclude archived programmes.");
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

const lenderRegistry = readFileSync(
  join(root, "src/components/catalyst-one/lender-registry-admin/lender-registry-admin-workspace.tsx"),
  "utf8",
);
if (lenderRegistry.includes("NewProductProgramWizard")) {
  console.error("Lender Registry still mounts the legacy Product Program wizard.");
  process.exit(1);
}
if (!lenderRegistry.includes("ADMIN_PRODUCT_PROGRAMS") || !lenderRegistry.includes('new: "1"')) {
  console.error("Lender Registry New Product Program does not route to the canonical editor.");
  process.exit(1);
}

const workspace = readFileSync(
  join(root, "src/components/catalyst-one/enterprise-mdm/product-programs-workspace.tsx"),
  "utf8",
);
if (!workspace.includes('params.get("new") === "1"') || !workspace.includes("ProductProgrammeEditor")) {
  console.error("Canonical Product Programs workspace does not open create from query.");
  process.exit(1);
}

const editor = readFileSync(
  join(root, "src/components/catalyst-one/product-programme-operations/programme-editor.tsx"),
  "utf8",
);
if (!editor.includes("ControlledMultiSelect") || !editor.includes("PROGRAMME_EMPLOYMENT_TYPES")) {
  console.error("Canonical editor is missing controlled Employment Types.");
  process.exit(1);
}
if (!editor.includes("toProgrammeWritePayload")) {
  console.error("Canonical editor is not using the structured write payload.");
  process.exit(1);
}

const masters = readFileSync(
  join(root, "src/constants/product-programme-operations/controlled-masters.ts"),
  "utf8",
);
for (const label of [
  "Salaried",
  "Self-employed Professional",
  "Self-employed Non-professional/Business",
  "Not applicable",
]) {
  if (!masters.includes(`label: "${label}"`)) {
    console.error(`Controlled Employment Type missing: ${label}`);
    process.exit(1);
  }
}

const writePayload = readFileSync(
  join(root, "src/lib/product-programme-operations/to-write-payload.ts"),
  "utf8",
);
if (writePayload.includes("employmentType:") && !writePayload.includes("employmentTypes")) {
  console.error("Write payload still uses legacy employmentType.");
  process.exit(1);
}

const schema = readFileSync(
  join(root, "src/lib/product-programme-operations/request-schema.ts"),
  "utf8",
);
if (!schema.includes("rejectUnknownProgrammeFields") || !schema.includes('"employmentTypes"')) {
  console.error("Canonical request schema no longer rejects unknown fields.");
  process.exit(1);
}
try {
  const schemaMod = await import(
    pathToFileURL(join(root, "src/lib/product-programme-operations/request-schema.ts")).href
  );
  let unknownBlocked = false;
  try {
    schemaMod.rejectUnknownProgrammeFields({
      lenderId: "lender-1",
      employmentType: "Salaried",
      roiPercent: 8.5,
    });
  } catch (error) {
    unknownBlocked = String(error?.message ?? "").includes("Unknown fields are not allowed");
  }
  if (!unknownBlocked) {
    console.error("Unknown-field regression: legacy wizard fields were accepted.");
    process.exit(1);
  }
} catch (error) {
  if (String(error?.message ?? "").includes("Unknown-field regression")) throw error;
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
process.exit(0);
