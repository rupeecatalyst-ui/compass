/**
 * CO-ARCH-001-I4a — Product Registry infrastructure verification.
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

const TABLES = [
  "enterprise_product_categories",
  "enterprise_product_groups",
  "enterprise_products",
];

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
  console.log("\n=== CO-ARCH-001-I4a Product Registry Verification ===\n");

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
      AND t.typname IN ('ProductLifecycleStatus', 'ProductOperationalStatus')
  `);
  if (enums.length === 2) pass("Product registry enums");
  else fail("Product registry enums", `found ${enums.length}/2`);

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

  const code = `I4A_VERIFY_${Date.now()}`;
  const category = await prisma.enterpriseProductCategory.create({
    data: {
      organizationId: org.id,
      code,
      label: "I4a Verify Category",
      status: "draft",
      createdBy: admin.id,
      modifiedBy: admin.id,
    },
  });
  pass("Create product category", category.id);

  const group = await prisma.enterpriseProductGroup.create({
    data: {
      organizationId: org.id,
      categoryId: category.id,
      code: `${code}_GRP`,
      label: "I4a Verify Group",
      status: "draft",
      createdBy: admin.id,
      modifiedBy: admin.id,
    },
  });
  pass("Create product group", group.id);

  const product = await prisma.enterpriseProduct.create({
    data: {
      organizationId: org.id,
      categoryId: category.id,
      groupId: group.id,
      code: `${code}_PROD`,
      label: "I4a Verify Product",
      lifecycleStatus: "draft",
      operationalStatus: "inactive",
      status: "draft",
      createdBy: admin.id,
      modifiedBy: admin.id,
    },
  });
  pass("Create product", product.id);

  await prisma.enterpriseProduct.delete({ where: { id: product.id } });
  await prisma.enterpriseProductGroup.delete({ where: { id: group.id } });
  await prisma.enterpriseProductCategory.delete({ where: { id: category.id } });
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
