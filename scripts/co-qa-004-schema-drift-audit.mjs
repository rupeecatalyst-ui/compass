/**
 * CO-QA-004 — Production schema drift audit vs Prisma migrations.
 * Read-only comparison of critical enterprise tables + _prisma_migrations.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvFile(".env");
loadEnvFile(".env.local");

const p = new PrismaClient();

const TABLES = [
  "enterprise_opportunities",
  "enterprise_deals",
  "enterprise_contacts",
  "ecm_companies",
  "enterprise_transaction_documents",
  "enterprise_document_registry",
  "enterprise_lenders",
  "enterprise_lender_programs",
];

/** Expected columns from schema.prisma critical models (snake_case). */
const EXPECTED = {
  enterprise_opportunities: [
    "id",
    "organization_id",
    "opportunity_number",
    "legacy_loan_file_id",
    "lifecycle_status",
    "lifecycle_phase",
    "gross_stage",
    "sub_stage",
    "operational_status",
    "product_id",
    "product_code",
    "product_label",
    "product_family",
    "transaction_type",
    "lending_type",
    "requested_amount",
    "currency_code",
    "primary_contact_id",
    "primary_contact_name",
    "primary_contact_mobile",
    "primary_contact_email",
    "primary_borrower_kind",
    "company_id",
    "company_name",
    "employment_type_code",
    "city_label",
    "relationship_manager_user_id",
    "relationship_manager_name",
    "primary_owner_user_id",
    "priority",
    "is_urgent",
    "is_delayed",
    "source_channel",
    "campaign_code",
    "notes",
    "snapshot",
    "converted_to_deal_at",
    "converted_deal_id",
    "product_uniqueness_key",
    "archived",
    "archived_at",
    "archived_by",
    "is_deleted",
    "deleted_at",
    "deleted_by",
    "deletion_reason",
    "row_version",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
  ],
  enterprise_deals: [
    "id",
    "organization_id",
    "deal_number",
    "opportunity_id",
    "lender_id",
    "lender_program_id",
    "legacy_loan_file_id",
    "file_number",
    "gross_stage",
    "sub_stage",
    "lifecycle_status",
    "lifecycle_phase",
    "operational_status",
    "product_id",
    "product_code",
    "product_label",
    "product_family",
    "transaction_type",
    "requested_amount",
    "approved_amount",
    "fulfilled_amount",
    "currency_code",
    "primary_contact_id",
    "primary_contact_name",
    "primary_contact_mobile",
    "primary_contact_email",
    "company_id",
    "relationship_manager_user_id",
    "relationship_manager_name",
    "primary_owner_user_id",
    "priority",
    "is_urgent",
    "is_delayed",
    "primary_counterparty_name",
    "snapshot",
    "lending_extension",
    "commercial_terms",
    "invoice_party_type",
    "invoice_party_specify",
    "stage_entered_at",
    "archived",
    "archived_at",
    "archived_by",
    "is_deleted",
    "deleted_at",
    "deleted_by",
    "deletion_reason",
    "row_version",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
  ],
};

