/**
 * CO-LW-001 — Enterprise Lending Programs Workspace Phase 1 (static gates).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const required = [
  "src/types/lending-programs-workspace.ts",
  "src/constants/lending-programs-workspace.ts",
  "src/lib/lending-programs-workspace/index.ts",
  "src/components/catalyst-one/lending-programs-workspace/lending-programs-workspace.tsx",
  "docs/co-lw-001/CO-LW-001-LENDING-PROGRAMS-PHASE1-READINESS-REPORT.md",
];

for (const rel of required) {
  assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
}

const nav = read("src/config/navigation.ts");
assert.match(nav, /Lending Programs/);
assert.match(nav, /ROUTES\.LENDERS/);
assert.ok(!nav.includes('title: "Lenders"'), "Primary nav must rename Lenders → Lending Programs");

const page = read("src/app/(dashboard)/lenders/page.tsx");
assert.match(page, /LendingProgramsWorkspace/);
assert.match(page, /CO-LW-001|CO-LW-003/);

const ws = read(
  "src/components/catalyst-one/lending-programs-workspace/lending-programs-workspace.tsx",
);
assert.match(ws, /Lender View/);
assert.match(ws, /Product View/);
assert.match(ws, /Refresh Snapshot/);
assert.match(ws, /loadLendingProgramsSnapshot/);
assert.match(ws, /loadLivePipelineForLender/);
assert.match(ws, /listConversationActivities/);
assert.match(ws, /listEdcTimelineByContext/);
assert.match(ws, /Not Specified|LENDING_PROGRAMS_NOT_SPECIFIED/);
assert.match(ws, /Comparison Matrix/);
assert.match(ws, /Business Fit/);
assert.match(ws, /CHANAKYA/);
assert.ok(!/Relationship Score/i.test(ws), "Phase 1 must not invent Relationship Score");
assert.ok(!/predictive/i.test(ws), "Phase 1 must not add predictive analytics");

const lib = read("src/lib/lending-programs-workspace/index.ts");
assert.match(lib, /lenderRegistryClient/);
assert.match(lib, /fetchProductMasterOptions/);
assert.match(lib, /enterpriseDealApiClient/);
assert.match(lib, /publishedPrograms/);
assert.match(lib, /sessionStorage/);
assert.ok(!/prisma\./i.test(lib), "Compose must not own a new Prisma store");

const types = read("src/types/lending-programs-workspace.ts");
assert.match(types, /LendingProgramsSnapshot/);
assert.match(types, /source: \"client_compose\"/);

console.log("CO-LW-001 verify: PASS");
