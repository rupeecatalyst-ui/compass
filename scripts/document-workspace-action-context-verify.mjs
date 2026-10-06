import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import {
  lockDocumentWorkspaceContext,
  documentWorkspaceFingerprint,
  lockMatchesCurrentDocumentWorkspaceRequest,
  composerMustRefuseStaleContext,
  documentWorkspaceTransientUiAfterFingerprintChange,
} from "../src/lib/document-workspace/context-lock.ts";

const opportunity = { id: "opportunity_current", organizationId: "organization_current", primaryContactId: "contact_current", companyId: "company_current" };
const deal = { id: "cdeal_current", organizationId: opportunity.organizationId, opportunityId: opportunity.id };
const resolve = (request, record = opportunity, selectedDeal = null, actor = opportunity.organizationId) =>
  lockDocumentWorkspaceContext({ request, opportunity: record, deal: selectedDeal, actorOrganizationId: actor });
const request = { opportunityId: opportunity.id };
const a = resolve(request);
assert.equal(a.ok, true);
// Reproduces the regression: optional URL IDs are enriched by server resolution.
assert.notEqual(documentWorkspaceFingerprint(request), a.context.fingerprint);
const allowed = (lock, req, opened = lock?.fingerprint) => !composerMustRefuseStaleContext({
  openedFingerprint: opened,
  currentFingerprint: lockMatchesCurrentDocumentWorkspaceRequest(lock, req) ? lock.fingerprint : null,
  authorised: lockMatchesCurrentDocumentWorkspaceRequest(lock, req),
});
for (const action of ["custom_email", "template_email", "request_selected", "request_all_pending", "send_documents"]) {
  assert.equal(allowed(a.context, request), true, action);
}
const dealRequest = { dealId: deal.id };
const d = resolve(dealRequest, opportunity, deal);
assert.equal(d.ok, true);
assert.equal(d.context.opportunityId, opportunity.id);
assert.equal(d.context.dealId, deal.id);
assert.equal(allowed(d.context, dealRequest), true);
assert.equal(allowed(d.context, request), false, "Deal lock cannot leak into Opportunity-only request");
const requestB = { opportunityId: "opportunity_next" };
const b = resolve(requestB, { ...opportunity, id: requestB.opportunityId });
assert.equal(b.ok, true);
assert.equal(allowed(a.context, requestB), false, "A lock rejected immediately on B URL");
assert.equal(allowed(b.context, requestB, a.context.fingerprint), false, "A composer rejected after B resolves");
const cleared = documentWorkspaceTransientUiAfterFingerprintChange({ previousFingerprint: documentWorkspaceFingerprint(request), nextFingerprint: documentWorkspaceFingerprint(requestB) });
assert.equal(cleared.switched, true);
assert.deepEqual(cleared.selectedIds, []);
assert.equal(cleared.composerFingerprint, null);
assert.equal(resolve(request, opportunity, null, "organization_other").ok, false);
assert.equal(resolve({ ...request, dealId: deal.id }, opportunity, { ...deal, opportunityId: "opportunity_other" }).ok, false);
assert.equal(composerMustRefuseStaleContext({ openedFingerprint: a.context.fingerprint, currentFingerprint: a.context.fingerprint, authorised: false }), true);
assert.equal(allowed(null, request), false);
const source = fs.readFileSync(new URL("../src/components/catalyst-one/document-workspace/document-workspace.tsx", import.meta.url), "utf8");
assert.ok(source.includes("currentCommunicationFingerprint.current"));
assert.ok(source.includes("lockMatchesCurrentDocumentWorkspaceRequest(lock, request) && !lockError"));
const actionGate = source.slice(source.indexOf("const onAction ="), source.indexOf("const requestable =", source.indexOf("const onAction =")));
assert.ok(actionGate.includes("currentFingerprint: currentCommunicationFingerprint.current"));
assert.ok(!actionGate.includes("currentFingerprint: contextKey"), "Action gate must compare canonical identities, not sparse URL fingerprint");
assert.ok(source.includes("setMailbox(transition.mailbox)"), "Preserve production mailbox reset");
assert.ok(source.includes("contextFingerprint={lock?.fingerprint || contextKey}"), "Preserve production composer reset binding");
const ownerReset = source.slice(source.indexOf("const owner = `${activePartyKey}|${ownerTab}`"), source.indexOf("}, [activePartyKey, ownerTab])"));
for (const reset of ["setSelectedIds([])", "setMailbox(null)", "setMailboxFingerprint(null)"]) assert.ok(ownerReset.includes(reset));
assert.ok(source.includes("setMailboxFingerprint(null)"));
assert.ok(source.includes("setMailbox(null)"));
assert.ok(source.includes("currentMailboxScope.current !== mailboxScope || composerMustRefuseStaleContext"));
assert.ok(source.includes('if (!result.ok || result.deliveryStatus !== "sent")'), "Failed operational dispatch must not be reported as sent");
const operationalApi = fs.readFileSync(new URL("../src/lib/enterprise-communication-center/operational-transaction-email-api.ts", import.meta.url), "utf8");
assert.ok(operationalApi.slice(operationalApi.indexOf("export async function sendTransactionOperationalEmail")).includes("if (!res.ok)"), "Failed validation responses must reject before reporting delivery");
const openEmail = source.slice(source.indexOf('if (id === "custom_email"'), source.indexOf('if (id === "whatsapp"'));
assert.ok(openEmail.includes('setMailbox("send")'));
assert.ok(!/queueOutboxMessage|authenticatedJsonFetch|requestDocumentItems/.test(openEmail));
assert.ok(openEmail.includes("setMailboxFingerprint(lock!.fingerprint)"));
const openCentre = source.slice(source.indexOf("open={actionOpen}"), source.indexOf("selectedCount={selectedIds.length}", source.indexOf("open={actionOpen}")));
assert.ok(openCentre.includes("setActionOpen(open)"));
assert.ok(!/queueOutboxMessage|authenticatedJsonFetch|requestDocumentItems|createOrRegenerateUploadSession/.test(openCentre));
console.log("PASS: Opportunity actions, Deal context, A → B isolation, unauthorized rejection, reset wiring, fail-closed response, email opening has no writes/send (contract and source checks).");
for (const relative of ["../src/components/catalyst-one/document-workspace/document-workspace.tsx", "../src/lib/document-workspace/context-lock.ts"]) {
  const result = ts.transpileModule(fs.readFileSync(new URL(relative, import.meta.url), "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
    reportDiagnostics: true,
    fileName: relative,
  });
  assert.deepEqual((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error), []);
}
console.log("PASS: changed TypeScript files transpile without syntax errors.");
