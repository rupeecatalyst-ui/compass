/**
 * CO-C1-CATALYST-REFINEMENTS-016 — Document Workspace false stale-context correction.
 * Synthetic IDs only. Does not read production data, send mail, or mutate documents.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  captureAuthorisedComposerFingerprint,
  composerMustRefuseStaleContext,
  documentWorkspaceDeskActionsMustRefuse,
  documentWorkspaceFingerprint,
  lockMatchesCurrentDocumentWorkspaceRequest,
} from "../src/lib/document-workspace/context-lock.ts";
import { validateLockedDocumentSelection } from "../src/lib/document-workspace/selection.ts";
import { decideDocumentBelongsToContext } from "../src/lib/document-workspace/access-decision.ts";
import {
  DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE,
} from "../src/constants/document-workspace-security.ts";
import {
  decideCanMoveToDeleted,
  decideCanRestoreDeleted,
  decidePermanentPurge,
} from "../src/lib/document-workspace/lifecycle-decision.ts";
import { ROLES } from "../src/constants/roles.ts";
import { shouldInlinePreview } from "../src/lib/document-workspace/file-security.ts";
import { DOCUMENT_WORKSPACE_STALE_CONTEXT } from "../src/constants/document-workspace.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
}
function expect(name, condition) {
  if (condition) ok(name);
  else fail(name);
}
function mustContain(rel, needle, label = needle) {
  expect(`${rel} contains ${label}`, read(rel).includes(needle));
}
function mustNotContain(rel, needle, label = needle) {
  expect(`${rel} omits ${label}`, !read(rel).includes(needle));
}

const workspace = "src/components/catalyst-one/document-workspace/document-workspace.tsx";
const preview = "src/components/catalyst-one/document-workspace/document-workspace-preview.tsx";
const access = "src/lib/document-workspace/access-decision.ts";
const lifecycle = "src/lib/document-workspace/lifecycle-decision.ts";
const store = "src/lib/document-registry/store.ts";

console.log("\n--- False stale-context: sparse URL vs resolved lock ---");

const currentOpportunityId = "clopportunity000117syn";
const otherOpportunityId = "clopportunityother00syn";
const orgId = "corg0000000000000000001";
const contactId = "ccontact000000000000001";
const dealA = "cdealA000000000000000001";
const dealB = "cdealB000000000000000001";
const factsheetId = "cdocfactsheet000000001";

const sparseUrl = { opportunityId: currentOpportunityId };
const resolvedLock = {
  organizationId: orgId,
  opportunityId: currentOpportunityId,
  dealId: "",
  contactId,
  companyId: "",
};
const resolvedFingerprint = documentWorkspaceFingerprint(resolvedLock);
const urlFingerprint = documentWorkspaceFingerprint(sparseUrl);

expect(
  "resolved lock fingerprint differs from sparse URL fingerprint",
  resolvedFingerprint !== urlFingerprint,
);
expect(
  "legacy fingerprint compare would refuse a legitimate current Opportunity",
  composerMustRefuseStaleContext({
    openedFingerprint: resolvedFingerprint,
    currentFingerprint: urlFingerprint,
    authorised: true,
  }) === true,
);

const sparseMatches = lockMatchesCurrentDocumentWorkspaceRequest(resolvedLock, sparseUrl);
expect("sparse URL Opportunity ID plus fully resolved lock is allowed", sparseMatches === true);
expect(
  "desk actions allow sparse URL + resolved organisation/contact lock",
  documentWorkspaceDeskActionsMustRefuse({
    lockMatchesRequest: sparseMatches,
    authorised: true,
  }) === false,
);

const orgContactUrl = {
  opportunityId: currentOpportunityId,
  organizationId: orgId,
  contactId,
};
expect(
  "sparse URL Opportunity plus resolved organisation/contact still matches",
  lockMatchesCurrentDocumentWorkspaceRequest(resolvedLock, orgContactUrl) === true,
);

const oppMismatch = lockMatchesCurrentDocumentWorkspaceRequest(resolvedLock, {
  opportunityId: otherOpportunityId,
});
expect("URL Opportunity mismatch is refused", oppMismatch === false);
expect(
  "desk actions refuse Opportunity mismatch",
  documentWorkspaceDeskActionsMustRefuse({
    lockMatchesRequest: oppMismatch,
    authorised: true,
  }) === true,
);

const dealLock = { ...resolvedLock, dealId: dealA };
expect(
  "URL Deal mismatch is refused",
  lockMatchesCurrentDocumentWorkspaceRequest(dealLock, {
    opportunityId: currentOpportunityId,
    dealId: dealB,
  }) === false,
);

expect(
  "missing authorised lock is refused",
  documentWorkspaceDeskActionsMustRefuse({
    lockMatchesRequest: false,
    authorised: false,
  }) === true,
);
expect(
  "lock error / unauthorised is refused even if request shape matches",
  documentWorkspaceDeskActionsMustRefuse({
    lockMatchesRequest: true,
    authorised: false,
  }) === true,
);

const openedOnA = documentWorkspaceFingerprint({
  organizationId: orgId,
  opportunityId: currentOpportunityId,
  contactId,
});
const deskMovedToB = documentWorkspaceFingerprint({
  organizationId: orgId,
  opportunityId: otherOpportunityId,
  contactId,
});
expect(
  "composer opened under Opportunity A refuses after desk changes to Opportunity B",
  composerMustRefuseStaleContext({
    openedFingerprint: openedOnA,
    currentFingerprint: deskMovedToB,
    authorised: true,
  }) === true,
);
expect(
  "composer stays open when lock fingerprint is unchanged",
  composerMustRefuseStaleContext({
    openedFingerprint: openedOnA,
    currentFingerprint: openedOnA,
    authorised: true,
  }) === false,
);

expect(
  "capture fingerprint only from authorised matching lock",
  captureAuthorisedComposerFingerprint({
    lockFingerprint: resolvedFingerprint,
    lockMatchesRequest: true,
    authorised: true,
  }) === resolvedFingerprint,
);
expect(
  "capture fingerprint refuses unauthorised lock",
  captureAuthorisedComposerFingerprint({
    lockFingerprint: resolvedFingerprint,
    lockMatchesRequest: true,
    authorised: false,
  }) === null,
);

console.log("\n--- Current-Opportunity factsheet (synthetic OPP-2026-000117 model) ---");
const currentSelection = validateLockedDocumentSelection({
  organizationId: orgId,
  opportunityId: currentOpportunityId,
  selected: [
    {
      id: factsheetId,
      organizationId: orgId,
      opportunityId: currentOpportunityId,
      dealId: null,
    },
  ],
});
expect(
  "factsheet stamped to the current Opportunity is allowed through action validation",
  currentSelection.ok === true &&
    documentWorkspaceDeskActionsMustRefuse({
      lockMatchesRequest: true,
      authorised: true,
    }) === false,
);

const belongs = decideDocumentBelongsToContext({
  organizationId: orgId,
  opportunityId: currentOpportunityId,
  document: {
    id: factsheetId,
    organizationId: orgId,
    opportunityId: currentOpportunityId,
    dealId: null,
    status: "active",
  },
});
expect("014B belongs-to-context allows the current-Opportunity document", belongs.ok === true);

const foreignSelection = validateLockedDocumentSelection({
  organizationId: orgId,
  opportunityId: currentOpportunityId,
  selected: [
    {
      id: "cdocotheropportunity0001",
      organizationId: orgId,
      opportunityId: otherOpportunityId,
      dealId: null,
    },
  ],
});
expect(
  "document from another Opportunity is refused by selection",
  foreignSelection.ok === false && foreignSelection.code === "CROSS_TRANSACTION",
);

const foreignBelongs = decideDocumentBelongsToContext({
  organizationId: orgId,
  opportunityId: currentOpportunityId,
  document: {
    id: "cdocotheropportunity0001",
    organizationId: orgId,
    opportunityId: otherOpportunityId,
    status: "active",
  },
});
expect(
  "document from another Opportunity is refused by 014B belongs-to-context",
  !foreignBelongs.ok &&
    foreignBelongs.httpStatus === 404 &&
    foreignBelongs.message === DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE,
);

console.log("\n--- Preview, Custom Email, channels, delete/restore unchanged ---");
mustNotContain(preview, "documentWorkspaceDeskActionsMustRefuse", "preview not gated by desk-action refuse");
mustNotContain(preview, "composerMustRefuseStaleContext", "preview not gated by composer stale check");
mustContain(preview, "getDocumentPreviewUrl", "preview still uses authorised preview URL");
expect(
  "inline PDF preview policy unchanged",
  shouldInlinePreview({ mimeType: "application/pdf", filename: "factsheet.pdf" }) === true,
);

mustContain(workspace, "documentWorkspaceDeskActionsMustRefuse", "onAction uses lock-match desk gate");
mustNotContain(
  workspace,
  "openedFingerprint: lock?.fingerprint",
  "onAction no longer compares lock fingerprint to URL",
);
mustNotContain(
  workspace,
  "currentFingerprint: lock?.fingerprint || contextKey",
  "composer no longer falls back to sparse URL fingerprint",
);
mustContain(workspace, "currentFingerprint: lock?.fingerprint", "open composer compares captured vs lock fingerprint");
mustContain(workspace, 'setMailbox("send")', "Custom Email opens mailbox");
mustContain(workspace, "Nothing has been sent", "Custom Email / request do not claim send");
mustNotContain(workspace, "sendTransactionalEmail(", "no SMTP send from Document Workspace");
mustContain(workspace, 'id === "whatsapp"', "WhatsApp uses onAction after desk gate");
mustContain(workspace, 'id === "download_pack"', "Download Pack uses onAction after desk gate");
mustContain(workspace, 'id === "request_selected"', "Request uses onAction after desk gate");
mustContain(workspace, 'id === "template_email"', "Template Email uses onAction after desk gate");
mustContain(workspace, "lockedOpportunityId", "actions stay on locked Opportunity");
expect(
  "stale-context copy unchanged",
  DOCUMENT_WORKSPACE_STALE_CONTEXT.includes("previous transaction"),
);

mustNotContain(access, "documentWorkspaceDeskActionsMustRefuse", "014B access-decision not rewritten");
expect("delete still Manager+", decideCanMoveToDeleted({ role: ROLES.VIEWER, document: null }).ok === false);
expect(
  "restore still Manager+",
  decideCanRestoreDeleted({ role: ROLES.ANALYST, document: null }).ok === false,
);
expect("permanent purge still refused", decidePermanentPurge().httpStatus === 403);
mustContain(lifecycle, "PURGE_NOT_AUTHORISED", "purge refuse unchanged");

console.log("\n--- Classification and orphan-reclaim left untouched ---");
mustNotContain(workspace, "doc:address-rent", "does not rewrite production type_ref");
mustContain(store, "reclaim orphans", "orphan-reclaim remains a separate local listing path");

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nCO-C1-DOCUMENT-WORKSPACE-STALE-CONTEXT-016 verifier PASS");
