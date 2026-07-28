#!/usr/bin/env node
/**
 * CO-DOM-001 — Enterprise Borrower & Contact Model static verification.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function mustExist(rel) {
  const abs = join(root, rel);
  if (!existsSync(abs)) failures.push(`Missing file: ${rel}`);
  return abs;
}

function mustContain(rel, needle, label) {
  const abs = mustExist(rel);
  const text = readFileSync(abs, "utf8");
  if (!text.includes(needle)) failures.push(`${label ?? rel}: expected "${needle}"`);
}

mustExist("prisma/migrations/20260727120000_co_dom_001_borrower_contact_model/migration.sql");
mustContain("prisma/schema.prisma", "OpportunityPrimaryBorrowerKind", "schema enum");
mustContain("prisma/schema.prisma", "employee", "employee role");
mustContain("src/constants/opportunity-primary-borrower.ts", "OPPORTUNITY_PRIMARY_BORROWER_KIND");
mustContain("src/lib/enterprise-opportunity/start-opportunity-from-company.ts", "startOpportunityFromCompany");
mustContain("src/components/catalyst-one/contacts/contact-creation-intent-screen.tsx", '"individual" | "company"');
mustNotContain("src/components/catalyst-one/contacts/contact-creation-intent-screen.tsx", "individual_company");

function mustNotContain(rel, needle, label) {
  const abs = mustExist(rel);
  const text = readFileSync(abs, "utf8");
  if (text.includes(needle)) failures.push(`${label ?? rel}: must not contain "${needle}"`);
}

mustContain("src/constants/enterprise-company-master/index.ts", "ECM_COMPANY_REPRESENTATIVE_ROLES");
mustContain("src/components/catalyst-one/opportunity-workspace/workspace-borrower-party-sections.tsx", "Borrower Structure");
mustContain("server/repositories/enterprise-opportunity/enterprise-opportunity.repository.ts", "findActiveForCompanyProduct");

if (failures.length) {
  console.error("CO-DOM-001 verify FAILED:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log("CO-DOM-001 verify OK — borrower/contact model artefacts present.");
