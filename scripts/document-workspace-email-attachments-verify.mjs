import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import * as router from "../src/lib/enterprise-communication-center/recipient-router.ts";
import * as fileSecurity from "../src/lib/document-workspace/file-security.ts";
import * as policy from "../src/constants/document-registry/index.ts";
import * as intake from "../src/constants/document-intake/index.ts";
import * as ccPolicy from "../src/lib/enterprise-communication-center/initiating-sender-cc.ts";
import * as recipientSelection from "../src/lib/enterprise-communication-center/recipient-selection.ts";
import * as lockPolicy from "../src/lib/document-workspace/context-lock.ts";
import { validateLockedDocumentSelection } from "../src/lib/document-workspace/selection.ts";
import { mergeDocumentWorkspaceRows } from "../src/lib/document-workspace/merge-rows.ts";
import { deriveDocumentWorkspaceReviewStatus } from "../src/lib/document-workspace/review-status.ts";
import { appendCorporateEmailSignature } from "../src/lib/enterprise-communication-center/corporate-identity.ts";

// Offline tests: real changed functions; database, HTTP and SMTP boundaries are in-memory doubles.
const root = fileURLToPath(new URL("..", import.meta.url));
const requireNative = createRequire(import.meta.url);
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
function evaluate(source, mocks = {}, globals = {}, filename = "fixture.ts") {
  const result = ts.transpileModule(source, { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, reportDiagnostics: true });
  assert.deepEqual((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error), []);
  const module = { exports: {} };
  const context = vm.createContext({ module, exports: module.exports, Buffer, Uint8Array, Blob, File, FormData, URL, setTimeout, clearTimeout, console, ...globals,
    require: id => Object.hasOwn(mocks, id) ? mocks[id] : id.startsWith("node:") ? requireNative(id) : (() => { throw new Error(`Unmocked boundary: ${id}`); })(),
  });
  vm.runInContext(result.outputText, context, { filename });
  return module.exports;
}
const load = (relative, mocks, globals) => evaluate(read(relative), mocks, globals, relative);
const org = "organization_current", opp = "opportunity_current", deal = "cdeal_current";
const manager = { id: "user_manager", email: "manager@example.test", isActive: true, role: "MANAGER" };
const employees = [manager, { id: "user_employee_one", email: "one@example.test", isActive: true, role: "ANALYST" }, { id: "user_employee_two", email: "two@example.test", isActive: true, role: "MANAGER" }, { id: "user_viewer", email: "viewer@example.test", isActive: true, role: "VIEWER" }, { id: "user_inactive", email: "inactive@example.test", isActive: false, role: "ANALYST" }];
let missingCustomer = false;
const contactFixtures = [
  { id: "contact_current", organizationId: org, name: "Customer", officialEmail: "customer@example.test", personalEmail: null, enabled: true, isDeleted: false, status: "active" },
  { id: "contact_extra", organizationId: org, name: "Existing Contact", officialEmail: "extra@example.test", personalEmail: null, enabled: true, isDeleted: false, status: "active" },
  { id: "contact_foreign", organizationId: "foreign", name: "Foreign", officialEmail: "foreign@example.test", enabled: true, isDeleted: false, status: "active" },
];
const lenderFixtures = [{ id: "lender_contact", organizationId: org, name: "Lender Contact", email: "lender@example.test", enabled: true, isDeleted: false }];
function eligible(rows, where) {
  return rows.filter(row => (!where.organizationId || row.organizationId === where.organizationId)
    && (!where.id || where.id.in.includes(row.id)) && (!where.enabled || row.enabled)
    && (!where.isActive || row.isActive) && (where.isDeleted !== false || !row.isDeleted)
    && (!where.role || row.role !== where.role.not) && (!where.status || row.status !== where.status.not)
    && (!where.OR || where.OR.some(clause => Object.entries(clause).some(([key, condition]) => String(row[key] || "").toLowerCase().includes(condition.contains.toLowerCase())))));
}
const prisma = {
  enterpriseDeal: { findFirst: async ({ where }) => where.organizationId === org && where.id === deal ? { id: deal, opportunityId: opp, primaryContactId: "contact_current", relationshipManagerUserId: manager.id, lenderId: "lender_current" } : null },
  enterpriseOpportunity: { findFirst: async ({ where }) => where.organizationId === org && where.id === opp ? { id: opp, primaryContactId: "contact_current", relationshipManagerUserId: manager.id } : null },
  ecmContact: { findMany: async ({ where }) => missingCustomer ? [] : eligible(contactFixtures, where) },
  user: { findMany: async ({ where }) => eligible(employees, where), findFirst: async ({ where }) => employees.find(u => u.id === where.id) },
  enterpriseLenderContact: { findFirst: async () => ({ lenderId: "lender_current", email: "lender@example.test" }), findMany: async ({ where }) => eligible(lenderFixtures, where) },
};
const directory = load("server/services/enterprise-communication-center/recipient-directory.service.ts", {
  "@/lib/enterprise-communication-center/recipient-router": router,
  "@/lib/enterprise-communication-center/recipient-selection": recipientSelection,
  "@server/lib/prisma": { prisma },
  "@server/repositories/ecm/organization.repository": { resolvePilotOrganizationId: async () => org },
});
const recipients = load("server/services/enterprise-communication-center/recipient-router.service.ts", {
  "./recipient-directory.service": directory,
  "@/lib/enterprise-communication-center/recipient-router": router,
  "@server/lib/prisma": { prisma },
  "@server/repositories/ecm/organization.repository": { resolvePilotOrganizationId: async () => org },
});
const recipientInput = { organizationId: org, opportunityId: opp, eventType: "customer_communication" };
assert.equal(router.internalUserIdForParticipant({ id: "rm:user_employee_one" }), "user_employee_one");
assert.equal(router.internalUserIdForParticipant({ id: "employee:user_employee_two", identityRef: "identity:user:user_employee_two" }), "user_employee_two");
assert.equal(router.internalUserIdForParticipant({ id: "rm:Employee Name", email: "untrusted@example.test" }), null);
const customer = await recipients.loadAndResolveTransactionOperationalRecipients({ ...recipientInput, to: ["tampered@example.test"] });
assert.equal(customer.ok, true); assert.equal(customer.to[0], "customer@example.test");
for (const id of ["user_employee_one", "user_employee_two"]) {
  const result = await recipients.loadAndResolveTransactionOperationalRecipients({ ...recipientInput, primaryToRole: "internal_employee", internalUserId: id, to: ["tampered@example.test"] });
  assert.equal(result.ok, true); assert.equal(result.to[0], employees.find(u => u.id === id).email);
}
for (const id of [null, "user_unknown", "user_viewer", "user_inactive"]) assert.equal((await recipients.loadAndResolveTransactionOperationalRecipients({ ...recipientInput, primaryToRole: "internal_employee", internalUserId: id })).ok, false);
await assert.rejects(() => recipients.loadAndResolveTransactionOperationalRecipients({ ...recipientInput, organizationId: "organization_other", primaryToRole: "internal_employee", internalUserId: "user_employee_one" }));
await assert.rejects(() => recipients.loadAndResolveTransactionOperationalRecipients({ ...recipientInput, opportunityId: "opportunity_other", dealId: deal }));
const lender = await recipients.loadAndResolveTransactionOperationalRecipients({ ...recipientInput, dealId: deal, primaryToRole: "lender" });
assert.equal(lender.ok, true); assert.equal(lender.to[0], "lender@example.test");
missingCustomer = true; assert.equal((await recipients.loadAndResolveTransactionOperationalRecipients(recipientInput)).ok, false); missingCustomer = false;
console.log("PASS 1–6,9: Customer/User/lender SSOT, two employees, identity selection, unauthorized/missing/cross-org rejection, tampered email ignored.");

