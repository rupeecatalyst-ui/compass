/**
 * CO-ARCH-005 verify — architecture refinement (no auto programs).
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let failed = false;

function ok(rel, snippets = []) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error("MISSING:", rel);
    failed = true;
    return;
  }
  const text = fs.readFileSync(full, "utf8");
  for (const snip of snippets) {
    if (!text.includes(snip)) {
      console.error(`FAIL: ${rel} missing "${snip}"`);
      failed = true;
      return;
    }
  }
  console.log("OK:", rel);
}

ok("src/lib/enterprise-lender-registry/program-architecture.ts", [
  "countLendersSupportingDirectoryProduct",
  "buildCommercialProgramValidationReport",
  "isPublishedCommercialProgram",
]);
ok("src/components/catalyst-one/lender-registry-admin/new-product-program-wizard.tsx", [
  "New Product Program",
  "Supported Product",
  "Save Draft",
  "Publish",
]);
ok("src/components/catalyst-one/lender-registry-admin/lender-registry-admin-workspace.tsx", [
  "New Product Program",
  "Enterprise Validation Report",
  "Published Programs",
  "Capability, zero programs",
]);
ok("src/components/catalyst-one/enterprise-lender-workspace/elw-lender-registry.tsx", [
  "Supported Lenders",
  "Published Programs",
  "Configure Product Programs",
  "publishedOnly: true",
  "countLendersSupportingDirectoryProduct",
]);
ok("src/lib/enterprise-lender-registry/bootstrap-master.ts", []);
const bootstrap = fs.readFileSync(
  path.join(root, "src/lib/enterprise-lender-registry/bootstrap-master.ts"),
  "utf8",
);
if (bootstrap.includes("createProgram")) {
  console.error("FAIL: bootstrap must not auto-create programs");
  failed = true;
} else {
  console.log("OK: bootstrap does not createProgram");
}

ok("docs/co-arch-001/CO-ARCH-005-LENDER-PROGRAM-ARCHITECTURE.md", [
  "Supported Products",
  "Published Programs",
]);

if (failed) {
  console.error("\nCO-ARCH-005 VERIFY FAILED");
  process.exit(1);
}
console.log("\nCO-ARCH-005 VERIFY PASSED");
