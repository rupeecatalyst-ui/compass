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
  const rows = await p.$queryRawUnsafe(`
    SELECT id, code, display_name, label, status::text, enabled,
           lifecycle_status::text AS lifecycle,
           operational_status::text AS operational
    FROM enterprise_lenders
    WHERE COALESCE(is_deleted,false)=false
    ORDER BY code
  `);
  console.log(JSON.stringify(rows, null, 2));

  const search = await p.$queryRawUnsafe(`
    SELECT id, code, display_name, label, operational_status::text AS operational
    FROM enterprise_lenders
    WHERE organization_id='cmrtlilr60001weys1xv2uu5t'
      AND COALESCE(is_deleted,false)=false
      AND status='active' AND enabled=true AND lifecycle_status='active'
      AND (
        COALESCE(label,'') ILIKE '%ICICI%' OR code ILIKE '%ICICI%' OR COALESCE(display_name,'') ILIKE '%ICICI%'
        OR COALESCE(legal_name,'') ILIKE '%ICICI%' OR COALESCE(short_name,'') ILIKE '%ICICI%'
      )
  `);
  console.log("SEARCH_ICICI", JSON.stringify(search, null, 2));
  await p.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
