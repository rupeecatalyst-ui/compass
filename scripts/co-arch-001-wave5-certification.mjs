/**
 * CO-ARCH-001 Wave 5 — Certification & Dry Run harness.
 * Executes infrastructure verifies, flag parity, and rollback drills.
 * Does not mutate production feature flags permanently.
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
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

const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (url) process.env.DATABASE_URL = url;
process.env.ENTERPRISE_PERSISTENCE_MODE = process.env.ENTERPRISE_PERSISTENCE_MODE || "prisma";
process.env.ENTERPRISE_MASTERS_DUAL_READ = process.env.ENTERPRISE_MASTERS_DUAL_READ || "true";

const VERIFY_SCRIPTS = [
  "scripts/co-arch-001-i1-verify.mjs",
  "scripts/co-arch-001-i2-verify.mjs",
  "scripts/co-arch-001-i3-verify.mjs",
  "scripts/co-arch-001-i4a-verify.mjs",
  "scripts/co-arch-001-i4b-verify.mjs",
  "scripts/co-arch-001-i4c-verify.mjs",
  "scripts/co-arch-001-i5a-verify.mjs",
  "scripts/co-arch-001-i5b-verify.mjs",
  "scripts/co-arch-001-i6a-verify.mjs",
  "scripts/co-arch-001-i6b-verify.mjs",
  "scripts/co-arch-001-wave4-seed-verify.mjs",
];

const results = [];

function pass(label, detail = "") {
  results.push({ ok: true, label, detail });
  console.log(`  OK  ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label, detail = "") {
  results.push({ ok: false, label, detail });
  console.error(` FAIL ${label}${detail ? ` — ${detail}` : ""}`);
}

function runScript(script) {
  const started = Date.now();
  try {
    execSync(`node ${script}`, {
      stdio: "pipe",
      env: process.env,
      cwd: resolve("."),
      encoding: "utf8",
    });
    pass(script, `${Date.now() - started}ms`);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message.slice(0, 200) : "failed";
    fail(script, msg);
    return false;
  }
}

try {
  execSync("npx tsx scripts/co-arch-001-wave5-parity-runner.ts", {
    stdio: "inherit",
    env: process.env,
    cwd: resolve("."),
  });
  pass("Wave 5 parity + rollback runner");
} catch {
  fail("Wave 5 parity + rollback runner");
}

console.log("\n=== CO-ARCH-001 Wave 5 — Full Verify Suite ===\n");
for (const script of VERIFY_SCRIPTS) {
  if (!existsSync(resolve(script))) {
    fail(script, "missing");
    continue;
  }
  runScript(script);
}

const failed = results.filter((r) => !r.ok);
const summary = {
  date: new Date().toISOString(),
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  results,
};

const outDir = resolve("docs/co-arch-001");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  resolve(outDir, "WAVE5-CERTIFICATION-EVIDENCE.json"),
  JSON.stringify(summary, null, 2),
  "utf8",
);

console.log(`\n=== Wave 5 Harness Summary: ${summary.passed}/${summary.total} passed ===\n`);
console.log(`Evidence written: docs/co-arch-001/WAVE5-CERTIFICATION-EVIDENCE.json\n`);
process.exit(failed.length ? 1 : 0);
