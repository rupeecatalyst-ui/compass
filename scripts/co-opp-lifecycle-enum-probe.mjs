/**
 * Inspect OpportunityLifecycleStatus enum values (read-only).
 * Usage: node --env-file=.env.local scripts/co-opp-lifecycle-enum-probe.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

function loadEnv() {
  const envFile = existsSync(".env.local") ? ".env.local" : ".env";
  const text = readFileSync(resolve(process.cwd(), envFile), "utf8");
  for (const line of text.split(/\r?\n/)) {
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

loadEnv();
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'OpportunityLifecycleStatus'
    ORDER BY e.enumsortorder
  `);
  console.log("OpportunityLifecycleStatus values:", JSON.stringify(rows, null, 2));

  const pending = await prisma.$queryRawUnsafe(`
    SELECT migration_name, finished_at
    FROM _prisma_migrations
    WHERE migration_name LIKE '%opportunity_lifecycle%'
       OR migration_name LIKE '%co_opp_002%'
    ORDER BY started_at
  `);
  console.log("Related migrations:", JSON.stringify(pending, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
