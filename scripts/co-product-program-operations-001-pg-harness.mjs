/**
 * Disposable local PostgreSQL for Product Programme BAT.
 * Binds 127.0.0.1 only. Never prints passwords. Never uses production DATABASE_URL.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sidecarEntry = join(root, ".tmp/pg-embed/node_modules/embedded-postgres/dist/index.js");
const dataDir = join(root, ".tmp/pg-cluster-ppo-bat-utf8");
const secretFile = join(root, ".tmp/ppo-bat.secret.json");
const PORT = 55434;
const USER = "ppo_bat";
const CLEAN_DB = "catalyst_one_product_program_bat_001";
const PRE_DB = "catalyst_one_product_program_bat_pre_001";

export function readBatSecret() {
  if (!existsSync(secretFile)) return null;
  return JSON.parse(readFileSync(secretFile, "utf8"));
}

export function batUrl(database) {
  const secret = readBatSecret();
  if (!secret?.password) throw new Error("BAT secret file missing. Start the isolated cluster first.");
  const password = encodeURIComponent(secret.password);
  return `postgresql://${USER}:${password}@127.0.0.1:${PORT}/${database}?schema=public`;
}

export async function startIsolatedPostgres() {
  if (!existsSync(sidecarEntry)) {
    throw new Error(`embedded-postgres sidecar missing at ${sidecarEntry}`);
  }
  const { default: EmbeddedPostgres } = await import(pathToFileURL(sidecarEntry).href);
  mkdirSync(join(root, ".tmp"), { recursive: true });
  const existing = existsSync(secretFile) ? JSON.parse(readFileSync(secretFile, "utf8")) : null;
  const password = typeof existing?.password === "string" && existing.password.length > 0
    ? existing.password
    : randomBytes(24).toString("base64url");
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: USER,
    password,
    port: PORT,
    persistent: true,
    authMethod: "scram-sha-256",
    postgresFlags: ["-h", "127.0.0.1"],
    initdbFlags: ["--encoding=UTF8", "--lc-collate=C", "--lc-ctype=C"],
    onLog: (message) => {
      const text = String(message);
      if (/password|secret/i.test(text)) return;
      process.stdout.write(`[pg] ${text}`);
    },
    onError: (err) => {
      const text = err instanceof Error ? err.message : String(err);
      if (/password|secret/i.test(text)) return;
      console.error("[pg:error]", text);
    },
  });
  if (!existsSync(join(dataDir, "PG_VERSION"))) {
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase(CLEAN_DB);
  } catch {
    /* already exists on restart */
  }
  try {
    await pg.createDatabase(PRE_DB);
  } catch {
    /* already exists on restart */
  }
  writeFileSync(
    secretFile,
    `${JSON.stringify({ user: USER, port: PORT, cleanDb: CLEAN_DB, preDb: PRE_DB, password }, null, 2)}\n`,
    { encoding: "utf8" },
  );
  return { pg, port: PORT, user: USER, cleanDb: CLEAN_DB, preDb: PRE_DB };
}

const isMain = process.argv[1]?.replaceAll("\\", "/").endsWith("co-product-program-operations-001-pg-harness.mjs");
if (isMain) {
  const { pg } = await startIsolatedPostgres();
  const client = pg.getPgClient("postgres", "127.0.0.1");
  await client.connect();
  const ping = await client.query("SELECT current_database() AS db, inet_server_addr() AS addr, inet_server_port() AS port");
  await client.end();
  console.log(
    JSON.stringify(
      {
        ok: true,
        bound: "127.0.0.1",
        port: PORT,
        cleanDb: CLEAN_DB,
        preDb: PRE_DB,
        serverAddr: ping.rows[0]?.addr ?? null,
        serverPort: ping.rows[0]?.port ?? null,
        passwordPrinted: false,
        keep: process.argv.includes("--keep"),
      },
      null,
      2,
    ),
  );
  if (!process.argv.includes("--keep")) {
    await pg.stop();
  } else {
    console.log("Isolated PostgreSQL kept running for BAT. Stop with the harness stop command.");
    await new Promise(() => {});
  }
}
