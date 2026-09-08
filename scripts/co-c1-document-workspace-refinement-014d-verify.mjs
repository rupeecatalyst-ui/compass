/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014D
 * Inbound classification, New from Email, LOD checklist selection, WhatsApp/Email handoff.
 */
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { DOCUMENT_WORKSPACE_DESK_SHEET_CLASSNAME } from "../src/constants/document-workspace-refinement-014.ts";
import { DOCUMENT_WORKSPACE_MALWARE_SCANNING_ENABLED } from "../src/constants/document-workspace-security.ts";
import { isOperationalSmtpDeliveryEnabled } from "../src/constants/enterprise-communication-center/operational-delivery.ts";
import { ENTERPRISE_MARKETING_EXECUTION_ENABLED } from "../src/constants/enterprise-marketing-engine/safety.ts";
import {
  DOCUMENT_WORKSPACE_AUDIT_ACTIONS,
  DOCUMENT_WORKSPACE_AUDIT_SENSITIVE_KEYS,
} from "../src/constants/document-workspace-audit.ts";
import {
  DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES,
  DOCUMENT_WORKSPACE_INCOMPLETE_PROGRAMME_DISCLAIMER,
  DOCUMENT_WORKSPACE_CHECKLIST_NO_PROMISE,
} from "../src/constants/document-workspace-inbound.ts";
import {
  classifyInboundAttachment,
  decideSilentOtherAssignment,
  cannotAutoAttachFromLooseNameMatch,
  inboundFileCountsTowardReadiness,
  inboundOutcomeCountsTowardReadiness,
} from "../src/lib/document-workspace/inbound-classification.ts";
import { matchInboundEmailTransaction } from "../src/lib/enterprise-inbound-email/transaction-matcher.ts";
import {
  filterUnseenInboundEmailDocuments,
  inboundEmailVersionKey,
  countUnseenInboundByOwner,
  countUnseenInboundByTransaction,
} from "../src/lib/document-workspace/inbound-email-new.ts";
import {
  revalidateChecklistSelection,
  isRequestableChecklistStatus,
  overlayChecklistStatusFromReviews,
  ownerKindFromRole,
} from "../src/lib/document-workspace/checklist-selection.ts";
import {
  buildDocumentWorkspaceRequestMessageDto,
  formatRequestMessagePlainText,
  messageContainsForbiddenHandoffContent,
} from "../src/lib/document-workspace/request-message-dto.ts";
import {
  resolveWhatsAppHandoffMobile,
  buildWhatsAppDeepLink,
  preferNativeWebShare,
  buildWhatsAppHandoffPayload,
} from "../src/lib/document-workspace/whatsapp-handoff.ts";
import { deriveDocumentWorkspaceReviewStatus } from "../src/lib/document-workspace/review-status.ts";
import { canCitePublishedProgramme } from "../src/lib/product-programme-operations/legacy-review.ts";
import { sanitizeDocumentWorkspaceAuditMetadata } from "../src/lib/document-workspace/audit-sanitize.ts";

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

const lod = [
  { requestRef: "req-pan", typeRef: "doc:pan", label: "PAN Card", participantId: "p1" },
  { requestRef: "req-aadhaar", typeRef: "doc:aadhaar", label: "Aadhaar", participantId: "p1" },
];

expect("014A desk width unchanged", DOCUMENT_WORKSPACE_DESK_SHEET_CLASSNAME.includes("min-[1280px]:w-[55vw]"));
expect("malware scanning remains off", DOCUMENT_WORKSPACE_MALWARE_SCANNING_ENABLED === false);
expect("operational SMTP remains disabled", isOperationalSmtpDeliveryEnabled() === false);
expect("marketing execution remains disabled", ENTERPRISE_MARKETING_EXECUTION_ENABLED === false);

const threadClassified = classifyInboundAttachment({
  matchReason: "outbound_thread_headers",
  opportunityId: "opp-1",
  contactId: "c1",
  secureRequest: { opportunityId: "opp-1", typeRef: "doc:pan", requestRef: "req-pan" },
});
expect(
  "thread/request-correlated attachment classifies automatically",
  threadClassified.outcome === DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.CLASSIFIED_AUTOMATICALLY &&
    threadClassified.suggestedTypeRef === "doc:pan",
);

const senderLinked = classifyInboundAttachment({
  matchReason: "single_open_transaction_for_sender",
  opportunityId: "opp-1",
  contactId: "c1",
  filename: "pan-card.pdf",
  lodCandidates: lod,
});
expect(
  "sender-linked transaction suggests classification for review",
  senderLinked.outcome === DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.SUGGESTED_REVIEW_REQUIRED &&
    senderLinked.suggestedTypeRef === "doc:pan",
);

