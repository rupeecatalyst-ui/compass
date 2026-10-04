/**
 * CO-MARKETING-REDESIGN-023 — Aggregate runner spawn safety (DEP0190).
 * Proves the shell-true spawn option is absent and command arguments cannot come from
 * Sheet, campaign, env, or user data.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MARKETING_PRESTAGING_GATE_SCRIPTS,
  MARKETING_PRESTAGING_GATES,
  marketingNodeExecutable,
} from "./lib/marketing-safe-spawn.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function stripSelfAssertions(src) {
  return src
    .replaceAll("must not use a shell true spawn option", "")
    .replaceAll("shell true spawn option remains", "");
}

function hasShellTrueOption(src) {
  return /shell\s*:\s*true\b/.test(stripSelfAssertions(src));
}

const AGGREGATE_RUNNERS = [
  "scripts/lib/marketing-safe-spawn.mjs",
  "scripts/co-marketing-redesign-pre-staging-gates.mjs",
  "scripts/co-marketing-redesign-safe-next-build.mjs",
  "scripts/co-marketing-redesign-022-postgres-runtime-verify.mjs",
  "scripts/marketing-visual-harness/capture.mjs",
  "scripts/marketing-visual-harness/capture-bat.mjs",
  "scripts/co-marketing-redesign-bat-001.mjs",
];

const SPAWN_CONCAT = new RegExp("spawnSync\\([^)]*\\+");
const EXEC_CONCAT = new RegExp("exec(?:Sync|FileSync)?\\([^)]*\\+");

for (const rel of AGGREGATE_RUNNERS) {
  const src = read(rel);
  assert.equal(hasShellTrueOption(src), false, `${rel} must not use a shell true spawn option`);
  assert.doesNotMatch(src, SPAWN_CONCAT, `${rel} must not concatenate spawn command strings`);
  assert.doesNotMatch(src, EXEC_CONCAT, `${rel} must not introduce concatenated shell execution`);
}

const helper = read("scripts/lib/marketing-safe-spawn.mjs");
assert.match(helper, /shell:\s*false/);
assert.match(helper, /windowsHide:\s*true/);
assert.match(helper, /spawnSync\(process\.execPath,/);
assert.match(helper, /MARKETING_PRESTAGING_GATE_SCRIPTS/);
assert.match(helper, /assertAllowlistedMarketingNpmScript/);
assert.match(helper, /nodeArgs/);
assert.doesNotMatch(helper, /process\.env\.[A-Z0-9_]+.*spawnSync/);
assert.doesNotMatch(helper, /campaignId|normalizedEmail|spreadsheetId/);
assert.doesNotMatch(helper, /shell:\s*true/);

const preStaging = read("scripts/co-marketing-redesign-pre-staging-gates.mjs");
assert.match(preStaging, /runAllowlistedMarketingNpmScript/);
assert.doesNotMatch(preStaging, /spawnSync\(/);
assert.equal(hasShellTrueOption(preStaging), false);

const safeBuild = read("scripts/co-marketing-redesign-safe-next-build.mjs");
assert.match(safeBuild, /spawnSync\(process\.execPath,/);
assert.match(safeBuild, /nextBin, "build"\]/);

const postgres = read("scripts/co-marketing-redesign-022-postgres-runtime-verify.mjs");
assert.match(postgres, /spawnSync\(name, \["--version"\]/);

const capture = read("scripts/marketing-visual-harness/capture.mjs");
assert.match(capture, /spawnSync\(process\.execPath,/);

assert.ok(MARKETING_PRESTAGING_GATE_SCRIPTS.length >= 30);
assert.ok(MARKETING_PRESTAGING_GATE_SCRIPTS.every((name) => /^verify:co-marketing-/.test(name)));
assert.equal(
  new Set(MARKETING_PRESTAGING_GATE_SCRIPTS).size,
  MARKETING_PRESTAGING_GATE_SCRIPTS.length,
);
assert.equal(MARKETING_PRESTAGING_GATES.length, MARKETING_PRESTAGING_GATE_SCRIPTS.length);
for (const gate of MARKETING_PRESTAGING_GATES) {
  assert.ok(Array.isArray(gate.nodeArgs));
  assert.ok(gate.nodeArgs.every((arg) => typeof arg === "string"));
  assert.ok(gate.nodeArgs.every((arg) => arg === "--import" || arg === "tsx" || arg.startsWith("scripts/co-marketing-")));
}

const exe = marketingNodeExecutable();
assert.equal(exe, process.execPath);

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".next") continue;
      walk(abs, acc);
    } else if (/\.(mjs|js)$/.test(entry.name)) acc.push(abs);
  }
  return acc;
}

const marketingScripts = walk(join(root, "scripts")).filter((abs) => {
  const rel = abs.replaceAll("\\", "/");
  if (rel.includes("022-consolidate-migrations")) return false;
  if (rel.includes("023-spawn-safety-verify")) return false;
  return /co-marketing-redesign-(pre-staging|safe-next|bat-001)|marketing-visual-harness\/capture|marketing-safe-spawn/.test(
    rel,
  );
});
for (const abs of marketingScripts) {
  const src = readFileSync(abs, "utf8");
  const rel = abs.slice(root.length + 1).replaceAll("\\", "/");
  if (hasShellTrueOption(src)) {
    throw new Error(`shell true spawn option remains in Marketing runner ${rel}`);
  }
  assert.doesNotMatch(
    src,
    /spawnSync\(\s*[`'"].*\$\{/,
    `${rel} must not interpolate values into a spawn command string`,
  );
}

console.log(
  JSON.stringify(
    {
      ok: true,
      shellTrueAbsent: true,
      commandArgsAreArrays: true,
      allowlistedStaticScripts: MARKETING_PRESTAGING_GATE_SCRIPTS.length,
      nodeExecutable: exe,
      campaignRecipientSheetCannotBecomeArgv: true,
    },
    null,
    2,
  ),
);
console.log("CO-MARKETING-REDESIGN-023 spawn safety PASS");
