#!/usr/bin/env node
/**
 * CO-ADMIN-006 — Product Master Functional Completion static verify.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];

function mustExist(rel) {
  if (!existsSync(resolve(root, rel))) failures.push(`Missing: ${rel}`);
}

function mustContain(rel, needle) {
  const abs = resolve(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing: ${rel}`);
    return;
  }
  if (!readFileSync(abs, "utf8").includes(needle)) {
    failures.push(`${rel} missing "${needle}"`);
  }
}

mustExist("src/components/catalyst-one/product-library/product-categories-view.tsx");
mustExist("src/components/catalyst-one/product-library/product-master-management-view.tsx");
mustExist("src/lib/enterprise-product-master/admin-client.ts");
mustExist("src/app/api/product-registry/groups/[groupId]/activate/route.ts");
mustExist("docs/co-admin-006/CO-ADMIN-006-PRODUCT-MASTER-COMPLETION-REPORT.md");

mustContain("src/data/catalyst-one/product-library/product-categories-seed.ts", "LOAN_PRODUCTS");
mustContain("src/data/catalyst-one/product-library/product-categories-seed.ts", "Loan Products");
mustContain("src/data/catalyst-one/product-library/product-groups-seed.ts", "SECURED_LOANS");
mustContain("src/data/catalyst-one/product-library/product-groups-seed.ts", "Secured Loans");
mustContain("src/constants/enterprise-product-master/canonical-catalog.ts", "COMM_PURCHASE");
mustContain("src/constants/enterprise-product-master/canonical-catalog.ts", "Commercial Purchase");
mustContain("src/lib/enterprise-product-master/admin-client.ts", "createProductCategory");
mustContain("src/lib/enterprise-product-master/admin-client.ts", "createProductGroup");
mustContain(
  "src/components/catalyst-one/product-library/product-categories-view.tsx",
  "Create Category",
);
mustContain(
  "src/components/catalyst-one/product-library/product-categories-view.tsx",
  "Create Group",
);
mustContain(
  "src/app/api/product-registry/_lib/route-utils.ts",
  "productRegistryErrorResponse",
);
mustContain(
  "src/app/api/product-registry/products/route.ts",
  "productRegistryErrorResponse",
);

const categoriesView = readFileSync(
  resolve(root, "src/components/catalyst-one/product-library/product-categories-view.tsx"),
  "utf8",
);
if (categoriesView.includes("getProductCategories()")) {
  failures.push("Categories view must not use in-memory product-store getProductCategories()");
}

if (failures.length) {
  console.error("CO-ADMIN-006 verify FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-ADMIN-006 verify PASSED");
console.log(" - Category/Group CRUD UI, COMM_PURCHASE seed, actionable API errors present");
