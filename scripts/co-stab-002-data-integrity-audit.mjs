/**
 * CO-STAB-002 — Read-only data integrity probes against DATABASE_URL / DIRECT_URL.
 * No mutations. Prints JSON summary for the Executive Data Integrity Report.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.log(JSON.stringify({ ok: false, error: "NO_DATABASE_URL" }));
  process.exit(2);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  const [
    dealsMissingOpp,
    dealsMissingLender,
    activeOppMissingProductKey,
    softDeletedContactsReferenced,
    docLinkBadDef,
    migrationCount,
    indexes,
    payeeNullability,
    dealCount,
    oppCount,
    contactCount,
    lenderCount,
  ] = await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS c FROM enterprise_deals WHERE is_deleted = false AND opportunity_id IS NULL`,
    ),
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS c FROM enterprise_deals WHERE is_deleted = false AND lender_id IS NULL`,
    ),
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS c FROM enterprise_opportunities
       WHERE is_deleted = false AND archived = false
         AND lifecycle_status::text IN ('requirement_captured','active','on_hold')
         AND closed_at IS NULL AND product_uniqueness_key IS NULL`,
    ),
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS c FROM enterprise_opportunities o
       JOIN ecm_contacts c ON c.id = o.primary_contact_id
       WHERE c.is_deleted = true AND o.is_deleted = false`,
    ),
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS c FROM enterprise_deal_document_links d
       WHERE d.is_deleted = false AND d.document_definition_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM enterprise_document_definitions x WHERE x.id = d.document_definition_id
         )`,
    ),
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS c FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
    ),
    prisma.$queryRawUnsafe(
      `SELECT indexname FROM pg_indexes WHERE indexname IN (
         'eopp_active_contact_product_uidx',
         'edeal_org_opp_lender_active_key',
         'eapayee_org_contact_unique_active',
         'eapayee_org_company_unique_active',
         'ecm_companies_org_name_ci_key'
       ) ORDER BY indexname`,
    ),
    prisma.$queryRawUnsafe(
      `SELECT column_name, is_nullable FROM information_schema.columns
       WHERE table_name = 'enterprise_accounting_payees'
         AND column_name IN ('legal_name','billing_name')
       ORDER BY column_name`,
    ),
    prisma.enterpriseDeal.count({ where: { isDeleted: false } }),
    prisma.enterpriseOpportunity.count({ where: { isDeleted: false } }),
    prisma.ecmContact.count({ where: { isDeleted: false } }),
    prisma.enterpriseLender.count({ where: { isDeleted: false } }),
  ]);

  const countOf = (rows) => (Array.isArray(rows) && rows[0] ? Number(rows[0].c) : -1);
  const indexNames = (Array.isArray(indexes) ? indexes : []).map((r) => r.indexname);

  const report = {
    ok: true,
    sprint: "CO-STAB-002",
    counts: {
      deals: dealCount,
      opportunities: oppCount,
      contacts: contactCount,
      lenders: lenderCount,
      appliedMigrations: countOf(migrationCount),
    },
    orphans: {
      dealsMissingOpportunity: countOf(dealsMissingOpp),
      dealsMissingLender: countOf(dealsMissingLender),
      activeOppMissingProductKey: countOf(activeOppMissingProductKey),
      softDeletedContactsReferencedByActiveOpp: countOf(softDeletedContactsReferenced),
      dealDocumentLinkBadDefinition: countOf(docLinkBadDef),
    },
    dbOnlyIndexesPresent: indexNames,
    expectedDbOnlyIndexes: [
      "eopp_active_contact_product_uidx",
      "edeal_org_opp_lender_active_key",
      "eapayee_org_contact_unique_active",
      "eapayee_org_company_unique_active",
      "ecm_companies_org_name_ci_key",
    ],
    payeeNullability,
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.log(JSON.stringify({ ok: false, error: String(e) }));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
