/**
 * Temporary one-time Field Control Master history reconciliation.
 * Remove after the single Hostinger reconciliation deployment.
 *
 * Disabled unless FCM_FOUNDATION_V1_HISTORY_RECONCILE is exactly "true".
 * The only database write this script can reach is:
 * prisma migrate resolve --applied 20260926180000_field_control_master_foundation_v1
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { classifyStatus } from "./prisma-migrate-status-build-probe.mjs";

export const MIGRATION_NAME = "20260926180000_field_control_master_foundation_v1";
export const MIGRATION_RELATIVE_PATH =
  "prisma/migrations/20260926180000_field_control_master_foundation_v1/migration.sql";
export const CERTIFIED_BYTES = 3660;
export const CERTIFIED_SHA256 = "1B05A9EAE8A0AD7A0227BF2847D51A2E39DEA1F96AACCE1C11CD2F6CBB8B3E5D";
export const RESOLVE_ARGS = ["migrate", "resolve", "--applied", MIGRATION_NAME];

export function reconciliationEnabled(value) {
  return typeof value === "string" && value.trim() === "true";
}

export function artifactMatches(bytes) {
  if (!Buffer.isBuffer(bytes)) return false;
  if (bytes.length !== CERTIFIED_BYTES) return false;
  const hash = createHash("sha256").update(bytes).digest("hex").toUpperCase();
  return hash === CERTIFIED_SHA256;
}

export function decideAction(classification) {
  if (!classification || !Array.isArray(classification.pending)) return "fail";
  if (classification.kind === "UP_TO_DATE" && classification.pending.length === 0) {
    return "already_applied";
  }
  if (
    classification.kind === "OTHER_PENDING" &&
    classification.pending.length === 1 &&
    classification.pending[0] === MIGRATION_NAME
  ) {
    return "resolve";
  }
  return "fail";
}

function fail(code) {
  console.log(`RECONCILIATION_FAILED ${code}`);
  process.exit(1);
}

function readCommittedBlob(root) {
  const result = spawnSync("git", ["cat-file", "blob", `HEAD:${MIGRATION_RELATIVE_PATH}`], {
    cwd: root,
    shell: false,
    encoding: null,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout)) return null;
  return result.stdout;
}

function runMigrateStatus(root) {
  const prismaCli = resolve(root, "node_modules", "prisma", "build", "index.js");
  const migrationDir = resolve(root, "prisma", "migrations");
  if (!existsSync(prismaCli) || !existsSync(migrationDir)) {
    return { kind: "PROBE_UNAVAILABLE", pending: [] };
  }
  const migrationNames = readdirSync(migrationDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const result = spawnSync(
    process.execPath,
    [prismaCli, "migrate", "status", "--schema", "prisma/schema.prisma"],
    {
      cwd: root,
      encoding: "utf8",
      shell: false,
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (result.error || result.signal || result.status === null) {
    return { kind: "PROBE_UNAVAILABLE", pending: [] };
  }
  return classifyStatus(`${result.stdout ?? ""}\n${result.stderr ?? ""}`, result.status, migrationNames);
}

function runPostcheck(root) {
  const probe = resolve(root, "scripts", "prisma-migrate-status-build-probe.mjs");
  const result = spawnSync(process.execPath, [probe], {
    cwd: root,
    encoding: "utf8",
    shell: false,
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const text = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const upToDate = lines.includes("[prisma-status-probe] UP_TO_DATE");
  const rejected =
    lines.some((line) => line.includes("APPROVED_PENDING_ONLY")) ||
    lines.some((line) => line.startsWith("[prisma-status-probe] PENDING "));
  if (result.status !== 0 || !upToDate || rejected) fail("POSTCHECK_NOT_UP_TO_DATE");
}

function main() {
  if (!reconciliationEnabled(process.env.FCM_FOUNDATION_V1_HISTORY_RECONCILE)) {
    console.log("RECONCILIATION_DISABLED");
    process.exit(0);
  }

  const root = process.cwd();
  const committed = readCommittedBlob(root);
  if (committed && !artifactMatches(committed)) fail("HASH_MISMATCH");

  const migrationPath = resolve(root, MIGRATION_RELATIVE_PATH);
  if (!existsSync(migrationPath)) fail("HASH_MISMATCH");
  const runtime = readFileSync(migrationPath);
  if (!artifactMatches(runtime)) fail("HASH_MISMATCH");

  if (!process.env.DATABASE_URL?.trim()) fail("DATABASE_URL_ABSENT");

  const action = decideAction(runMigrateStatus(root));
  if (action === "fail") fail("NOT_EXACTLY_PENDING");
  if (action === "resolve") {
    console.log("RECONCILIATION_PRECHECK_PENDING_CONFIRMED");
    const prismaCli = resolve(root, "node_modules", "prisma", "build", "index.js");
    if (!existsSync(prismaCli)) fail("RESOLVE_FAILED");
    const resolved = spawnSync(process.execPath, [prismaCli, ...RESOLVE_ARGS], {
      cwd: root,
      encoding: "utf8",
      shell: false,
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (resolved.error || resolved.signal || resolved.status !== 0) fail("RESOLVE_FAILED");
    console.log("RECONCILIATION_APPLIED");
  } else {
    console.log("RECONCILIATION_ALREADY_APPLIED");
  }

  runPostcheck(root);
  process.exit(0);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
