/**
 * CO-DOC-002 — Trace deals for OPP-2026-000043 (cuid id, not uuid).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const OPP_ID = "cms30bmw70003l8045fgp8fxt";

async function main() {
  const deals = await prisma.$queryRawUnsafe(
    `SELECT id, deal_number, legacy_loan_file_id, file_number, gross_stage,
            primary_contact_id, company_id
     FROM enterprise_deals
     WHERE opportunity_id = $1 AND COALESCE(is_deleted, false) = false`,
    OPP_ID,
  );
  console.log("DEALS", JSON.stringify(deals, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
