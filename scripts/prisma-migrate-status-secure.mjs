/**
 * Secure Prisma migrate status (credential values never printed).
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
  console.error("FAIL: DATABASE_URL / DIRECT_URL missing (values not logged)");
  process.exit(1);
}

const prismaCli = resolve(root, "node_modules", "prisma", "build", "index.js");
const result = spawnSync(process.execPath, [prismaCli, "migrate", "status"], {
  cwd: root,
  env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: directUrl },
  stdio: "inherit",
  shell: false,
});
process.exit(result.status ?? 1);
