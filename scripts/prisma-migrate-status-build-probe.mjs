/** Temporary, read-only Hostinger build diagnostic. Remove after migration-status review. */
import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const APPROVED = "20260917120000_co_credit_risk_policy_lifecycle_status";
const MIGRATION_NAME = /^\d{14}_[a-z0-9_]+$/;
const PREFIX = "[prisma-status-probe]";

export function classifyStatus(output, exitCode, migrationNames) {
  const known = new Set(migrationNames.filter((name) => MIGRATION_NAME.test(name)));
  if (/\bfailed migrations?\b|migration(?:\(s\)|s)? (?:has|have) failed|P3009\b/i.test(output)) {
    return { kind: "FAILED_HISTORY", pending: [] };
  }
  if (/migration history.*(?:different|diverg)|migrations? from the database.*not found locally|last common migration/i.test(output)) {
    return { kind: "DIVERGED_HISTORY", pending: [] };
  }
  if (/\b(?:P1000|P1001|P1002|P1012|P1013|P1017)\b|can't reach database|authentication failed|environment variable not found|datasource.*(?:invalid|missing)/i.test(output)) {
    return { kind: "PROBE_UNAVAILABLE", pending: [] };
  }

  const lines = output.split(/\r?\n/).map((line) => line.trim());
  const heading = lines.findIndex((line) => /(?:following\s+)?migration(?:\(s\)|s)?\s+have not yet been applied/i.test(line));
  if (heading >= 0) {
    if (exitCode === 0) return { kind: "UNCLASSIFIED", pending: [] };
    const pending = [];
    for (const line of lines.slice(heading + 1)) {
      if (!line) {
        if (pending.length) break;
        continue;
      }
      if (!MIGRATION_NAME.test(line)) break;
      if (!known.has(line) || pending.includes(line)) return { kind: "UNCLASSIFIED", pending: [] };
      pending.push(line);
    }
    const count = output.match(/\b(\d+)\s+migration(?:\(s\)|s)?\s+have not yet been applied/i);
    if (!pending.length || (count && Number(count[1]) !== pending.length)) {
      return { kind: "UNCLASSIFIED", pending: [] };
    }
    return { kind: pending.length === 1 && pending[0] === APPROVED ? "APPROVED_PENDING_ONLY" : "OTHER_PENDING", pending };
  }
  if (exitCode === 0 && /Database schema is up to date/i.test(output)) {
    return { kind: "UP_TO_DATE", pending: [] };
  }
  return { kind: "UNCLASSIFIED", pending: [] };
}

function main() {
  const root = process.cwd();
  const prismaCli = resolve(root, "node_modules", "prisma", "build", "index.js");
  const migrationDir = resolve(root, "prisma", "migrations");
  if (!existsSync(prismaCli) || !existsSync(migrationDir)) {
    console.error(`${PREFIX} MIGRATION_STATUS_PROBE_UNAVAILABLE`);
    process.exitCode = 1;
    return;
  }

  const migrationNames = readdirSync(migrationDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const result = spawnSync(process.execPath, [prismaCli, "migrate", "status", "--schema", "prisma/schema.prisma"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.signal || result.status === null) {
    console.error(`${PREFIX} MIGRATION_STATUS_PROBE_UNAVAILABLE`);
    process.exitCode = 1;
    return;
  }

  // Prisma output stays in memory. Never forward raw stdout, stderr, or errors.
  const classification = classifyStatus(`${result.stdout ?? ""}\n${result.stderr ?? ""}`, result.status, migrationNames);
  if (classification.kind === "PROBE_UNAVAILABLE") {
    console.error(`${PREFIX} MIGRATION_STATUS_PROBE_UNAVAILABLE`);
  } else {
    console.log(`${PREFIX} ${classification.kind}`);
    for (const name of classification.pending) console.log(`${PREFIX} PENDING ${name}`);
  }
  // Only the approved pending migration or an up-to-date result may continue
  // to the separately gated deployment helper.
  process.exitCode = classification.kind === "UP_TO_DATE" || classification.kind === "APPROVED_PENDING_ONLY" ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