const ambiguous = classifyInboundAttachment({
  matchReason: "multiple_open_transactions_for_sender",
  openTransactionCount: 2,
  contactId: "c1",
  filename: "pan-card.pdf",
  lodCandidates: lod,
});
expect(
  "ambiguous sender with two Opportunities stays review-required and unattached",
  ambiguous.outcome === DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.UNCLASSIFIED_REVIEW_REQUIRED &&
    ambiguous.suggestedTypeRef === null &&
    ambiguous.evidenceCodes.includes("ambiguous_sender_transactions"),
);

const matcherAmbiguous = matchInboundEmailTransaction({
  fromEmail: "customer@example.com",
  subject: "documents",
  textBody: null,
  inReplyTo: null,
  referencesHeader: null,
  senderContacts: { contactIds: ["c1"], lenderContactIds: [], wealthPartnerIds: [], isInternalUser: false },
  openTransactionsByContact: [
    { opportunityId: "opp-1", opportunityNumber: "OPP-1" },
    { opportunityId: "opp-2", opportunityNumber: "OPP-2" },
  ],
});
expect(
  "matcher does not auto-attach two open Opportunities",
  matcherAmbiguous.status === "needs_review" && matcherAmbiguous.opportunityId === null,
);

expect("loose name match cannot auto-attach", cannotAutoAttachFromLooseNameMatch({ matchReason: "loose_name_match" }));
const loose = classifyInboundAttachment({
  matchReason: "loose_name_match",
  filename: "ravi-sharma-pan.pdf",
  lodCandidates: lod,
});
expect(
  "loose filename/name match does not auto-attach",
  loose.outcome === DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.UNCLASSIFIED_REVIEW_REQUIRED &&
    loose.suggestedTypeRef === null,
);

const uncertain = classifyInboundAttachment({
  matchReason: "opportunity_reference",
  opportunityId: "opp-1",
  filename: "scan.pdf",
  lodCandidates: lod,
});
expect(
  "uncertain file stays review-required",
  uncertain.outcome === DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.UNCLASSIFIED_REVIEW_REQUIRED &&
    uncertain.confidenceBand === "review_required",
);

const silentOther = decideSilentOtherAssignment({ typeRef: "doc:other" });
expect("Other is not silently assigned", !silentOther.ok);
const confirmedOther = decideSilentOtherAssignment({ typeRef: "doc:other", employeeConfirmedOther: true });
expect("authorised employee may confirm Other", confirmedOther.ok);
const lodOther = decideSilentOtherAssignment({ typeRef: "doc:other", lodFormallyUsesOther: true });
expect("formal LOD Other may be assigned", lodOther.ok);

const rejected = classifyInboundAttachment({ fileSecurityRejected: true, filename: "malware.exe" });
expect(
  "rejected file-security outcome",
  rejected.outcome === DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.REJECTED_FILE_SECURITY,
);
const duplicate = classifyInboundAttachment({ duplicateOfDocumentId: "doc-1", opportunityId: "opp-1" });
expect(
  "duplicate candidate handling",
  duplicate.outcome === DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES.DUPLICATE_CANDIDATE,
);

const emailRecord = {
  status: "active",
  typeRef: "unclassified:abc",
  uploadSource: "email",
  versions: [{ id: "v1" }],
};
expect(
  "unclassified email file does not count toward readiness",
  inboundFileCountsTowardReadiness(emailRecord) === false,
);
expect(
  "suggested classification does not count as received",
  inboundOutcomeCountsTowardReadiness("suggested_classification_review_required") === false,
);

const pendingUnclassified = deriveDocumentWorkspaceReviewStatus({
  record: {
    id: "d1",
    typeRef: "unclassified:abc",
    categoryLabel: "Unknown",
    originalFilename: "scan.pdf",
    displayName: "scan.pdf",
    status: "active",
    links: {},
    versions: [{ id: "v1", version: 1, originalFilename: "scan.pdf", displayName: "scan.pdf", fileSizeBytes: 10, mimeType: "application/pdf", blobId: "b1", uploadedBy: "sys", uploadedAt: "2026-09-09T00:00:00.000Z", isCurrent: true }],
    uploadedBy: "sys",
    uploadedAt: "2026-09-09T00:00:00.000Z",
    updatedAt: "2026-09-09T00:00:00.000Z",
    version: 1,
    fileSizeBytes: 10,
    mimeType: "application/pdf",
    uploadSource: "email",
  },
});
expect("unclassified inbound review status stays pending", pendingUnclassified === "pending");

