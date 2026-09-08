/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014B
 * Server-side Document Workspace access and file security.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROLES } from "../src/constants/roles.ts";
import {
  DOCUMENT_WORKSPACE_MALWARE_SCANNING_ENABLED,
  DOCUMENT_WORKSPACE_SHARE_ZIP_MAX_BYTES,
  DOCUMENT_WORKSPACE_UPLOAD_MAX_BYTES,
  DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE,
  DOCUMENT_WORKSPACE_GENERIC_UNAUTHENTICATED,
  DOCUMENT_WORKSPACE_GENERIC_FORBIDDEN,
} from "../src/constants/document-workspace-security.ts";
import { DOCUMENT_REGISTRY_MAX_BYTES } from "../src/constants/document-registry/index.ts";
import { DOCUMENT_WORKSPACE_ZIP_MAX_BYTES } from "../src/constants/document-workspace-refinement-014.ts";
import {
  capabilityAllowed,
  decideAuthenticatedActor,
  decideOrganizationScope,
  decideHierarchyVisibility,
  decideDocumentBelongsToContext,
  decideDealBelongsToOpportunity,
  decideParticipantBelongsToTransaction,
  decideCrossTransactionSelection,
  publicDocumentWorkspaceAccessMessage,
} from "../src/lib/document-workspace/access-decision.ts";
import {
  validateDocumentWorkspaceUpload,
  hasDangerousDoubleExtension,
  filenameLooksUnsafe,
  isSafeDocumentStorageKey,
  shouldInlinePreview,
  sanitizeDownloadFilename,
} from "../src/lib/document-workspace/file-security.ts";
import { consumeUploadPortalRateLimit, resetUploadPortalRateLimitForTests } from "../src/lib/document-workspace/upload-portal-rate-limit.ts";
import { otpMatches, hashOpaqueToken, createOpaqueUploadToken } from "../src/lib/document-workspace/upload-session-crypto.ts";
import { DOCUMENT_WORKSPACE_DESK_SHEET_CLASSNAME } from "../src/constants/document-workspace-refinement-014.ts";

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

expect("014A desk width unchanged", DOCUMENT_WORKSPACE_DESK_SHEET_CLASSNAME.includes("min-[1280px]:w-[55vw]"));
expect("upload limit is registry 25MB", DOCUMENT_WORKSPACE_UPLOAD_MAX_BYTES === DOCUMENT_REGISTRY_MAX_BYTES);
expect("zip share cap stays 50MB and separate", DOCUMENT_WORKSPACE_SHARE_ZIP_MAX_BYTES === DOCUMENT_WORKSPACE_ZIP_MAX_BYTES && DOCUMENT_WORKSPACE_UPLOAD_MAX_BYTES !== DOCUMENT_WORKSPACE_ZIP_MAX_BYTES);
expect("malware scanning is absent", DOCUMENT_WORKSPACE_MALWARE_SCANNING_ENABLED === false);

const viewer = decideAuthenticatedActor({
  tokenUserId: "u1",
  user: { id: "u1", isActive: true, organizationId: "org1", role: ROLES.VIEWER },
});
expect("authorised employee actor accepted", viewer.ok);

const unauth = decideAuthenticatedActor({ tokenUserId: null, user: null });
expect("unauthenticated employee denied 401", !unauth.ok && unauth.httpStatus === 401 && unauth.message === DOCUMENT_WORKSPACE_GENERIC_UNAUTHENTICATED);

const inactive = decideAuthenticatedActor({
  tokenUserId: "u1",
  user: { id: "u1", isActive: false, organizationId: "org1", role: ROLES.ADMIN },
});
expect("inactive user denied 403", !inactive.ok && inactive.httpStatus === 403 && inactive.message === DOCUMENT_WORKSPACE_GENERIC_FORBIDDEN);

const missingUser = decideAuthenticatedActor({ tokenUserId: "ghost", user: null });
expect("missing user denied 401", !missingUser.ok && missingUser.httpStatus === 401);

