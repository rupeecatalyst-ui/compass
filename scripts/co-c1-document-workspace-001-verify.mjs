/**
 * CO-C1-DOCUMENT-WORKSPACE-001
 * Dedicated Document Workspace over Enterprise Document Registry SSOT.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DOCUMENT_WORKSPACE_TITLE,
  DOCUMENT_WORKSPACE_SUBTITLE,
  DOCUMENT_WORKSPACE_OWNER_TABS,
  DOCUMENT_WORKSPACE_ACTIONS,
} from "../src/constants/document-workspace.ts";
import {
  deriveDocumentWorkspaceReviewStatus,
  countDocumentWorkspaceReviews,
  isLenderEligibleDocumentVersion,
} from "../src/lib/document-workspace/review-status.ts";
import {
  groupDocumentRequestItemsByOwner,
  buildGroupedDocumentRequestBody,
} from "../src/lib/document-workspace/grouped-request.ts";
import { mergeDocumentWorkspaceRows } from "../src/lib/document-workspace/merge-rows.ts";
import {
  listUnclassifiedReceivedDocuments,
  isDuplicateRegistryAttachment,
} from "../src/lib/document-workspace/unclassified.ts";
import { mapDealLenderRecipients } from "../src/lib/document-workspace/lender-pack.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function mustContain(rel, needle, label = needle) {
  if (!read(rel).includes(needle)) failures.push(`${rel} missing ${label}`);
}

function mustNotContain(rel, needle, label = needle) {
  if (read(rel).includes(needle)) failures.push(`${rel} must not contain ${label}`);
}

function expect(name, condition) {
  if (!condition) failures.push(name);
}

expect("title", DOCUMENT_WORKSPACE_TITLE === "Document Workspace");
expect(
  "subtitle",
  DOCUMENT_WORKSPACE_SUBTITLE === "Enterprise Document Registry · Single Source of Truth",
);
expect("owner tabs include property", DOCUMENT_WORKSPACE_OWNER_TABS.some((t) => t.id === "property"));
expect(
  "action catalogue",
  DOCUMENT_WORKSPACE_ACTIONS.map((a) => a.id).includes("send_to_lender") &&
    DOCUMENT_WORKSPACE_ACTIONS.map((a) => a.id).includes("request_all_pending"),
);

const nav = "src/config/navigation.ts";
mustContain(nav, 'title: "Document Workspace"', "nav rename");
mustContain(nav, "ROUTES.DOCUMENT_WORKSPACE", "nav route");
mustNotContain(nav, 'title: "Documents"', "old Documents nav item");
mustContain(nav, "Loan Journey", "Loan Journey remains");

const navSrc = read(nav);
const loanIdx = navSrc.indexOf('title: "Loan Journey"');
const docIdx = navSrc.indexOf('title: "Document Workspace"');
expect("Document Workspace immediately below Loan Journey", loanIdx >= 0 && docIdx > loanIdx && docIdx - loanIdx < 500);

const workspace = "src/components/catalyst-one/document-workspace/document-workspace.tsx";
mustContain(workspace, "DOCUMENT_WORKSPACE_TITLE", "page title");
mustContain(workspace, "DOCUMENT_WORKSPACE_SUBTITLE", "supporting label");
mustNotContain(workspace, "LeadOpportunityJourneyChrome", "no journey chrome");
mustNotContain(workspace, "OpportunityBoundStage", "no opportunity picker stage");
mustNotContain(workspace, "Continue to Credit", "no continue to credit");
mustNotContain(workspace, "Back to Lead Creation", "no back to lead");
mustContain(workspace, "Open Opportunity", "subtle opportunity link");
mustContain(workspace, "Action Centre", "action centre button");
mustContain(workspace, "listDocumentsForOpportunityRuntime", "shared registry list");
mustContain(workspace, "uploadDocumentToRegistry", "shared registry write");
mustContain(workspace, "queueOutboxMessage", "outbox not live send");
mustContain(workspace, "EmailContextWorkspace", "email composer");
mustContain(workspace, "WhatsAppContextWorkspace", "whatsapp composer");
mustContain(workspace, "EnterpriseActivityComposer", "follow-up composer");

mustContain(
  "src/app/(dashboard)/documents/page.tsx",
  "DOCUMENT_WORKSPACE",
  "legacy /documents redirect",
);
mustContain(
  "src/constants/lead-opportunity-journey.ts",
  "DOCUMENT_CENTER",
  "journey Documents stage retained",
);
mustContain(
  "src/components/catalyst-one/deal-workspace/deal-documents-projection.tsx",
  "listDocumentsForOpportunityRuntime",
  "Deal projection same registry",
);

mustContain(
  "src/lib/document-requests/store.ts",
  "revokeUploadSession",
  "revocable secure link",
);
mustContain(
  "src/components/catalyst-one/customer-document-portal/customer-document-collection-portal.tsx",
  "groupDocumentRequestItemsByOwner",
  "portal owner grouping",
);
mustNotContain(
  "src/components/catalyst-one/customer-document-portal/customer-document-collection-portal.tsx",
  "RM Remarks",
  "internal notes on portal",
);
mustContain(
  "server/services/enterprise-inbound-email/inbound-email-ingestion.service.ts",
  "createUnclassifiedDocumentTypeRef",
  "inbound unclassified typeRef",
);
mustContain(
  "server/services/enterprise-inbound-email/inbound-email-ingestion.service.ts",
  "contentHash: attachment.contentHash",
  "inbound duplicate hash",
);
mustContain(
  "server/services/enterprise-inbound-email/inbound-email-ingestion.service.ts",
  "storageKey: orgDup.storageKey",
  "hash reuse copies stored asset",
);
mustContain(
  "server/services/enterprise-inbound-email/inbound-email-ingestion.service.ts",
  "opportunityId: match.opportunityId",
  "hash reuse still links current Opportunity",
);
mustNotContain(
  "src/lib/document-workspace/lender-pack.ts",
  "sendTransactionOperationalEmail",
  "no live lender email",
);

const pending = deriveDocumentWorkspaceReviewStatus({ lodItem: { status: "pending" } });
const received = deriveDocumentWorkspaceReviewStatus({
  record: { verifiedAt: undefined, versions: [{ id: "1" }], uploadSource: "email" },
});
const accepted = deriveDocumentWorkspaceReviewStatus({
  record: { verifiedAt: "2026-01-01", versions: [{ id: "1" }] },
});
expect("pending status", pending === "pending");
expect("email received not auto-accepted", received === "received");
expect("verified accepted", accepted === "accepted");
expect("lender eligible only accepted", isLenderEligibleDocumentVersion({ reviewStatus: "accepted" }));
expect("pending not lender eligible", !isLenderEligibleDocumentVersion({ reviewStatus: "received" }));

const counts = countDocumentWorkspaceReviews([
  { reviewStatus: "pending" },
  { reviewStatus: "received" },
  { reviewStatus: "rejected" },
]);
expect("count pending", counts.pending === 1 && counts.received === 1 && counts.rejected === 1);

const blocks = groupDocumentRequestItemsByOwner([
  { typeRef: "doc:pan", label: "PAN", ownerName: "Asha", ownerRoleLabel: "Primary Applicant" },
  { typeRef: "doc:pan", label: "PAN", ownerName: "Ravi", ownerRoleLabel: "Co-Applicant" },
  { typeRef: "doc:gst", label: "GST", ownerName: "Asha", ownerRoleLabel: "Primary Applicant" },
]);
expect("owner grouping", blocks.length === 2);
const body = buildGroupedDocumentRequestBody({
  customerName: "Asha",
  opportunityReference: "OPP-TEST",
  product: "Home Loan",
  blocks,
});
expect("grouped body mentions both owners", body.includes("Primary Applicant") && body.includes("Co-Applicant"));
expect("draft does not send", body.includes("Nothing has been sent yet"));

const rows = mergeDocumentWorkspaceRows({
  records: [
    {
      id: "r1",
      typeRef: "doc:pan",
      categoryLabel: "KYC",
      displayName: "PAN.pdf",
      status: "active",
      versions: [{ id: "v1", isCurrent: true, displayName: "PAN.pdf" }],
      links: { opportunityId: "opp-1", documentScope: "applicant", participantId: "p1" },
      originalFilename: "PAN.pdf",
      uploadedAt: "2026-01-01",
    },
  ],
  lodItems: [
    {
      typeRef: "doc:pan",
      label: "PAN Card",
      moduleLabel: "KYC",
      status: "uploaded",
      registryRecordId: "r1",
      participantId: "p1",
      ownerName: "Asha",
      ownerRoleLabel: "Primary Applicant",
    },
  ],
  participants: [{ id: "p1", name: "Asha", role: "primary_applicant" }],
});
expect("shared record id not copied", rows.length === 1 && rows[0].registryRecordId === "r1");

const unclassified = listUnclassifiedReceivedDocuments([
  {
    id: "u1",
    status: "active",
    typeRef: "doc:other:xyz",
    versions: [{ id: "v" }],
    uploadSource: "email",
    originalFilename: "scan.pdf",
    fileSizeBytes: 12,
  },
  {
    id: "u2",
    status: "active",
    typeRef: "doc:pan",
    verifiedAt: "2026-01-01",
    versions: [{ id: "v" }],
    originalFilename: "pan.pdf",
    fileSizeBytes: 10,
  },
]);
expect("unclassified queue", unclassified.length === 1 && unclassified[0].id === "u1");
expect(
  "duplicate detection",
  isDuplicateRegistryAttachment(unclassified, { originalFilename: "scan.pdf", fileSizeBytes: 12 }),
);

const recipients = mapDealLenderRecipients({
  id: "deal-1",
  dealNumber: "DEAL-1",
  primaryCounterpartyName: "HDFC",
  snapshot: {
    lenders: [
      {
        lender: "HDFC",
        lenderSalesContactName: "Branch RM",
        lenderSalesContactOfficialEmail: "rm@example.invalid",
      },
    ],
  },
});
expect("lender recipient mapped", recipients[0]?.recipientType === "lender_representative");
expect("lender mapping does not invent customer email as lender", recipients[0]?.name.includes("HDFC"));

if (failures.length) {
  console.error("FAIL");
  for (const item of failures) console.error(" -", item);
  process.exit(1);
}
console.log("PASS CO-C1-DOCUMENT-WORKSPACE-001");