const v1 = inboundEmailVersionKey({ versionNumber: 1, uploadedAt: "t1" });
const v2 = inboundEmailVersionKey({ versionNumber: 2, uploadedAt: "t2" });
expect("replacement version key differs", v1 !== v2);
const candidates = [
  { documentId: "d1", versionKey: v1, uploadSource: "email", ownerEntityId: "c1", opportunityId: "opp-1", dealId: null },
  { documentId: "d1", versionKey: v2, uploadSource: "email", ownerEntityId: "c1", opportunityId: "opp-1", dealId: null },
  { documentId: "d2", versionKey: v1, uploadSource: "email", ownerEntityId: "c1", opportunityId: "opp-1", dealId: null },
  { documentId: "d3", versionKey: v1, uploadSource: "email", ownerEntityId: "c2", opportunityId: "opp-2", dealId: null, deleted: true },
  { documentId: "d4", versionKey: v1, uploadSource: "email", ownerEntityId: "c1", opportunityId: "opp-1", newEligible: false },
];
const unseenAfterOne = filterUnseenInboundEmailDocuments({
  candidates,
  seenKeys: [{ documentId: "d1", versionKey: v1 }],
});
expect(
  "opening one document/version does not clear others",
  unseenAfterOne.some((row) => row.documentId === "d1" && row.versionKey === v2) &&
    unseenAfterOne.some((row) => row.documentId === "d2"),
);
expect("replacement version becomes new", unseenAfterOne.some((row) => row.documentId === "d1" && row.versionKey === v2));
expect("deleted document excluded from new count", unseenAfterOne.every((row) => row.documentId !== "d3"));
expect("ignored/rejected outcome excluded", unseenAfterOne.every((row) => row.documentId !== "d4"));
const byOwner = countUnseenInboundByOwner({ unseen: unseenAfterOne });
const byTx = countUnseenInboundByTransaction({ unseen: unseenAfterOne });
expect(
  "card and row counts agree",
  byOwner.c1 === unseenAfterOne.filter((row) => (row.ownerEntityId || row.contactId) === "c1").length &&
    byTx.byOpportunity["opp-1"] === unseenAfterOne.filter((row) => row.opportunityId === "opp-1").length,
);

expect("pending is requestable", isRequestableChecklistStatus("pending"));
expect("received is not requestable", !isRequestableChecklistStatus("received"));
expect("accepted is not requestable", !isRequestableChecklistStatus("accepted"));
expect("owner grouping includes co-applicant", ownerKindFromRole("Co-Applicant") === "co_applicant");
expect("owner grouping includes company", ownerKindFromRole("Director", "Company") === "company");

const canonical = overlayChecklistStatusFromReviews(
  [
    {
      requestRef: "req-pan",
      typeRef: "doc:pan",
      label: "PAN Card",
      ownerLabel: "Ravi",
      ownerRoleLabel: "Applicant",
      ownerKind: "applicant",
      status: "pending",
      mandatory: true,
      opportunityId: "opp-1",
      organizationId: "org-1",
      lodVersionId: "lod-v1",
      programmeVersionRef: "prog:v2",
    },
    {
      requestRef: "req-aadhaar",
      typeRef: "doc:aadhaar",
      label: "Aadhaar",
      ownerLabel: "Ravi",
      ownerRoleLabel: "Applicant",
      ownerKind: "applicant",
      status: "pending",
      mandatory: true,
      opportunityId: "opp-1",
      organizationId: "org-1",
      lodVersionId: "lod-v1",
      programmeVersionRef: "prog:v2",
    },
  ],
  [{ requestRef: "req-pan", typeRef: "doc:pan", reviewStatus: "received" }],
);
expect("received item overlay excluded from request", canonical[0].status === "received" && canonical[1].status === "pending");

const receivedDenied = revalidateChecklistSelection({
  organizationId: "org-1",
  opportunityId: "opp-1",
  lodVersionId: "lod-v1",
  selectedRefs: ["req-pan"],
  canonicalItems: canonical,
});
expect("received item cannot be requested again", !receivedDenied.ok && receivedDenied.code === "NOT_REQUESTABLE");

const cross = revalidateChecklistSelection({
  organizationId: "org-1",
  opportunityId: "opp-1",
  selectedRefs: ["req-aadhaar"],
  canonicalItems: [{ ...canonical[1], opportunityId: "opp-2" }],
});
expect("cross-transaction selection denied", !cross.ok && cross.code === "CROSS_TRANSACTION");

