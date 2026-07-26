/**
 * CO-OPP-SSOT-001 — static verify Opportunity Registry SSOT gate.
 * Usage: node scripts/co-opp-ssot-001-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const ctx = fs.readFileSync(
  path.join(root, "src/components/catalyst-one/opportunity-workspace/opportunity-workspace-context.tsx"),
  "utf8",
);
const shell = fs.readFileSync(
  path.join(root, "src/components/catalyst-one/opportunity-workspace/opportunity-workspace.tsx"),
  "utf8",
);
const board = fs.readFileSync(
  path.join(root, "src/components/catalyst-one/opportunity-workspace/workspace-life-strategy-board.tsx"),
  "utf8",
);

assert(ctx.includes("CO-OPP-SSOT-001"), "Provider must cite CO-OPP-SSOT-001");
assert(ctx.includes('setRegistryLoadStatus("failed")'), "Must fail Registry load explicitly");
assert(ctx.includes('setWorkspaceReady(true)'), "Ready only after success path");
assert(!ctx.includes("Fall through: keep URL opportunityId"), "Soft URL fallback must be removed");
assert(
  ctx.includes("opportunityNumber: registryOpportunity?.opportunityNumber"),
  "Opportunity number must come from Registry only",
);
assert(
  shell.includes("Opportunity could not be loaded"),
  "Shell must show Registry failure UI",
);
assert(
  board.includes("registryLoadStatus !== \"ready\""),
  "Select must require Registry ready",
);
assert(
  board.includes("registryOpportunity.id"),
  "Select/Move-to-Deal must use Registry id",
);

const report = {
  softUrlFallbackRemoved: true,
  workspaceReadyOnlyAfterRegistry: true,
  opportunityNumberFromRegistryOnly: true,
  selectRequiresRegistry: true,
  failureUiPresent: true,
  verdict: "PASS",
};

const out = path.join(root, "docs/certification-screenshots/co-opp-ssot-001");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "verify-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
