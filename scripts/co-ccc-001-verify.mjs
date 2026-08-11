#!/usr/bin/env node
/**
 * CO-CCC-001 — static gate: Corporate Compliance Center foundation.
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

const prismaModels = [
  "CccLegalEntity",
  "CccInstitutionProfile",
  "CccInstitutionRequirement",
  "CccDocumentPackageDefinition",
  "CccDocumentPackageInstance",
  "CccDispatch",
  "CccDispatchItem",
];

for (const model of prismaModels) {
  mustContain("prisma/schema.prisma", `model ${model}`, `Prisma model ${model}`);
}

mustContain(
  "prisma/schema.prisma",
  "repositoryKey",
  "OrganizationDocument repositoryKey",
);
mustContain(
  "prisma/schema.prisma",
  "legalEntityId",
  "OrganizationDocument legalEntityId",
);

mustExist(
  "prisma/migrations/20260807150000_co_ccc_001_corporate_compliance_center/migration.sql",
  "CCC migration",
);

const apiRoutes = [
  "src/app/api/organization/compliance-center/entities/route.ts",
  "src/app/api/organization/compliance-center/documents/route.ts",
  "src/app/api/organization/compliance-center/institutions/route.ts",
  "src/app/api/organization/compliance-center/packages/route.ts",
  "src/app/api/organization/compliance-center/dispatches/route.ts",
  "src/app/api/organization/compliance-center/intelligence/route.ts",
];

for (const route of apiRoutes) {
  mustExist(route, `API route ${route}`);
}

mustContain(
  "src/constants/routes.ts",
  "ORGANIZATION_COMPLIANCE_CENTER",
  "CCC route constant",
);

mustContain(
  "src/lib/corporate-compliance-center/api-client.ts",
  "cccApi",
  "browser API client",
);

mustContain(
  "src/components/catalyst-one/corporate-compliance-center/ccc-workspace.tsx",
  "CccWorkspace",
  "CCC workspace UI",
);

mustContain(
  "server/services/organization-workspace/organization-workspace.service.ts",
  "repositoryKey",
  "org upload defaults repositoryKey",
);

mustContain(
  "src/app/(dashboard)/organization/corporate-repository/page.tsx",
  "ORGANIZATION_COMPLIANCE_CENTER",
  "corporate repository CCC link",
);

mustExist("docs/co-ccc-001/CO-CCC-001-ARCHITECTURE-REPORT.md", "architecture report");

if (failures.length) {
  console.error("CO-CCC-001 verify FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log(
  "CO-CCC-001 verify PASS (engineering gate only — run E2E on live app with ENTERPRISE_PERSISTENCE_MODE=prisma).",
);
