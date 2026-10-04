/**
 * Cumulative overnight refinements 1–6 — safe finite verifiers only.
 * Does not mutate baseline unrelated failures. No deploy, no migrate.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const refinements = [
  {
    id: "1",
    name: "RC Employee Synchronisation and Deal-Level Editing",
    script: "verify:co-c1-rc-employee-assignment-001",
  },
  {
    id: "2",
    name: "Loans-Only My Deals Configurable Kanban",
    script: "verify:co-c1-my-deals-kanban-001",
  },
  {
    id: "3",
    name: "Dedicated Document Workspace",
    script: "verify:co-c1-document-workspace-001",
  },
  {
    id: "4",
    name: "Real-Time CHANAKYA Intelligence",
    script: "verify:co-c1-chanakya-realtime-intelligence-001",
  },
  {
    id: "5",
    name: "Enterprise Chart Readability + Relationship Heat Map",
    script: "verify:co-c1-enterprise-chart-readability-001",
  },
  {
    id: "6",
    name: "Contact 360 Relationship Graph",
    script: "verify:co-c1-contact-360-relationship-graph-001",
  },
];

function run(script) {
  const result = spawnSync("npm", ["run", script], {
    cwd: root,
    encoding: "utf8",
    shell: true,
    timeout: 180_000,
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  const blockedLine = output
    .split(/\r?\n/)
    .some((line) => /^BLOCKED\b/.test(line.trim()));
  return {
    status: result.status === 0 ? (blockedLine ? "BLOCKED" : "PASS") : "FAIL",
    code: result.status,
    tail: output.trim().split(/\r?\n/).slice(-8).join(" | "),
  };
}

console.log("CUMULATIVE OVERNIGHT 1–6\n");
const rows = [];
for (const item of refinements) {
  process.stdout.write(`Running ${item.script} … `);
  const result = run(item.script);
  console.log(result.status);
  rows.push({ ...item, ...result });
}

console.log("\nRefinement | Implemented | Tests | PASS/FAIL/BLOCKED | Remaining morning action");
console.log("---|---|---|---|---");
for (const row of rows) {
  const morning =
    row.status === "PASS"
      ? "Live BAT on authorised session"
      : row.status === "BLOCKED"
        ? "Complete blocked live path; do not invent records"
        : "Inspect verifier tail; do not greenwash unrelated baseline";
  console.log(
    `${row.id} ${row.name} | yes | ${row.script} | ${row.status} | ${morning}`,
  );
}

const failed = rows.filter((r) => r.status === "FAIL");
if (failed.length) {
  console.error("\nFailed tails:");
  for (const row of failed) console.error(`${row.script}: ${row.tail}`);
  process.exit(1);
}
