/**
 * CO-360-001 — Universal Enterprise 360° Workspace Framework verify (static).
 * No migrate / no deploy / no live transactional mutation.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

for (const rel of [
  "src/types/enterprise-360-workspace.ts",
  "src/constants/enterprise-360-workspace/index.ts",
  "src/lib/enterprise-360-workspace/index.ts",
  "src/lib/enterprise-360-workspace/compose.ts",
  "src/components/catalyst-one/enterprise-360-workspace/enterprise-360-workspace.tsx",
  "src/components/catalyst-one/enterprise-360-workspace/enterprise-360-framework-demo.tsx",
  "src/app/(dashboard)/admin/enterprise-360/page.tsx",
  ".cursor/rules/enterprise-360-workspace.mdc",
  "docs/co-360-001/CO-360-001-UNIVERSAL-360-FRAMEWORK-REPORT.md",
]) {
  assert.ok(exists(rel), `missing ${rel}`);
}

const constants = read("src/constants/enterprise-360-workspace/index.ts");
for (const section of [
  "executive_summary",
  "timeline",
  "documents",
  "tasks",
  "notes",
  "communications",
  "activities",
  "ai_insights",
  "audit_history",
  "attachments",
]) {
  assert.match(constants, new RegExp(`id:\\s*"${section}"`));
}

for (const kind of [
  "customer",
  "lender",
  "wealth_partner",
  "vendor",
  "employee",
  "contact",
]) {
  assert.match(constants, new RegExp(`${kind}:\\s*\\{`));
}

assert.match(constants, /Registry = Identity/);
assert.match(constants, /Workspace = Daily Operations/);
assert.match(constants, /ENTERPRISE_360_COMMAND_BAR/);
assert.match(constants, /legal_compliance/);
assert.match(constants, /business_roles/);
assert.match(constants, /pipeline_summary/);

const compose = read("src/lib/enterprise-360-workspace/compose.ts");
assert.match(compose, /composeEnterprise360Workspace/);
assert.match(compose, /composeContactIdentityRoleLinks/);
assert.match(compose, /listEnterprise360FrameworkInventory/);

const docs = read("src/lib/enterprise-360-workspace/documents.ts");
assert.match(docs, /Document Registry/);
assert.match(docs, /documentRegistryRecordId/);

const ui = read(
  "src/components/catalyst-one/enterprise-360-workspace/enterprise-360-workspace.tsx",
);
assert.match(ui, /EnterpriseWorkspaceShell/);
assert.match(ui, /command-bar/);
assert.match(ui, /executive-dashboard/);
assert.match(ui, /Business Roles/);

const demo = read(
  "src/components/catalyst-one/enterprise-360-workspace/enterprise-360-framework-demo.tsx",
);
assert.match(demo, /CO-360-001 Framework Demo/);

const routes = read("src/constants/routes.ts");
assert.match(routes, /ADMIN_ENTERPRISE_360/);

const rule = read(".cursor/rules/enterprise-360-workspace.mdc");
assert.match(rule, /CO-360-001/);
assert.match(rule, /Registries remain administrative/);

assert.ok(!exists("prisma/migrations/20260729140000_co_360_001"));

console.log("CO-360-001 Universal Enterprise 360° Framework verify: PASS");
console.log("NOTE: Framework only — no migrate / no deploy / no live-data mutation.");
