/**
 * CO-QA-004 — Exact Prisma model vs production column drift (from schema.prisma maps).
 */
import { readFileSync, existsSync } from "node:fs";
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

/** Exact DB columns required by current schema.prisma models (@@map). */
const PRISMA_REQUIRED = {
  enterprise_opportunities: [
    "id",
    "organization_id",
    "opportunity_number",
    "legacy_loan_file_id",
    "external_refs",
    "product_id",
    "product_code",
    "product_label",
    "product_uniqueness_key",
    "product_family",
    "transaction_type",
    "requirement_stage",
    "requirement_sub_stage",
    "lifecycle_status",
    "fulfilment_mode",
    "fulfilment_status",
    "fulfilled_amount",
    "stage_entered_at",
    "closed_at",
    "archived",
    "archived_at",
    "archived_by",
    "primary_owner_user_id",
    "relationship_manager_user_id",
    "relationship_manager_name",
    "team_id",
    "branch_id",
    "primary_contact_id",
    "primary_contact_name",
    "primary_contact_mobile",
    "primary_contact_email",
    "primary_borrower_kind",
    "company_id",
    "company_name",
    "employment_type_code",
    "city_label",
    "state_label",
    "currency_code",
    "requested_amount",
    "priority",
    "source_code",
    "source_contact_id",
    "snapshot",
    "lending_extension",
    "version_number",
    "row_version",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
    "is_deleted",
    "deleted_at",
    "deleted_by",
    "deletion_reason",
  ],
  ecm_company_contact_links: [
    "id",
    "organization_id",
    "company_id",
    "contact_id",
    "relation_role",
    "designation",
    "department",
    "status",
    "created_by",
    "modified_by",
    "created_at",
    "updated_at",
  ],
  enterprise_products: ["sort_order", "parent_product_id", "is_secured", "customer_segment", "remarks"],
  enterprise_lenders: [
    "priority",
    "default_processing_rules",
    "branch_coverage",
    "rm_mapping",
    "remarks",
  ],
  production_reset_runs: ["id"],
  enterprise_metric_runs: ["id"],
  enterprise_metric_snapshots: ["id"],
  enterprise_transaction_documents: ["id"],
  lender_program_portal_invites: ["id"],
};

async function cols(table) {
  const rows = await p.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1`,
    table,
  );
  return new Set(rows.map((r) => r.column_name));
}

async function tableExists(table) {
  const r = await p.$queryRawUnsafe(
    `SELECT to_regclass($1) IS NOT NULL AS e`,
    `public.${table}`,
  );
  return Boolean(r[0]?.e);
}

async function main() {
  const report = {};
  for (const [table, required] of Object.entries(PRISMA_REQUIRED)) {
    const exists = await tableExists(table);
    if (!exists) {
      report[table] = { exists: false, missingEntireTable: true, missingColumns: required };
      continue;
    }
    const have = await cols(table);
    const missing = required.filter((c) => !have.has(c));
    report[table] = {
      exists: true,
      missingColumns: missing,
      prismaAligned: missing.length === 0,
    };
  }

  // nullable check primary_contact_id
  if (await tableExists("enterprise_opportunities")) {
    const nullability = await p.$queryRawUnsafe(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_name='enterprise_opportunities' AND column_name='primary_contact_id'`,
    );
    report.enterprise_opportunities.primary_contact_id_nullable =
      nullability[0]?.is_nullable === "YES";
  }

  const index = await p.$queryRawUnsafe(
    `SELECT indexname FROM pg_indexes
     WHERE tablename='enterprise_opportunities'
       AND indexname='eopp_org_company_product_lifecycle_idx'`,
  );

  console.log(
    JSON.stringify(
      {
        prismaVsProduction: report,
        coDom001IndexPresent: index.length > 0,
        blocker:
          report.enterprise_opportunities?.missingColumns?.includes("primary_borrower_kind") ||
          false,
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
