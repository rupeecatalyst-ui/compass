#!/usr/bin/env node
/**
 * CO-MDM-001 — Enterprise Master Data Management static verify.
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

mustExist("src/constants/enterprise-mdm/index.ts");
mustExist("src/components/catalyst-one/enterprise-mdm/enterprise-mdm-hub.tsx");
mustExist("src/app/(dashboard)/admin/enterprise-mdm/page.tsx");
mustExist("src/app/(dashboard)/admin/product-programs/page.tsx");
mustExist("src/app/(dashboard)/admin/document-types/page.tsx");
mustExist("docs/co-mdm-001/CO-MDM-001-ENTERPRISE-MASTER-DATA-READINESS-REPORT.md");
mustExist(".cursor/rules/enterprise-mdm.mdc");
mustExist("prisma/migrations/20260727180000_co_mdm_001_reference_master_domains/migration.sql");

mustContain("src/constants/enterprise-master-data/tier0-metadata.ts", "business_source");
mustContain("src/constants/enterprise-master-data/tier0-metadata.ts", "customer_segment");
mustContain("src/constants/enterprise-master-data/tier0-metadata.ts", "relationship_type");
mustContain("server/services/reference-master/seed-reference-masters.service.ts", "Never overwrite administrator");
mustContain("server/services/tier2-registry/seed-tier2-registries.service.ts", "preserve administrator changes");
mustContain(
  "src/components/catalyst-one/reference-master-admin/reference-master-admin-workspace.tsx",
  "Archive",
);
mustContain(
  "src/components/catalyst-one/reference-master-admin/reference-master-admin-workspace.tsx",
  "Restore",
);
mustContain(
  "src/components/catalyst-one/reference-master-admin/reference-master-admin-workspace.tsx",
  "Duplicate",
);
mustContain("src/lib/enterprise-mdm/business-source-options.ts", "fetchBusinessSourceOptions");
mustContain("src/constants/enterprise-mdm/index.ts", "canWriteEnterpriseMdm");

if (failures.length) {
  console.error("CO-MDM-001 verify FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-MDM-001 verify PASSED");
console.log(" - MDM hub, lookup CRUD, seed protect, new domains present");
