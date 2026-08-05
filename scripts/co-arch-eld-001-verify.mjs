/**
 * CO-ARCH-ELD-001 — structural verify for Enterprise Lender Directory.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `Missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

for (const rel of [
  "src/components/catalyst-one/enterprise-lender-directory/enterprise-lender-directory-workspace.tsx",
  "src/components/catalyst-one/enterprise-lender-directory/eld-slide-over.tsx",
  "src/lib/enterprise-lender-directory/compose-directory.ts",
  "docs/co-arch-eld-001/CO-ARCH-ELD-001-ENTERPRISE-LENDER-DIRECTORY-READINESS.md",
]) {
  assert.ok(fs.existsSync(path.join(root, rel)), rel);
}

const nav = read("src/config/navigation.ts");
assert.match(nav, /Enterprise Lender Directory/);
assert.doesNotMatch(nav, /title: "Lending Programs"/);

const page = read("src/app/(dashboard)/lenders/page.tsx");
assert.match(page, /EnterpriseLenderDirectoryWorkspace/);
assert.doesNotMatch(page, /LendingProgramsWorkspace/);

const ws = read(
  "src/components/catalyst-one/enterprise-lender-directory/enterprise-lender-directory-workspace.tsx",
);
assert.match(ws, /EnterpriseLenderDirectorySlideOver/);
assert.match(ws, /EldLenderEmployeesPanel/);
assert.match(ws, /ELD_LANDING_TABS/);
assert.match(ws, /Smart sort/);
assert.match(ws, /Export/);
assert.match(ws, /ELD_CATEGORY_OPTIONS/);

for (const rel of [
  "src/components/catalyst-one/enterprise-lender-directory/eld-lender-employees-panel.tsx",
  "src/components/catalyst-one/enterprise-lender-directory/eld-employee-slide-over.tsx",
  "src/lib/enterprise-lender-directory/compose-employees.ts",
]) {
  assert.ok(fs.existsSync(path.join(root, rel)), rel);
}

const employees = read(
  "src/components/catalyst-one/enterprise-lender-directory/eld-lender-employees-panel.tsx",
);
assert.match(employees, /loadEldLenderEmployeeContacts/);
assert.match(employees, /EldLenderEmployeeSlideOver/);
assert.match(employees, /lender_employee|Lender Employees/);

const empPanel = read(
  "src/components/catalyst-one/enterprise-lender-directory/eld-employee-slide-over.tsx",
);
assert.match(empPanel, /65vw|70vw/);
assert.match(empPanel, /hierarchy|Reporting structure/i);
assert.match(empPanel, /Current Pipeline|pipeline/i);
assert.match(empPanel, /Edit Mode|Edit/);
assert.match(empPanel, /saveEldLenderEmployeeEmployment|Save/);

const saveEmp = read("src/lib/enterprise-lender-directory/save-lender-employee.ts");
assert.match(saveEmp, /saveEldLenderEmployeeEmployment/);
assert.match(saveEmp, /recordEcmAudit/);
assert.match(saveEmp, /Institution/);
assert.doesNotMatch(saveEmp, /opportunityId\s*=/);

const composeEmp = read("src/lib/enterprise-lender-directory/compose-employees.ts");
assert.match(composeEmp, /composeEldLenderEmployeeRows/);
assert.match(composeEmp, /Not Specified/);
assert.match(composeEmp, /lender_employee/);

const panel = read(
  "src/components/catalyst-one/enterprise-lender-directory/eld-slide-over.tsx",
);
assert.match(panel, /65vw|70vw/);
assert.match(panel, /duration-\[250ms\]/);
assert.match(panel, /Hierarchy/);
assert.match(panel, /Chanakya Insights/);

const compose = read("src/lib/enterprise-lender-directory/compose-directory.ts");
assert.match(compose, /sortEnterpriseLenderDirectoryRows/);
assert.match(compose, /Not Specified/);
assert.match(compose, /rememberEldLenderUsed/);

console.log("CO-ARCH-ELD-001 verify: PASS");
