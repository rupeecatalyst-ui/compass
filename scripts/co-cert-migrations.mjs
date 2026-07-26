#!/usr/bin/env node
/**
 * CO-CERT-005 — Script 4: Migration / Database Certification
 * Captures Prisma migrate status; redacts datasource URLs before any display.
 *
 * Usage: node scripts/co-cert-migrations.mjs
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  CERT_ROOT,
  exitCode,
  listMigrationFolders,
  printGateRow,
  printSection,
  readEnvFileKey,
  redactSensitiveOutput,
  validateConnectionVar,
} from "./_lib/cert-toolkit.mjs";

printSection("Database Migration Certification");

const dbOk = validateConnectionVar("DATABASE_URL");
const directOk = validateConnectionVar("DIRECT_URL");
printGateRow("DATABASE_URL configured", dbOk);
printGateRow("DIRECT_URL configured", directOk);

if (dbOk === "FAIL" || directOk === "FAIL") {
  printSection("Overall Result");
  console.log("FAIL");
  process.exit(1);
}

const envLocal = path.join(CERT_ROOT, ".env.local");
const envDefault = path.join(CERT_ROOT, ".env");
const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  readEnvFileKey(envLocal, "DATABASE_URL") ||
  readEnvFileKey(envDefault, "DATABASE_URL");
const directUrl =
  process.env.DIRECT_URL?.trim() ||
  readEnvFileKey(envLocal, "DIRECT_URL") ||
  readEnvFileKey(envDefault, "DIRECT_URL") ||
  databaseUrl;

const onDisk = listMigrationFolders();
printGateRow("Migration folders on disk", String(onDisk.length));

const prismaCli = path.join(CERT_ROOT, "node_modules", "prisma", "build", "index.js");
const result = spawnSync(process.execPath, [prismaCli, "migrate", "status"], {
  cwd: CERT_ROOT,
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: directUrl,
  },
  encoding: "utf8",
  shell: false,
});

const combined = `${result.stdout || ""}\n${result.stderr || ""}`;
const safe = redactSensitiveOutput(combined);
const upToDate = /Database schema is up to date/i.test(combined);
const pendingMatch = combined.match(/(\d+)\s+migration[s]?\s+have not yet been applied/i);
const pendingCount = pendingMatch ? Number(pendingMatch[1]) : 0;
const foundMatch = combined.match(/(\d+)\s+migrations?\s+found in prisma\/migrations/i);
const foundCount = foundMatch ? Number(foundMatch[1]) : onDisk.length;

printGateRow("Migrations found (Prisma)", String(foundCount));
printGateRow("Pending migrations", pendingCount === 0 ? "0" : String(pendingCount));
printGateRow("Schema up to date", upToDate ? "PASS" : "FAIL");
printGateRow("Prisma migrate status exit", result.status === 0 ? "PASS" : "FAIL");

// Show only redacted, non-secret status lines (optional audit trail)
const useful = safe
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(
    (l) =>
      l &&
      !l.startsWith("warn ") &&
      (l.includes("migrations") ||
        l.includes("up to date") ||
        l.includes("have not yet been applied") ||
        l.includes("Following migration") ||
        l.startsWith("FAIL")),
  );
if (useful.length) {
  printSection("Status (redacted)");
  for (const line of useful.slice(0, 12)) console.log(line);
}

const overall =
  dbOk === "PASS" &&
  directOk === "PASS" &&
  upToDate &&
  result.status === 0 &&
  pendingCount === 0
    ? "PASS"
    : "FAIL";

printSection("Overall Result");
console.log(overall);
process.exit(exitCode(overall));
