/**
 * CO-DWS-001 — Deal Workspace validation stabilization verify (static).
 * No migrate / no deploy.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

for (const rel of [
  "src/constants/invoice-party.ts",
  "server/services/enterprise-deal/deal-invoice-party.ts",
  "src/lib/deal-workspace/deal-workflow-validation.ts",
  "src/lib/deal-workspace/deal-edit-validation.ts",
  "src/components/catalyst-one/deal-workspace/deal-readiness-strip.tsx",
  "docs/co-dws-001/CO-DWS-001-DEAL-WORKSPACE-VALIDATION-REPORT.md",
]) {
  assert.ok(exists(rel), `missing ${rel}`);
}

const invoice = read("src/constants/invoice-party.ts");
assert.match(invoice, /invoicePartyRequiredToProgressTo/);
assert.match(invoice, /return false/);
assert.match(invoice, /assertInvoicePartyForAccountingOperation/);
assert.match(invoice, /CO-DWS-001|CO-BUG-001/);

const serverAssert = read("server/services/enterprise-deal/deal-invoice-party.ts");
assert.match(serverAssert, /Intentionally empty|no-op for Lender Pipeline/i);
assert.match(serverAssert, /assertInvoicePartyForAccountingOperation/);

const transition = read("server/services/enterprise-deal/enterprise-deal.service.ts");
assert.match(transition, /Invoice Party does not block Lender Pipeline/);
assert.ok(!/assertInvoicePartyForDealStage\(\{/.test(transition));

const loanVal = read("src/lib/loan-validation.ts");
assert.ok(!/LOAN_MISSING_INVOICE_PARTY/.test(loanVal));

const editVal = read("src/lib/deal-workspace/deal-edit-validation.ts");
assert.match(editVal, /requireInvoiceParty intentionally ignored|CO-BUG-001/);
assert.ok(!/INVOICE_PARTY_REQUIRED_MESSAGE/.test(editVal));
assert.ok(!/isInvoicePartyComplete/.test(editVal));

const editDialog = read("src/components/catalyst-one/shared/edit-deal-dialog.tsx");
assert.match(editDialog, /requireInvoiceParty:\s*false/);
assert.match(editDialog, /required=\{false\}/);

const readiness = read("src/lib/deal-workspace/deal-workflow-validation.ts");
assert.match(readiness, /deriveDealReadiness/);
assert.match(readiness, /DEAL_WORKFLOW_VALIDATION_INVENTORY/);
assert.match(readiness, /INVOICE_PARTY_ACTION_CENTER_TITLE|Accounting Setup Pending/);
assert.match(readiness, /INVOICE_PARTY_READINESS_HINT/);
assert.match(readiness, /never blocks Lender Pipeline/i);

const header = read("src/components/catalyst-one/deal-workspace/deal-executive-header.tsx");
assert.match(header, /DealReadinessStrip/);
assert.match(header, /deriveDealReadiness/);

const actionCenter = read("src/components/catalyst-one/action-center/action-center.tsx");
assert.match(actionCenter, /readinessNotices/);
assert.match(actionCenter, /action-center-readiness/);

const dealAc = read("src/components/catalyst-one/action-center/deal-action-center.tsx");
assert.match(dealAc, /deriveDealReadiness/);
assert.match(dealAc, /readinessNotices/);

console.log("CO-DWS-001 Deal Workspace Validation Stabilization verify: PASS");
console.log("NOTE: No migrate / no deploy in this sprint.");
