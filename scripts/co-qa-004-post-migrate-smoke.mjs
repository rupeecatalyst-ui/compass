/**
 * CO-QA-004 — Post-migrate smoke: Opportunity findMany must succeed.
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

async function main() {
  const cols = await p.$queryRawUnsafe(
    `SELECT column_name, udt_name, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_name = 'enterprise_opportunities'
       AND column_name IN ('primary_borrower_kind', 'company_name', 'primary_contact_id')
     ORDER BY column_name`,
  );

  const applied = await p.$queryRawUnsafe(
    `SELECT migration_name, finished_at
     FROM _prisma_migrations
     WHERE migration_name IN (
       '20260722120000_co_admin_004_production_reset',
       '20260722140000_co_admin_005_product_lender_master',
       '20260722160000_co_perf_001_enterprise_metrics_engine',
       '20260727120000_co_dom_001_borrower_contact_model',
       '20260727180000_co_mdm_001_reference_master_domains',
       '20260727190000_co_lend_001_lender_program_portal',
       '20260727193000_co_lend_001b_contact_dialogue',
       '20260727194500_co_doc_002_durable_transaction_documents'
     )
     ORDER BY migration_name`,
  );

  const sample = await p.enterpriseOpportunity.findMany({
    take: 5,
    where: { isDeleted: false },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      opportunityNumber: true,
      primaryBorrowerKind: true,
      companyName: true,
      primaryContactId: true,
      primaryContactName: true,
    },
  });

  const deals = await p.enterpriseDeal.findMany({
    take: 2,
    where: { isDeleted: false },
    select: { id: true, dealNumber: true, opportunityId: true },
  });

  const contacts = await p.ecmContact.findMany({
    take: 2,
    where: { isDeleted: false },
    select: { id: true, name: true },
  });

  const lenders = await p.enterpriseLender.findMany({
    take: 2,
    where: { isDeleted: false },
    select: { id: true, code: true, priority: true },
  });

  const docs = await p.enterpriseTransactionDocument.count();

  console.log(
    JSON.stringify(
      {
        columns: cols,
        newlyAppliedMigrations: applied,
        opportunityFindManyOk: true,
        opportunitySample: sample,
        dealFindManyOk: true,
        dealSample: deals,
        contactFindManyOk: true,
        contactSample: contacts,
        lenderFindManyOk: true,
        lenderSample: lenders,
        transactionDocumentCount: docs,
      },
      null,
      2,
    ),
  );
  await p.$disconnect();
}

main().catch(async (e) => {
  console.error("SMOKE_FAIL", e);
  await p.$disconnect();
  process.exit(1);
});
