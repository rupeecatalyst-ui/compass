#!/usr/bin/env node
/**
 * CO-CUTOVER-001 — Static verify (no deletion).
 * Confirms cutover analysis artefacts; never mutates production data.
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

mustExist("docs/co-cutover-001/CO-CUTOVER-001-PRODUCTION-DATA-CUTOVER-VALIDATION-REPORT.md");
mustExist("server/services/production-reset/filters.ts");
mustExist("server/services/production-reset/production-reset.service.ts");
mustExist("src/app/api/admin/production-reset/route.ts");
mustExist(".cursor/rules/production-data-cutover.mdc");

mustContain("server/services/production-reset/production-reset.service.ts", "analyseCutover");
mustContain("server/services/production-reset/filters.ts", "DEMO_SEED_CREATED_BY");
mustContain("server/services/production-reset/filters.ts", "companyWhere");
mustContain("src/app/api/admin/production-reset/route.ts", 'view === "cutover"');
mustContain(
  "src/constants/production-reset/preserved.ts",
  "Product-Lender Matrix",
);
mustContain(
  "docs/co-cutover-001/CO-CUTOVER-001-PRODUCTION-DATA-CUTOVER-VALIDATION-REPORT.md",
  "deletionPerformed: false",
);
mustContain(
  "docs/co-cutover-001/CO-CUTOVER-001-PRODUCTION-DATA-CUTOVER-VALIDATION-REPORT.md",
  "AWAITING ADMINISTRATOR REVIEW",
);

const service = readFileSync(
  resolve(root, "server/services/production-reset/production-reset.service.ts"),
  "utf8",
);
if (!service.includes("deletionPerformed: false")) {
  failures.push("analyseCutover must set deletionPerformed: false");
}

if (failures.length) {
  console.error("CO-CUTOVER-001 verify FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-CUTOVER-001 verify PASSED");
console.log(" - Cutover analysis API + filters present");
console.log(" - Validation report present (awaiting admin review)");
console.log(" - No deletion performed by this script");
