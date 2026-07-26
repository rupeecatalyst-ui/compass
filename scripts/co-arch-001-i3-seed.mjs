/**
 * CO-ARCH-001-I3 — Reference Master seed CLI wrapper.
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);

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

const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("FAIL: DATABASE_URL / DIRECT_URL missing");
  process.exit(2);
}

try {
  execSync("npx tsx scripts/co-arch-001-i3-seed-runner.ts", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
    cwd: resolve("."),
  });
} catch {
  process.exit(1);
}