const stale = revalidateChecklistSelection({
  organizationId: "org-1",
  opportunityId: "opp-1",
  lodVersionId: "lod-v2",
  selectedRefs: ["req-aadhaar"],
  canonicalItems: canonical,
});
expect("server revalidation catches stale selection", !stale.ok && stale.code === "STALE_SELECTION");

expect(
  "incomplete programme disclaimer is canonical",
  DOCUMENT_WORKSPACE_INCOMPLETE_PROGRAMME_DISCLAIMER ===
    "Additional documents may be required after specialist review.",
);
expect(
  "draft programme cannot be cited",
  canCitePublishedProgramme({
    enabled: true,
    isLivePublished: false,
    publicationState: "draft",
    completenessState: "incomplete",
  }) === false,
);
expect(
  "published complete programme can be cited",
  canCitePublishedProgramme({
    enabled: true,
    isDeleted: false,
    isLivePublished: true,
    publicationState: "published",
    completenessState: "complete",
  }) === true,
);

const dto = buildDocumentWorkspaceRequestMessageDto({
  organizationId: "org-1",
  correlationId: "corr-1",
  generatedAt: "2026-09-09T00:00:00.000Z",
  channel: "whatsapp",
  safeTransactionReference: "OPP-1",
  product: "Home Loan",
  customerDisplayName: "Ravi Sharma",
  initiatingEmployeeId: "u1",
  programmeVersionRef: "prog:v2",
  lodVersionId: "lod-v1",
  incompleteProgramme: true,
  items: [canonical[1]],
});
const text = formatRequestMessagePlainText(dto);
expect("shared DTO includes organisation and correlation", dto.organizationId === "org-1" && dto.correlationId === "corr-1");
expect("message uses authorised first name", text.includes("Hello Ravi"));
expect("message includes grouped pending list", text.includes("Aadhaar"));
expect("message includes incomplete programme disclaimer", text.includes(DOCUMENT_WORKSPACE_INCOMPLETE_PROGRAMME_DISCLAIMER));
expect("message includes no-promise disclaimer", text.includes(DOCUMENT_WORKSPACE_CHECKLIST_NO_PROMISE));
expect("message has no internal URL or token", !messageContainsForbiddenHandoffContent(text) && !text.includes("/api/") && !text.includes("uptok_"));

const validMobile = resolveWhatsAppHandoffMobile({ authorisedContactMobile: "9876543210" });
expect("valid authorised Indian mobile is normalised", validMobile.ok && validMobile.e164Digits === "919876543210");
const missingMobile = resolveWhatsAppHandoffMobile({ authorisedContactMobile: "" });
expect("missing mobile is blocked", !missingMobile.ok && missingMobile.code === "MISSING_OR_INVALID");
const forged = resolveWhatsAppHandoffMobile({
  authorisedContactMobile: "9876543210",
  browserSubmittedMobile: "9111111111",
});
expect("browser-forged mobile is ignored", !forged.ok && forged.code === "FORGED_MOBILE");
expect(
  "native share preferred on mobile with Share API",
  preferNativeWebShare({ hasShareApi: true, canShare: true, isMobileLike: true }) === true,
);
expect(
  "desktop falls back to WhatsApp deep link",
  preferNativeWebShare({ hasShareApi: true, canShare: true, isMobileLike: false }) === false,
);
const deep = buildWhatsAppDeepLink({ e164Digits: "919876543210", text });
expect("WhatsApp deep link uses wa.me without attachments", deep.startsWith("https://wa.me/919876543210?text=") && !deep.includes("blob:"));
const payload = buildWhatsAppHandoffPayload({
  dto,
  authorisedContactMobile: "9876543210",
});
expect(
  "handoff payload never claims delivered",
  payload.ok && payload.text === text && payload.deepLink.includes("wa.me"),
);

const auditSanitized = sanitizeDocumentWorkspaceAuditMetadata({
  otp: "123456",
  token: "secret",
  mobile: "9876543210",
  email: "a@b.com",
  selectedCount: 2,
  correlationId: "corr-1",
});
expect(
  "audit metadata keeps counts and strips secrets",
  auditSanitized &&
    auditSanitized.selectedCount === 2 &&
    auditSanitized.correlationId === "corr-1" &&
    !("otp" in auditSanitized) &&
    !("token" in auditSanitized) &&
    !("mobile" in auditSanitized) &&
    !("email" in auditSanitized),
);
expect("audit sensitive keys include mobile and email", DOCUMENT_WORKSPACE_AUDIT_SENSITIVE_KEYS.includes("mobile"));

