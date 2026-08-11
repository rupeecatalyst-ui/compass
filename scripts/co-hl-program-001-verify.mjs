/**
 * CO-HL-PROGRAM-001 — static + live SSOT gates (no deploy).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

function mustExist(rel) {
  assert.ok(fs.existsSync(path.join(root, rel)), `Missing: ${rel}`);
}

function assertIncludes(rel, needles, label) {
  const src = read(rel);
  for (const n of needles) {
    assert.ok(src.includes(n), `${label}: ${rel} must contain ${JSON.stringify(n)}`);
  }
}

mustExist("src/lib/enterprise-product-lender-priority/compose-home-loan-eligible.ts");
mustExist("server/services/product-lender-priority/home-loan-priority.service.ts");
mustExist("src/app/api/admin/home-loan-lender-priority/route.ts");
mustExist("src/components/catalyst-one/admin/home-loan-lender-priority-workspace.tsx");
mustExist("src/app/(dashboard)/admin/home-loan-lender-priority/page.tsx");
mustExist(
  "prisma/migrations/20260808180000_co_hl_program_001_product_lender_priority/migration.sql",
);
mustExist("docs/co-hl-program-001/HOME-LOAN-ELIGIBLE-LENDERS-LIVE.json");

assertIncludes(
  "prisma/schema.prisma",
  ["model EnterpriseProductLenderPriority", "enterprise_product_lender_priorities"],
  "schema",
);

assertIncludes(
  "src/lib/enterprise-product-lender-priority/compose-home-loan-eligible.ts",
  ["HL_PROGRAM_PRODUCT_FAMILY", "lenderSupportsHomeLoan", "productCodesShareSelectionFamily"],
  "compose",
);

assertIncludes(
  "server/services/product-lender-priority/home-loan-priority.service.ts",
  [
    "enterpriseProductLenderPriority",
    "composeHomeLoanEligibleLenderRows",
    "saveHomeLoanLenderPriorities",
    "productsSupported",
  ],
  "service",
);

assertIncludes(
  "server/services/product-lender-priority/home-loan-priority.service.ts",
  ["productsSupported"],
  "no-master-mutation-via-priority",
);

const service = read("server/services/product-lender-priority/home-loan-priority.service.ts");
assert.ok(
  !service.includes("updateLender(") && !service.includes("productsSupported:"),
  "Priority service must not mutate lender productsSupported / updateLender",
);

assertIncludes(
  "src/constants/routes.ts",
  ["ADMIN_HOME_LOAN_LENDER_PRIORITY", "/admin/home-loan-lender-priority"],
  "routes",
);

assertIncludes(
  "src/constants/administration-console.ts",
  ["home-loan-lender-priority", "ADMIN_HOME_LOAN_LENDER_PRIORITY"],
  "admin-console",
);

const liveRaw = read("docs/co-hl-program-001/HOME-LOAN-ELIGIBLE-LENDERS-LIVE.json");
const live = JSON.parse(liveRaw.charCodeAt(0) === 0xfeff ? liveRaw.slice(1) : liveRaw);
assert.equal(live.sprint, "CO-HL-PROGRAM-001");
assert.equal(live.productFamily, "HOME_LOAN");
assert.ok(Array.isArray(live.lenders), "live lenders array required");
assert.ok(live.homeLoanMappedCount >= 1, "at least one Home Loan–mapped lender");
assert.equal(live.homeLoanMappedCount, live.lenders.length);

const codes = new Set();
for (const row of live.lenders) {
  assert.equal(row.homeLoanMapped, "Yes");
  assert.equal(row.homeLoanSelectionPriority, null);
  assert.ok(row.lenderId && row.lenderCode && row.institutionName);
  assert.ok(!codes.has(row.lenderCode), `duplicate lender code: ${row.lenderCode}`);
  codes.add(row.lenderCode);
}

console.log("CO-HL-PROGRAM-001 verify PASSED");
console.log(` - Live Home Loan–mapped lenders: ${live.homeLoanMappedCount}`);
console.log(` - Enabled lenders in dump: ${live.totalEnabledLenders}`);
console.log(" - Priority table + PO desk wired; no Home Loan program create in this step");
console.log(" - Deploy: blocked pending Product Owner priority order");
