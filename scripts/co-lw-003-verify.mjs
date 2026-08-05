/**
 * CO-LW-003 — Lending Programs Workspace UX Optimisation (static gates).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const required = [
  "src/components/catalyst-one/lending-programs-workspace/lending-programs-workspace.tsx",
  "src/app/(dashboard)/lenders/page.tsx",
  "docs/co-lw-003/CO-LW-003-LENDING-PROGRAMS-UX-READINESS-REPORT.md",
];
for (const rel of required) {
  assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
}

const page = read("src/app/(dashboard)/lenders/page.tsx");
assert.match(page, /layoutMode=\"document\"/);
assert.match(page, /LENDING_PROGRAMS_WORKSPACE_TITLE/);
assert.ok(!page.includes("LENDING_PROGRAMS_WORKSPACE_SUBTITLE"), "Page must not pass duplicate subtitle");
assert.match(page, /CO-LW-003/);

const shell = read(
  "src/components/catalyst-one/shared/enterprise-registry-workspace-shell.tsx",
);
assert.match(shell, /layoutMode/);
assert.match(shell, /document/);

const consts = read("src/constants/enterprise-registry-workspace.ts");
assert.match(consts, /ENTERPRISE_REGISTRY_DOCUMENT_VIEWPORT_CLASS/);

const ws = read(
  "src/components/catalyst-one/lending-programs-workspace/lending-programs-workspace.tsx",
);
assert.match(ws, /CO-LW-003/);
assert.match(ws, /Eligible Lenders/);
assert.match(ws, /Comparison Matrix/);
assert.match(ws, /Active Opportunities/);
assert.match(ws, /Relationship Team/);
assert.match(ws, /CHANAKYA Insights/);
// CO-LW-004 superseded the inline KpiChip helper with the shared LpKpiStrip dashboard primitive.
assert.match(ws, /LpKpiStrip/);
assert.match(ws, /loadLivePipelineForProduct/);
assert.match(ws, /productFocusLenderId/);
assert.ok(
  !/(?<![a-z-])h-\[calc\(100vh/.test(ws),
  "Workspace must not lock nested viewport height (h-[calc(100vh…)])",
);
assert.ok(!ws.includes("LENDING_PROGRAMS_WORKSPACE_SUBTITLE"), "No duplicate subtitle in body");
assert.ok(!/Relationship Score/i.test(ws), "Must not invent Relationship Score");

const lib = read("src/lib/lending-programs-workspace/index.ts");
assert.match(lib, /loadLivePipelineForProduct/);

console.log("CO-LW-003 verify: PASS");
