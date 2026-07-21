/**
 * CO-SPRINT-117 — Live Database Baseline Audit (read-only).
 *
 * Catalyst One Pilot canonical Supabase project: unpjfzvlokovobxgvazo (Catalyst One Platform)
 * Loads ONLY repo-root .env / .env.local — never compass/.env.local.
 *
 * Does NOT run: migrate deploy, db seed, or any DDL.
 *
 * Usage:
 *   node scripts/co-sprint-117-baseline-audit.mjs
 */

import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);

const CANONICAL_PROJECT_ID = "unpjfzvlokovobxgvazo";
const FORBIDDEN_PROJECT_IDS = new Set([
  "swbrjrrapwdtgkpdbphe",
  "lspghyjozleqovrtdxqe",
]);

function loadEnvFile(path, { override = false } = {}) {
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

// Catalyst One root only — do NOT load compass/.env.local
loadEnvFile(resolve(process.cwd(), ".env"), { override: false });
loadEnvFile(resolve(process.cwd(), ".env.local"), { override: true });

function projectHintFromUrl(url) {
  try {
    const u = new URL(url);
    const user = u.username || "";
    if (user.startsWith("postgres.")) return user.slice("postgres.".length);
    const m = u.hostname.match(/^db\.([^.]+)\.supabase\.co$/);
    return m?.[1] || null;
  } catch {
    return null;
  }
}

function assertCanonicalProject(label, url) {
  if (!url) return;
  const hint = projectHintFromUrl(url);
  if (hint && FORBIDDEN_PROJECT_IDS.has(hint)) {
    throw new Error(
      `${label} points at forbidden project ${hint}. Catalyst One Pilot must use ${CANONICAL_PROJECT_ID} only.`,
    );
  }
  if (hint && hint !== CANONICAL_PROJECT_ID) {
    throw new Error(
      `${label} project_hint=${hint} does not match canonical ${CANONICAL_PROJECT_ID}.`,
    );
  }
  // Direct host form db.<ref>.supabase.co already checked via hint.
  // Pooler hosts may omit ref in hostname — require postgres.<ref> username.
  if (/pooler\.supabase\.com$/i.test(new URL(url).hostname) && !hint) {
    throw new Error(
      `${label} pooler URL must use username postgres.${CANONICAL_PROJECT_ID}`,
    );
  }
}

const configuredDatabaseUrl = process.env.DATABASE_URL?.trim() || "";
const configuredDirectUrl = process.env.DIRECT_URL?.trim() || "";

console.log(`Canonical Catalyst One project: ${CANONICAL_PROJECT_ID}`);
console.log(
  `SUPABASE_PROJECT_ID env: ${process.env.SUPABASE_PROJECT_ID || "(unset)"}`,
);
console.log(`SUPABASE_URL env: ${process.env.SUPABASE_URL || "(unset)"}`);

function summarizeUrlConfig(label, url) {
  if (!url) {
    console.log(`${label}: missing`);
    return;
  }
  try {
    const parsed = new URL(url);
    console.log(
      `${label}: host=${parsed.hostname} port=${parsed.port || "(default)"} user=${parsed.username || "(none)"} password=${parsed.password ? "present" : "MISSING"} project_hint=${projectHintFromUrl(url) || "(none)"}`,
    );
  } catch {
    console.log(`${label}: INVALID_URL_FORMAT`);
  }
}

summarizeUrlConfig("DATABASE_URL", configuredDatabaseUrl);
summarizeUrlConfig("DIRECT_URL", configuredDirectUrl);

if (!configuredDatabaseUrl && !configuredDirectUrl) {
  console.error(
    "DATABASE_URL / DIRECT_URL not set in repo-root .env or .env.local.\n" +
      `Paste connection strings from Supabase project ${CANONICAL_PROJECT_ID} into .env.local, then re-run.`,
  );
  process.exit(2);
}

try {
  assertCanonicalProject("DATABASE_URL", configuredDatabaseUrl);
  assertCanonicalProject("DIRECT_URL", configuredDirectUrl);
  if (
    process.env.SUPABASE_PROJECT_ID &&
    process.env.SUPABASE_PROJECT_ID !== CANONICAL_PROJECT_ID
  ) {
    throw new Error(
      `SUPABASE_PROJECT_ID=${process.env.SUPABASE_PROJECT_ID} is not canonical ${CANONICAL_PROJECT_ID}`,
    );
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(2);
}

/** Prefer pooler URL first; fall back to direct if needed. Never log credentials. */
async function connectWithFallback() {
  const { PrismaClient } = require("@prisma/client");
  const candidates = [];
  if (configuredDatabaseUrl) {
    candidates.push({ label: "DATABASE_URL", url: configuredDatabaseUrl });
  }
  if (configuredDirectUrl && configuredDirectUrl !== configuredDatabaseUrl) {
    candidates.push({ label: "DIRECT_URL", url: configuredDirectUrl });
  }

  const errors = [];
  for (const candidate of candidates) {
    const client = new PrismaClient({
      datasources: { db: { url: candidate.url } },
    });
    try {
      await client.$queryRawUnsafe("SELECT 1 AS ok");
      console.log(`Connected using ${candidate.label} (credentials not logged).`);
      return { client, connectionLabel: candidate.label };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${candidate.label}: ${msg.split("\n").filter(Boolean)[0]}`);
      await client.$disconnect().catch(() => {});
    }
  }
  throw new Error(
    `Unable to authenticate to PostgreSQL (canonical ${CANONICAL_PROJECT_ID}).\n${errors.map((e) => ` - ${e}`).join("\n")}`,
  );
}

/** Objects CO-SPRINT-117 intends to ADD (not yet baseline). */
const SPRINT_117_TABLES = [
  "organizations",
  "ecm_contacts",
  "ecm_contact_relationships",
  "ecm_contact_audit_references",
  "ecm_companies",
  "ecm_company_contact_links",
];

const SPRINT_117_ENUMS = [
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

/** Auth baseline expected from schema.prisma (pre–CO-SPRINT-117). */
const PRISMA_AUTH_TABLES = ["users", "refresh_tokens", "password_reset_tokens"];
const PRISMA_AUTH_ENUMS = ["Role"];

const REPO_MIGRATIONS = [
  "20260720120000_pilot_user_onboarding",
  "20260720180000_co_sprint_117_ecm_foundation",
];

async function q(prisma, sql) {
  return prisma.$queryRawUnsafe(sql);
}

function setOf(rows, key) {
  return new Set(rows.map((r) => String(r[key])));
}

function onlyIn(a, b) {
  return [...a].filter((x) => !b.has(x)).sort();
}

async function main() {
  const { client: prisma, connectionLabel } = await connectWithFallback();
  try {
  const report = {
    generatedAt: new Date().toISOString(),
    mode: "read-only",
    connectionLabel,
    migrateDeployExecuted: false,
    dbSeedExecuted: false,
    postgres: {},
    prismaExpectations: {
      authTables: PRISMA_AUTH_TABLES,
      authEnums: PRISMA_AUTH_ENUMS,
      repoMigrations: REPO_MIGRATIONS,
      sprint117PendingTables: SPRINT_117_TABLES,
      sprint117PendingEnums: SPRINT_117_ENUMS,
    },
    drift: {},
    recommendation: null,
    blockers: [],
  };

  const tables = await q(prisma, `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const enums = await q(prisma, `
    SELECT t.typname AS enum_name,
           array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  `);

  const indexes = await q(prisma, `
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `);

  const foreignKeys = await q(prisma, `
    SELECT
      tc.table_name,
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule,
      rc.update_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name
  `);

  const extensions = await q(prisma, `
    SELECT extname, extversion
    FROM pg_extension
    ORDER BY extname
  `);

  let migrations = [];
  let migrationsTableExists = false;
  try {
    const exists = await q(prisma, `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
      ) AS present
    `);
    migrationsTableExists = Boolean(exists[0]?.present);
    if (migrationsTableExists) {
      migrations = await q(prisma, `
        SELECT id, migration_name, finished_at, applied_steps_count, rolled_back_at,
               logs IS NOT NULL AS has_logs
        FROM "_prisma_migrations"
        ORDER BY finished_at NULLS LAST, migration_name
      `);
    }
  } catch (err) {
    report.blockers.push(`Failed reading _prisma_migrations: ${err.message}`);
  }

  const userColumns = await q(prisma, `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
    ORDER BY ordinal_position
  `);

  report.postgres = {
    tables: tables.map((t) => t.table_name),
    enums: enums.map((e) => ({ name: e.enum_name, values: e.enum_values })),
    indexes: indexes.map((i) => ({
      table: i.tablename,
      name: i.indexname,
      def: i.indexdef,
    })),
    foreignKeys,
    extensions,
    prismaMigrations: {
      tableExists: migrationsTableExists,
      rows: migrations,
    },
    usersColumns: userColumns,
  };

  const pgTables = setOf(tables, "table_name");
  const pgEnums = setOf(enums, "enum_name");
  const appliedMigrations = new Set(
    migrations.filter((m) => !m.rolled_back_at).map((m) => m.migration_name),
  );

  const prismaKnownTables = new Set([
    ...PRISMA_AUTH_TABLES,
    ...SPRINT_117_TABLES,
    "_prisma_migrations",
  ]);
  const prismaKnownEnums = new Set([...PRISMA_AUTH_ENUMS, ...SPRINT_117_ENUMS]);

  const pgBusinessTables = new Set(
    [...pgTables].filter((t) => t !== "_prisma_migrations"),
  );

  const onlyInPostgresTables = onlyIn(pgBusinessTables, prismaKnownTables);
  const onlyInPrismaAuthMissingInPg = onlyIn(
    new Set(PRISMA_AUTH_TABLES),
    pgTables,
  );
  const sprint117AlreadyInPg = SPRINT_117_TABLES.filter((t) => pgTables.has(t));
  const sprint117EnumsAlreadyInPg = SPRINT_117_ENUMS.filter((e) =>
    pgEnums.has(e),
  );
  const authEnumsMissing = onlyIn(new Set(PRISMA_AUTH_ENUMS), pgEnums);

  const expectedPilotColumns = [
    "employee_id",
    "mobile",
    "department",
    "must_change_password",
    "created_by_id",
    "reporting_manager_id",
    "eum_user_id",
  ];
  const userColSet = setOf(userColumns, "column_name");
  const missingPilotColumns = expectedPilotColumns.filter(
    (c) => !userColSet.has(c),
  );

  const migrationHistory = {
    repoMigrations: REPO_MIGRATIONS,
    appliedInDb: [...appliedMigrations].sort(),
    inRepoNotApplied: REPO_MIGRATIONS.filter((m) => !appliedMigrations.has(m)),
    inDbNotInRepo: [...appliedMigrations].filter(
      (m) => !REPO_MIGRATIONS.includes(m),
    ),
    pilotApplied: appliedMigrations.has("20260720120000_pilot_user_onboarding"),
    sprint117Applied: appliedMigrations.has(
      "20260720180000_co_sprint_117_ecm_foundation",
    ),
  };

  report.drift = {
    objectsOnlyInPostgreSQL: {
      tables: onlyInPostgresTables,
      enums: onlyIn(pgEnums, prismaKnownEnums),
    },
    objectsOnlyInPrismaSchema_missingInPostgreSQL: {
      authTables: onlyInPrismaAuthMissingInPg,
      authEnums: authEnumsMissing,
      pilotUserColumnsMissing: missingPilotColumns,
    },
    sprint117ObjectsAlreadyPresentInPostgreSQL: {
      tables: sprint117AlreadyInPg,
      enums: sprint117EnumsAlreadyInPg,
    },
    migrationHistoryConsistency: migrationHistory,
    notes: [],
  };

  // Recommendation engine
  let recommendation = "A";
  const reasons = [];

  if (onlyInPrismaAuthMissingInPg.length || authEnumsMissing.length) {
    recommendation = "B";
    reasons.push(
      "Auth baseline objects expected by schema.prisma are missing in PostgreSQL.",
    );
  }

  if (!migrationsTableExists) {
    recommendation = "B";
    reasons.push(
      "_prisma_migrations table missing — Prisma history must be baselined before deploy.",
    );
  }

  if (
    migrationsTableExists &&
    pgTables.has("users") &&
    appliedMigrations.size === 0
  ) {
    recommendation = "B";
    reasons.push(
      "Auth tables exist but _prisma_migrations is empty (likely prior db push). Reconciliation/baseline required.",
    );
  }

  if (migrationHistory.inDbNotInRepo.length) {
    recommendation = "B";
    reasons.push(
      `DB has migrations not in repo: ${migrationHistory.inDbNotInRepo.join(", ")}`,
    );
  }

  if (sprint117AlreadyInPg.length || sprint117EnumsAlreadyInPg.length) {
    recommendation = "B";
    reasons.push(
      "CO-SPRINT-117 objects already exist in PostgreSQL; bare CREATE migration would fail — reconcile first.",
    );
  }

  if (
    migrationHistory.sprint117Applied &&
    (sprint117AlreadyInPg.length === 0 || sprint117EnumsAlreadyInPg.length === 0)
  ) {
    recommendation = "B";
    reasons.push(
      "_prisma_migrations claims CO-SPRINT-117 applied but objects are incomplete.",
    );
  }

  if (
    recommendation === "A" &&
    onlyInPostgresTables.length === 0 &&
    pgTables.has("users") &&
    pgEnums.has("Role") &&
    !migrationHistory.sprint117Applied &&
    sprint117AlreadyInPg.length === 0
  ) {
    reasons.push(
      "Auth baseline present; no ECM collision; CO-SPRINT-117 not yet applied — safe ADD-ONLY deploy candidate.",
    );
  }

  if (!pgTables.has("users")) {
    recommendation = "B";
    reasons.push(
      "users table missing — CO-SPRINT-117 FK ecm_contacts.linked_user_id → users.id cannot be created.",
    );
  }

  report.recommendation = {
    code: recommendation,
    label:
      recommendation === "A"
        ? "CO-SPRINT-117 can be applied safely as a non-destructive migration."
        : "A reconciliation/baseline migration is required before CO-SPRINT-117.",
    reasons,
  };

  const outPath = resolve(
    process.cwd(),
    "prisma/migrations/20260720180000_co_sprint_117_ecm_foundation/BASELINE_AUDIT_REPORT.json",
  );
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log("=== CO-SPRINT-117 Live Database Baseline Audit ===");
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Tables (${report.postgres.tables.length}): ${report.postgres.tables.join(", ")}`);
  console.log(
    `Enums (${report.postgres.enums.length}): ${report.postgres.enums.map((e) => e.name).join(", ")}`,
  );
  console.log(`Indexes: ${report.postgres.indexes.length}`);
  console.log(`Foreign keys: ${report.postgres.foreignKeys.length}`);
  console.log(
    `Extensions: ${report.postgres.extensions.map((e) => `${e.extname}@${e.extversion}`).join(", ") || "(none)"}`,
  );
  console.log(`_prisma_migrations rows: ${migrations.length}`);
  console.log("\n--- Drift ---");
  console.log(
    "Only in PostgreSQL (tables):",
    report.drift.objectsOnlyInPostgreSQL.tables.join(", ") || "(none)",
  );
  console.log(
    "Auth missing in PostgreSQL:",
    report.drift.objectsOnlyInPrismaSchema_missingInPostgreSQL.authTables.join(
      ", ",
    ) || "(none)",
  );
  console.log(
    "Sprint-117 already in PG:",
    report.drift.sprint117ObjectsAlreadyPresentInPostgreSQL.tables.join(", ") ||
      "(none)",
  );
  console.log(
    "Migrations in repo not applied:",
    migrationHistory.inRepoNotApplied.join(", ") || "(none)",
  );
  console.log(
    "Migrations in DB not in repo:",
    migrationHistory.inDbNotInRepo.join(", ") || "(none)",
  );
  console.log("\n=== RECOMMENDATION ===");
  console.log(`${report.recommendation.code}: ${report.recommendation.label}`);
  for (const r of reasons) console.log(` - ${r}`);
  console.log(`\nFull JSON written to:\n ${outPath}`);
  console.log(
    "\nNo migrate deploy / db seed executed. Awaiting your approval of findings.",
  );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
