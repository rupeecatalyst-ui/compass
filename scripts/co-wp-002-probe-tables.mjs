/**
 * CO-WP-002 — Probe Wealth Partner tables (read-only).
 * Usage: node --env-file=.env.local scripts/co-wp-002-probe-tables.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.enterprise_wealth_partners')::text AS partners,
            to_regclass('public.enterprise_wealth_partner_network_members')::text AS network,
            to_regclass('public.enterprise_wealth_partner_activities')::text AS activities,
            to_regclass('public.enterprise_wealth_partner_commissions')::text AS commissions,
            to_regclass('public.enterprise_wealth_partner_bank_accounts')::text AS banking`
  );
  console.log(JSON.stringify(rows, null, 2));

  try {
    const count = await prisma.enterpriseWealthPartner.count();
    console.log("enterpriseWealthPartner.count=", count);
  } catch (e) {
    console.error("COUNT_FAILED", e?.message ?? e);
  }
}

main()
  .catch((e) => {
    console.error("PROBE_FAILED", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
