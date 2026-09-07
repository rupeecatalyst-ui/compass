/**
 * Apply Prisma migrations to an explicit isolated BAT database only.
 * Never prints passwords. Never writes _prisma_migrations. Never uses production URLs.
 *
 * Usage:
 *   node scripts/co-product-program-operations-001-pg-migrate.mjs --database <name>
 *   node scripts/co-product-program-operations-001-pg-migrate.mjs --database <name> --history
 */
import { spawn } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PARENT_NM = "C:\\Compass by Rupee Catalyst (3)\\node_modules";
const secret = JSON.parse(readFileSync(join(root, ".tmp/ppo-bat.secret.json"), "utf8"));
if (!secret?.password || !secret?.port || !secret?.user) {
  throw new Error("BAT secret file incomplete. Start the isolated cluster first.");
}

const dbIdx = process.argv.indexOf("--database");
const database = dbIdx >= 0 ? process.argv[dbIdx + 1] : null;
if (!database || database.startsWith("-")) {
  throw new Error("Required: --database <name>. Refusing to default to a tainted BAT database.");
}

const FORBIDDEN = new Set([
  "catalyst_one_product_program_bat_001",
  "catalyst_one_product_program_bat_pre_001",
]);
if (FORBIDDEN.has(database)) {
  throw new Error(`Refusing to migrate preserved evidence database ${database}.`);
}

const HOST = "127.0.0.1";
const historyOnly = process.argv.includes("--history");

function urlFor(db) {
  return `postgresql://${encodeURIComponent(secret.user)}:${encodeURIComponent(secret.password)}@${HOST}:${secret.port}/${db}?schema=public`;
}

function redact(text) {
  return String(text)
    .replace(/postgresql:\/\/[^@\s]+@/g, "postgresql://***@")
    .replace(/password[=:]\s*\S+/gi, "password=***");
}

const { Client } = createRequire(join(root, ".tmp/pg-embed/node_modules/pg/package.json"))("pg");

function diskMigrations() {
  return readdirSync(join(root, "prisma/migrations"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{14}_/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

async function withClient(db, fn) {
  const client = new Client({ connectionString: urlFor(db) });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function assertUtf8(db) {
  await withClient(db, async (client) => {
    const r = await client.query(
      `SELECT current_database() AS datname, pg_encoding_to_char(encoding) AS enc
       FROM pg_database WHERE datname = current_database()`,
    );
    const enc = r.rows[0]?.enc;
    const datname = r.rows[0]?.datname;
    console.log(JSON.stringify({ host: HOST, port: secret.port, database: datname, encoding: enc }));
    if (enc !== "UTF8") {
      throw new Error(`Isolated database encoding is ${enc}; UTF8 is required before migrate deploy.`);
    }
  });
}

async function proveCleanHistory(db) {
  const onDisk = diskMigrations();
  return withClient(db, async (client) => {
    const r = await client.query(`
      SELECT
        migration_name,
        started_at,
        finished_at IS NOT NULL AS finished,
        rolled_back_at IS NOT NULL AS rolled_back,
        (logs IS NOT NULL AND logs <> '') AS has_logs
      FROM "_prisma_migrations"
      ORDER BY started_at, migration_name
    `);
    const names = r.rows.map((row) => row.migration_name);
    const unfinished = r.rows.filter((row) => row.finished !== true).map((row) => row.migration_name);
    const rolledBack = r.rows.filter((row) => row.rolled_back === true).map((row) => row.migration_name);
    const extra = names.filter((name) => !onDisk.includes(name));
    const missing = onDisk.filter((name) => !names.includes(name));
    const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
    const report = {
      database: db,
      diskCount: onDisk.length,
      catalogueCount: r.rows.length,
      unfinished,
      rolledBack,
      extraInCatalogue: extra,
      missingFromCatalogue: missing,
      duplicates,
      lastApplied: names.at(-1) ?? null,
    };
    console.log(JSON.stringify(report, null, 2));
    if (
      unfinished.length ||
      rolledBack.length ||
      extra.length ||
      missing.length ||
      duplicates.length ||
      r.rows.length !== onDisk.length
    ) {
      throw new Error("Prisma migration catalogue is not clean.");
    }
    return report;
  });
}

function runPrisma(args, db) {
  if (args.includes("resolve") || args.some((arg) => String(arg).includes("_prisma_migrations"))) {
    throw new Error("migrate resolve and catalogue manipulation are forbidden.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(PARENT_NM, "prisma/build/index.js"), ...args], {
      cwd: root,
      env: {
        ...process.env,
        NODE_PATH: PARENT_NM,
        DATABASE_URL: urlFor(db),
        DIRECT_URL: urlFor(db),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => process.stdout.write(redact(chunk)));
    child.stderr.on("data", (chunk) => process.stderr.write(redact(chunk)));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`prisma ${args.join(" ")} exited ${code}`));
    });
  });
}

await assertUtf8(database);
if (historyOnly) {
  await proveCleanHistory(database);
  console.log(JSON.stringify({ ok: true, database, action: "history" }));
} else {
  console.log(`migrate_target=${database} host=${HOST} port=${secret.port} (password not printed)`);
  await runPrisma(["migrate", "deploy"], database);
  await proveCleanHistory(database);
  console.log(JSON.stringify({ ok: true, database, action: "migrate deploy" }));
}