async function columnsFor(table) {
  const rows = await p.$queryRawUnsafe(
    `SELECT column_name, data_type, udt_name, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    table,
  );
  return rows;
}

async function indexesFor(table) {
  return p.$queryRawUnsafe(
    `SELECT indexname, indexdef
     FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = $1
     ORDER BY indexname`,
    table,
  );
}

async function fksFor(table) {
  return p.$queryRawUnsafe(
    `SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table,
            ccu.column_name AS foreign_column
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
     JOIN information_schema.constraint_column_usage ccu
       ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = 'public' AND tc.table_name = $1
     ORDER BY tc.constraint_name`,
    table,
  );
}

async function enums() {
  return p.$queryRawUnsafe(
    `SELECT t.typname AS enum_name, e.enumlabel AS enum_value
     FROM pg_type t
     JOIN pg_enum e ON t.oid = e.enumtypid
     JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public'
       AND t.typname ILIKE '%borrower%' OR t.typname ILIKE '%Opportunity%'
     ORDER BY t.typname, e.enumsortorder`,
  );
}

async function main() {
  const migrationDirs = readdirSync("prisma/migrations")
    .filter((d) => existsSync(join("prisma/migrations", d, "migration.sql")))
    .sort();

  const applied = await p.$queryRawUnsafe(
    `SELECT id, migration_name, finished_at, rolled_back_at, started_at, applied_steps_count
     FROM _prisma_migrations
     ORDER BY started_at ASC NULLS LAST, migration_name ASC`,
  );

  const appliedNames = new Set(applied.map((r) => r.migration_name));
  const repoNotApplied = migrationDirs.filter((d) => !appliedNames.has(d));
  const appliedNotInRepo = [...appliedNames].filter(
    (n) => !migrationDirs.includes(n) && n !== undefined,
  );

  console.log("=== MIGRATION_HISTORY_PRODUCTION ===");
  console.log(JSON.stringify(applied, null, 2));

  console.log("\n=== REPO_MIGRATIONS ===");
  console.log(JSON.stringify(migrationDirs, null, 2));

  console.log("\n=== DRIFT_MIGRATIONS ===");
  console.log(
    JSON.stringify(
      {
        inRepoNotAppliedInProduction: repoNotApplied,
        appliedInProductionNotInRepo: appliedNotInRepo,
        coDom001PresentInRepo: migrationDirs.includes(
          "20260727120000_co_dom_001_borrower_contact_model",
        ),
        coDom001AppliedInProduction: appliedNames.has(
          "20260727120000_co_dom_001_borrower_contact_model",
        ),
      },
      null,
      2,
    ),
  );

  const enumRows = await p.$queryRawUnsafe(
    `SELECT t.typname AS enum_name, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
     FROM pg_type t
     JOIN pg_enum e ON t.oid = e.enumtypid
     JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public' AND t.typname = 'OpportunityPrimaryBorrowerKind'
     GROUP BY t.typname`,
  );
  console.log("\n=== ENUM_OpportunityPrimaryBorrowerKind ===");
  console.log(JSON.stringify(enumRows, null, 2));

  const drift = {};
  for (const table of TABLES) {
    const exists = await p.$queryRawUnsafe(
      `SELECT to_regclass('public.${table}') IS NOT NULL AS exists`,
    );
    if (!exists[0]?.exists) {
      drift[table] = { exists: false };
      continue;
    }
    const cols = await columnsFor(table);
    const colNames = cols.map((c) => c.column_name);
    const expected = EXPECTED[table];
    const missing = expected
      ? expected.filter((c) => !colNames.includes(c))
      : [];
    const extra = expected
      ? colNames.filter((c) => !expected.includes(c))
      : [];
    drift[table] = {
      exists: true,
      columnCount: colNames.length,
      missingColumns: missing,
      extraColumnsVsExpectedSubset: expected ? extra : "(no expected list — inventory only)",
      columns: colNames,
      indexes: (await indexesFor(table)).map((i) => i.indexname),
      foreignKeys: await fksFor(table),
    };
  }

  console.log("\n=== TABLE_DRIFT ===");
  console.log(JSON.stringify(drift, null, 2));

  // Focused opportunity column check
  const opp = drift.enterprise_opportunities;
  console.log("\n=== CO_QA_004_FOCUS ===");
  console.log(
    JSON.stringify(
      {
        primary_borrower_kind_in_prod: opp?.columns?.includes("primary_borrower_kind") ?? false,
        company_id_in_prod: opp?.columns?.includes("company_id") ?? false,
        company_name_in_prod: opp?.columns?.includes("company_name") ?? false,
        missingOnOpportunities: opp?.missingColumns ?? [],
        blockingError:
          "Invalid prisma.enterpriseOpportunity.findMany() — column primary_borrower_kind does not exist",
      },
      null,
      2,
    ),
  );

  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
