/**
 * CO-ADMIN-005 — static readiness verify.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) failures.push(`Missing: ${rel}`);
}

mustExist("src/constants/enterprise-product-master/canonical-catalog.ts");
mustExist("src/lib/enterprise-product-master/options.ts");
mustExist("src/components/catalyst-one/product-library/product-master-management-view.tsx");
mustExist("src/components/catalyst-one/admin/product-lender-matrix-workspace.tsx");
mustExist("src/app/(dashboard)/admin/product-library/master/page.tsx");
mustExist("src/app/(dashboard)/admin/product-lender-matrix/page.tsx");
mustExist("src/app/api/admin/product-lender-matrix/route.ts");
mustExist("src/app/api/product-registry/seed/route.ts");
mustExist("prisma/migrations/20260722140000_co_admin_005_product_lender_master/migration.sql");
mustExist("docs/co-admin-005/CO-ADMIN-005-PRODUCT-LENDER-MASTER-READINESS-REPORT.md");

const catalog = fs.readFileSync(
  path.join(root, "src/constants/enterprise-product-master/canonical-catalog.ts"),
  "utf8",
);
const required = [
  "Home Loan",
  "Home Loan Balance Transfer",
  "Loan Against Property (LAP)",
  "Commercial Purchase",
  "Commercial Mortgage",
  "Working Capital (Secured)",
  "Working Capital (Unsecured)",
  "Business Loan (Unsecured)",
  "Construction Finance",
  "Lease Rental Discounting (LRD)",
  "Project Finance",
  "Personal Loan",
  "Education Loan",
  "Doctor Loan",
  "Professional Loan",
];
for (const label of required) {
  if (!catalog.includes(label)) failures.push(`Canonical catalog missing: ${label}`);
}

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
for (const field of ["sortOrder", "parentProductId", "isSecured", "customerSegment", "remarks"]) {
  if (!schema.includes(field)) failures.push(`Prisma EnterpriseProduct missing ${field}`);
}
for (const field of ["priority", "defaultProcessingRules", "branchCoverage", "rmMapping"]) {
  if (!schema.includes(field)) failures.push(`Prisma EnterpriseLender missing ${field}`);
}

if (failures.length) {
  console.error("CO-ADMIN-005 verify FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-ADMIN-005 verify PASSED");
console.log(" - Product Master + Matrix UI present");
console.log(" - Canonical 15-product seed present");
console.log(" - Schema extensions present");
