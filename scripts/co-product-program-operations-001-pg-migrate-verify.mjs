/**
 * Isolated BAT migration checksum / history verification.
 * Never prints DATABASE_URL or passwords.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const secret = JSON.parse(readFileSync(join(root, ".tmp/ppo-bat.secret.json"), "utf8"));
const HOST = "127.0.0.1";
const CLEAN_DB = "catalyst_one_product_program_bat_clean_002";
const url = `postgresql://${encodeURIComponent(secret.user)}:${encodeURIComponent(secret.password)}@${HOST}:${secret.port}/${CLEAN_DB}?schema=public`;

function sha256File(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

const names = [
  "20260906180000_co_product_program_operations_001",
  "20260906184500_co_product_program_operations_001_strict_publication",
  "20260906190000_co_product_program_operations_001_drop_legacy_program_code_unique",
];
const files = names.map((name) => ({
  name,
  file: join(root, "prisma/migrations", name, "migration.sql"),
  checksum: sha256File(join(root, "prisma/migrations", name, "migration.sql")),
}));

const isolatedMod = await import(pathToFileURL(join(root, ".tmp/generated/prisma-client/index.js")).href);
const prisma = new isolatedMod.PrismaClient({ datasources: { db: { url } } });
const rows = await prisma.$queryRawUnsafe(
  `SELECT migration_name, checksum, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back
   FROM "_prisma_migrations"
   WHERE migration_name LIKE '20260906%'
   ORDER BY started_at`,
);
await prisma.$disconnect();

const history = Array.isArray(rows) ? rows : [];
const missing = files.filter((file) => !history.some((row) => row.migration_name === file.name));
const unfinished = history.filter((row) => !row.finished || row.rolled_back);
if (missing.length || unfinished.length) {
  throw new Error(`Migration history incomplete missing=${missing.map((f) => f.name).join(",")} unfinished=${unfinished.map((r) => r.migration_name).join(",")}`);
}

console.log(JSON.stringify({
  ok: true,
  host: HOST,
  database: CLEAN_DB,
  files: files.map((f) => ({ name: f.name, sha256: f.checksum })),
  applied: history.map((row) => ({ name: row.migration_name, finished: row.finished, rolledBack: row.rolled_back })),
}));
