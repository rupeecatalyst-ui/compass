/**
 * CO-ARCH-001-I1 — Tier 0 metadata infrastructure verification.
 * Read-only schema checks + optional write smoke when pilot org exists.
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

const EXPECTED_TABLES = [
  "enterprise_registry_audit_entries",
  "enterprise_registry_attachments",
  "enterprise_registry_import_batches",
];

const EXPECTED_ENUMS = [
  "RegistryStatus",
  "RegistryApprovalStatus",
  "EnterpriseRegistryModule",
  "RegistryImportBatchStatus",
  "RegistryAuditAction",
];

const EXPECTED_FKS = [
  "enterprise_registry_audit_entries_organization_id_fkey",
  "enterprise_registry_attachments_organization_id_fkey",
  "enterprise_registry_import_batches_organization_id_fkey",
];

const prisma = new PrismaClient({
  datasources: { db: { url } },
});

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
  console.log("\n=== CO-ARCH-001-I1 Tier 0 Metadata Verification ===\n");

  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const tableNames = new Set(tables.map((r) => r.table_name));

  for (const t of EXPECTED_TABLES) {
    if (tableNames.has(t)) pass(`Table ${t}`);
    else fail(`Table ${t}`, "missing");
  }

  const enums = await prisma.$queryRawUnsafe(`
    SELECT t.typname AS name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'
  `);
  const enumNames = new Set(enums.map((r) => r.name));

  for (const e of EXPECTED_ENUMS) {
    if (enumNames.has(e)) pass(`Enum ${e}`);
    else fail(`Enum ${e}`, "missing");
  }

  const fks = await prisma.$queryRawUnsafe(`
    SELECT conname FROM pg_constraint WHERE contype = 'f'
  `);
  const fkNames = new Set(fks.map((r) => r.conname));

  for (const fk of EXPECTED_FKS) {
    if (fkNames.has(fk)) pass(`FK ${fk}`);
    else fail(`FK ${fk}`, "missing");
  }

  const failedBeforeSmoke = results.filter((r) => !r.ok);
  if (failedBeforeSmoke.length) {
    console.log("\n=== Summary: schema checks failed — run npx prisma migrate deploy ===\n");
    process.exit(1);
  }

  const org = await prisma.organization.findUnique({
    where: { slug: "rupee-catalyst" },
  });

  if (!org) {
    console.log("\n  SKIP write smoke — pilot org not seeded");
  } else {
    const testEntityId = `i1-verify-${Date.now()}`;
    const admin = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN", isActive: true },
      orderBy: { createdAt: "asc" },
    });
    const actorId = admin?.id ?? "system-i1-verify";

    const audit = await prisma.enterpriseRegistryAuditEntry.create({
      data: {
        organizationId: org.id,
        registryModule: "reference_master",
        entityId: testEntityId,
        entityCode: "verify-smoke",
        action: "created",
        actorUserId: actorId,
        newValue: { phase: "CO-ARCH-001-I1", smoke: true },
      },
    });
    pass("Audit entry write smoke", audit.id);

    await prisma.enterpriseRegistryAuditEntry.delete({ where: { id: audit.id } });
    pass("Audit entry cleanup");
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== Summary: ${results.length - failed.length}/${results.length} passed ===\n`);

  if (failed.length) {
    console.error("Migration may not be applied. Run: npx prisma migrate deploy");
    process.exit(1);
  }

  process.exit(0);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
