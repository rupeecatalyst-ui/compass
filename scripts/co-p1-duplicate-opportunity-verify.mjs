/**
 * P1 — Duplicate Opportunity creation prevention (static verify).
 * No data mutation. Confirms idempotent Draft Start wiring.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function mustContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing: ${rel}`);
    return;
  }
  const text = readFileSync(abs, "utf8");
  if (!text.includes(needle)) failures.push(`${label ?? rel}: expected "${needle}"`);
}

mustContain(
  "server/repositories/enterprise-opportunity/enterprise-opportunity.repository.ts",
  "findOpenDraftForContact",
  "repo open draft contact",
);
mustContain(
  "server/repositories/enterprise-opportunity/enterprise-opportunity.repository.ts",
  "findOpenDraftForCompany",
  "repo open draft company",
);
mustContain(
  "server/services/enterprise-opportunity/index.ts",
  "pg_advisory_lock",
  "service draft create lock",
);
mustContain(
  "server/services/enterprise-opportunity/index.ts",
  "findOpenDraftForContact",
  "service open draft",
);
mustContain(
  "src/app/api/enterprise-opportunities/route.ts",
  "findOpenDraft",
  "API findOpenDraft",
);
mustContain(
  "src/lib/enterprise-opportunity/start-opportunity-from-contact.ts",
  "findOpenDraftForContact",
  "client contact reuse",
);
mustContain(
  "src/lib/enterprise-opportunity/start-opportunity-from-company.ts",
  "findOpenDraftForCompany",
  "client company reuse",
);
mustContain(
  "src/components/catalyst-one/contacts/contact-workspace-modal.tsx",
  "startingJourneyLockRef",
  "contact in-flight lock",
);
mustContain(
  "src/components/catalyst-one/companies/company-workspace-modal.tsx",
  "startingJourneyLockRef",
  "company in-flight lock",
);
mustContain(
  "src/components/catalyst-one/lead-information/lead-information-workspace.tsx",
  "updateOpportunity",
  "Lead Information PATCH only",
);

if (failures.length) {
  console.error("P1 duplicate Opportunity verify FAILED:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log("P1 duplicate Opportunity verify OK — Draft Start is idempotent (preventive only).");
