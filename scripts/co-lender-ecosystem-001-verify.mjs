/**
 * CO-LENDER-ECOSYSTEM-001 — static activation verify (no DB writes).
 * Confirms wiring + data-protection artefacts. Does not mutate live data.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) failures.push(`Missing: ${rel}`);
}

function mustContain(rel, needle) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    failures.push(`Missing: ${rel}`);
    return;
  }
  const text = fs.readFileSync(full, "utf8");
  if (!text.includes(needle)) failures.push(`${rel} missing expected: ${needle}`);
}

mustExist("docs/co-lender-ecosystem-001/CO-LENDER-ECOSYSTEM-001-ACTIVATION-REPORT.md");
mustExist(".cursor/rules/enterprise-lender-ecosystem-live-data.mdc");
mustExist(
  "prisma/migrations/20260805140000_co_lender_ecosystem_001_contact_departments/migration.sql",
);
mustExist("server/repositories/lender-registry/lender-contacts-documents.repository.ts");
mustExist("src/app/api/lender-registry/lenders/[lenderId]/contacts/route.ts");
mustExist("src/app/api/lender-registry/lenders/[lenderId]/documents/route.ts");

mustContain(
  "src/lib/enterprise-lender-registry/index.ts",
  "/api/lender-registry/lenders/${lenderId}/contacts",
);
mustContain(
  "src/lib/enterprise-lender-registry/index.ts",
  "/api/lender-registry/lenders/${lenderId}/documents",
);
mustContain("prisma/schema.prisma", "regional_head");
mustContain(
  "prisma/migrations/20260805140000_co_lender_ecosystem_001_contact_departments/migration.sql",
  "ADD VALUE IF NOT EXISTS 'sales'",
);
mustContain(
  "server/repositories/lender-registry/lender-contacts-documents.repository.ts",
  "isDeleted: true",
);
mustContain(
  "docs/co-lender-ecosystem-001/CO-LENDER-ECOSYSTEM-001-ACTIVATION-REPORT.md",
  "NO existing live data was modified",
);

if (failures.length) {
  console.error("CO-LENDER-ECOSYSTEM-001 verify FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-LENDER-ECOSYSTEM-001 verify OK (static; no live data touched).");