expect("viewer can view/download/upload/request/share", capabilityAllowed(ROLES.VIEWER, "view") && capabilityAllowed(ROLES.VIEWER, "download") && capabilityAllowed(ROLES.VIEWER, "upload") && capabilityAllowed(ROLES.VIEWER, "request") && capabilityAllowed(ROLES.VIEWER, "share"));
expect("viewer cannot replace/review/delete", !capabilityAllowed(ROLES.VIEWER, "replace") && !capabilityAllowed(ROLES.VIEWER, "review") && !capabilityAllowed(ROLES.VIEWER, "delete"));
expect("analyst can replace", capabilityAllowed(ROLES.ANALYST, "replace"));
expect("manager can delete", capabilityAllowed(ROLES.MANAGER, "delete"));
expect("admin can delete", capabilityAllowed(ROLES.ADMIN, "delete") && capabilityAllowed(ROLES.SUPER_ADMIN, "delete"));

const orgOk = decideOrganizationScope({ actorOrganizationId: "org1", recordOrganizationId: "org1" });
expect("same organisation allowed", orgOk.ok);
const otherOrg = decideOrganizationScope({ actorOrganizationId: "org1", recordOrganizationId: "org2" });
expect("other organisation record is 404", !otherOrg.ok && otherOrg.httpStatus === 404 && otherOrg.message === DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
const forged = decideOrganizationScope({ actorOrganizationId: "org1", recordOrganizationId: "org1", claimedOrganizationId: "org-forged" });
expect("forged organisation id is 403", !forged.ok && forged.httpStatus === 403);

const ownerOpp = {
  id: "opp1",
  organizationId: "org1",
  primaryOwnerUserId: "rm1",
  relationshipManagerUserId: "rm1",
};
const rmVisible = decideHierarchyVisibility({
  actor: { userId: "rm1", role: ROLES.ANALYST, organizationId: "org1" },
  opportunity: ownerOpp,
  downlineUserIds: ["rm1"],
});
expect("owner/RM with transaction access allowed", rmVisible.ok);

const managerVisible = decideHierarchyVisibility({
  actor: { userId: "mgr1", role: ROLES.MANAGER, organizationId: "org1" },
  opportunity: ownerOpp,
  downlineUserIds: ["mgr1", "rm1"],
});
expect("manager/superior via canonical hierarchy allowed", managerVisible.ok);

const peerDenied = decideHierarchyVisibility({
  actor: { userId: "peer1", role: ROLES.ANALYST, organizationId: "org1" },
  opportunity: ownerOpp,
  downlineUserIds: ["peer1"],
});
expect("peer without visibility is 404", !peerDenied.ok && peerDenied.httpStatus === 404);

const adminVisible = decideHierarchyVisibility({
  actor: { userId: "admin1", role: ROLES.ADMIN, organizationId: "org1" },
  opportunity: ownerOpp,
  downlineUserIds: ["admin1"],
});
expect("admin org-wide within organisation allowed", adminVisible.ok);

const adminOtherOrg = decideHierarchyVisibility({
  actor: { userId: "admin1", role: ROLES.SUPER_ADMIN, organizationId: "org1" },
  opportunity: { ...ownerOpp, organizationId: "org2" },
  downlineUserIds: ["admin1"],
});
expect("super admin still organisation-scoped", !adminOtherOrg.ok && adminOtherOrg.httpStatus === 404);

const docOk = decideDocumentBelongsToContext({
  organizationId: "org1",
  opportunityId: "opp1",
  document: { id: "d1", organizationId: "org1", opportunityId: "opp1" },
});
expect("document in authorised opportunity allowed", docOk.ok);
const docOtherOpp = decideDocumentBelongsToContext({
  organizationId: "org1",
  opportunityId: "opp1",
  document: { id: "d2", organizationId: "org1", opportunityId: "opp2" },
});
expect("document from another opportunity is 404", !docOtherOpp.ok && docOtherOpp.httpStatus === 404);
const deletedDoc = decideDocumentBelongsToContext({
  organizationId: "org1",
  opportunityId: "opp1",
  document: { id: "d3", organizationId: "org1", opportunityId: "opp1", status: "quarantined" },
});
expect("quarantined document is 404", !deletedDoc.ok && deletedDoc.httpStatus === 404);

const dealOk = decideDealBelongsToOpportunity({ opportunityId: "opp1", dealOpportunityId: "opp1" });
expect("deal on opportunity allowed", dealOk.ok);
const dealOther = decideDealBelongsToOpportunity({ opportunityId: "opp1", dealOpportunityId: "opp2" });
expect("deal from another opportunity is 404", !dealOther.ok && dealOther.httpStatus === 404);

const partyOk = decideParticipantBelongsToTransaction({
  requestedEntityId: "c1",
  allowedEntityIds: ["c1", "co1"],
});
expect("participant on transaction allowed", partyOk.ok);
const partyOther = decideParticipantBelongsToTransaction({
  requestedEntityId: "c-other",
  allowedEntityIds: ["c1", "co1"],
});
expect("participant from another transaction is 404", !partyOther.ok && partyOther.httpStatus === 404);

const selOk = decideCrossTransactionSelection({
  organizationId: "org1",
  opportunityId: "opp1",
  selected: [{ id: "d1", organizationId: "org1", opportunityId: "opp1" }],
});
expect("same-transaction multi-select allowed", selOk.ok);
const selCross = decideCrossTransactionSelection({
  organizationId: "org1",
  opportunityId: "opp1",
  selected: [
    { id: "d1", organizationId: "org1", opportunityId: "opp1" },
    { id: "d2", organizationId: "org1", opportunityId: "opp2" },
  ],
});
expect("cross-transaction multi-selection denied", !selCross.ok);

const pdfBytes = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const validUpload = validateDocumentWorkspaceUpload({
  filename: "kyc.pdf",
  declaredMime: "application/pdf",
  byteLength: pdfBytes.byteLength,
  bytes: pdfBytes,
});
expect("valid supported upload accepted", validUpload.ok);

const zero = validateDocumentWorkspaceUpload({ filename: "kyc.pdf", byteLength: 0 });
expect("zero-byte file rejected", !zero.ok && zero.code === "EMPTY");

const oversized = validateDocumentWorkspaceUpload({
  filename: "kyc.pdf",
  byteLength: DOCUMENT_WORKSPACE_UPLOAD_MAX_BYTES + 1,
});
expect("oversized file rejected", !oversized.ok && oversized.code === "TOO_LARGE");

const badExt = validateDocumentWorkspaceUpload({ filename: "payload.exe", byteLength: 12 });
expect("unsupported/dangerous extension rejected", !badExt.ok);

const mismatch = validateDocumentWorkspaceUpload({
  filename: "kyc.pdf",
  declaredMime: "image/png",
  byteLength: pdfBytes.byteLength,
  bytes: pdfBytes,
});
expect("extension/MIME mismatch rejected", !mismatch.ok && mismatch.code === "EXTENSION_MIME_MISMATCH");

expect("dangerous double extension blocked", hasDangerousDoubleExtension("invoice.pdf.exe"));
const doubleExt = validateDocumentWorkspaceUpload({ filename: "invoice.pdf.exe", byteLength: 12 });
expect("double extension upload rejected", !doubleExt.ok && (doubleExt.code === "DOUBLE_EXTENSION" || doubleExt.code === "DANGEROUS"));

expect("path traversal filename unsafe", filenameLooksUnsafe("../secret.pdf") && filenameLooksUnsafe("folder/file.pdf"));
expect("storage key traversal rejected", !isSafeDocumentStorageKey("../etc/passwd") && !isSafeDocumentStorageKey("etd/../other"));
expect("canonical storage key accepted", isSafeDocumentStorageKey("etd/org1/opp1/doc1/v1/abc"));

expect("pdf inline preview allowed", shouldInlinePreview({ mimeType: "application/pdf", filename: "a.pdf" }));
expect("svg never inline", !shouldInlinePreview({ mimeType: "image/svg+xml", filename: "a.svg" }));
expect("filename sanitised", !sanitizeDownloadFilename('../x.pdf').includes("/") && !sanitizeDownloadFilename('a\r\n"q.pdf').includes("\n"));

const token = createOpaqueUploadToken();
expect("opaque token hashed", token.hash === hashOpaqueToken(token.token));
expect("otp compare is constant-time exact", otpMatches("123456", hashOpaqueToken("123456")) && !otpMatches("000000", hashOpaqueToken("123456")));

resetUploadPortalRateLimitForTests();
expect("rate-limit hook allows first call", consumeUploadPortalRateLimit("bucket-a", 2, 60_000));
expect("rate-limit hook allows second call", consumeUploadPortalRateLimit("bucket-a", 2, 60_000));
expect("rate-limit hook blocks excess", consumeUploadPortalRateLimit("bucket-a", 2, 60_000) === false);

expect("inaccessible resource message is generic", publicDocumentWorkspaceAccessMessage(404) === DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);

mustContain("server/services/document-workspace/document-workspace-access.service.ts", "resolveDocumentWorkspaceAccess", "canonical access resolver");
mustContain("src/app/api/document-workspace/context/route.ts", "resolveDocumentWorkspaceAccess", "context uses resolver");
mustContain("src/app/api/document-workspace/refinement-014/route.ts", "listDocumentWorkspaceLinkedParties", "014 employee route");
mustContain("server/services/document-workspace/document-workspace-refinement-014.service.ts", "requireAuthorisedWorkspace", "014 service uses access resolver");
mustContain("src/app/api/enterprise-transaction-documents/route.ts", "resolveDocumentWorkspaceAccess", "ETD list/upsert access");
mustContain("src/app/api/enterprise-transaction-documents/binary/route.ts", "resolveDocumentWorkspaceAccess", "binary access");
mustContain("src/app/api/enterprise-transaction-documents/binary/route.ts", "export async function GET", "authorised binary GET");
mustNotContain("src/app/api/enterprise-transaction-documents/route.ts", "includeContent=1", "no includeContent dump");
mustNotContain("src/lib/document-registry/server-sync.ts", "includeContent=1", "hydrate no longer dumps binaries in list");
mustContain("src/lib/document-registry/server-sync.ts", "/api/enterprise-transaction-documents/binary?", "hydrate uses authorised binary GET");
mustContain("src/app/api/document-workspace/upload-portal/route.ts", "receiveCustomerPortalUpload", "customer multipart upload");
mustNotContain("src/app/api/document-workspace/upload-portal/route.ts", "registryRecordId", "customer cannot bind arbitrary registry ids");
mustContain("server/services/document-workspace/document-workspace-refinement-014.service.ts", "attemptCount: { increment: 1 }", "atomic OTP attempts");
mustContain("server/services/document-workspace/document-workspace-refinement-014.service.ts", "verifiedAt: { not: null }", "verified session required for customer upload");
mustContain("server/services/document-workspace/document-workspace-refinement-014.service.ts", "export async function describeUploadPortal", "customer describe");
mustNotContain("server/services/document-workspace/document-workspace-refinement-014.service.ts", "partyEntityId: request.partyEntityId", "describe omits party entity ids");
mustContain("src/constants/document-workspace-security.ts", "DOCUMENT_WORKSPACE_MALWARE_SCANNING_ENABLED = false", "no invented malware scan");
mustContain("src/lib/document-requests/virus-scan-hook.ts", "skipped: true", "AV hook does not claim a scan pass");

if (failures.length) {
  console.error(`\nFAILED ${failures.length}`);
  process.exit(1);
}
console.log("\nPASS  CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014B");
