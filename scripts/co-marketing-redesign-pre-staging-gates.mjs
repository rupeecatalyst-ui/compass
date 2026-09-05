/**
 * CO-MARKETING-REDESIGN pre-staging aggregate gate.
 * Runs redesign 001–021 plus existing Marketing safety verifiers.
 * Does not migrate, send, commit, push, or invoke `npm run build` (that script runs Prisma migrate).
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "marketing-pre-staging-local-jwt-secret-aaaa";
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  process.env.JWT_REFRESH_SECRET = "marketing-pre-staging-local-jwt-refresh-bbbb";
}

const requested = process.argv.slice(2);
const gates = [
  "verify:co-marketing-redesign-001",
  "verify:co-marketing-redesign-002",
  "verify:co-marketing-redesign-003",
  "verify:co-marketing-redesign-004",
  "verify:co-marketing-redesign-005",
  "verify:co-marketing-redesign-006",
  "verify:co-marketing-redesign-007",
  "verify:co-marketing-redesign-008",
  "verify:co-marketing-redesign-009",
  "verify:co-marketing-redesign-010",
  "verify:co-marketing-redesign-011",
  "verify:co-marketing-redesign-012",
  "verify:co-marketing-redesign-013",
  "verify:co-marketing-redesign-014",
  "verify:co-marketing-redesign-015",
  "verify:co-marketing-redesign-016",
  "verify:co-marketing-redesign-017",
  "verify:co-marketing-redesign-018",
  "verify:co-marketing-redesign-019",
  "verify:co-marketing-redesign-020",
  "verify:co-marketing-redesign-021",
  "verify:co-marketing-mkt-01",
  "verify:co-marketing-mkt-02",
  "verify:co-marketing-mkt-03",
  "verify:co-marketing-mkt-04",
  "verify:co-marketing-mkt-05",
  "verify:co-marketing-mkt-07",
  "verify:co-marketing-mkt-08",
  "verify:co-marketing-mkt-09",
  "verify:co-marketing-mkt-10",
  "verify:co-marketing-mkt-11",
  "verify:co-marketing-mkt-12",
  "verify:co-marketing-mkt-13",
  "verify:co-marketing-activation-002",
  "verify:co-marketing-campaign-durability",
];

const selected = requested.length
  ? gates.filter((script) => requested.includes(script))
  : gates;
if (requested.length && selected.length !== requested.length) {
  const unknown = requested.filter((script) => !gates.includes(script));
  console.error(`Unknown pre-staging gate(s): ${unknown.join(", ")}`);
  process.exit(1);
}

const results = [];
let failed = false;

for (const script of selected) {
  console.log(`\n======== ${script} ========`);
  const run = spawnSync("npm", ["run", script], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      ENTERPRISE_MARKETING_EXECUTION_ENABLED: "false",
      ENTERPRISE_MARKETING_EMAIL_MODE: "dry_run",
    },
  });
  const ok = run.status === 0;
  results.push({ script, status: ok ? "PASS" : "FAIL", exitCode: run.status });
  if (!ok) failed = true;
}

console.log("\n======== PRE-STAGING SUMMARY ========");
for (const row of results) {
  console.log(`${row.status}  ${row.script}`);
}

if (failed) {
  console.error("CO-MARKETING-REDESIGN pre-staging gates FAILED");
  process.exit(1);
}

console.log("CO-MARKETING-REDESIGN pre-staging gates PASS");
