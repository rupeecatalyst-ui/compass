/**
 * CO-DOC-002 — Follow-up evidence for Jain / Daga purge impact.
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
const OPP = {
  daga: "cms2vufve0005kt04ckevxu85",
  jain: "cms30bmw70003l8045fgp8fxt",
};
const CONTACT = {
  daga: "cms2vphsy0005ji04q0ikd89s",
  jain: "cmrxevs0b0001l704lyfsj88k",
};

async function main() {
  const contacts = await p.$queryRawUnsafe(
    `SELECT id, name, mobile_primary, personal_email, created_at
     FROM ecm_contacts
     WHERE id IN ($1, $2)`,
    CONTACT.daga,
    CONTACT.jain
  );
  console.log("CONTACTS", JSON.stringify(contacts, null, 2));

  const deals = await p.$queryRawUnsafe(
    `SELECT id, deal_number, opportunity_id, primary_contact_name, gross_stage, created_at
     FROM enterprise_deals
     WHERE opportunity_id IN ($1, $2) AND COALESCE(is_deleted,false)=false`,
    OPP.daga,
    OPP.jain
  );
  console.log("DEALS", JSON.stringify(deals, null, 2));

  const dealIds = deals.map((d) => d.id);
  if (dealIds.length) {
    const ddl = await p.$queryRawUnsafe(
      `SELECT * FROM enterprise_deal_document_links WHERE deal_id = ANY($1::text[]) LIMIT 50`,
      dealIds
    ).catch((e) => {
      console.log("ddl error", e.message);
      return [];
    });
    console.log("DEAL_DOCUMENT_LINKS", JSON.stringify(ddl, null, 2));
  }

  const tables = await p.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND (table_name ILIKE '%doc%' OR table_name ILIKE '%registry%')
     ORDER BY 1`
  );
  console.log(
    "DOC/REGISTRY TABLES",
    tables.map((t) => t.table_name)
  );

  // Check if migration table claims durable docs applied
  const mig = await p.$queryRawUnsafe(
    `SELECT migration_name, finished_at FROM _prisma_migrations
     WHERE migration_name ILIKE '%doc%' OR migration_name ILIKE '%transaction_document%'
     ORDER BY finished_at DESC NULLS LAST
     LIMIT 20`
  ).catch(() => []);
  console.log("DOC MIGRATIONS", JSON.stringify(mig, null, 2));

  for (const [label, id] of Object.entries(OPP)) {
    const row = await p.$queryRawUnsafe(
      `SELECT opportunity_number, primary_contact_name,
              (snapshot IS NOT NULL) AS has_snap,
              left(coalesce(snapshot::text,''), 1200) AS snap
       FROM enterprise_opportunities WHERE id = $1`,
      id
    );
    console.log(`\n=== ${label.toUpperCase()} SNAP ===`);
    console.log(JSON.stringify(row, null, 2));
  }

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
