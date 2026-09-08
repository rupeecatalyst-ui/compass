/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014
 * Right-side document desk, Linked Parties, ZIP, OTP/hash, sender CC, inbound seen.
 * Enterprise Document Registry remains the only document SSOT. No ZIP persistence.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ENTERPRISE_MARKETING_EXECUTION_ENABLED } from "../src/constants/enterprise-marketing-engine/safety.ts";
import { isOperationalSmtpDeliveryEnabled } from "../src/constants/enterprise-communication-center/operational-delivery.ts";
import { DOCUMENT_WORKSPACE_NO_CO_APPLICANT, DOCUMENT_WORKSPACE_REFINEMENT_014_ID, DOCUMENT_WORKSPACE_DESK_BREAKPOINT_PX, DOCUMENT_WORKSPACE_DESK_DESKTOP_MIN_VW, DOCUMENT_WORKSPACE_DESK_DESKTOP_TARGET_VW, DOCUMENT_WORKSPACE_DESK_DESKTOP_MAX_VW, DOCUMENT_WORKSPACE_DESK_TABLET_MIN_VW, DOCUMENT_WORKSPACE_DESK_TABLET_TARGET_VW, DOCUMENT_WORKSPACE_DESK_TABLET_MAX_VW, DOCUMENT_WORKSPACE_DESK_SHEET_CLASSNAME, DOCUMENT_WORKSPACE_DESK_PREVIEW_SPLIT_CLASSNAME } from "../src/constants/document-workspace-refinement-014.ts";
import { mergeLinkedParties } from "../src/lib/document-workspace/linked-parties.ts";
import { validateLockedDocumentSelection } from "../src/lib/document-workspace/selection.ts";
import { planDocumentWorkspaceZip } from "../src/lib/document-workspace/zip-package.ts";
import { enforceMandatoryInitiatingSenderCc } from "../src/lib/enterprise-communication-center/initiating-sender-cc.ts";
import { filterUnseenInboundEmailDocuments } from "../src/lib/document-workspace/inbound-email-new.ts";
import { hashOpaqueToken, otpMatches, createOpaqueUploadToken } from "../src/lib/document-workspace/upload-session-crypto.ts";
import { sanitizeDocumentWorkspaceHtml, htmlToPlainTextFallback } from "../src/lib/document-workspace/sanitize-html.ts";

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

expect("refinement id", DOCUMENT_WORKSPACE_REFINEMENT_014_ID === "CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014");
expect("marketing execution remains disabled", ENTERPRISE_MARKETING_EXECUTION_ENABLED === false);
expect("operational SMTP remains off unless explicitly enabled", isOperationalSmtpDeliveryEnabled() === false || process.env.ECC_OPERATIONAL_SMTP_DELIVERY_ENABLED === "true");

