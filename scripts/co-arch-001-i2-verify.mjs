/**
 * CO-ARCH-001-I2 — Reference Master infrastructure verification.
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

const EXPECTED_TABLE = "enterprise_reference_masters";
const EXPECTED_ENUM = "ReferenceMasterDomain";

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
  console.log("\n=== CO-ARCH-001-I2 Reference Master Verification ===\n");

  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const tableNames = new Set(tables.map((r) => r.table_name));
  if (tableNames.has(EXPECTED_TABLE)) pass(`Table ${EXPECTED_TABLE}`);
  else fail(`Table ${EXPECTED_TABLE}`, "missing");

  const enums = await prisma.$queryRawUnsafe(`
    SELECT t.typname AS name FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e' AND t.typname = '${EXPECTED_ENUM}'
  `);
  if (enums.length) pass(`Enum ${EXPECTED_ENUM}`);
  else fail(`Enum ${EXPECTED_ENUM}`, "missing");

  const indexes = await prisma.$queryRawUnsafe(`
    SELECT indexname FROM pg_indexes
    WHERE tablename = '${EXPECTED_TABLE}' AND indexname = 'erm_org_domain_code_key'
  `);
  if (indexes.length) pass("Unique index erm_org_domain_code_key");
  else fail("Unique index erm_org_domain_code_key", "missing");

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

  const code = `i2-verify-${Date.now()}`;
  const created = await prisma.enterpriseReferenceMaster.create({
    data: {
      organizationId: org.id,
      domain: "employment_type",
      code,
      label: "I2 Verify Employment Type",
      status: "draft",
      createdBy: admin.id,
      modifiedBy: admin.id,
    },
  });
  pass("Create reference master", created.id);

  await prisma.enterpriseReferenceMaster.update({
    where: { id: created.id },
    data: { status: "active", enabled: true, modifiedBy: admin.id },
  });
  pass("Update reference master status");

  await prisma.enterpriseReferenceMaster.delete({ where: { id: created.id } });
  pass("Cleanup direct prisma smoke row");

  // Service-layer smoke (includes Tier 0 audit)
  try {
    const { execSync } = await import("node:child_process");
    execSync(
      `npx tsx scripts/co-arch-001-i2-service-smoke.ts`,
      { stdio: "inherit", env: process.env, cwd: resolve(".") },
    );
    pass("Service CRUD + audit smoke");
  } catch {
    fail("Service CRUD + audit smoke", "tsx smoke failed");
  }

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
