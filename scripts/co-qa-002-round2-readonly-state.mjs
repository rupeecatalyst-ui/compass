/**
 * CO-QA-002 Round 2 — readonly production state for Mehernosh Dastoor Deals.
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
const OPP = "cms1q4k3h0003l3047et4d0qt";
const IDS = [
  "cms1qhjsy0005l304sxcmqo0g",
  "cms1qhpel000bl304kiosj4cw",
  "cms1qhwhd000hl304u2vbh6ga",
];

async function main() {
  const deals = await p.$queryRawUnsafe(
    `SELECT id, deal_number, opportunity_id,
            COALESCE(is_deleted,false) AS is_deleted, deleted_at, updated_at,
            row_version, primary_counterparty_name
     FROM enterprise_deals
     WHERE opportunity_id = $1
     ORDER BY deal_number`,
    OPP
  );
  const soft = await p.$queryRawUnsafe(
    `SELECT entity_id, status, deleted_at, deletion_reason, deleted_by
     FROM enterprise_soft_delete_records
     WHERE entity_id = ANY($1::text[])`,
    IDS
  );
  const audit = await p.$queryRawUnsafe(
    `SELECT entity_id, action, at, actor_user_id, reason
     FROM enterprise_soft_delete_audits
     WHERE entity_id = ANY($1::text[])
     ORDER BY at DESC
     LIMIT 20`,
    IDS
  );
  console.log(
    JSON.stringify(
      {
        customer: "Mehernosh Dastoor",
        opportunityId: OPP,
        opportunityNumber: "OPP-2026-000041",
        deals,
        softDeleteRecords: soft,
        softDeleteAudits: audit,
        phase1BatQuestion:
          "Did UI DELETE persist? Evidence: is_deleted still false + empty soft_delete tables = NO for BAT path.",
      },
      null,
      2
    )
  );
  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
