/**
 * CO-ARCH-001-I4b — Document Registry infrastructure verification.
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

function loadEnv(path, override = false) {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (override || !process.env[key]) process.env[key] = val;
  }
}

loadEnv(resolve(".env"));
loadEnv(resolve(".env.local"), true);

const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("FAIL: DATABASE_URL / DIRECT_URL missing");
  process.exit(2);
}

const TABLES = ["enterprise_document_types", "enterprise_document_definitions"];
const prisma = new PrismaClient({ datasources: { db: { url } } });
const results = [];

function pass(label, detail = "") {
  results.push({ ok: true, label, detail });
  console.log(`  OK  ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label, detail = "") {
  results.push({ ok: false, label, detail });
  console.error(` FAIL ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("\n=== CO-ARCH-001-I4b Document Registry Verification ===\n");

  const tableRows = await prisma.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const tableNames = new Set(tableRows.map((r) => r.table_name));
  for (const table of TABLES) {
    if (tableNames.has(table)) pass(`Table ${table}`);
    else fail(`Table ${table}`, "missing");
  }

  const enums = await prisma.$queryRawUnsafe(`
    SELECT t.typname AS name FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'
      AND t.typname IN ('DocumentRegistryCategory', 'DocumentRegistryClassification', 'DocumentRegistryLifecycleStatus')
  `);
  if (enums.length === 3) pass("Document registry enums");
  else fail("Document registry enums", `found ${enums.length}/3`);

  const failedSchema = results.filter((r) => !r.ok);
  if (failedSchema.length) {
    console.log("\n=== Schema checks failed — run npx prisma migrate deploy ===\n");
    process.exit(1);
  }

  const org = await prisma.organization.findUnique({ where: { slug: "rupee-catalyst" } });
  const admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!org || !admin) {
    console.log("\n  SKIP CRUD smoke — org or admin not seeded\n");
    process.exit(0);
  }

  const code = `I4B_VERIFY_${Date.now()}`;
  const docType = await prisma.enterpriseDocumentType.create({
    data: {
      organizationId: org.id,
      code,
      label: "I4b Verify Type",
      category: "identity",
      status: "draft",
      createdBy: admin.id,
      modifiedBy: admin.id,
    },
  });
  pass("Create document type", docType.id);

  const definition = await prisma.enterpriseDocumentDefinition.create({
    data: {
      organizationId: org.id,
      typeId: docType.id,
      code: `${code}_DEF`,
      label: "I4b Verify Definition",
      category: "identity",
      classification: "internal",
      lifecycleStatus: "draft",
      status: "draft",
      createdBy: admin.id,
      modifiedBy: admin.id,
    },
  });
  pass("Create document definition", definition.id);

  await prisma.enterpriseDocumentDefinition.delete({ where: { id: definition.id } });
  await prisma.enterpriseDocumentType.delete({ where: { id: docType.id } });
  pass("Cleanup direct prisma smoke rows");

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== Summary: ${results.length - failed.length}/${results.length} passed ===\n`);
  process.exit(failed.length ? 1 : 0);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
