/**
 * CO-ARCH-003 Phase 2B Sprint 1 — Invoice Party Master + Deal attribute verify.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const checks = [];

  const payeeTable = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.enterprise_accounting_payees')::text AS reg`,
  );
  checks.push({
    name: "Invoice Party Master table (enterprise_accounting_payees) exists",
    ok: Array.isArray(payeeTable) && payeeTable[0]?.reg === "enterprise_accounting_payees",
  });

  const cols = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'enterprise_accounting_payees'
       AND column_name IN (
         'legal_name','billing_name','gstin','pan','billing_address','state_label',
         'invoice_email','tds_applicable','tds_rate_percent','gst_status','company_id','contact_id'
       )`,
  );
  checks.push({
    name: "Invoice Party Master accounting columns",
    ok: Array.isArray(cols) && cols.length >= 11,
  });

  const uniq = await prisma.$queryRawUnsafe(
    `SELECT indexname FROM pg_indexes
     WHERE tablename = 'enterprise_accounting_payees'
       AND indexname IN ('eapayee_org_contact_unique_active','eapayee_org_company_unique_active')`,
  );
  checks.push({
    name: "1:0..1 unique indexes (Contact / Company)",
    ok: Array.isArray(uniq) && uniq.length >= 2,
  });

  const dealCols = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'enterprise_deals'
       AND column_name IN (
         'commission_payee_type','commission_payee_specify',
         'commission_payee_contact_id','commission_accounting_payee_id',
         'opportunity_id','lender_id'
       )`,
  );
  checks.push({
    name: "Deal Invoice Party columns + Phase 2A intact",
    ok: Array.isArray(dealCols) && dealCols.length >= 6,
  });

  const opp = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.enterprise_opportunities')::text AS reg`,
  );
  checks.push({
    name: "Phase 2A opportunity registry intact",
    ok: Array.isArray(opp) && opp[0]?.reg === "enterprise_opportunities",
  });

  let failed = 0;
  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"} · ${c.name}`);
    if (!c.ok) failed += 1;
  }
  console.log(
    failed === 0
      ? "\nSprint 1 Invoice Party schema verify: ALL PASS"
      : `\nSprint 1 Invoice Party schema verify: ${failed} FAIL`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
