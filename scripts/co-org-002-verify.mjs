#!/usr/bin/env node
/**
 * CO-ORG-002 — static gate: registry soft-delete adapters + Product Library quarantine.
 * Engineering gate only — does NOT satisfy Business Certification.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function mustExist(rel, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) failures.push(`${label ?? rel}: file missing`);
}

function mustContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing file: ${rel}`);
    return;
  }
  const text = readFileSync(abs, "utf8");
  if (!text.includes(needle)) failures.push(`${label ?? rel}: expected "${needle}"`);
}

function mustNotContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing file: ${rel}`);
    return;
  }
  const text = readFileSync(abs, "utf8");
  if (text.includes(needle)) failures.push(`${label ?? rel}: must not contain "${needle}"`);
}

// Soft-delete adapters exist
mustExist("server/services/soft-delete/adapters/opportunity.adapter.ts", "opportunity adapter");
mustExist("server/services/soft-delete/adapters/deal.adapter.ts", "deal adapter");
mustExist(
  "server/services/soft-delete/adapters/organization-document.adapter.ts",
  "organization document adapter",
);

mustContain(
  "server/services/soft-delete/adapters/opportunity.adapter.ts",
  "prisma.enterpriseOpportunity",
  "opportunity adapter uses Prisma",
);
mustContain(
  "server/services/soft-delete/adapters/deal.adapter.ts",
  "prisma.enterpriseDeal",
  "deal adapter uses Prisma",
);
mustContain(
  "server/services/soft-delete/adapters/organization-document.adapter.ts",
  "prisma.organizationDocument",
  "org document adapter uses Prisma",
);

// Service imports real adapters (not stubs)
mustContain(
  "server/services/soft-delete/soft-delete.service.ts",
  'from "./adapters/opportunity.adapter"',
  "service imports opportunity adapter",
);
mustContain(
  "server/services/soft-delete/soft-delete.service.ts",
  'from "./adapters/deal.adapter"',
  "service imports deal adapter",
);
mustContain(
  "server/services/soft-delete/soft-delete.service.ts",
  'from "./adapters/organization-document.adapter"',
  "service imports org document adapter",
);
mustNotContain(
  "server/services/soft-delete/soft-delete.service.ts",
  "loanFileSoftDeleteAdapter",
  "service must not use loan_files stub",
);
mustNotContain(
  "server/services/soft-delete/soft-delete.service.ts",
  "documentSoftDeleteAdapter",
  "service must not use documents stub",
);

// Stubs no longer export replaced modules
mustNotContain(
  "server/services/soft-delete/adapters/stub.adapters.ts",
  'stubAdapter("opportunities")',
  "stub must not export opportunities",
);
mustNotContain(
  "server/services/soft-delete/adapters/stub.adapters.ts",
  'stubAdapter("loan_files")',
  "stub must not export loan_files",
);
mustNotContain(
  "server/services/soft-delete/adapters/stub.adapters.ts",
  'stubAdapter("documents")',
  "stub must not export documents",
);
mustContain(
  "server/services/soft-delete/adapters/stub.adapters.ts",
  'stubAdapter("tasks")',
  "stub still exports tasks",
);

// Product Library quarantine
mustContain(
  "src/lib/product-library/product-store.ts",
  "CO-ORG-002",
  "product-store quarantine comment",
);
mustContain(
  "src/components/catalyst-one/product-library/product-registry-view.tsx",
  "ProductLibrarySsotCallout",
  "registry SSOT callout",
);
mustContain(
  "src/lib/enterprise-lender-registry/local-store.ts",
  "CO-ORG-002",
  "lender local-store quarantine comment",
);

// Docs
mustExist("docs/co-org-002/CO-ORG-002-REGISTRY-ACTIVATION-REPORT.md", "activation report");

// npm script
mustContain("package.json", "verify:co-org-002", "npm verify script");

if (failures.length) {
  console.error("CO-ORG-002 verify FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log(
  "CO-ORG-002 verify PASS (engineering gate only — run Recovery E2E on live app with ENTERPRISE_PERSISTENCE_MODE=prisma).",
);
