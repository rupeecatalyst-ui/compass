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

const DEAL_IDS = [
  "cms1qhjsy0005l304sxcmqo0g",
  "cms1qhpel000bl304kiosj4cw",
  "cms1qhwhd000hl304u2vbh6ga",
];

async function main() {
  const soft = await p.$queryRawUnsafe(
    `SELECT * FROM enterprise_soft_delete_records
     WHERE entity_id = ANY($1::text[])
     ORDER BY deleted_at DESC NULLS LAST`,
    DEAL_IDS
  ).catch(async (e) => {
    console.log("soft delete table err", e.message);
    const tables = await p.$queryRawUnsafe(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE '%soft%'`
    );
    console.log("soft tables", tables);
    return [];
  });
  console.log("SOFT_DELETE_RECORDS", JSON.stringify(soft, null, 2));

  const audits = await p.$queryRawUnsafe(
    `SELECT id, deal_id, event_type, summary, created_at, actor_user_id
     FROM enterprise_deal_timeline_events
     WHERE deal_id = ANY($1::text[])
       AND (
         event_type ILIKE '%delet%' OR event_type ILIKE '%archiv%' OR event_type ILIKE '%restor%'
         OR COALESCE(summary,'') ILIKE '%delet%' OR COALESCE(summary,'') ILIKE '%kanban%'
       )
     ORDER BY created_at DESC
     LIMIT 50`,
    DEAL_IDS
  ).catch(async (e) => {
    console.log("timeline err", e.message);
    const cols = await p.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name='enterprise_deal_timeline_events'`
    );
    console.log("timeline cols", cols.map((c) => c.column_name));
    return [];
  });
  console.log("DELETE_RELATED_TIMELINE", JSON.stringify(audits, null, 2));

  const registryAudit = await p.$queryRawUnsafe(
    `SELECT id, entity_id, action, summary, created_at
     FROM enterprise_registry_audit_entries
     WHERE entity_id = ANY($1::text[])
     ORDER BY created_at DESC
     LIMIT 30`,
    DEAL_IDS
  ).catch((e) => {
    console.log("registry audit err", e.message);
    return [];
  });
  console.log("REGISTRY_AUDIT", JSON.stringify(registryAudit, null, 2));

  await p.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
