/**
 * P1 — Participant document isolation (Contact-authoritative match).
 * Static assertions against association.ts source — no data mutation.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

const assoc = readFileSync(
  join(root, "src/lib/document-registry/association.ts"),
  "utf8",
);
const workspace = readFileSync(
  join(root, "src/components/catalyst-one/document-center/document-center-workspace.tsx"),
  "utf8",
);
const categories = readFileSync(
  join(root, "src/components/catalyst-one/document-center/document-categories-table.tsx"),
  "utf8",
);

function must(cond, label) {
  if (!cond) failures.push(label);
}

must(assoc.includes("Contact-authoritative"), "association: Contact-authoritative comment");
must(assoc.includes("if (!selected) return false"), "association: never fail-open on parse");
must(
  assoc.includes("if (contactId && selectedContactId)") &&
    assoc.includes("return contactId === selectedContactId"),
  "association: Contact ID equality gate",
);
must(workspace.includes("scopedReceipts"), "workspace: scoped receipts for checklist");
must(workspace.includes("registryRecordToVersions"), "workspace: versions from scoped registry");
must(workspace.includes("activeRecordsForType"), "workspace: owner-scoped type records");
must(
  categories.includes("const hasFiles = count > 0"),
  "categories: View/Replace only when scoped file count > 0",
);
must(
  categories.includes("activeRecordsForType(storageRef)"),
  "categories: Replace uses owner-scoped records",
);
must(!workspace.includes("loadDocumentVersions("), "workspace: no unscoped loadDocumentVersions");

if (failures.length) {
  console.error("P1 participant isolation verify FAILED:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log("P1 participant isolation verify OK — Contact-authoritative load path present.");