const workspace = "src/components/catalyst-one/document-workspace/document-workspace.tsx";
const constants014 = "src/constants/document-workspace-refinement-014.ts";
const actionDrawer = "src/components/catalyst-one/document-workspace/document-workspace-action-drawer.tsx";
const preview = "src/components/catalyst-one/document-workspace/document-workspace-preview.tsx";
mustContain(workspace, 'data-document-workspace-desk="014"', "right-side document desk");
mustContain(workspace, 'data-document-workspace-desk-layout="right-sheet"', "right-sheet layout");
mustContain(workspace, 'side="right"', "opens from the right");
mustContain(workspace, "DOCUMENT_WORKSPACE_DESK_SHEET_CLASSNAME", "canonical desk width class");
mustContain(workspace, "restoreDocumentWorkspaceViewDocumentsFocus", "focus return to View Documents");
mustContain(workspace, "onCloseAutoFocus", "close restores focus");
mustContain(workspace, "DOCUMENT_WORKSPACE_CLOSE_DESK_LABEL", "labelled close control");
mustNotContain(workspace, "fixed inset-0 z-40", "no unconditional desktop full-screen workspace");
mustNotContain(workspace, "Half workspace", "no half-workspace control");
mustContain(constants014, "min-[1280px]:w-[55vw]", "desktop target 55vw");
mustContain(constants014, "min-[1280px]:min-w-[50vw]", "desktop min 50vw");
mustContain(constants014, "min-[1280px]:max-w-[min(60vw,72rem)]", "desktop max 60vw with cap");
mustContain(constants014, "md:w-[80vw]", "tablet target 80vw");
mustContain(constants014, "md:min-w-[70vw]", "tablet min 70vw");
mustContain(constants014, "md:max-w-[85vw]", "tablet max 85vw");
mustContain(constants014, "w-full", "mobile full-width sheet");
mustContain(constants014, "min-[1280px]:grid-cols-2", "preview occupies half the desk");
expect("desktop breakpoint 1280", DOCUMENT_WORKSPACE_DESK_BREAKPOINT_PX === 1280);
expect("desktop width 50-60vw", DOCUMENT_WORKSPACE_DESK_DESKTOP_MIN_VW === 50 && DOCUMENT_WORKSPACE_DESK_DESKTOP_TARGET_VW === 55 && DOCUMENT_WORKSPACE_DESK_DESKTOP_MAX_VW === 60);
expect("tablet width 70-85vw", DOCUMENT_WORKSPACE_DESK_TABLET_MIN_VW === 70 && DOCUMENT_WORKSPACE_DESK_TABLET_TARGET_VW === 80 && DOCUMENT_WORKSPACE_DESK_TABLET_MAX_VW === 85);
expect("sheet class encodes desktop contract", DOCUMENT_WORKSPACE_DESK_SHEET_CLASSNAME.includes("min-[1280px]:min-w-[50vw]") && DOCUMENT_WORKSPACE_DESK_SHEET_CLASSNAME.includes("min-[1280px]:max-w-[min(60vw,72rem)]"));
expect("preview split is half desk", DOCUMENT_WORKSPACE_DESK_PREVIEW_SPLIT_CLASSNAME.includes("min-[1280px]:grid-cols-2"));
mustContain(workspace, "data-document-workspace-contact-name", "contact name");
mustContain(workspace, "DocumentWorkspaceLinkedParties", "linked parties");
mustContain(workspace, "DocumentWorkspaceMailbox", "large mailbox");
mustContain(workspace, "DocumentWorkspaceSelectionBar", "selection bar");
mustContain(workspace, "pauseOutboxCountdown", "outbox paused");
mustContain("src/lib/document-workspace/linked-parties.ts", "DOCUMENT_WORKSPACE_NO_CO_APPLICANT", "no co-applicant constant");
mustContain(workspace, "Preview", "preview beside filename");
mustContain("src/components/catalyst-one/document-workspace/document-workspace-mailbox.tsx", "data-mandatory-sender-cc", "locked sender CC");
mustContain("src/components/catalyst-one/customer-document-portal/customer-document-collection-portal.tsx", "data-document-upload-otp", "email OTP gate");
mustContain("prisma/migrations/20260908130000_co_c1_document_workspace_refinement_014/migration.sql", "enterprise_document_version_seen", "seen table");
mustNotContain("prisma/migrations/20260908130000_co_c1_document_workspace_refinement_014/migration.sql", "zip_bytes", "no ZIP column");
mustNotContain("prisma/migrations/20260908130000_co_c1_document_workspace_refinement_014/migration.sql", "UPDATE \"enterprise_transaction_documents\" SET", "no ownership rewrite");
mustContain(actionDrawer, "data-document-workspace-action-centre", "docked action centre");
mustContain(actionDrawer, "data-document-workspace-action-centre-collapsed", "collapsible action centre");
mustContain(actionDrawer, "open && !desktopDesk", "action centre sheet is not a desktop takeover");
mustContain(preview, 'data-document-workspace-preview-share="half"', "preview half of desk");
mustContain("src/lib/document-workspace/temporary-zip.ts", "triggerBlobDownload", "temporary ZIP download");
mustContain("src/lib/document-workspace/temporary-zip.ts", "never written to the Enterprise Document Registry", "ZIP not persisted");
mustContain("src/lib/document-workspace/transaction-card-grid.ts", "restoreDocumentWorkspaceViewDocumentsFocus", "focus helper");

