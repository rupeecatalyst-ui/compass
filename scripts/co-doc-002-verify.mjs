#!/usr/bin/env node
/**
 * CO-DOC-002 — Document persistence association static verification.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function mustExist(rel) {
  const abs = join(root, rel);
  if (!existsSync(abs)) failures.push(`Missing: ${rel}`);
  return abs;
}

function mustContain(rel, needle, label) {
  const abs = mustExist(rel);
  if (!existsSync(abs)) return;
  const text = readFileSync(abs, "utf8");
  if (!text.includes(needle)) failures.push(`${label ?? rel}: expected "${needle}"`);
}

mustExist("docs/co-doc-002/CO-DOC-002-DOCUMENT-PERSISTENCE-INVESTIGATION-REPORT.md");
mustExist("src/lib/document-registry/association.ts");
mustContain(
  "src/lib/document-registry/store.ts",
  "healDocumentOwnerAssociations",
  "heal helper",
);
mustContain(
  "src/lib/document-registry/store.ts",
  "ListDocumentsRuntimeOptions",
  "reclaim options",
);
mustContain(
  "src/lib/document-registry/association.ts",
  "recordMatchesDocumentOwnerScope",
  "owner match SSOT",
);
mustContain(
  "src/components/catalyst-one/document-center/document-center-workspace.tsx",
  "listDocumentsForOpportunityRuntime",
  "Document Center dual-key list",
);
mustContain(
  "src/components/catalyst-one/document-center/document-center-workspace.tsx",
  "healDocumentOwnerAssociations",
  "Document Center heal",
);
mustContain(
  "src/components/catalyst-one/opportunity-workspace/opportunity-workspace-context.tsx",
  "listDocumentsForOpportunityRuntime",
  "OW hydrate from registry",
);
mustContain(
  "src/components/catalyst-one/deal-workspace/deal-documents-projection.tsx",
  "recordMatchesDocumentOwnerScope",
  "Deal docs owner match",
);

mustContain(
  "src/lib/demo-seed/purge-client-demo-data.ts",
  "NEVER purge Document Registry",
  "purge must not wipe Document Registry",
);
mustContain(
  "src/lib/document-registry/server-sync.ts",
  "hydrateDocumentRegistryFromServer",
  "server hydrate",
);
mustContain(
  "server/services/enterprise-transaction-documents/enterprise-transaction-document.service.ts",
  "enterpriseTransactionDocumentService",
  "durable document service",
);
mustExist("prisma/migrations/20260727194500_co_doc_002_durable_transaction_documents/migration.sql");
mustExist("src/app/api/enterprise-transaction-documents/route.ts");

if (failures.length) {
  console.error("CO-DOC-002 verify FAILED:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log("CO-DOC-002 verify OK — association + purge fix + durable server sync present.");
console.log("NOTE: OPP-2026-000043 historical uploads purged from localStorage require re-upload after this fix.");
