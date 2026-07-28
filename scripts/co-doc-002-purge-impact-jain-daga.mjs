/**
 * CO-DOC-002 — Compare Priyesh Jain vs Sandeep Daga document purge / durable store impact.
 */
import { readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
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

async function tableExists(name) {
  const rows = await p.$queryRawUnsafe(
    `SELECT 1 AS ok FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    name
  );
  return rows.length > 0;
}

async function main() {
  // ECM contacts — name fields are typically first_name / last_name / display_name
  const contacts = await p.$queryRawUnsafe(`
    SELECT id, display_name, first_name, last_name, mobile_primary, email_primary, created_at
    FROM ecm_contacts
    WHERE COALESCE(display_name,'') ILIKE '%Priyesh%Jain%'
       OR COALESCE(display_name,'') ILIKE '%Sandeep%Daga%'
       OR (COALESCE(first_name,'') ILIKE '%Priyesh%' AND COALESCE(last_name,'') ILIKE '%Jain%')
       OR (COALESCE(first_name,'') ILIKE '%Sandeep%' AND COALESCE(last_name,'') ILIKE '%Daga%')
       OR COALESCE(display_name,'') ILIKE '%Priyesh%'
       OR COALESCE(display_name,'') ILIKE '%Daga%'
    ORDER BY display_name NULLS LAST
    LIMIT 40
  `).catch(async (e) => {
    console.error("contacts query failed", e.message);
    const cols = await p.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='ecm_contacts' ORDER BY ordinal_position`
    );
    console.log("ECM COLS", cols.map((c) => c.column_name).join(", "));
    return [];
  });
  console.log("\n=== CONTACTS ===");
  console.log(JSON.stringify(contacts, null, 2));

  const contactIds = contacts.map((c) => c.id).filter(Boolean);

  const opps = await p.$queryRawUnsafe(`
    SELECT id, opportunity_number, primary_contact_id, primary_contact_name,
           lifecycle_status, created_at, updated_at
    FROM enterprise_opportunities
    WHERE COALESCE(is_deleted, false) = false
      AND (
        opportunity_number = 'OPP-2026-000043'
        OR COALESCE(primary_contact_name,'') ILIKE '%Priyesh%'
        OR COALESCE(primary_contact_name,'') ILIKE '%Sandeep%Daga%'
        OR COALESCE(primary_contact_name,'') ILIKE '%Daga%'
        OR COALESCE(lending_extension::text,'') ILIKE '%Daga%'
        OR COALESCE(lending_extension::text,'') ILIKE '%Priyesh%'
        ${contactIds.length ? `OR primary_contact_id IN (${contactIds.map((_, i) => `$${i + 1}`).join(",")})` : ""}
      )
    ORDER BY opportunity_number
  `, ...contactIds).catch(async (e) => {
    console.error("opp query failed", e.message);
    return [];
  });
  console.log("\n=== OPPORTUNITIES ===");
  console.log(JSON.stringify(opps, null, 2));

  const hasDocs = await tableExists("enterprise_transaction_documents");
  console.log("\nenterprise_transaction_documents exists:", hasDocs);

  if (hasDocs) {
    const oppIds = opps.map((o) => o.id);
    const docsByOpp = oppIds.length
      ? await p.$queryRawUnsafe(
          `SELECT id, opportunity_id, opportunity_number, contact_id, display_name, type_ref,
                  original_filename, file_size_bytes, status, upload_source, created_at,
                  (content_bytes IS NOT NULL) AS has_content
           FROM enterprise_transaction_documents
           WHERE opportunity_id IN (${oppIds.map((_, i) => `$${i + 1}`).join(",")})
           ORDER BY created_at`,
          ...oppIds
        ).catch((e) => {
          console.error("docs by opp failed", e.message);
          return [];
        })
      : [];
    console.log("\n=== SERVER DOCS FOR MATCHED OPPS ===");
    console.log(JSON.stringify(docsByOpp, null, 2));

    const count = await p.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS n FROM enterprise_transaction_documents`
    );
    console.log("TOTAL SERVER DOCS", count);

    const recent = await p.$queryRawUnsafe(`
      SELECT id, opportunity_id, opportunity_number, contact_id, display_name, type_ref,
             original_filename, created_at, (content_bytes IS NOT NULL) AS has_content
      FROM enterprise_transaction_documents
      ORDER BY created_at DESC
      LIMIT 30
    `);
    console.log("\n=== RECENT SERVER DOCS (any) ===");
    console.log(JSON.stringify(recent, null, 2));
  }

  // Snapshot / lending participants for matched opps
  for (const o of opps) {
    const detail = await p.$queryRawUnsafe(
      `SELECT opportunity_number, primary_contact_id, primary_contact_name,
              left(coalesce(lending_extension::text,''), 500) AS lending_snip
       FROM enterprise_opportunities WHERE id = $1`,
      o.id
    );
    console.log("\n=== OPP DETAIL", o.opportunity_number, "===");
    console.log(JSON.stringify(detail, null, 2));
  }

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
