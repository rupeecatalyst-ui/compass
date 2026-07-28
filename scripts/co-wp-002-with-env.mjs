/**
 * Load .env.local then run: node scripts/co-wp-002-with-env.mjs <cmd...>
 * Example: node scripts/co-wp-002-with-env.mjs npx prisma migrate status
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const envFile = existsSync(".env.local") ? ".env.local" : ".env";
const text = readFileSync(resolve(process.cwd(), envFile), "utf8");
for (const line of text.split(/\r?\n/)) {
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

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node scripts/co-wp-002-with-env.mjs <command...>");
  process.exit(1);
}

const result = spawnSync(args[0], args.slice(1), {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
process.exit(result.status ?? 1);
