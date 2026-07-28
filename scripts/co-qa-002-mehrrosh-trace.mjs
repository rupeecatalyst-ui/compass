/**
 * CO-QA-002 re-open — locate Mehrrosh Dastoor deals and related opportunity state.
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
  const contacts = await p.$queryRawUnsafe(`
    SELECT id, name, mobile_primary
    FROM ecm_contacts
    WHERE name ILIKE '%Mehrrosh%' OR name ILIKE '%Dastoor%'
    ORDER BY name
  `);
  console.log("CONTACTS", JSON.stringify(contacts, null, 2));

  const opps = await p.$queryRawUnsafe(`
    SELECT id, opportunity_number, primary_contact_id, primary_contact_name,
           lifecycle_status, COALESCE(is_deleted,false) AS is_deleted, created_at, updated_at
    FROM enterprise_opportunities
    WHERE primary_contact_name ILIKE '%Mehrrosh%'
       OR primary_contact_name ILIKE '%Dastoor%'
       OR COALESCE(lending_extension::text,'') ILIKE '%Mehrrosh%'
       OR COALESCE(lending_extension::text,'') ILIKE '%Dastoor%'
    ORDER BY opportunity_number
  `);
  console.log("OPPS", JSON.stringify(opps, null, 2));

  const deals = await p.$queryRawUnsafe(`
    SELECT id, deal_number, opportunity_id, primary_contact_name, lender_id,
           primary_counterparty_name, gross_stage, lifecycle_status,
           COALESCE(is_deleted,false) AS is_deleted, deleted_at, deleted_by, deletion_reason,
           archived, created_at, updated_at,
           left(coalesce(snapshot::text,''), 400) AS snap
    FROM enterprise_deals
    WHERE primary_contact_name ILIKE '%Mehrrosh%'
       OR primary_contact_name ILIKE '%Dastoor%'
       OR COALESCE(snapshot::text,'') ILIKE '%Mehrrosh%'
       OR COALESCE(snapshot::text,'') ILIKE '%Dastoor%'
    ORDER BY created_at
  `);
  console.log("DEALS", JSON.stringify(deals, null, 2));

  if (opps.length) {
    const oppIds = opps.map((o) => o.id);
    const allDealsForOpp = await p.$queryRawUnsafe(
      `SELECT id, deal_number, opportunity_id, lender_id, primary_counterparty_name,
              gross_stage, COALESCE(is_deleted,false) AS is_deleted, deleted_at, archived, updated_at
       FROM enterprise_deals
       WHERE opportunity_id = ANY($1::text[])
       ORDER BY created_at`,
      oppIds
    );
    console.log("ALL_DEALS_FOR_OPP", JSON.stringify(allDealsForOpp, null, 2));
  }

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
