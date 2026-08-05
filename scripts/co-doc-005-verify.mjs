/**
 * CO-DOC-005 — Document Package Registry verify (static). No migrate / no deploy.
 * Run: node scripts/co-doc-005-verify.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

for (const rel of [
  "src/types/document-package.ts",
  "src/lib/document-package/store.ts",
  "src/lib/document-package/server-sync.ts",
  "src/lib/document-package/index.ts",
  "server/services/enterprise-document-packages/enterprise-document-package.service.ts",
  "src/app/api/enterprise-document-packages/route.ts",
  "src/components/catalyst-one/document-center/document-registry-record-preview-dialog.tsx",
  "prisma/migrations/20260729160000_co_doc_005_document_package_registry/migration.sql",
  "docs/co-doc-005/CO-DOC-005-DOCUMENT-PACKAGE-REGISTRY-READINESS-REPORT.md",
]) {
  assert.ok(exists(rel), `missing ${rel}`);
}

const types = read("src/types/document-package.ts");
assert.match(types, /storageStatus/);
assert.match(types, /schemaVersion: 2/);
assert.match(types, /DurableDocumentPackageDto/);

const store = read("src/lib/document-package/store.ts");
assert.match(store, /DOCUMENT_PACKAGE_STORAGE_KEY_V1/);
assert.match(store, /mergeDurablePackagesIntoLocalCache/);
assert.match(store, /reconstructPackagesFromRegistryRecords/);

const ops = read("src/lib/document-package/index.ts");
assert.match(ops, /syncDocumentPackageToServer/);
assert.match(ops, /previewDocumentRegistryRecord/);
assert.match(ops, /getDocumentPreviewUrl/);

const preview = read(
  "src/components/catalyst-one/document-center/document-registry-record-preview-dialog.tsx",
);
assert.match(preview, /previewDocumentRegistryRecord/);
assert.ok(!/openViewer\(record\.typeRef\)/.test(preview));

const workspace = read(
  "src/components/catalyst-one/document-center/document-center-workspace.tsx",
);
assert.match(workspace, /hydrateDocumentPackagesFromServer/);
assert.match(workspace, /setRegistryPreviewId\(record\.id\)/);
assert.match(workspace, /data-dc-action="upload-files"/);
assert.match(workspace, /data-dc-action="upload-folder"/);

const sync = read("src/lib/document-package/server-sync.ts");
assert.match(sync, /searchDocumentPackages/);
assert.match(sync, /fileHits/);

const searchProviders = read("src/mission-control/search/providers.ts");
assert.match(searchProviders, /searchDocumentPackages/);
assert.match(searchProviders, /Document Package Registry/);

const palette = read("src/components/layout/command-palette.tsx");
assert.match(palette, /searchDocumentPackages/);
assert.match(palette, /Document Packages/);

const mig = read(
  "prisma/migrations/20260729160000_co_doc_005_document_package_registry/migration.sql",
);
assert.match(mig, /PREPARED FOR APPROVAL/);
assert.match(mig, /enterprise_document_packages/);
assert.match(mig, /enterprise_document_package_audits/);
assert.ok(!/DROP TABLE/i.test(mig));

const schema = read("prisma/schema.prisma");
assert.match(schema, /model EnterpriseDocumentPackage/);
assert.match(schema, /model EnterpriseDocumentPackageAudit/);

console.log("CO-DOC-005 Document Package Registry verify: PASS");
console.log("NOTE: Migration prepared only — do not execute without Product Owner approval.");
