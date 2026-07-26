/**
 * CO-ARCH-001-I6a — Tier 1 picker port swap verification CLI.
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

function loadEnv(path, override = false) {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (override || !process.env[key]) process.env[key] = val;
  }
}

loadEnv(resolve(".env"));
loadEnv(resolve(".env.local"), true);

process.env.ENTERPRISE_PERSISTENCE_MODE = process.env.ENTERPRISE_PERSISTENCE_MODE || "prisma";
process.env.ENTERPRISE_MASTERS_DUAL_READ = process.env.ENTERPRISE_MASTERS_DUAL_READ || "true";

const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (url) process.env.DATABASE_URL = url;

try {
  execSync("npx tsx scripts/co-arch-001-i6a-verify-runner.ts", {
    stdio: "inherit",
    env: process.env,
    cwd: resolve("."),
  });
} catch {
  process.exit(1);
}
