/**
 * Smoke: confirm Postgres accepts dialogue enum (no Opportunity row writes).
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
  const cast = await prisma.$queryRawUnsafe(
    `SELECT 'dialogue'::"OpportunityLifecycleStatus" AS v,
            'in_progress'::"OpportunityLifecycleStatus" AS v2,
            'converted_to_deal'::"OpportunityLifecycleStatus" AS v3,
            'completed'::"OpportunityLifecycleStatus" AS v4`,
  );
  console.log("CAST_OK", JSON.stringify(cast));

  const counts = await prisma.$queryRawUnsafe(`
    SELECT lifecycle_status::text AS status, COUNT(*)::int AS n
    FROM enterprise_opportunities
    WHERE is_deleted = false
    GROUP BY lifecycle_status
    ORDER BY n DESC
  `);
  console.log("EXISTING_STATUS_COUNTS", JSON.stringify(counts, null, 2));
  console.log("SMOKE_OK — enum accepts dialogue; existing rows unchanged.");
}

main()
  .catch((e) => {
    console.error("SMOKE_FAILED", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
