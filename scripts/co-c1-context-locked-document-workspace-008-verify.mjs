/**
 * CO-C1-CONTEXT-LOCKED-DOCUMENT-WORKSPACE-008
 * Context lock over the dedicated Document Workspace. No second document store.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  lockDocumentWorkspaceContext,
  filterRegistryRecordsForLockedContext,
  composerMustRefuseStaleContext,
  hasUnsavedDocumentWorkspaceDraft,
  isCanonicalDocumentWorkspaceId,
  parseDocumentWorkspaceSearchParams,
  buildDocumentWorkspaceHref,
  documentWorkspaceFingerprint,
  documentWorkspaceContextLeaksPii,
  documentWorkspaceTransientUiAfterFingerprintChange,
  lockMatchesCurrentDocumentWorkspaceRequest,
} from "../src/lib/document-workspace/context-lock.ts";
import { lodItemsForLockedUploadSession } from "../src/lib/document-workspace/grouped-request.ts";

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
const lockLib = "src/lib/document-workspace/context-lock.ts";

mustContain(workspace, "fetchDocumentWorkspaceContext", "server lock");
mustContain(workspace, "filterRegistryRecordsForLockedContext", "deal scope filter");
mustContain(workspace, "DOCUMENT_WORKSPACE_CHANGE_TRANSACTION", "change transaction");
mustContain(workspace, "DOCUMENT_WORKSPACE_DRAFT_WARNING", "unsaved draft warning");
mustContain(workspace, "composerMustRefuseStaleContext", "stale composer refuse");
mustContain(workspace, "queueOutboxMessage", "outbox not live send");
mustContain(workspace, "EmailContextWorkspace", "email composer");
mustNotContain(workspace, "listed.items[0]", "silent first-deal auto-select");
mustNotContain(workspace, "LeadOpportunityJourneyChrome", "no journey chrome");
mustNotContain(workspace, "mobilePrimary", "no mobile field");
mustNotContain(workspace, "personalEmail", "no email field");
mustContain(lockLib, "NAME_OR_PII_RESOLUTION_FORBIDDEN", "pii resolution forbidden");
mustContain("src/app/api/document-workspace/context/route.ts", "resolveDocumentWorkspaceContext", "API lock");
mustContain(
  "src/components/catalyst-one/document-center/document-center-workspace.tsx",
  "listDocumentsForOpportunityRuntime",
  "Opportunity Documents same registry",
);
mustContain(workspace, "listDocumentsForOpportunityRuntime", "Workspace same registry");
mustContain(
  "src/components/catalyst-one/deal-workspace/deal-documents-projection.tsx",
  "buildDocumentWorkspaceHref",
  "Deal entry carries ids",
);
mustContain(
  "src/components/catalyst-one/opportunity-workspace/workspace-documents-panel.tsx",
  "buildDocumentWorkspaceHref",
  "Opportunity entry carries ids",
);

expect("email is not a canonical id", !isCanonicalDocumentWorkspaceId("ada@example.com"));
expect("mobile is not a canonical id", !isCanonicalDocumentWorkspaceId("9876543210"));
expect("display name is not a canonical id", !isCanonicalDocumentWorkspaceId("Ada Lovelace"));
expect("opportunity number is not a canonical id", !isCanonicalDocumentWorkspaceId("OPP-2026-000001"));
expect("cuid-like id is canonical", isCanonicalDocumentWorkspaceId("cabcdefghijklmnopqrstuvwx"));

const params = parseDocumentWorkspaceSearchParams(
  new URLSearchParams(
    "opportunityId=cabcdefghijklmnopqrstuvwx&dealId=cdealid0000000000000001&ownerTab=guarantors&documentId=cdocid00000000000000001",
  ),
);
expect("direct Opportunity entry parsed", params.opportunityId === "cabcdefghijklmnopqrstuvwx");
expect("direct Deal entry parsed", params.dealId === "cdealid0000000000000001");
const href = buildDocumentWorkspaceHref(params);
expect("refresh URL preserves opportunityId", href.includes("opportunityId=cabcdefghijklmnopqrstuvwx"));
expect("refresh URL preserves dealId", href.includes("dealId=cdealid0000000000000001"));
expect("refresh URL preserves owner tab", href.includes("ownerTab=guarantors"));
expect("refresh URL preserves selected document", href.includes("documentId=cdocid00000000000000001"));

const opp = {
  id: "copportunity000000000001",
  organizationId: "corg0000000000000000001",
  opportunityNumber: "OPP-1",
  primaryContactId: "ccontact000000000000001",
  companyId: "ccompany000000000000001",
  primaryContactName: "Ada",
  productLabel: "Home Loan",
  relationshipManagerName: "RM One",
  requirementStage: "Documents",
  isDeleted: false,
};

const dealA = {
  id: "cdealA000000000000000001",
  organizationId: opp.organizationId,
  opportunityId: opp.id,
  dealNumber: "DEAL-A",
  lenderName: "Lender A",
  grossStage: "Login",
  isDeleted: false,
};
const dealB = { ...dealA, id: "cdealB000000000000000001", dealNumber: "DEAL-B", lenderName: "Lender B" };

const lockedA = lockDocumentWorkspaceContext({
  request: { opportunityId: opp.id, dealId: dealA.id, organizationId: opp.organizationId },
  actorOrganizationId: opp.organizationId,
  opportunity: opp,
  deal: dealA,
});
const lockedB = lockDocumentWorkspaceContext({
  request: { opportunityId: opp.id, dealId: dealB.id, organizationId: opp.organizationId },
  actorOrganizationId: opp.organizationId,
  opportunity: opp,
  deal: dealB,
});
expect("Deal A lock ok", lockedA.ok === true);
expect("Deal B lock ok", lockedB.ok === true);
expect(
  "five/two Deals remain distinct fingerprints",
  lockedA.ok && lockedB.ok && lockedA.context.fingerprint !== lockedB.context.fingerprint,
);

const mismatch = lockDocumentWorkspaceContext({
  request: { opportunityId: opp.id, dealId: dealA.id },
  actorOrganizationId: opp.organizationId,
  opportunity: opp,
  deal: { ...dealA, opportunityId: "cotheropportunity0000001" },
});
expect("Opportunity/Deal mismatch rejected", !mismatch.ok && mismatch.code === "OPPORTUNITY_DEAL_MISMATCH");

const crossOrg = lockDocumentWorkspaceContext({
  request: { opportunityId: opp.id, organizationId: "cotherorg00000000000001" },
  actorOrganizationId: "cotherorg00000000000001",
  opportunity: opp,
  deal: null,
});
expect("cross-organisation denied", !crossOrg.ok && crossOrg.code === "CROSS_ORGANIZATION");

const pii = lockDocumentWorkspaceContext({
  request: { opportunityId: "9876543210" },
  actorOrganizationId: opp.organizationId,
  opportunity: opp,
  deal: null,
});
expect("mobile/email/name resolution forbidden", !pii.ok && pii.code === "NAME_OR_PII_RESOLUTION_FORBIDDEN");

const records = [
  { id: "shared", status: "active", links: { opportunityId: opp.id, documentScope: "shared" } },
  { id: "dealA", status: "active", links: { opportunityId: opp.id, dealId: dealA.id, documentScope: "lender" } },
  { id: "dealB", status: "active", links: { opportunityId: opp.id, dealId: dealB.id, documentScope: "lender" } },
  { id: "otherOpp", status: "active", links: { opportunityId: "cotheropportunity0000001", documentScope: "shared" } },
];
const scopedA = filterRegistryRecordsForLockedContext({
  records,
  opportunityId: opp.id,
  dealId: dealA.id,
}).map((r) => r.id);
const scopedOpp = filterRegistryRecordsForLockedContext({
  records,
  opportunityId: opp.id,
}).map((r) => r.id);
expect("Deal A sees shared Opportunity docs", scopedA.includes("shared"));
expect("Deal A sees its lender doc", scopedA.includes("dealA"));
expect("Deal-specific scope does not leak to another Deal", !scopedA.includes("dealB"));
expect("Opportunity-level hides lender Deal docs", !scopedOpp.includes("dealA") && scopedOpp.includes("shared"));
expect("other Opportunity records excluded", !scopedA.includes("otherOpp") && !scopedOpp.includes("otherOpp"));

expect(
  "switching context is a fingerprint change",
  documentWorkspaceFingerprint({ opportunityId: opp.id, dealId: dealA.id }) !==
    documentWorkspaceFingerprint({ opportunityId: opp.id, dealId: dealB.id }),
);
expect(
  "unsaved draft warning required",
  hasUnsavedDocumentWorkspaceDraft({ groupedDraft: "Please send PAN", composerOpen: false }),
);
expect(
  "preview/drawer restore helper writes owner tab",
  buildDocumentWorkspaceHref({ opportunityId: opp.id, ownerTab: "property" }).includes("ownerTab=property"),
);

expect(
  "stale composer refuses",
  composerMustRefuseStaleContext({
    openedFingerprint: lockedA.ok ? lockedA.context.fingerprint : "a",
    currentFingerprint: lockedB.ok ? lockedB.context.fingerprint : "b",
    authorised: true,
  }),
);
expect(
  "fresh composer allowed",
  !composerMustRefuseStaleContext({
    openedFingerprint: lockedA.ok ? lockedA.context.fingerprint : "a",
    currentFingerprint: lockedA.ok ? lockedA.context.fingerprint : "a",
    authorised: true,
  }),
);
expect(
  "unauthorised composer refuses",
  composerMustRefuseStaleContext({
    openedFingerprint: "x",
    currentFingerprint: "x",
    authorised: false,
  }),
);

const lockedItems = lodItemsForLockedUploadSession({
  items: [
    { typeRef: "doc:pan", label: "PAN", ownerName: "Ada" },
    { typeRef: "doc:gst", label: "GST", ownerName: "Co" },
  ],
  lockedRequestRefs: ["doc:pan"],
});
expect("secure upload returns only locked request items", lockedItems.length === 1 && lockedItems[0].typeRef === "doc:pan");

mustContain("src/lib/document-requests/upload-engine.ts", "lockedDealId", "upload stamps locked Deal");
mustContain("src/lib/document-requests/upload-engine.ts", "lockedRequestRefs", "upload refuses other request refs");
mustContain(workspace, "documentWorkspaceTransientUiAfterFingerprintChange", "switch clears transient UI");
mustContain(workspace, "lockMatchesCurrentDocumentWorkspaceRequest", "ignore stale lock after switch");
mustContain(workspace, "setLock(null)", "clear previous lock while switching");
mustNotContain(workspace, "void registryTick", "no void-tick useMemo hack");
mustNotContain(workspace, "parseParticipantScopeKey", "deal projection unused import not in workspace");
mustNotContain(
  "src/components/catalyst-one/deal-workspace/deal-documents-projection.tsx",
  "parseParticipantScopeKey",
  "unused parseParticipantScopeKey removed",
);
mustContain(
  "src/components/catalyst-one/deal-workspace/deal-documents-projection.tsx",
  "documentCenterActiveOwner",
  "participant owner scope still resolved",
);

const switchClear = documentWorkspaceTransientUiAfterFingerprintChange({
  previousFingerprint: documentWorkspaceFingerprint({ opportunityId: "opp-a", dealId: "deal-a" }),
  nextFingerprint: documentWorkspaceFingerprint({ opportunityId: "opp-a", dealId: "deal-b" }),
});
expect("transaction switch is detected", switchClear.switched === true);
expect(
  "switch clears selection preview composer and drafts",
  switchClear.selectedIds.length === 0 &&
    switchClear.previewId === null &&
    switchClear.composer === null &&
    switchClear.groupedDraft === "" &&
    switchClear.coverBody === "",
);
const sameCtx = documentWorkspaceTransientUiAfterFingerprintChange({
  previousFingerprint: "a|opp|deal||",
  nextFingerprint: "a|opp|deal||",
});
expect("same fingerprint does not switch", sameCtx.switched === false);
expect(
  "stale lock does not match the next request",
  lockMatchesCurrentDocumentWorkspaceRequest(
    { opportunityId: "opp-a", dealId: "deal-a", contactId: "ctc-a", companyId: "co-a" },
    { opportunityId: "opp-a", dealId: "deal-b", contactId: "ctc-a", companyId: "co-a" },
  ) === false,
);
expect(
  "resolved lock still matches a sparse URL request",
  lockMatchesCurrentDocumentWorkspaceRequest(
    {
      organizationId: "org-a",
      opportunityId: "opp-a",
      dealId: "deal-a",
      contactId: "ctc-a",
      companyId: "co-a",
    },
    { opportunityId: "opp-a", dealId: "deal-a" },
  ) === true,
);
mustNotContain(workspace, "sendTransactionalEmail(", "no direct send API");

if (lockedA.ok) {
  expect("resolved context has no email/mobile leakage", !documentWorkspaceContextLeaksPii(lockedA.context));
}

expect("exists API route", fs.existsSync(path.join(root, "src/app/api/document-workspace/context/route.ts")));
expect("exists lock lib", fs.existsSync(path.join(root, lockLib)));

if (failures.length) {
  console.error(`\nCO-C1-CONTEXT-LOCKED-DOCUMENT-WORKSPACE-008 verifier FAIL (${failures.length})`);
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}

console.log("\nCO-C1-CONTEXT-LOCKED-DOCUMENT-WORKSPACE-008 verifier PASS");
