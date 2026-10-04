/**
 * Cumulative overnight refinements 7–10 — safe finite verifiers only.
 * Does not mutate production, deploy, or mark blocked live checks as PASS.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const refinements = [
  {
    id: "7A",
    name: "Operational Contact Strategy",
    script: "verify:co-c1-contact-strategy-sticky-notes-007",
  },
  {
    id: "7B",
    name: "Private Sticky Notes",
    script: "verify:co-c1-contact-strategy-sticky-notes-007",
    reuse: "7A",
  },
  {
    id: "8",
    name: "Context-Locked Document Workspace",
    script: "verify:co-c1-context-locked-document-workspace-008",
  },
  {
    id: "9",
    name: "Conversational CHANAKYA Intelligence",
    script: "verify:co-c1-chanakya-conversational-intelligence-009",
  },
  {
    id: "10",
    name: "Detailed Activity & Dialogue Timeline",
    script: "verify:co-c1-activity-dialogue-timeline-010",
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

console.log("CUMULATIVE OVERNIGHT 7–10\n");
const rows = [];
const byId = new Map();
for (const item of refinements) {
  let result;
  if (item.reuse && byId.has(item.reuse)) {
    result = byId.get(item.reuse);
    console.log(`${item.script} (${item.id} reuse ${item.reuse}) … ${result.status}`);
  } else {
    process.stdout.write(`Running ${item.script} … `);
    result = run(item.script);
    console.log(result.status);
  }
  const row = { ...item, ...result, id: item.id, name: item.name };
  byId.set(item.id, row);
  rows.push(row);
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
const blocked = rows.filter((r) => r.status === "BLOCKED");
if (blocked.length) {
  console.warn("\nBlocked live checks (not marked PASS):");
  for (const row of blocked) console.warn(`${row.script}: ${row.tail}`);
}
if (failed.length) {
  console.error("\nFailed tails:");
  for (const row of failed) console.error(`${row.script}: ${row.tail}`);
  process.exit(1);
}
if (blocked.length) process.exit(2);

console.log(
  "\nCHANAKYA chat Save as Draft is intentionally deferred in Phase 1 pending an approved Proposal Registry; proposal generation remains operational.",
);
process.exit(0);
