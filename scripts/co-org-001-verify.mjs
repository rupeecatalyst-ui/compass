#!/usr/bin/env node
/**
 * CO-ORG-001 — static gate: Organization Workspace UI wired to durable APIs.
 * Engineering gate only — does NOT satisfy Business Certification.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function mustExist(rel, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) failures.push(`${label ?? rel}: file missing`);
}

function mustContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing file: ${rel}`);
    return;
  }
  const text = readFileSync(abs, "utf8");
  if (!text.includes(needle)) failures.push(`${label ?? rel}: expected "${needle}"`);
}

function mustNotContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing file: ${rel}`);
    return;
  }
  const text = readFileSync(abs, "utf8");
  if (text.includes(needle)) failures.push(`${label ?? rel}: must not contain "${needle}"`);
}

const prismaModels = [
  "OrganizationWorkspaceProfile",
  "OrganizationWorkspaceSettings",
  "OrganizationBusinessConfig",
  "OrganizationSecurityConfig",
  "OrganizationDirector",
  "OrganizationBankAccount",
  "OrganizationDigitalSignature",
  "OrganizationSeal",
  "OrganizationDocument",
  "OrganizationDocumentTemplateType",
  "OrganizationActivityEvent",
  "OrganizationAuditEntry",
];

for (const model of prismaModels) {
  mustContain("prisma/schema.prisma", `model ${model}`, `Prisma model ${model}`);
}

const apiRoutes = [
  "src/app/api/organization/profile/route.ts",
  "src/app/api/organization/settings/route.ts",
  "src/app/api/organization/business-config/route.ts",
  "src/app/api/organization/security/route.ts",
  "src/app/api/organization/directors/route.ts",
  "src/app/api/organization/bank-accounts/route.ts",
  "src/app/api/organization/digital-signatures/route.ts",
  "src/app/api/organization/seal/route.ts",
  "src/app/api/organization/documents/route.ts",
  "src/app/api/organization/document-templates/route.ts",
  "src/app/api/organization/activity/route.ts",
  "src/app/api/organization/audit/route.ts",
];

for (const route of apiRoutes) {
  mustExist(route, `API route ${route}`);
}

mustContain(
  "src/lib/enterprise-organization-workspace/api-client.ts",
  "organizationWorkspaceApi",
  "browser API client",
);

mustNotContain(
  "src/lib/organization-documents/store.ts",
  "localStorage",
  "org documents store must not use localStorage",
);

mustContain(
  "src/components/catalyst-one/organization/company-profile-form.tsx",
  "organizationWorkspaceApi.getProfile",
  "company profile loads from API",
);

mustContain(
  "src/components/catalyst-one/organization/directors-table.tsx",
  "organizationWorkspaceApi.listDirectors",
  "directors table loads from API",
);

mustContain(
  "src/components/catalyst-one/organization-documents/organization-documents-workspace.tsx",
  "hydrateOrgDocumentsRegistry",
  "documents workspace hydrates registry",
);

mustExist("docs/co-org-001/CO-ORG-001-ACTIVATION-REPORT.md", "activation report");

if (failures.length) {
  console.error("CO-ORG-001 verify FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log(
  "CO-ORG-001 verify PASS (engineering gate only — run E2E on live app with ENTERPRISE_PERSISTENCE_MODE=prisma).",
);