const svc = "server/services/document-workspace/document-workspace-refinement-014d.service.ts";
const route = "src/app/api/document-workspace/refinement-014/route.ts";
const matcher = "src/lib/enterprise-inbound-email/transaction-matcher.ts";
const ingest = "server/services/enterprise-inbound-email/inbound-email-ingestion.service.ts";
mustContain(matcher, "secure_request_identifier", "secure request matching");
mustNotContain(matcher, "filename_only", "filename never matches transactions");
mustContain(svc, "resolveDocumentWorkspaceAccess", "014B access resolver");
mustContain(svc, "DOCUMENT_WORKSPACE_REASSIGNMENT_DENIED", "unauthorised reassignment denied");
mustContain(svc, "generateOpportunityLod", "canonical LOD source");
mustContain(svc, "canCitePublishedProgramme", "pinned published programme only");
mustContain(svc, "lenderProgramId", "reads Deal programme stamp");
mustNotContain(svc, "lenderProgramId =", "does not write Deal programme stamp");
mustContain(svc, "WHATSAPP_CHECKLIST_PREPARED", "WhatsApp prepared audit");
mustContain(svc, "WHATSAPP_HANDOFF_OPENED", "WhatsApp handoff opened audit");
mustContain(svc, "delivered: false", "never claims WhatsApp delivered");
mustContain(svc, "EMAIL_CHECKLIST_PREPARED", "email prepared audit");
mustContain(svc, "EMAIL_QUEUED", "email queued audit");
mustContain(svc, "sent: false", "queued is not sent");
mustContain(svc, "isOperationalSmtpDeliveryEnabled", "SMTP flag read-only");
mustContain(svc, "INBOUND_CLASSIFICATION_CONFIRMED", "classification confirmed audit");
mustContain(route, 'view === "inbound-review"', "inbound review list");
mustContain(route, "prepare_handoff", "shared prepare action");
mustContain(route, "whatsapp_handoff_opened", "handoff opened action");
mustContain(ingest, "classifyInboundAttachment", "ingestion uses 014D classifier");
mustContain(ingest, "DOCUMENT_WORKSPACE_STATUS_QUARANTINED", "rejected files quarantined");
mustNotContain(ingest, "WHATSAPP_BUSINESS", "no WhatsApp Business API");
mustNotContain(svc, "TWILIO", "no WhatsApp provider credentials");
mustNotContain(svc, "smtpEnabled: true", "does not force SMTP on");
mustContain("src/components/catalyst-one/document-workspace/document-workspace-inbound-review.tsx", "DOCUMENT_WORKSPACE_RECEIVED_FROM_EMAIL_LABEL", "review section");
mustContain("src/components/catalyst-one/document-workspace/document-workspace-checklist-share.tsx", "preferNativeWebShare", "native share path");
mustContain("src/components/catalyst-one/document-workspace/document-workspace-checklist-share.tsx", "whatsapp_handoff_cancelled", "cancelled handoff");
mustContain("src/constants/document-workspace-refinement-014.ts", "min-[1280px]:w-[55vw]", "014A width preserved");

const migration = "prisma/migrations/20260909010000_co_c1_document_workspace_refinement_014d/migration.sql";
mustContain(migration, "20260908220000_co_c1_document_workspace_refinement_014c", "ordered after 014C");
mustContain(migration, "inbound_classification_json", "additive classification column");
mustContain(migration, "ADD COLUMN IF NOT EXISTS", "additive only");
mustNotContain(migration, "DROP TABLE", "no table drops");
mustNotContain(migration, "DROP COLUMN", "no column drops");
mustNotContain(migration, "DELETE FROM", "no row deletes");
mustNotContain(migration, "TRUNCATE", "no truncate");
mustNotContain(migration, "lender_program", "does not rewrite programmes");

mustContain("src/constants/document-workspace-audit.ts", "INBOUND_ATTACHMENT_DETECTED", "detected audit");
mustContain("src/constants/document-workspace-audit.ts", "CHECKLIST_GENERATED", "checklist generated audit");
mustContain("src/constants/document-workspace-audit.ts", "SELECTION_REJECTED_VALIDATION", "selection rejected audit");
mustContain("src/lib/document-workspace/request-message-dto.ts", "groupedItems", "shared DTO grouped items");
mustNotContain("src/lib/document-workspace/whatsapp-handoff.ts", "delivered: true", "WhatsApp lib never delivered");

if (failures.length) {
  console.error(`\nFAILED ${failures.length}`);
  process.exit(1);
}
console.log("\nPASS  CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014D");
