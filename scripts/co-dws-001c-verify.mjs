/**
 * CO-DWS-001C — Remove Accounting dependency from Lender Pipeline (static verify).
 * No migrate / no live-data / no deploy.
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
  "server/services/enterprise-deal/enterprise-deal.service.ts",
  "src/lib/deal-workspace/deal-workflow-validation.ts",
  "src/components/catalyst-one/action-center/deal-action-center.tsx",
  "src/components/catalyst-one/execution/lender-pipeline-board.tsx",
  "docs/co-dws-001/CO-DWS-001C-ACCOUNTING-PIPELINE-DECOUPLE-REPORT.md",
]) {
  assert.ok(exists(rel), `missing ${rel}`);
}

const invoice = read("src/constants/invoice-party.ts");
assert.match(invoice, /INVOICE_PARTY_ACTION_CENTER_TITLE\s*=\s*"Accounting Setup Pending"/);
assert.match(invoice, /INVOICE_PARTY_READINESS_HINT\s*=\s*"Invoice Party has not yet been configured\."/);
assert.match(invoice, /INVOICE_PARTY_ACTION_CENTER_ACTION\s*=\s*"Configure Invoice Party"/);
assert.match(invoice, /export function invoicePartyRequiredToProgressTo/);
assert.match(invoice, /return false/);
assert.match(invoice, /assertInvoicePartyForAccountingOperation/);

const serverAssert = read("server/services/enterprise-deal/deal-invoice-party.ts");
assert.match(serverAssert, /Intentionally empty|no-op for Lender Pipeline/i);
assert.ok(!/throw new DealValidationError[\s\S]{0,80}INVOICE_PARTY_REQUIRED_MESSAGE[\s\S]{0,40}assertInvoicePartyForDealStage/.test(serverAssert));

const transition = read("server/services/enterprise-deal/enterprise-deal.service.ts");
assert.match(transition, /Invoice Party does not block Lender Pipeline/);
assert.ok(!/assertInvoicePartyForDealStage\(\{/.test(transition));
assert.ok(!/assertInvoicePartyForAccountingOperation\(\{/.test(transition));

const loanVal = read("src/lib/loan-validation.ts");
assert.ok(!/LOAN_MISSING_INVOICE_PARTY/.test(loanVal));
assert.ok(!/INVOICE_PARTY_REQUIRED_MESSAGE/.test(loanVal));

const board = read("src/components/catalyst-one/execution/lender-pipeline-board.tsx");
assert.match(board, /never block Pipeline/i);
assert.ok(!/INVOICE_PARTY_REQUIRED_MESSAGE/.test(board));
assert.ok(!/assertInvoiceParty/.test(board));

const readiness = read("src/lib/deal-workspace/deal-workflow-validation.ts");
assert.match(readiness, /INVOICE_PARTY_ACTION_CENTER_TITLE/);
assert.match(readiness, /INVOICE_PARTY_READINESS_HINT/);
assert.match(readiness, /INVOICE_PARTY_ACTION_CENTER_ACTION/);
assert.match(readiness, /never a Lender Pipeline stage-transition gate/i);

const dealAc = read("src/components/catalyst-one/action-center/deal-action-center.tsx");
assert.match(dealAc, /INVOICE_PARTY_ACTION_CENTER_TITLE/);
assert.match(dealAc, /INVOICE_PARTY_READINESS_HINT/);
assert.match(dealAc, /INVOICE_PARTY_ACTION_CENTER_ACTION/);
assert.match(dealAc, /readinessNotices/);

const editDialog = read("src/components/catalyst-one/shared/edit-deal-dialog.tsx");
assert.match(editDialog, /requireInvoiceParty:\s*false/);
assert.match(editDialog, /required=\{false\}/);

const modal = read("src/components/catalyst-one/shared/loan-workspace-modal.tsx");
assert.match(modal, /required=\{false\}/);

console.log("CO-DWS-001C Remove Accounting Dependency from Lender Pipeline: PASS");
console.log("NOTE: No migrate / no live-data / no deploy.");
