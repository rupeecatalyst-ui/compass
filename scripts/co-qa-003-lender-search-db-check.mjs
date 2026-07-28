/**
 * CO-QA-003 — Check Prisma lender registry for common banks + search path health.
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
  const exists = await p.$queryRawUnsafe(
    `SELECT 1 AS ok FROM information_schema.tables WHERE table_schema='public' AND table_name='enterprise_lenders' LIMIT 1`
  );
  console.log("enterprise_lenders exists:", exists.length > 0);
  if (!exists.length) {
    await p.$disconnect();
    return;
  }

  const totals = await p.$queryRawUnsafe(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE COALESCE(is_deleted,false)=false)::int AS not_deleted,
      COUNT(*) FILTER (WHERE COALESCE(is_deleted,false)=false AND status::text ILIKE '%active%' AND enabled = true)::int AS active_enabled
    FROM enterprise_lenders
  `);
  console.log("TOTALS", totals);

  const sample = await p.$queryRawUnsafe(`
    SELECT id, code, display_name, short_name, status::text AS status, enabled, lifecycle_status::text AS lifecycle,
           COALESCE(is_deleted,false) AS is_deleted
    FROM enterprise_lenders
    WHERE COALESCE(display_name,'') ILIKE ANY(ARRAY['%ICICI%','%HDFC%','%SBI%','%State Bank%','%Axis%','%Kotak%'])
       OR COALESCE(short_name,'') ILIKE ANY(ARRAY['%ICICI%','%HDFC%','%SBI%','%Axis%','%Kotak%'])
       OR COALESCE(code,'') ILIKE ANY(ARRAY['%ICICI%','%HDFC%','%SBI%','%AXIS%','%KOTAK%'])
    ORDER BY display_name
    LIMIT 40
  `);
  console.log("BANK SAMPLE", JSON.stringify(sample, null, 2));

  const byStatus = await p.$queryRawUnsafe(`
    SELECT status::text AS status, lifecycle_status::text AS lifecycle, enabled, COUNT(*)::int AS n
    FROM enterprise_lenders
    WHERE COALESCE(is_deleted,false)=false
    GROUP BY 1,2,3
    ORDER BY n DESC
  `);
  console.log("BY STATUS", byStatus);

  const orgs = await p.$queryRawUnsafe(`
    SELECT o.id, o.slug, o.name, COUNT(l.id)::int AS lender_count
    FROM organizations o
    LEFT JOIN enterprise_lenders l ON l.organization_id = o.id AND COALESCE(l.is_deleted,false)=false
    GROUP BY o.id, o.slug, o.name
    ORDER BY lender_count DESC
    LIMIT 10
  `);
  console.log("ORGS", orgs);

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
