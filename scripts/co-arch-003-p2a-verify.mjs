/**
 * CO-ARCH-003 Phase 2A — Verify Opportunity–Deal foundation (schema + BI smoke).
 * Usage: node --env-file=.env.local scripts/co-arch-003-p2a-verify.mjs
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);

function loadEnvFile(name) {
  const path = resolve(process.cwd(), name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("FAIL: DATABASE_URL / DIRECT_URL missing");
  process.exit(1);
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ datasources: { db: { url } } });

const REQUIRED_TABLES = [
  "enterprise_opportunity_number_sequences",
  "enterprise_opportunities",
  "enterprise_deals",
];

const REQUIRED_DEAL_COLUMNS = ["opportunity_id", "lender_id", "lender_program_id"];

async function tableExists(name) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.${name}')::text AS reg`,
  );
  return Boolean(rows?.[0]?.reg);
}

async function columnExists(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    table,
    column,
  );
  return rows.length > 0;
}

async function main() {
  let failed = 0;

  for (const t of REQUIRED_TABLES) {
    const ok = await tableExists(t);
    console.log(ok ? `OK table ${t}` : `FAIL table ${t}`);
    if (!ok) failed += 1;
  }

  for (const col of REQUIRED_DEAL_COLUMNS) {
    const ok = await columnExists("enterprise_deals", col);
    console.log(ok ? `OK column enterprise_deals.${col}` : `FAIL column enterprise_deals.${col}`);
    if (!ok) failed += 1;
  }

  // Unique legacy on deals should be gone
  const uniq = await prisma.$queryRawUnsafe(
    `SELECT indexname FROM pg_indexes
     WHERE tablename = 'enterprise_deals' AND indexname = 'edeal_org_legacy_loan_file_key'`,
  );
  const legacyUniqueGone = uniq.length === 0;
  console.log(
    legacyUniqueGone
      ? "OK legacy_loan_file unique dropped (multi-Deal bridge)"
      : "FAIL legacy_loan_file unique still present",
  );
  if (!legacyUniqueGone) failed += 1;

  const oppCount = await prisma.enterpriseOpportunity.count();
  const dealCount = await prisma.enterpriseDeal.count({ where: { isDeleted: false } });
  const dealsWithOpp = await prisma.enterpriseDeal.count({
    where: { isDeleted: false, opportunityId: { not: null } },
  });
  const dealsWithLender = await prisma.enterpriseDeal.count({
    where: { isDeleted: false, lenderId: { not: null } },
  });
  const orphanDeals = await prisma.enterpriseDeal.count({
    where: { isDeleted: false, opportunityId: null },
  });

  console.log(`INFO opportunities=${oppCount}`);
  console.log(`INFO active_deals=${dealCount} with_opportunity=${dealsWithOpp} with_lender=${dealsWithLender} orphan_opportunity_fk=${orphanDeals}`);

  if (orphanDeals > 0) {
    console.log(
      `WARN ${orphanDeals} active Deal(s) still missing opportunity_id — run scripts/co-arch-003-p2a-backfill.mjs`,
    );
  }

  if (failed > 0) {
    console.error(`FAIL: ${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("PASS: CO-ARCH-003 Phase 2A foundation schema verified");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