const multipleSelections = {
  toRecipients: [{ kind: "lender_contact", id: "lender_contact", email: "tampered@example.test" }, { kind: "user", id: "user_employee_one" }, { kind: "contact", id: "contact_extra" }, { kind: "contact", id: "contact_extra" }],
  ccRecipients: [{ kind: "user", id: "user_employee_two" }, { kind: "contact", id: "contact_extra" }],
};
const multiple = await recipients.loadAndResolveTransactionOperationalRecipients({ ...recipientInput, ...multipleSelections });
assert.equal(multiple.ok, true);
assert.deepEqual(Array.from(multiple.to), ["customer@example.test", "lender@example.test", "one@example.test", "extra@example.test"]);
assert.deepEqual(Array.from(multiple.cc), [manager.email, "two@example.test"]);
const withoutPrimary = await recipients.loadAndResolveTransactionOperationalRecipients({ ...recipientInput, ...multipleSelections, includePrimaryTo: false });
assert.ok(!withoutPrimary.to.includes("customer@example.test"));
for (const ref of [{ kind: "contact", id: "contact_foreign" }, { kind: "user", id: "user_viewer" }, { kind: "user", id: "user_inactive" }, { kind: "lender_contact", id: "unknown" }, { kind: "arbitrary", id: "unknown" }]) {
  await assert.rejects(() => recipients.loadAndResolveTransactionOperationalRecipients({ ...recipientInput, toRecipients: [ref] }));
}
await assert.rejects(() => directory.resolveEmailRecipientSelections("foreign", [], []));
assert.equal((await directory.searchEmailRecipientDirectory(org, "Existing"))[0].id, "contact_extra");
assert.equal((await directory.searchEmailRecipientDirectory(org, "extra@example.test"))[0].id, "contact_extra");
assert.equal((await directory.searchEmailRecipientDirectory(org, "Foreign")).length, 0);
const senderAlsoTo = ccPolicy.enforceMandatoryInitiatingSenderCc({ to: [manager.email, manager.email.toUpperCase()], cc: [], initiatingUser: manager });
assert.equal(senderAlsoTo.ok, true); assert.deepEqual(senderAlsoTo.cc, [manager.email]); assert.equal(senderAlsoTo.to.length, 1);
console.log("PASS A–F,I,J: multiple canonical TO/CC, Contact name/email search, Customer/Lender/User coexistence, removable primary, deduplication, mandatory logged-in-user CC even in TO, unauthorized refs rejected.");

