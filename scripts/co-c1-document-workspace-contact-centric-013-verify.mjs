/**
 * CO-C1-DOCUMENT-WORKSPACE-CONTACT-CENTRIC-013
 * Contact-centric grid + context-locked desk. Enterprise Document Registry remains SSOT.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DOCUMENT_WORKSPACE_OPEN_CONTACT_LABEL,
  DOCUMENT_WORKSPACE_VIEW_DOCUMENTS_LABEL,
  DOCUMENT_WORKSPACE_REFINEMENT_ID,
} from "../src/constants/document-workspace-contact-centric.ts";
import { DOCUMENT_WORKSPACE_CARD_GRID_OPEN_LABEL } from "../src/constants/document-workspace-card-grid.ts";
import {
  buildContact360Href,
  displayDocumentWorkspacePartyName,
} from "../src/lib/document-workspace/contact-href.ts";
import { summarizeDocumentWorkspaceCategoryReadiness } from "../src/lib/document-workspace/category-readiness.ts";
import { mergeDocumentWorkspaceRows } from "../src/lib/document-workspace/merge-rows.ts";
import { buildDocumentWorkspaceCardGroups } from "../src/lib/document-workspace/transaction-card-grid.ts";
import { ENTERPRISE_MARKETING_EXECUTION_ENABLED } from "../src/constants/enterprise-marketing-engine/safety.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function expect(name, condition) {
  if (condition) console.log(`PASS  ${name}`);
  else {
    failures.push(name);
    console.log(`FAIL  ${name}`);
  }
}

function mustContain(rel, needle, label = needle) {
  expect(`${rel} contains ${label}`, read(rel).includes(needle));
}

function mustNotContain(rel, needle, label = needle) {
  expect(`${rel} omits ${label}`, !read(rel).includes(needle));
}

const workspace = "src/components/catalyst-one/document-workspace/document-workspace.tsx";
const cardUi = "src/components/catalyst-one/document-workspace/document-workspace-transaction-card.tsx";
const switcher = "src/components/catalyst-one/document-workspace/document-workspace-switcher.tsx";
const store = "src/lib/document-registry/store.ts";

expect("refinement id", DOCUMENT_WORKSPACE_REFINEMENT_ID === "CO-C1-DOCUMENT-WORKSPACE-CONTACT-CENTRIC-013");
expect("open contact label", DOCUMENT_WORKSPACE_OPEN_CONTACT_LABEL === "Open Contact");
expect("view documents label", DOCUMENT_WORKSPACE_VIEW_DOCUMENTS_LABEL === "View Documents");
expect("012 CTA aligned to View Documents", DOCUMENT_WORKSPACE_CARD_GRID_OPEN_LABEL === "View Documents");
expect("marketing execution remains disabled", ENTERPRISE_MARKETING_EXECUTION_ENABLED === false);

mustContain(cardUi, "DOCUMENT_WORKSPACE_OPEN_CONTACT_LABEL", "Open Contact CTA");
mustContain(cardUi, "DOCUMENT_WORKSPACE_VIEW_DOCUMENTS_LABEL", "View Documents CTA");
mustContain(cardUi, "data-open-contact", "contact action");
mustContain(cardUi, "LenderLogo", "lender logo");
mustContain(switcher, "buildContact360Href", "canonical Contact 360");
mustContain(switcher, "displayDocumentWorkspacePartyName", "company/contact display");
mustContain(switcher, "grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3", "3/2/1 columns");
mustContain(workspace, 'data-document-workspace-desk="014"', "dedicated full-screen desk");
mustNotContain(workspace, "lg:min-w-[50vw]", "overlapping half workspace removed");
mustNotContain(workspace, "Half workspace", "half workspace control removed");
mustContain(workspace, "DocumentWorkspaceOpsBar", "operations bar");
mustContain(workspace, "uploadFolderAsDocumentPackage", "folder upload SSOT");
mustContain(workspace, "replaceDocumentInRegistry", "replace version");
mustContain(workspace, "deleteDocumentFromRegistry", "governed remove");
mustContain(workspace, "queueOutboxMessage", "email dry-run");
mustContain(workspace, "pauseOutboxCountdown", "email not sent");
mustContain(workspace, "addCustomDocumentRequirement", "other documents");
mustContain(workspace, "reclassifyDocumentRegistryRecord", "inbound attach");
mustContain(workspace, "markItemRemarks", "internal note");
mustContain(workspace, "stampDocumentReview", "review/received");
mustContain(store, "reclassifyDocumentRegistryRecord", "reclassify stays on registry");
mustNotContain(workspace, "prisma migrate", "no migration from UI");
mustNotContain(workspace, "updateDeal(", "no deal mutation");
mustNotContain(workspace, "updateOpportunity(", "no opportunity mutation");
mustNotContain(cardUi, "primaryContactEmail", "no email on cards");
mustNotContain(switcher, "window.prompt", "no name resolution prompt");

expect(
  "company borrower name wins when company id present",
  displayDocumentWorkspacePartyName({
    companyId: "co_1",
    companyName: "Acme Homes Pvt Ltd",
    contactName: "Ravi",
  }) === "Acme Homes Pvt Ltd",
);
expect(
  "contact name used when no company",
  displayDocumentWorkspacePartyName({
    companyId: null,
    companyName: "",
    contactName: "Ravi",
  }) === "Ravi",
);
expect(
  "contact 360 uses canonical contact id",
  buildContact360Href({ contactId: "contact_abcdefgh", companyId: null }) ===
    "/contacts?contact=contact_abcdefgh",
);
expect(
  "company 360 uses canonical company id",
  buildContact360Href({ contactId: null, companyId: "company_abcdefgh" }) ===
    "/contacts?company=company_abcdefgh",
);
expect("pii-looking ids are refused", buildContact360Href({ contactId: "Ravi Sharma", companyId: null }) === null);

const rows = mergeDocumentWorkspaceRows({
  records: [
    {
      id: "r1",
      typeRef: "pan",
      categoryLabel: "KYC",
      originalFilename: "pan-1.pdf",
      displayName: "PAN",
      status: "active",
      links: { opportunityId: "opp_1" },
      versions: [
        { id: "v1", version: 1, originalFilename: "pan-1.pdf", displayName: "PAN", fileSizeBytes: 1, mimeType: "application/pdf", blobId: "b1", uploadedBy: "RM", uploadedAt: "2026-01-01T00:00:00.000Z", isCurrent: true },
        { id: "v2", version: 2, originalFilename: "pan-2.pdf", displayName: "PAN", fileSizeBytes: 1, mimeType: "application/pdf", blobId: "b2", uploadedBy: "RM", uploadedAt: "2026-01-02T00:00:00.000Z", isCurrent: false },
      ],
      uploadedBy: "RM",
      uploadedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      version: 2,
      fileSizeBytes: 1,
      mimeType: "application/pdf",
      reviewStatus: "accepted",
    },
  ],
  lodItems: [
    { typeRef: "pan", label: "PAN", category: "critical", moduleId: "kyc", moduleLabel: "KYC", mandatory: true, critical: true, status: "verified" },
    { typeRef: "aadhaar", label: "Aadhaar", category: "critical", moduleId: "kyc", moduleLabel: "KYC", mandatory: true, critical: true, status: "pending" },
  ],
  participants: [],
});
const summary = summarizeDocumentWorkspaceCategoryReadiness(rows);
expect("category readiness available", summary.available === true);
expect(
  "two files in one category do not count as two complete categories",
  summary.available && summary.required === 2 && summary.accepted === 1 && summary.percent === 50,
);
expect("received files reported separately", summary.available && summary.received === 2);

const grouped = buildDocumentWorkspaceCardGroups(
  [
    {
      opportunityId: "opp_new",
      opportunityNumber: "OPP-9",
      borrowerName: "Newest Borrower",
      product: "Home Loan",
      amountLabel: "₹1",
      stage: "Documents",
      lifecycleStatus: "active",
      assignedRc: "Arun",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      contactId: "contact_abcdefgh",
      deals: [],
    },
  ],
  { chip: "all" },
);
expect("canonical grouping still uses opportunity id", grouped[0]?.opportunityId === "opp_new");

mustContain("prisma/schema.prisma", "model EnterpriseLenderProgram", "product programmes schema untouched");
mustNotContain(workspace, "ENTERPRISE_MARKETING_EXECUTION_ENABLED = true", "does not enable marketing");

if (failures.length) {
  console.error(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nCO-C1-DOCUMENT-WORKSPACE-CONTACT-CENTRIC-013 verify PASS");
