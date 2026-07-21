/**
 * Read-only verification of Enterprise Baseline v1.0 (no seed, no DDL).
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
  console.error("DATABASE_URL / DIRECT_URL missing");
  process.exit(2);
}

const EXPECTED_TABLES = [
  "users",
  "refresh_tokens",
  "password_reset_tokens",
  "organizations",
  "ecm_contacts",
  "ecm_companies",
  "ecm_company_contact_links",
  "ecm_contact_relationships",
  "ecm_contact_audit_references",
  "_prisma_migrations",
];

const EXPECTED_ENUMS = [
  "Role",
  "EcmContactRole",
  "EcmContactStatus",
  "EcmPlatformAccess",
  "EcmContactRelationshipType",
  "EcmContactRelationshipStatus",
  "EcmAuditEntityType",
  "EcmCompanyStatus",
  "EcmCompanyRelationRole",
  "EcmCompanyLinkStatus",
];

const EXPECTED_UNIQUE_INDEXES = [
  "users_email_key",
  "users_employee_id_key",
  "users_eum_user_id_key",
  "refresh_tokens_token_key",
  "password_reset_tokens_token_key",
  "organizations_slug_key",
  "ecm_contacts_org_mobile_key",
  "ecm_company_contact_role_key",
  "ecm_companies_org_name_ci_key",
];

const EXPECTED_FKS = [
  "users_created_by_id_fkey",
  "users_reporting_manager_id_fkey",
  "refresh_tokens_user_id_fkey",
  "password_reset_tokens_user_id_fkey",
  "ecm_contacts_organization_id_fkey",
  "ecm_contacts_linked_user_id_fkey",
  "ecm_companies_organization_id_fkey",
  "ecm_company_contact_links_organization_id_fkey",
  "ecm_company_contact_links_company_id_fkey",
  "ecm_company_contact_links_contact_id_fkey",
  "ecm_contact_relationships_organization_id_fkey",
  "ecm_contact_relationships_from_contact_id_fkey",
  "ecm_contact_relationships_to_contact_id_fkey",
  "ecm_contact_audit_references_organization_id_fkey",
  "ecm_contact_audit_references_contact_id_fkey",
  "ecm_contact_audit_references_relationship_id_fkey",
];

const BUSINESS_TABLES = EXPECTED_TABLES.filter((t) => t !== "_prisma_migrations");

const prisma = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  const report = {
    generatedAt: new Date().toISOString(),
    mode: "read-only-verification",
    seedExecuted: false,
    checks: {},
  };

  const migrationsTable = await prisma.$queryRawUnsafe(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
    ) AS present
  `);
  report.checks.prismaMigrationsTableExists = Boolean(migrationsTable[0]?.present);

  let migrations = [];
  if (report.checks.prismaMigrationsTableExists) {
    migrations = await prisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at, rolled_back_at, applied_steps_count
      FROM "_prisma_migrations"
      ORDER BY finished_at NULLS LAST, migration_name
    `);
  }
  report.checks.migrations = migrations.map((m) => ({
    name: m.migration_name,
    finished: Boolean(m.finished_at),
    rolledBack: Boolean(m.rolled_back_at),
    steps: Number(m.applied_steps_count ?? 0),
  }));
  report.checks.baselineV1Applied = migrations.some(
    (m) =>
      m.migration_name === "20260721000000_enterprise_baseline_v1_0" &&
      m.finished_at &&
      !m.rolled_back_at,
  );

  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const tableSet = new Set(tables.map((t) => t.table_name));
  report.checks.tablesPresent = [...tableSet].sort();
  report.checks.tablesMissing = EXPECTED_TABLES.filter((t) => !tableSet.has(t));
  report.checks.tablesUnexpected = [...tableSet].filter(
    (t) => !EXPECTED_TABLES.includes(t),
  );

  const enums = await prisma.$queryRawUnsafe(`
    SELECT t.typname AS enum_name,
           array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  `);
  const enumSet = new Set(enums.map((e) => e.enum_name));
  report.checks.enumsPresent = enums.map((e) => ({
    name: e.enum_name,
    values: e.enum_values,
  }));
  report.checks.enumsMissing = EXPECTED_ENUMS.filter((e) => !enumSet.has(e));

  const indexes = await prisma.$queryRawUnsafe(`
    SELECT indexname, tablename, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `);
  const indexSet = new Set(indexes.map((i) => i.indexname));
  report.checks.indexCount = indexes.length;
  report.checks.uniqueIndexesMissing = EXPECTED_UNIQUE_INDEXES.filter(
    (i) => !indexSet.has(i),
  );
  report.checks.indexes = indexes.map((i) => ({
    name: i.indexname,
    table: i.tablename,
  }));

  const fks = await prisma.$queryRawUnsafe(`
    SELECT tc.constraint_name, tc.table_name
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.constraint_name
  `);
  const fkSet = new Set(fks.map((f) => f.constraint_name));
  report.checks.foreignKeyCount = fks.length;
  report.checks.foreignKeysMissing = EXPECTED_FKS.filter((f) => !fkSet.has(f));
  report.checks.foreignKeys = fks.map((f) => ({
    name: f.constraint_name,
    table: f.table_name,
  }));

  const rowCounts = {};
  for (const t of BUSINESS_TABLES) {
    if (!tableSet.has(t)) {
      rowCounts[t] = null;
      continue;
    }
    const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM "${t}"`);
    rowCounts[t] = Number(rows[0]?.c ?? 0);
  }
  report.checks.rowCounts = rowCounts;
  report.checks.businessTablesAllEmpty = BUSINESS_TABLES.every(
    (t) => rowCounts[t] === 0,
  );

  const prismaMigRows = tableSet.has("_prisma_migrations")
    ? Number(
        (
          await prisma.$queryRawUnsafe(
            `SELECT COUNT(*)::int AS c FROM "_prisma_migrations"`,
          )
        )[0]?.c ?? 0,
      )
    : 0;
  report.checks.prismaMigrationsRowCount = prismaMigRows;

  const failed = [];
  if (!report.checks.prismaMigrationsTableExists) failed.push("_prisma_migrations missing");
  if (!report.checks.baselineV1Applied) failed.push("Baseline v1.0 not applied");
  if (report.checks.tablesMissing.length) failed.push("tables missing");
  if (report.checks.enumsMissing.length) failed.push("enums missing");
  if (report.checks.uniqueIndexesMissing.length) failed.push("unique indexes missing");
  if (report.checks.foreignKeysMissing.length) failed.push("foreign keys missing");
  if (!report.checks.businessTablesAllEmpty) failed.push("business tables not empty");

  report.verdict = failed.length === 0 ? "PASS" : "FAIL";
  report.failures = failed;

  console.log(JSON.stringify(report, null, 2));
  if (failed.length) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
