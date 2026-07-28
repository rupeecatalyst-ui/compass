#!/usr/bin/env node
/**
 * CO-DOM-001A — Enterprise Borrower Domain Migration static verification.
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
  if (!existsSync(abs)) return;
  const text = readFileSync(abs, "utf8");
  if (!text.includes(needle)) failures.push(`${label ?? rel}: expected "${needle}"`);
}

function mustNotContain(rel, needle, label) {
  const abs = mustExist(rel);
  if (!existsSync(abs)) return;
  const text = readFileSync(abs, "utf8");
  if (text.includes(needle)) failures.push(`${label ?? rel}: must not contain "${needle}"`);
}

mustExist("src/lib/enterprise-borrower-identity/index.ts");
mustExist("src/lib/enterprise-borrower-identity/resolve-borrower-identity.ts");
mustExist("docs/co-dom-001a/CO-DOM-001A-DOMAIN-MIGRATION-REPORT.md");
mustExist(".cursor/rules/enterprise-borrower-domain.mdc");

mustContain(
  "src/lib/enterprise-borrower-identity/resolve-borrower-identity.ts",
  "resolveOpportunityBorrowerIdentity",
  "opportunity identity helper",
);
mustContain(
  "src/lib/enterprise-borrower-identity/resolve-borrower-identity.ts",
  "resolveDealBorrowerIdentity",
  "deal identity helper",
);
mustContain(
  "src/lib/enterprise-opportunity/map-opportunity-to-registry-row.ts",
  "borrowerDisplayNameOrDash",
  "opportunity registry mapper",
);
mustContain(
  "src/lib/enterprise-deal/map-deal-to-registry-row.ts",
  "borrowerDisplayNameOrDash",
  "deal registry mapper",
);
mustContain(
  "src/lib/lead-opportunity-journey/opportunity-runtime-adapter.ts",
  "resolveOpportunityBorrowerIdentity",
  "runtime adapter",
);
mustContain(
  "src/lib/enterprise-deal/deal-create-from-opportunity.ts",
  "resolveOpportunityBorrowerIdentity",
  "deal create from opportunity",
);
mustContain(
  "src/lib/lead-opportunity-journey/active-context.ts",
  "primaryBorrowerKind",
  "active context kind",
);
mustContain(
  "src/lib/lead-opportunity-journey/active-context.ts",
  "companyId",
  "active context company",
);
mustContain(
  "src/lib/enterprise-session/session-context.ts",
  "activeCompanyId",
  "session company",
);
mustContain(
  "src/app/api/enterprise-opportunities/route.ts",
  "findActiveForCompanyProduct",
  "API company active lookup",
);
mustContain(
  "server/services/enterprise-deal/deal-serialize.ts",
  "primaryBorrowerKind",
  "deal serialize kind",
);
mustContain(
  "server/services/enterprise-opportunity/index.ts",
  "findActiveForCompanyProduct",
  "opportunity service company active",
);

// Anti-patterns — registry must not hardcode contact-only customer name
mustNotContain(
  "src/lib/enterprise-opportunity/map-opportunity-to-registry-row.ts",
  "customerName: opp.primaryContactName",
  "registry must not use contact-only customerName",
);
mustNotContain(
  "src/lib/enterprise-deal/map-deal-to-registry-row.ts",
  "borrowerName: deal.primaryContactName",
  "deal registry must not use contact-only borrowerName",
);

if (failures.length) {
  console.error(
    "CO-DOM-001A verify FAILED:\n" + failures.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  "CO-DOM-001A verify OK — borrower domain migration artefacts + SSOT wiring present.",
);