const pdfBytes = new Uint8Array(Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF"));
const document = { id: "document_registered", clientRecordId: "dreg_local", organizationId: org, opportunityId: opp, dealId: deal, originalFilename: "attachment.pdf", status: "active" };
let binaryReads = 0;
const access = {
  resolveDocumentWorkspaceAccess: async input => {
    assert.equal(input.userId, manager.id);
    if (input.claimedOrganizationId && input.claimedOrganizationId !== org) throw new Error("Cross organization");
    return { organizationId: org, opportunityId: input.opportunityId, dealId: input.dealId || null, actor: { ...manager, userId: manager.id }, lock: { customerName: "Customer", opportunityNumber: "OPP-TEST" } };
  },
  assertDocumentsInAuthorisedContext: async ({ context, documentIds }) => {
    assert.ok(documentIds.every(id => id === document.id));
    if (!validateLockedDocumentSelection({ ...context, selected: [document] }).ok || document.status !== "active") throw new Error("Unauthorized document");
  },
};
const attachmentMocks = {
  "@server/services/document-workspace/document-workspace-access.service": access,
  "@server/services/enterprise-transaction-documents/enterprise-transaction-document.service": { enterpriseTransactionDocumentService: {
    listByOpportunityForOrganization: async (organizationId, opportunityId) => organizationId === org && opportunityId === opp ? [document] : [],
    resolveBinaryForOrganization: async () => { binaryReads++; return { bytes: pdfBytes, mimeType: "application/pdf" }; },
  } },
  "@/lib/document-workspace/file-security": fileSecurity,
  "@/constants/document-workspace-refinement-014": { DOCUMENT_WORKSPACE_ZIP_MAX_BYTES: 50 * 1024 * 1024 },
};
const attachments = load("server/services/enterprise-communication-center/transaction-email-attachments.service.ts", attachmentMocks);
const attachmentInput = { actorUserId: manager.id, organizationId: org, opportunityId: opp, dealId: deal, documentIds: [document.clientRecordId] };
const existing = await attachments.loadTransactionEmailAttachments(attachmentInput);
assert.equal(existing.length, 1); assert.equal(existing[0].bytes, pdfBytes);
assert.equal((await attachments.loadTransactionEmailAttachments({ ...attachmentInput, documentIds: [document.id, document.clientRecordId] })).length, 1);
await assert.rejects(() => attachments.loadTransactionEmailAttachments({ ...attachmentInput, opportunityId: "opportunity_next" }));
await assert.rejects(() => attachments.loadTransactionEmailAttachments({ ...attachmentInput, dealId: "cdeal_next" }));
await assert.rejects(() => attachments.loadTransactionEmailAttachments({ ...attachmentInput, dealId: null }));
document.status = "quarantined"; await assert.rejects(() => attachments.loadTransactionEmailAttachments(attachmentInput)); document.status = "active";
const transport = load("server/services/enterprise-communication-center/smtp-transport.service.ts");
const mime = transport.buildMimeMessage({ fromEmail: manager.email, fromName: "Manager", replyToEmail: manager.email, to: customer.to, cc: customer.cc, subject: "Documents", textBody: "Please review", attachments: existing });
const parsedMime = await requireNative("mailparser").simpleParser(mime);
assert.deepEqual(Array.from(transport.uniqueSmtpRecipients([manager.email, "extra@example.test"], [manager.email.toUpperCase(), manager.email])), [manager.email, "extra@example.test"]);
assert.ok(read("server/services/enterprise-communication-center/smtp-transport.service.ts").includes("for (const addr of uniqueSmtpRecipients(to, cc))"), "SMTP uses deduplicated RCPT envelope");
assert.equal(parsedMime.subject, "Documents");
assert.equal(parsedMime.attachments[0].filename, "attachment.pdf");
assert.equal(Buffer.compare(parsedMime.attachments[0].content, Buffer.from(pdfBytes)), 0);
assert.match(mime, /multipart\/mixed/); assert.match(mime, /attachment; filename\*=UTF-8''attachment.pdf/); assert.ok(mime.includes(Buffer.from(pdfBytes).toString("base64")));
assert.match(transport.buildMimeMessage({ fromEmail: manager.email, fromName: "Manager", replyToEmail: manager.email, to: customer.to, cc: [], subject: "Text", textBody: "Unchanged text" }), /Content-Type: text\/plain; charset=utf-8/);
console.log("PASS 13,15: existing registry IDs resolve authorized binary without upload/copy; cross-transaction and quarantine rejected; shared SMTP MIME supports attachments.");

let smtpCalls = [], deliveryEnabled = true;
const dispatch = load("server/services/enterprise-communication-center/operational-email-dispatch.service.ts", {
  "@/constants/enterprise-communication-center/operational-delivery": { isOperationalSmtpDeliveryEnabled: () => deliveryEnabled },
  "@/constants/document-requests": {}, "@/constants/routes": { ROUTES: { OPPORTUNITY_WORKSPACE: "/opportunity-workspace" } },
  "@/lib/enterprise-communication-center/smtp-secret-resolver": { resolveSmtpSecret: () => "offline-secret" },
  "@server/services/enterprise-activity/enterprise-activity.service": { enterpriseActivityService: { emit: async () => {} } },
  "@server/services/enterprise-communication-center/ecc.service": { enterpriseCommunicationCenterService: { listProfiles: async () => [{ profileCode: "CUSTOMERS", active: true, smtpProvider: "smtp", smtpHost: "offline", smtpPort: 465, smtpUsername: "offline", senderEmail: "sender@example.test", replyToEmail: "reply@example.test" }] } },
  "@server/services/enterprise-communication-center/recipient-router.service": recipients,
  "@server/lib/prisma": { prisma }, "@/lib/enterprise-communication-center/initiating-sender-cc": ccPolicy,
  "@server/services/enterprise-communication-center/smtp-transport.service": { sendOperationalSmtpMessage: async input => { smtpCalls.push(input); return { ok: true, message: "offline simulation", smtpResponse: "250 fixture" }; } },
  "@server/services/enterprise-notification/enterprise-notification.service": { enterpriseNotificationService: { fanOutBestEffort: async () => {} } },
  "./transaction-email-attachments.service": attachments,
});
const dispatchInput = { ...recipientInput, dealId: deal, actorUserId: manager.id, actorName: "Manager", subject: "Custom subject", textBody: "Custom body", documentIds: [document.id] };
assert.equal((await dispatch.dispatchOperationalTransactionEmail(dispatchInput)).deliveryStatus, "sent");
assert.equal(smtpCalls.length, 1); assert.equal(smtpCalls[0].attachments[0].bytes, pdfBytes); assert.equal(smtpCalls[0].to[0], "customer@example.test");
assert.ok(smtpCalls[0].cc.includes(manager.email));
const multipleDispatch = await dispatch.dispatchOperationalTransactionEmail({ ...dispatchInput, ...multipleSelections, toRecipients: [...multipleSelections.toRecipients, { kind: "user", id: manager.id }], cc: [] });
assert.equal(multipleDispatch.deliveryStatus, "sent");
assert.ok(smtpCalls[1].cc.includes(manager.email), "Dispatch independently enforces authenticated sender CC, even selected in TO");
assert.ok(smtpCalls[1].to.includes(manager.email));
smtpCalls.pop();
await assert.rejects(() => dispatch.dispatchOperationalTransactionEmail({ ...dispatchInput, toRecipients: [{ kind: "contact", id: "contact_foreign" }] }));
assert.equal(smtpCalls.length, 1, "Unauthorized additional recipient prevents SMTP entirely");
await assert.rejects(() => dispatch.dispatchOperationalTransactionEmail({ ...dispatchInput, documentIds: ["document_foreign"] }));
assert.equal(smtpCalls.length, 1);
assert.equal((await dispatch.dispatchOperationalTransactionEmail({ ...dispatchInput, primaryToRole: "internal_employee", internalUserId: "user_viewer" })).deliveryStatus, "recipient_unresolved");
assert.equal(smtpCalls.length, 1);
deliveryEnabled = false; assert.equal((await dispatch.dispatchOperationalTransactionEmail(dispatchInput)).deliveryStatus, "disabled"); assert.equal(smtpCalls.length, 1); deliveryEnabled = true;
let httpOk = true, apiBodies = [];
const operationalApi = load("src/lib/enterprise-communication-center/operational-transaction-email-api.ts", {
  "@/lib/api-client": { authenticatedJsonFetch: async (url, options) => { apiBodies.push(JSON.parse(options.body)); return { ok: httpOk, json: async () => httpOk ? { data: { ok: true, deliveryStatus: "sent" } } : { data: { ok: true, deliveryStatus: "sent" }, error: { message: "Unauthorized" } } }; } },
});
await operationalApi.sendTransactionOperationalEmail({ ...dispatchInput, to: ["attacker@example.test"], cc: ["attacker@example.test"] });
assert.ok(!Object.hasOwn(apiBodies[0], "to")); assert.ok(!Object.hasOwn(apiBodies[0], "cc"));
httpOk = false; await assert.rejects(() => operationalApi.sendTransactionOperationalEmail(dispatchInput));
console.log("PASS: actual operational dispatcher + SMTP boundary (mock only), mandatory sender CC, disabled/invalid recipient/document gates, failed HTTP response rejected even with forged success payload.");

let routeDispatches = [], denyActor = false;
const routeMocks = {
  "@/lib/api/auth-route-utils": {
    requireAccessToken: () => ({ userId: manager.id, email: manager.email }),
    successResponse: data => ({ status: 200, data }), errorResponse: (status, code, message) => ({ status, code, message }), fromAuthError: error => error,
  },
  "@/constants/enterprise-persistence": { isEnterprisePersistencePrisma: () => true },
  "@/lib/enterprise-communication-center/recipient-router": router,
  "@/app/api/enterprise-opportunities/_lib/route-utils": { enterpriseOpportunityApiGuard() {}, mapOpportunityRouteError: error => ({ status: error.statusCode || 500, body: { error: { code: "DENIED", message: error.message } } }) },
  "@server/services/document-workspace/document-workspace-access.service": { resolveDocumentWorkspaceAccess: async input => {
    assert.equal(input.capability, "share"); if (denyActor || input.opportunityId !== opp || (input.dealId && input.dealId !== deal)) throw Object.assign(new Error("Unauthorized context"), { statusCode: 403 });
    return access.resolveDocumentWorkspaceAccess(input);
  } },
  "@/lib/enterprise-communication-center/initiating-sender-cc": ccPolicy,
  "@server/services/enterprise-communication-center/operational-email-dispatch.service": {
    dispatchOperationalTransactionEmail: async input => { routeDispatches.push(input); return { ok: true, deliveryStatus: "sent" }; },
    previewOperationalTransactionEmail: async input => ({ recipientResolution: await recipients.loadAndResolveTransactionOperationalRecipients(input), sender: { senderEmail: "sender@example.test" }, operationalDeliveryEnabled: true }),
  },
};
const previewRoute = load("src/app/api/enterprise-transaction-email/preview/route.ts", routeMocks);
const sendRoute = load("src/app/api/enterprise-transaction-email/send/route.ts", routeMocks);
const searchRoute = load("src/app/api/enterprise-transaction-email/recipients/route.ts", {
  ...routeMocks,
  "@server/services/enterprise-communication-center/recipient-directory.service": directory,
});
assert.equal((await searchRoute.GET({ url: `https://offline.test/api?opportunityId=${opp}&search=Existing` })).data[0].id, "contact_extra");
denyActor = true;
assert.equal((await searchRoute.GET({ url: `https://offline.test/api?opportunityId=${opp}&search=Existing` })).status, 403);
denyActor = false;
const requestFor = data => ({ json: async () => data });
assert.equal((await previewRoute.POST(requestFor({ opportunityId: opp, primaryToRole: "customer", to: ["tampered@example.test"] }))).data.recipientResolution.to[0], "customer@example.test");
assert.equal(routeDispatches.length, 0, "Preview does not dispatch or create communication records");
const sentRoute = await sendRoute.POST(requestFor({ opportunityId: opp, dealId: deal, subject: "Subject", textBody: "Body", documentIds: [document.id], to: ["tampered@example.test"] }));
assert.equal(sentRoute.status, 200); assert.equal(routeDispatches.length, 1); assert.ok(!Object.hasOwn(routeDispatches[0], "to"));
denyActor = true; assert.equal((await sendRoute.POST(requestFor({ opportunityId: opp, subject: "Subject", textBody: "Body" }))).status, 403); assert.equal(routeDispatches.length, 1); denyActor = false;
assert.equal((await previewRoute.POST(requestFor({ opportunityId: "opportunity_other" }))).status, 403);
console.log("PASS: preview/send routes enforce existing share authorization; preview has no dispatch; browser addresses never passed to dispatcher.");

let registryWrites = [], blobWrites = 0;
const browserStorage = new Map();
const browserGlobals = { window: { dispatchEvent() {} }, localStorage: { getItem: key => browserStorage.get(key) || null, setItem: (key, value) => browserStorage.set(key, value) }, CustomEvent: class { constructor(type) { this.type = type; } }, btoa: value => Buffer.from(value, "binary").toString("base64") };
const sync = load("src/lib/document-registry/server-sync.ts", {
  "@/lib/api-client": { getAccessToken: () => "offline-fixture", authenticatedJsonFetch: async (url, options) => { registryWrites.push({ url, data: JSON.parse(options.body) }); return { ok: true, json: async () => ({ success: true, data: { hasContent: true } }) }; } },
  "@/constants/enterprise-persistence": { isEnterprisePersistencePrisma: () => true },
  "@/constants/enterprise-document-object-storage": { ETD_INLINE_CONTENT_BYTES_MAX: 4 * 1024 * 1024 },
  "@/lib/document-registry/blob-store": {}, "@/lib/document-registry/store": {},
}, browserGlobals);
let persistAllowed = true;
const store = load("src/lib/document-registry/store.ts", {
  "@/constants/document-registry": policy,
  "@/lib/enterprise-deal/deal-data-access": { updateDeal: () => { throw new Error("Must not create/update Deal"); } },
  "@/lib/lead-opportunity-journey/opportunity-runtime-adapter": { isOpportunityRuntimeCase: () => true },
  "./blob-store": { saveDocumentBlob: async () => { blobWrites++; } },
  "./authorised-binary": {},
  "./file-utils": { validateDocumentFile: file => { const result = fileSecurity.validateDocumentWorkspaceUpload({ filename: file.name, declaredMime: file.type, byteLength: file.size }); return result.ok ? { ok: true } : { ok: false, reason: result.message }; } },
  "./server-sync": { syncDocumentRecordToServer: async (...args) => persistAllowed ? sync.syncDocumentRecordToServer(...args) : false },
}, browserGlobals);
const uploadFile = new File([pdfBytes], "attachment.pdf", { type: "application/pdf" });
const uploadInput = { file: uploadFile, typeRef: intake.createUnclassifiedDocumentTypeRef(), categoryLabel: "Other Documents", uploadedBy: manager.email, links: { opportunityId: opp, dealId: deal, ownerEntityId: "contact_current", documentScope: "applicant" }, uploadSource: "email", requireServerPersistence: true };
const uploaded = await store.uploadDocumentToRegistry(uploadInput);
assert.equal(registryWrites.length, 1); assert.equal(blobWrites, 1);
assert.equal(registryWrites[0].url, "/api/enterprise-transaction-documents");
assert.equal(registryWrites[0].data.opportunityId, opp); assert.equal(registryWrites[0].data.dealId, deal);
assert.equal(registryWrites[0].data.verifiedAt, null); assert.equal(registryWrites[0].data.verifiedBy, null);
assert.equal(registryWrites[0].data.contentBase64, Buffer.from(pdfBytes).toString("base64"));
const visible = store.listDocumentsForOpportunityRuntime(opp, null);
assert.equal(visible.length, 1); assert.equal(visible[0].id, uploaded.record.id);
assert.equal(mergeDocumentWorkspaceRows({ records: visible, lodItems: [], participants: [] })[0].record.id, uploaded.record.id);
assert.notEqual(deriveDocumentWorkspaceReviewStatus({ record: uploaded.record }), "accepted");
persistAllowed = false;
await assert.rejects(() => store.uploadDocumentToRegistry({ ...uploadInput, typeRef: intake.createUnclassifiedDocumentTypeRef() }));
assert.equal(store.getAllDocumentRegistryRecords().length, 1);
await assert.rejects(() => store.uploadDocumentToRegistry({ ...uploadInput, file: new File(["bad"], "malware.exe", { type: "application/octet-stream" }) }));
console.log("PASS 10–12,18: upload waits for registry persistence; same transaction visible; unclassified/pending, no acceptance/LOD match; no Opportunity/Deal/Contact creation.");

// Execute the actual parent callbacks extracted from TSX, not a duplicate implementation.
const workspacePath = "src/components/catalyst-one/document-workspace/document-workspace.tsx";
const workspace = read(workspacePath);
const ast = ts.createSourceFile(workspacePath, workspace, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function callback(name) {
  let result;
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === "DocumentWorkspaceMailbox") {
      const attr = node.attributes.properties.find(attr => ts.isJsxAttribute(attr) && attr.name.getText(ast) === name);
      if (attr?.initializer && ts.isJsxExpression(attr.initializer)) result = attr.initializer.expression.getText(ast);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.ok(result, name); return result;
}
let sendCalls = [], staleErrors = [], closed = false;
const globals = {
  currentMailboxScope: { current: "scope_a" }, mailboxScope: "scope_a",
  currentCommunicationFingerprint: { current: "canonical_a" }, mailboxFingerprint: "canonical_a",
  composerMustRefuseStaleContext: lockPolicy.composerMustRefuseStaleContext,
  DOCUMENT_WORKSPACE_STALE_CONTEXT: "stale", lockedOpportunityId: opp, dealId: deal, mailbox: "send",
  toast: { error: message => staleErrors.push(message), success() {} }, setMailbox: () => { closed = true; },
  sendTransactionOperationalEmail: async input => { sendCalls.push(input); return { ok: true, deliveryStatus: "sent" }; },
  appendCorporateEmailSignature, actor: "Manager",
};
const queue = evaluate(`module.exports = ${callback("onQueue")};`, {}, globals);
await queue({ subject: "Custom subject", textBody: "Custom body", documentIds: [document.id], primaryToRole: "customer", internalUserId: null });
assert.equal(sendCalls.length, 1); assert.equal(sendCalls[0].documentIds[0], document.id); assert.equal(closed, true);
globals.currentCommunicationFingerprint.current = "canonical_b";
await queue({ subject: "Stale", textBody: "Stale", documentIds: [document.id], primaryToRole: "customer", internalUserId: null });
assert.equal(sendCalls.length, 1); assert.equal(staleErrors.at(-1), "stale");
globals.currentCommunicationFingerprint.current = "canonical_a";
const attachGlobals = { ...globals, lockedLinks: uploadInput.links, user: manager, actor: manager.email,
  canUploadDocuments: () => true, activeParty: { entityId: "contact_current", entityKind: "contact" }, createUnclassifiedDocumentTypeRef: intake.createUnclassifiedDocumentTypeRef,
  uploadDocumentToRegistry: async input => { assert.equal(input.requireServerPersistence, true); return { record: uploaded.record }; },
};
const attach = evaluate(`module.exports = ${callback("onAttachDocument")};`, {}, attachGlobals);
assert.equal((await attach(uploadFile)).id, uploaded.record.id);
assert.equal(sendCalls.length, 1, "Attaching does not send");
const mailboxSource = read("src/components/catalyst-one/document-workspace/document-workspace-mailbox.tsx");
assert.ok(mailboxSource.includes("setKept((rows) => rows.filter((row) => row.id !== item.id))"));
assert.ok(!mailboxSource.includes("deleteDocument"));
assert.ok(!mailboxSource.includes("setKept(attachments);\n  }, [attachments])"), "Parent rerenders cannot restore removed email attachments");
assert.ok(mailboxSource.includes("previewTransactionOperationalEmail"));
assert.ok(mailboxSource.includes("documentIds: kept.map(item => item.id)"));
const openAction = workspace.slice(workspace.indexOf('if (id === "custom_email"'), workspace.indexOf('if (id === "whatsapp"'));
assert.ok(!/sendTransactionOperationalEmail|queueOutboxMessage|authenticatedJsonFetch/.test(openAction));
console.log("PASS 7,8,14,16: actual mailbox callbacks reach existing dispatcher only on send; opening/attaching do not send; stale callbacks rejected; removing affects only email selection.");

// Render the real mailbox with a minimal hook runner and click its controls offline.
const hooks = [], effectQueue = [];
let hookIndex = 0;
const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
const react = {
  useState(initial) { const index = hookIndex++; if (!(index in hooks)) hooks[index] = { value: typeof initial === "function" ? initial() : initial }; return [hooks[index].value, next => { hooks[index].value = typeof next === "function" ? next(hooks[index].value) : next; }]; },
  useRef(initial) { const index = hookIndex++; if (!(index in hooks)) hooks[index] = { current: initial }; return hooks[index]; },
  useMemo(fn) { hookIndex++; return fn(); },
  useEffect(fn, deps) { const index = hookIndex++; if (!sameDeps(hooks[index]?.deps, deps)) { const previous = hooks[index]; hooks[index] = { deps }; effectQueue.push(() => { previous?.cleanup?.(); hooks[index].cleanup = fn(); }); } },
};
let uiSends = [], uiUploads = 0;
const jsx = (type, props) => ({ type, props });
const mailboxModule = load("src/components/catalyst-one/document-workspace/document-workspace-mailbox.tsx", {
  react, "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" }, sonner: { toast: { error() {} } },
  "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/textarea": { Textarea: "Textarea" },
  "@/lib/enterprise-communication-center/operational-transaction-email-api": {
    previewTransactionOperationalEmail: async input => {
      const result = await recipients.loadAndResolveTransactionOperationalRecipients({ ...recipientInput, ...input });
      if (result.ok) Object.assign(result, ccPolicy.enforceMandatoryInitiatingSenderCc({ to: result.to, cc: result.cc, initiatingUser: manager }));
      return { operationalDeliveryEnabled: true, recipientResolution: result, sender: { senderEmail: "sender@example.test" } };
    },
    searchTransactionEmailRecipients: async input => directory.searchEmailRecipientDirectory(org, input.search),
  },
  "@/lib/enterprise-communication-center/recipient-selection": recipientSelection,
  "@/lib/assigned-users": { searchAssignableUsers: async () => [] }, "@/constants/document-workspace-security": { DOCUMENT_WORKSPACE_ALLOWED_EXTENSIONS: policy.DOCUMENT_REGISTRY_ALLOWED_EXTENSIONS },
  "@/constants/document-workspace-refinement-014": {}, "@/lib/utils": { cn: (...parts) => parts.join(" ") },
}, { window: { setTimeout, clearTimeout } });
const mailboxProps = { open: true, opportunityId: opp, dealId: deal, contextFingerprint: "canonical_a", initialKind: "custom", mode: "send", fromEmail: manager.email, senderCc: manager.email, initialTo: "untrusted@example.test", attachments: [{ id: document.id, filename: "attachment.pdf", versionLabel: "v1" }], requestedList: [],
  onQueue: async input => uiSends.push(input), onSaveDraft() {}, onClose() {}, onAttachDocument: async () => { uiUploads++; return { id: "document_new", filename: "new.pdf", versionLabel: "v1" }; } };
function renderMailbox() { hookIndex = 0; const tree = mailboxModule.DocumentWorkspaceMailbox(mailboxProps); while (effectQueue.length) effectQueue.shift()(); return tree; }
function nodes(tree) { const result = []; function walk(node) { if (Array.isArray(node)) return node.forEach(walk); if (!node || typeof node !== "object") return; result.push(node); walk(node.props?.children); } walk(tree); return result; }
let tree = renderMailbox(); await new Promise(resolve => setTimeout(resolve, 0)); tree = renderMailbox();
assert.equal(uiSends.length, 0); assert.equal(uiUploads, 0, "Opening has no upload or send");
assert.ok(nodes(tree).some(node => node.type === "Input" && node.props.value === "customer@example.test" && node.props.readOnly));
let sendButton = nodes(tree).find(node => node.type === "Button" && node.props.children === "Send Email");
assert.equal(sendButton.props.disabled, true, "Custom body required");
nodes(tree).find(node => node.type === "Textarea").props.onChange({ target: { value: "Custom body" } });
tree = renderMailbox(); sendButton = nodes(tree).find(node => node.type === "Button" && node.props.children === "Send Email"); assert.equal(sendButton.props.disabled, false);
async function pickRecipient(query, target) {
  nodes(tree).find(node => node.props?.["aria-label"] === "Add recipient to").props.onChange({ target: { value: target } });
  nodes(tree).find(node => node.props?.["aria-label"] === "Search email recipients").props.onChange({ target: { value: query } });
  renderMailbox(); await new Promise(resolve => setTimeout(resolve, 225)); tree = renderMailbox();
  const list = nodes(tree).find(node => node.props?.["aria-label"] === "Authorized email recipients");
  const option = nodes(list).find(node => node.type === "Button");
  assert.ok(option, query); option.props.onClick();
  renderMailbox(); await new Promise(resolve => setTimeout(resolve, 0)); tree = renderMailbox();
}
await pickRecipient("Existing", "to");
await pickRecipient("Lender", "to");
await pickRecipient("one@example.test", "cc");
await pickRecipient("two@example.test", "cc");
assert.equal(nodes(tree).filter(node => String(node.props?.["aria-label"] || "").startsWith("Remove TO ")).length, 2);
assert.equal(nodes(tree).filter(node => String(node.props?.["aria-label"] || "").startsWith("Remove CC ")).length, 2);
const lockedCc = nodes(tree).find(node => Object.hasOwn(node.props || {}, "data-mandatory-sender-cc"));
assert.equal(lockedCc.props.readOnly, true); assert.ok(lockedCc.props.value.includes(manager.email));
await pickRecipient("Existing", "to");
assert.equal(nodes(tree).filter(node => String(node.props?.["aria-label"] || "").startsWith("Remove TO ")).length, 2, "Repeated selection produces no additional chip");
await nodes(tree).find(node => node.type === "input" && node.props.type === "file").props.onChange({ target: { files: [uploadFile], value: "" } });
assert.equal(uiUploads, 1); assert.equal(uiSends.length, 0);
tree = renderMailbox();
nodes(tree).find(node => node.type === "Button" && node.props.children === "Remove from email").props.onClick();
mailboxProps.attachments = [...mailboxProps.attachments]; tree = renderMailbox();
sendButton = nodes(tree).find(node => node.type === "Button" && node.props.children === "Send Email"); await sendButton.props.onClick();
assert.equal(uiSends.length, 1); assert.deepEqual(Array.from(uiSends[0].documentIds), ["document_new"], "Removed registered document stays excluded after parent rerender");
assert.equal(uiSends[0].toRecipients.length, 2); assert.equal(uiSends[0].ccRecipients.length, 2);
assert.ok(uiSends[0].toRecipients.every(ref => !Object.hasOwn(ref, "email")), "Only durable references leave the composer");
mailboxProps.contextFingerprint = "canonical_b"; mailboxProps.attachments = []; renderMailbox(); tree = renderMailbox();
assert.equal(nodes(tree).filter(node => node.type === "Button" && node.props.children === "Remove from email").length, 0, "Context reset discards all A attachments");
assert.equal(nodes(tree).filter(node => /^Remove (TO|CC) /.test(node.props?.["aria-label"] || "")).length, 0, "A recipient selections do not survive B");
assert.equal(nodes(tree).find(node => node.props?.["aria-label"] === "Search email recipients").props.value, "");
console.log("PASS A–K: actual composer adds multiple TO/CC chips, locks sender CC, deduplicates repeated picks, submits identities only, resets recipient/attachment/search state on A → B; server dispatch and directory enforce authority.");
console.log("PASS: actual mailbox rendering enables valid Custom Email, resolves readonly recipient, picker attaches without sending, remove persists, transaction change clears A attachments.");

for (const relative of [workspacePath, "src/components/catalyst-one/document-workspace/document-workspace-mailbox.tsx", "src/components/catalyst-one/action-center/workspaces/email-context-workspace.tsx", "src/app/api/enterprise-transaction-email/send/route.ts", "src/app/api/enterprise-transaction-email/preview/route.ts", "src/lib/document-registry/store.ts", "src/lib/document-registry/server-sync.ts", "server/services/enterprise-communication-center/operational-email-dispatch.service.ts"]) {
  const result = ts.transpileModule(read(relative), { fileName: relative, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
  assert.deepEqual((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error), []);
}
console.log("PASS: focused offline email + attachment proofs and changed-file syntax. No real DB or SMTP calls.");
