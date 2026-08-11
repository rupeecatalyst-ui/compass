/**
 * CO-MASTER-001 — Enterprise Lender + Product Master activation (static gates).
 * No deploy. No live data mutation.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

function assertIncludes(rel, needles, label) {
  const src = read(rel);
  for (const n of needles) {
    assert.ok(src.includes(n), `${label}: ${rel} must contain ${JSON.stringify(n)}`);
  }
}

// Schema + migration
assertIncludes(
  "prisma/schema.prisma",
  [
    "maxFoirPercent",
    "maxDbrPercent",
    "creditRiskPolicyRef",
    "requiredDocumentTypeIds",
    '@@map("enterprise_lender_programs")',
    '@@map("enterprise_lenders")',
    "model EnterpriseProduct",
  ],
  "schema",
);
assert.ok(
  fs.existsSync(
    path.join(
      root,
      "prisma/migrations/20260808120000_co_master_001_program_eligibility_policy_docs/migration.sql",
    ),
  ),
  "migration folder missing",
);
assertIncludes(
  "prisma/migrations/20260808120000_co_master_001_program_eligibility_policy_docs/migration.sql",
  ["max_foir_percent", "max_dbr_percent", "credit_risk_policy_ref", "required_document_type_ids"],
  "migration-sql",
);

// Types + mappers + repository
assertIncludes(
  "src/types/enterprise-lender-registry.ts",
  ["maxFoirPercent", "maxDbrPercent", "creditRiskPolicyRef", "requiredDocumentTypeIds"],
  "types",
);
assertIncludes(
  "server/repositories/lender-registry/mappers.ts",
  ["maxFoirPercent", "requiredDocumentTypeIds"],
  "mappers",
);
assertIncludes(
  "server/repositories/lender-registry/lender-registry.repository.ts",
  ["maxFoirPercent", "creditRiskPolicyRef", "requiredDocumentTypeIds"],
  "repository",
);

// Admin UX (CO-MASTER-002 refined policy picker label; FOIR/DBR/docs remain)
assertIncludes(
  "src/components/catalyst-one/lender-registry-admin/new-product-program-wizard.tsx",
  ["Max FOIR %", "Max DBR %", "Credit & Risk Policy", "minCibil", "creditRiskPolicyRef"],
  "wizard",
);
assert.ok(
  read("src/components/catalyst-one/lender-registry-admin/new-product-program-wizard.tsx").match(
    /Required Document|Program LOD|Document Types/i,
  ),
  "wizard: must expose program document / LOD configuration",
);
assertIncludes(
  "src/components/catalyst-one/enterprise-mdm/product-programs-workspace.tsx",
  ["New Program", "Save Changes", "maxFoirPercent", "NewProductProgramWizard"],
  "programs-desk",
);

// Portal publish no longer drops FOIR
assertIncludes(
  "server/services/lender-program-portal/lender-program-portal.service.ts",
  ["maxFoirPercent", "maxDbrPercent", "requiredDocumentTypeIds"],
  "portal-publish",
);

// Directory FOIR from program
assertIncludes(
  "src/lib/enterprise-lender-directory/compose-directory.ts",
  ["maxFoirPercent"],
  "directory-foir",
);

// Integrity helper
assertIncludes(
  "src/lib/enterprise-lender-registry/master-integrity.ts",
  ["validateLenderProductProgramIntegrity", "ORPHAN_PROGRAM_LENDER", "PROGRAM_PRODUCT_NOT_MAPPED"],
  "integrity",
);

// Terminology: never introduce DTI as the product term
const wizard = read(
  "src/components/catalyst-one/lender-registry-admin/new-product-program-wizard.tsx",
);
assert.ok(wizard.includes("FOIR"), "wizard must use FOIR");
assert.ok(wizard.includes("DBR"), "wizard must use DBR");
assert.ok(!/\bDTI\b/.test(wizard.replace(/not DTI/g, "")), "wizard must not promote DTI");

// Docs
assert.ok(
  fs.existsSync(path.join(root, "docs/co-master-001/CO-MASTER-001-AUDIT-AND-CERTIFICATION-REPORT.md")),
  "certification report missing",
);

console.log("CO-MASTER-001 verify: PASS");
console.log("  Program FOIR/DBR/policy/docs fields activated on EnterpriseLenderProgram SSOT");
console.log("  Admin Product Programs desk: create + edit");
console.log("  Portal publish maps FOIR/DBR/docs");
console.log("  Deploy: deferred pending Product Owner review");
