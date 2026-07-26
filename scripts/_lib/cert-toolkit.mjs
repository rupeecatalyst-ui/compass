/**
 * CO-CERT-005 — Shared Certification Toolkit helpers.
 * Never log secret values, connection strings, or env contents.
 */

import { config } from "dotenv";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

config({ path: path.join(root, ".env.local") });
config({ path: path.join(root, ".env") });

export const CERT_ROOT = root;

export const INSECURE_SECRET_DENYLIST = Object.freeze([
  "",
  "dev-secret-change-in-production",
  "dev-refresh-secret-change-in-production",
  "change-me-to-a-long-random-secret-in-production",
  "change-me-to-another-long-random-secret",
  "secret",
  "changeme",
]);

export function envValue(name) {
  return (process.env[name] ?? "").trim();
}

/**
 * Validate a secret without exposing it.
 * @returns {"PASS"|"FAIL"}
 */
export function validateSecret(name, { minLength = 32, mustDifferFrom } = {}) {
  const value = envValue(name);
  if (!value) return "FAIL";
  if (value.length < minLength) return "FAIL";
  if (INSECURE_SECRET_DENYLIST.includes(value)) return "FAIL";
  if (mustDifferFrom) {
    const other = envValue(mustDifferFrom);
    if (other && other === value) return "FAIL";
  }
  return "PASS";
}

/**
 * @returns {"PASS"|"FAIL"}
 */
export function validateExact(name, expected) {
  const value = envValue(name);
  if (!value) return "FAIL";
  return value === expected ? "PASS" : "FAIL";
}

/**
 * Validate URL-like vars exist and look like connection strings — never print.
 * @returns {"PASS"|"FAIL"}
 */
export function validateConnectionVar(name) {
  const value = envValue(name);
  if (!value) return "FAIL";
  if (INSECURE_SECRET_DENYLIST.includes(value)) return "FAIL";
  if (value.length < 12) return "FAIL";
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value) && !value.startsWith("postgres")) {
    return "FAIL";
  }
  return "PASS";
}

export function padLabel(label, width = 42) {
  return label.length >= width ? label : label + " ".repeat(width - label.length);
}

export function printGateRow(label, result) {
  console.log(`${padLabel(label)}${result}`);
}

export function printSection(title) {
  console.log("");
  console.log(title);
  console.log("-".repeat(Math.min(60, Math.max(24, title.length))));
}

export function overallFromResults(results) {
  return results.every((r) => r === "PASS") ? "PASS" : "FAIL";
}

export function exitCode(overall) {
  return overall === "PASS" ? 0 : 1;
}

/** Redact connection strings / hosts from tool output before display. */
export function redactSensitiveOutput(text) {
  return String(text || "")
    .replace(/postgres(ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/Datasource "db":[^\n]*/g, 'Datasource "db": [REDACTED]')
    .replace(/at [a-z0-9.-]+\.(supabase|amazonaws|vercel|neon)\.[a-z.:0-9]+/gi, "at [REDACTED_HOST]");
}

export function listMigrationFolders() {
  const dir = path.join(root, "prisma", "migrations");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name !== "migration_lock.toml")
    .filter((name) => existsSync(path.join(dir, name, "migration.sql")))
    .sort();
}

export function readEnvFileKey(filePath, key) {
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
