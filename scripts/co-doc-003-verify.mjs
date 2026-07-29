/**
 * CO-DOC-003 — Static verify (no migrate / no deploy).
 * Run: node scripts/co-doc-003-verify.mjs
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
  "src/constants/document-package/index.ts",
  "src/lib/document-package/index.ts",
  "src/lib/document-package/store.ts",
  "src/lib/document-package/zip.ts",
  "src/components/catalyst-one/document-center/document-packages-panel.tsx",
  "prisma/migrations/20260729140000_co_doc_003_document_package_upload/migration.sql",
  "docs/co-doc-003/CO-DOC-003-DOCUMENT-PACKAGE-UPLOAD-READINESS-REPORT.md",
]) {
  assert.ok(exists(rel), `missing ${rel}`);
}

const workspace = read(
  "src/components/catalyst-one/document-center/document-center-workspace.tsx",
);
assert.match(workspace, /data-dc-action="upload-files"/);
assert.match(workspace, /data-dc-action="upload-folder"/);
assert.match(workspace, /uploadFolderAsDocumentPackage/);
assert.match(workspace, /DocumentPackagesPanel/);
assert.match(workspace, /\+ Upload Files/);
assert.match(workspace, /\+ Upload Folder/);

const types = read("src/types/document-registry.ts");
assert.match(types, /packageId\?:/);
assert.match(types, /folder_package/);

const mig = read(
  "prisma/migrations/20260729140000_co_doc_003_document_package_upload/migration.sql",
);
assert.match(mig, /PREPARED FOR APPROVAL/);
assert.match(mig, /enterprise_document_packages/);
assert.match(mig, /package_id/);
assert.ok(!/DROP TABLE/i.test(mig), "migration must not drop tables");

const panel = read(
  "src/components/catalyst-one/document-center/document-packages-panel.tsx",
);
assert.match(panel, /Open Folder/);
assert.match(panel, /Download Folder/);
assert.match(panel, /Add More Files/);

console.log("CO-DOC-003 Document Package Upload verify: PASS");
console.log("NOTE: Migration is prepared only — do not execute without Product Owner approval.");
