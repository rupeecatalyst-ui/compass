/**
 * Create one new UTF-8 database on the existing 127.0.0.1 BAT cluster.
 * Does not drop or alter existing BAT databases. Never prints passwords.
 *
 * Usage: node scripts/co-product-program-operations-001-pg-create-db.mjs --database <name>
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const secret = JSON.parse(readFileSync(join(root, ".tmp/ppo-bat.secret.json"), "utf8"));
const dbIdx = process.argv.indexOf("--database");
const database = dbIdx >= 0 ? process.argv[dbIdx + 1] : null;
if (!database || !/^[a-z0-9_]+$/.test(database)) {
  throw new Error("Required: --database <lowercase_name>.");
}

const PRESERVED = new Set([
  "catalyst_one_product_program_bat_001",
  "catalyst_one_product_program_bat_pre_001",
  "catalyst_one_product_program_bat_clean_002",
  "ppo_sql_preflight_review_001",
  "postgres",
  "template0",
  "template1",
]);
if (PRESERVED.has(database)) {
  throw new Error(`Refusing to create or replace preserved database ${database}.`);
}

const HOST = "127.0.0.1";
const { Client } = createRequire(join(root, ".tmp/pg-embed/node_modules/pg/package.json"))("pg");
const admin = new Client({
  host: HOST,
  port: secret.port,
  user: secret.user,
  password: secret.password,
  database: "postgres",
});
await admin.connect();
try {
  const existing = await admin.query("SELECT datname FROM pg_database WHERE datname = $1", [database]);
  if (existing.rowCount > 0) {
    throw new Error(`Database ${database} already exists. Not dropping it.`);
  }
  await admin.query(
    `CREATE DATABASE ${database}
     WITH ENCODING = 'UTF8'
     LC_COLLATE = 'C'
     LC_CTYPE = 'C'
     TEMPLATE = template0`,
  );
  const enc = await admin.query(
    `SELECT d.datname,
            pg_encoding_to_char(d.encoding) AS enc,
            r.rolname AS owner
     FROM pg_database d
     JOIN pg_roles r ON r.oid = d.datdba
     WHERE d.datname = $1`,
    [database],
  );
  console.log(
    JSON.stringify({
      ok: true,
      host: HOST,
      port: secret.port,
      database: enc.rows[0]?.datname,
      encoding: enc.rows[0]?.enc,
      owner: enc.rows[0]?.owner,
      preservedUntouched: [...PRESERVED],
    }),
  );
} finally {
  await admin.end();
}
