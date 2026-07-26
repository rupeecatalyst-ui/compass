/**
 * Secure Prisma migrate deploy runner (CO-ARCH-003 Phase 2A).
 * - Reads ONLY DATABASE_URL and DIRECT_URL from .env.local (or .env)
 * - Never prints, logs, or echoes credential values
 * - Does not load the full env file into the parent process beyond those two keys
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

function readEnvKey(filePath, key) {
  if (!existsSync(filePath)) return null;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq).trim() !== key) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    return val;
  }
  return null;
}

const root = process.cwd();
const envLocal = resolve(root, ".env.local");
const envDefault = resolve(root, ".env");

const databaseUrl =
  readEnvKey(envLocal, "DATABASE_URL") || readEnvKey(envDefault, "DATABASE_URL");
const directUrl =
  readEnvKey(envLocal, "DIRECT_URL") ||
  readEnvKey(envDefault, "DIRECT_URL") ||
  databaseUrl;

if (!databaseUrl || !directUrl) {
  console.error(
    "FAIL: DATABASE_URL and/or DIRECT_URL not found in .env.local/.env (values not logged)",
  );
  process.exit(1);
}

console.log("Starting prisma migrate deploy (credential values suppressed)…");

const prismaCli = resolve(root, "node_modules", "prisma", "build", "index.js");
const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
  cwd: root,
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: directUrl,
  },
  stdio: "inherit",
  shell: false,
});

if (result.error) {
  console.error("FAIL: could not start prisma:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
