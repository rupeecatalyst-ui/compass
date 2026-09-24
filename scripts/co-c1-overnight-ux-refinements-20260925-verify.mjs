/**
 * Overnight UX refinements 2026-09-25 — isolated worktree proofs only.
 * No production database, no migrate, no deploy.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, {
  get() {
    databaseAttempts += 1;
    throw new Error("DATABASE_FORBIDDEN");
  },
});

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const { resolveProductJourneyFieldLabel, parseProductJourneyFields } = await import("../src/lib/product-journey/index.ts");
const { buildDocumentWorkspaceHref } = await import("../src/lib/document-workspace/context-lock.ts");
const { ROUTES } = await import("../src/constants/routes.ts");
const { STICKY_NOTE_WORKSPACE_BLOCKS } = await import("../src/constants/sticky-notes.ts");
const {
  emptyAdditionalEligibilityFilters,
} = await import("../src/lib/product-programme-operations/additional-eligibility-filters/index.ts");

const AGE_ID = "assessment:borrower.ageYears";

{
  assert.equal(resolveProductJourneyFieldLabel(AGE_ID), "Age");
  assert.equal(resolveProductJourneyFieldLabel(AGE_ID, AGE_ID), "Age");
  assert.equal(resolveProductJourneyFieldLabel(AGE_ID, "Age"), "Age");
  assert.equal(resolveProductJourneyFieldLabel(AGE_ID, "Borrower Age"), "Borrower Age");
  const parsed = parseProductJourneyFields([{ fieldId: AGE_ID }]);
  assert.equal(parsed[0]?.fieldId, AGE_ID);
  assert.equal(parsed[0]?.label, "Age");
  console.log("PASS  A friendly Age label — ID unchanged");
}

{
  const editor = read("src/components/catalyst-one/product-programme-operations/programme-editor.tsx");
  const ids = [
    "programme-identity",
    "applicant-constitution",
    "geography-transaction",
    "eligibility",
    "loan-amount-tenure",
    "pricing-roi",
    "policy",
    "lod",
    "effective-dates",
    "completeness-review",
  ];
  assert.equal(ids.length, 10);
  for (const id of ids) {
    assert.match(editor, new RegExp(`id: "${id}"`));
    assert.match(editor, new RegExp(`id="${id}"`));
  }
  assert.match(editor, /function scrollToProgrammeSection/);
  assert.match(editor, /scrollIntoView/);
  assert.match(editor, /type="button"/);
  assert.match(editor, /role="navigation" aria-label="Programme sections"/);
  assert.doesNotMatch(editor, /function scrollToProgrammeSection[\s\S]{0,180}router\./);
  console.log("PASS  B ten section chips scroll in-page");
}

{
  const editor = read("src/components/catalyst-one/product-programme-operations/programme-editor.tsx");
  const builder = read("src/components/catalyst-one/product-programme-operations/additional-eligibility-filter-builder.tsx");
  const eligibilitySlice = editor.slice(
    editor.indexOf('data-section="eligibility"'),
    editor.indexOf('data-section="loan-amount-tenure"'),
  );
  assert.match(eligibilitySlice, /AdditionalEligibilityFilterBuilder/);
  assert.match(builder, /Additional Eligibility Filters/);
  assert.match(builder, /\+ Add Filter/);
  assert.match(builder, /\+ Add Group/);
  assert.match(builder, /ALL \/ AND/);
  assert.match(builder, /ANY \/ OR/);
  assert.match(builder, /onChange\(\{ version: 1,/);
  const empty = emptyAdditionalEligibilityFilters();
  assert.equal(empty.version, 1);
  assert.equal(empty.root.kind, "group");
  assert.equal(empty.root.combinator, "AND");
  assert.deepEqual(empty.root.children, []);
  console.log("PASS  C Additional Eligibility Filters stay in Eligibility");
}

{
  const href = buildDocumentWorkspaceHref({
    opportunityId: "opp_overnight_demo_01",
    contactId: "ctc_overnight_demo_01",
  });
  assert.equal(href.startsWith(`${ROUTES.DOCUMENT_WORKSPACE}?`), true);
  assert.match(href, /opportunityId=opp_overnight_demo_01/);
  assert.match(href, /contactId=ctc_overnight_demo_01/);
  const workspace = read("src/components/catalyst-one/opportunity-workspace/opportunity-workspace.tsx");
  const panel = read("src/components/catalyst-one/opportunity-workspace/workspace-documents-panel.tsx");
  assert.match(workspace, /buildDocumentWorkspaceHref/);
  assert.match(workspace, /onUploadDocuments=\{\(\) =>/);
  assert.doesNotMatch(workspace, /buildAuthorisedDocumentWorkspaceHref/);
  assert.doesNotMatch(workspace, /if \(tab !== "documents"\) return;/);
  assert.match(panel, /Open Document Workspace/);
  assert.match(panel, /buildDocumentWorkspaceHref/);
  console.log("PASS  D Documents action targets authorized Document Workspace");
}

{
  assert.equal(STICKY_NOTE_WORKSPACE_BLOCKS.length, 4);
  assert.deepEqual(
    STICKY_NOTE_WORKSPACE_BLOCKS.map((block) => block.field),
    ["title", "body", "checklist", "reminderAt"],
  );
  const ui = read("src/components/catalyst-one/sticky-notes/sticky-notes-workspace.tsx");
  assert.match(ui, /listStickyNotes/);
  assert.match(ui, /createStickyNote/);
  assert.match(ui, /updateStickyNote/);
  assert.match(ui, /archiveStickyNote/);
  assert.match(ui, /convertStickyNoteToTask/);
  assert.match(ui, /data-sticky-block=/);
  assert.match(ui, /bg-card p-4 text-card-foreground/);
  assert.doesNotMatch(ui, /sm:max-w-lg/);
  console.log("PASS  E four-block notes reuse existing store");
}

assert.equal(databaseAttempts, 0);
console.log("DATABASE_ACCESSED: NO");
console.log("CO_C1_OVERNIGHT_UX_REFINEMENTS_20260925_VERIFY: PASS");
