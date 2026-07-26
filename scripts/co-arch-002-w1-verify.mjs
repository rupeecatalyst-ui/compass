/**
 * CO-ARCH-002-W1 — verify Deal Registry tables + flags OFF (no UI).
 * Uses DIRECT_URL (or DATABASE_URL). Does not enable feature flags.
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
  "enterprise_deal_number_sequences",
  "enterprise_deals",
  "enterprise_deal_snapshots",
  "enterprise_deal_timeline_events",
  "enterprise_deal_participants",
  "enterprise_deal_counterparty_assignments",
  "enterprise_deal_document_links",
  "enterprise_deal_tasks",
  "enterprise_deal_activities",
  "enterprise_deal_notes",
  "enterprise_deal_assignments",
  "enterprise_deal_commercial_versions",
  "enterprise_deal_commission_links",
  "enterprise_deal_accounting_links",
  "enterprise_deal_notification_links",
  "enterprise_deal_intelligence_links",
  "enterprise_deal_workflow_bindings",
  "enterprise_deal_import_batches",
];

const REQUIRED_DEAL_COLUMNS = [
  "snapshot",
  "health_score",
  "health_band",
  "health_computed_at",
  "health_payload",
];

const FLAG_KEYS = [
  "DEAL_REGISTRY_DUAL_WRITE",
  "DEAL_REGISTRY_PORT_RUNTIME",
  "DEAL_REGISTRY_IMPORT_ENABLED",
  "DEAL_REGISTRY_BLOCK_LOCAL_WRITE",
];

function flagOn(name) {
  const raw = process.env[name];
  return raw === "true" || raw === "1";
}

async function main() {
  let failed = false;

  for (const key of FLAG_KEYS) {
    if (flagOn(key)) {
      console.error(`FAIL: ${key} must be OFF for Wave 1 (got enabled)`);
      failed = true;
    } else {
      console.log(`OK: ${key} OFF`);
    }
  }

  const tables = await prisma.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    REQUIRED_TABLES,
  );
  const present = new Set(tables.map((r) => r.table_name));
  for (const t of REQUIRED_TABLES) {
    if (present.has(t)) console.log(`OK: table ${t}`);
    else {
      console.error(`FAIL: missing table ${t}`);
      failed = true;
    }
  }

  const cols = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'enterprise_deals'
       AND column_name = ANY($1::text[])`,
    REQUIRED_DEAL_COLUMNS,
  );
  const colSet = new Set(cols.map((r) => r.column_name));
  for (const c of REQUIRED_DEAL_COLUMNS) {
    if (colSet.has(c)) console.log(`OK: enterprise_deals.${c}`);
    else {
      console.error(`FAIL: missing column enterprise_deals.${c}`);
      failed = true;
    }
  }

  const timelineSoft = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'enterprise_deal_timeline_events'
       AND column_name IN ('is_deleted', 'deleted_at', 'updated_at')`,
  );
  if (timelineSoft.length === 0) {
    console.log("OK: timeline has no soft-delete/update columns (append-only shape)");
  } else {
    console.error(
      "FAIL: timeline must not have soft-delete/update columns:",
      timelineSoft.map((r) => r.column_name).join(", "),
    );
    failed = true;
  }

  const partial = await prisma.$queryRawUnsafe(
    `SELECT indexname FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = 'edeal_cp_one_primary_uidx'`,
  );
  if (partial.length === 1) console.log("OK: partial unique edeal_cp_one_primary_uidx");
  else {
    console.error("FAIL: missing partial unique index edeal_cp_one_primary_uidx");
    failed = true;
  }

  if (failed) {
    console.error("\nCO-ARCH-002-W1 VERIFY FAILED");
    process.exit(1);
  }
  console.log("\nCO-ARCH-002-W1 VERIFY PASSED (engine idle; flags OFF)");
}

main()
  .catch((err) => {
    console.error("FAIL:", err?.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
