/**
 * CO-MASTER-002 — Policy + LOD + audit completion (static verify). No deploy.
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

assertIncludes(
  "src/lib/enterprise-lender-registry/resolve-program-policy.ts",
  [
    "validateProgramCreditRiskPolicyRef",
    "resolvePolicyForProgram",
    "getPublishedPolicies",
    "requirePublished",
  ],
  "policy-resolve",
);

assertIncludes(
  "src/lib/document-requests/resolve-program-lod.ts",
  [
    "resolveProgramLod",
    "normalizeProgramLodRequirements",
    "mandatory",
    "applicability",
    "EDIE_CATALOG",
  ],
  "lod-resolve",
);

assertIncludes(
  "server/services/lender-registry/lender-registry.service.ts",
  [
    "validateProgramCreditRiskPolicyRef",
    "maxFoirPercent",
    "creditRiskPolicyRef",
    "requiredDocuments",
    "lender_program_created",
    "lender_program_updated",
  ],
  "service-audit-validate",
);

assertIncludes(
  "src/app/api/admin/product-lender-matrix/route.ts",
  ["lenderRegistryService.createProgram", "productsSupported"],
  "matrix-audited-create",
);

assertIncludes(
  "src/app/api/lender-registry/programs/[programId]/resolve/route.ts",
  ["resolvePolicyForProgram", "resolveProgramLod"],
  "resolve-api",
);

assertIncludes(
  "src/components/catalyst-one/enterprise-mdm/product-programs-workspace.tsx",
  [
    "listSelectableCreditRiskPolicies",
    "listEdieDocumentTypeOptions",
    "Program LOD",
    "Mandatory",
  ],
  "programs-ui",
);

assertIncludes(
  "src/components/catalyst-one/execution/lender-pipeline-board.tsx",
  ["resolvePolicyForProgram", "creditRiskPolicyRef", "creditRiskPolicyLabel"],
  "pipeline-policy",
);

// Regression: FOIR/DBR still present
assertIncludes(
  "src/components/catalyst-one/lender-registry-admin/new-product-program-wizard.tsx",
  ["Max FOIR %", "Max DBR %", "listSelectableCreditRiskPolicies"],
  "wizard-regression",
);

assert.ok(
  fs.existsSync(
    path.join(root, "docs/co-master-002/CO-MASTER-002-COMPLETION-CERTIFICATION-REPORT.md"),
  ),
  "certification report missing",
);

console.log("CO-MASTER-002 verify: PASS");
console.log("  Policy validation + resolve · Program LOD · Audit enrichment · Pipeline stamp");
console.log("  Deploy: deferred pending Product Owner review");