const parties = mergeLinkedParties({
  opportunityParticipants: [
    { id: "p1", entityType: "individual", entityId: "c1", name: "Asha", role: "primary_applicant", status: "active" },
  ],
  lockKind: "opportunity",
});
expect("no co-applicant placeholder", parties.some((p) => p.displayName === DOCUMENT_WORKSPACE_NO_CO_APPLICANT));
expect("shared context present", parties.some((p) => p.key === "shared"));
expect("property context present", parties.some((p) => p.key === "property"));
expect("identity is entity id not name", parties[0].entityId === "c1");

const okSel = validateLockedDocumentSelection({
  organizationId: "org1",
  opportunityId: "opp1",
  selected: [{ id: "d1", organizationId: "org1", opportunityId: "opp1" }],
});
expect("same-transaction selection allowed", okSel.ok);
const cross = validateLockedDocumentSelection({
  organizationId: "org1",
  opportunityId: "opp1",
  selected: [{ id: "d2", organizationId: "org1", opportunityId: "opp2" }],
});
expect("cross-transaction selection rejected", !cross.ok);

const zip = planDocumentWorkspaceZip([
  {
    documentId: "doc1",
    versionId: "v1",
    versionNumber: 2,
    partyFolder: "Asha",
    categoryFolder: "KYC",
    filename: "pan.pdf",
    bytes: new Uint8Array([1, 2, 3]),
  },
  {
    documentId: "doc2",
    versionId: "v2",
    versionNumber: 1,
    partyFolder: "Asha",
    categoryFolder: "KYC",
    filename: "pan.pdf",
    bytes: new Uint8Array([4]),
  },
]);
expect("zip plans unique names", zip.ok && zip.entries.some((e) => e.path.includes("pan (2).pdf")));
expect("zip includes manifest", zip.ok && zip.entries.some((e) => e.path === "DOCUMENT-VERSION-MANIFEST.json"));

const cc = enforceMandatoryInitiatingSenderCc({
  to: ["customer@example.com"],
  cc: ["rm@example.com"],
  initiatingUser: { id: "u1", email: "actor@example.com", isActive: true },
});
expect("sender CC added once", cc.ok && cc.cc.filter((e) => e.toLowerCase() === "actor@example.com").length === 1);
const blocked = enforceMandatoryInitiatingSenderCc({
  to: ["customer@example.com"],
  cc: [],
  initiatingUser: { id: "u1", email: "not-an-email", isActive: true },
});
expect("invalid sender email blocks", !blocked.ok);

const unseen = filterUnseenInboundEmailDocuments({
  candidates: [
    { documentId: "d1", versionKey: "v1", uploadSource: "email" },
    { documentId: "d1", versionKey: "v2", uploadSource: "email" },
  ],
  seenKeys: [{ documentId: "d1", versionKey: "v1" }],
});
expect("replacement version is new again", unseen.length === 1 && unseen[0].versionKey === "v2");
expect("workspace load does not invent seen state", unseen[0].documentId === "d1");

const token = createOpaqueUploadToken();
expect("opaque token hashed", token.hash === hashOpaqueToken(token.token) && token.token.startsWith("uptok_"));
expect("otp compare is exact", otpMatches("123456", hashOpaqueToken("123456")) && !otpMatches("000000", hashOpaqueToken("123456")));

const html = sanitizeDocumentWorkspaceHtml('<p onclick="alert(1)">Hi</p><script>x()</script>');
expect("html sanitised", !html.includes("script") && !html.includes("onclick"));
expect("plain text fallback", htmlToPlainTextFallback("<p>Hello</p>") === "Hello");

mustNotContain(workspace, "localStorage.setItem(\"inbound-seen\"", "no browser seen store");
mustContain("src/constants/enterprise-marketing-engine/safety.ts", "ENTERPRISE_MARKETING_EXECUTION_ENABLED = false", "marketing off");

if (failures.length) {
  console.error(`\nFAILED ${failures.length}`);
  process.exit(1);
}
console.log("\nPASS  CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014");
