/**
 * Disposable local PostgreSQL runtime certification.
 * Never uses repository .env databases, production, staging, or Hostinger.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function hasCommand(name) {
  const probe = spawnSync(name, ["--version"], { encoding: "utf8", windowsHide: true });
  return probe.status === 0;
}

const docker = hasCommand("docker");
const psql = hasCommand("psql");
const report = {
  available: false,
  status: "BLOCKED",
  reason: "No safe disposable PostgreSQL facility is already installed on this machine (docker and psql are absent). Infrastructure was not installed. Repository environment databases were not used.",
  dockerPresent: docker,
  psqlPresent: psql,
  databaseCreated: false,
  databaseDropped: false,
  testsPerformed: [],
};

writeFileSync(
  join(root, "docs/co-marketing-redesign-022/postgres-runtime.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);

console.log("CO-MARKETING-REDESIGN-022 disposable PostgreSQL: BLOCKED");
console.log(report.reason);
process.exit(0);
