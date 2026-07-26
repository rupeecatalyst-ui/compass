/**
 * CO-ARCH-003 Phase 2B Sprint 2 — structural / regression verify (no DB writes).
 * Confirms Edit Deal, lender search, product eligibility, audit trail wiring,
 * and that Sprint 1 Invoice Party + Phase 2A Opportunity–Deal contracts remain.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const checks = [];

function check(id, name, ok, detail = "") {
  checks.push({ id, name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} [${id}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function read(rel) {
  const p = resolve(root, rel);
  if (!existsSync(p)) return null;
  return readFileSync(p, "utf8");
}

function mustInclude(rel, needles, id, name) {
  const src = read(rel);
  if (!src) {
    check(id, name, false, `missing file ${rel}`);
    return;
  }
  const missing = needles.filter((n) => !src.includes(n));
  check(id, name, missing.length === 0, missing.length ? `missing: ${missing.join(", ")}` : rel);
}

// --- Sprint 2 deliverables ---
mustInclude(
  "src/components/catalyst-one/shared/enterprise-lender-search.tsx",
  ["searchActiveLenders", "lenderSupportsProduct", "listRecentDealLenders", "listLenderPrograms"],
  "S2-01",
  "EnterpriseLenderSearch present",
);

mustInclude(
  "src/lib/deal-workspace/product-lender-eligibility.ts",
  ["resolveProductLibraryCode", "lenderSupportsProduct", "LENDER_REGISTRY_PRODUCT_OPTIONS"],
  "S2-02",
  "Product Library eligibility (no hard-coded filter lists)",
);

mustInclude(
  "src/components/catalyst-one/shared/edit-deal-dialog.tsx",
  [
    "EditDealDialog",
    "EnterpriseLenderSearch",
    "InvoicePartyField",
    "validateDealEditFields",
    "lenderId",
    "lenderProgramId",
    "changeReason",
  ],
  "S2-03",
  "Edit Deal dialog fields + validation",
);

mustInclude(
  "src/components/catalyst-one/execution/lender-pipeline-board.tsx",
  ["EnterpriseLenderSearch", "pendingProgram", "lenderProgramId", "rememberDealLender"],
  "S2-04",
  "Identify Lender uses enterprise search + program",
);

mustInclude(
  "src/components/catalyst-one/shared/loan-workspace-modal.tsx",
  ["EditDealDialog", "editDealOpen", "Edit Deal"],
  "S2-05",
  "Loan Workspace wires Edit Deal",
);

mustInclude(
  "server/services/enterprise-deal/enterprise-deal.service.ts",
  [
    "deal_lender_changed",
    "previousLenderId",
    "newLenderId",
    "previousProgramId",
    "newProgramId",
    "lender_or_program_change",
  ],
  "S2-06",
  "Deal lender/program audit trail",
);

mustInclude(
  "src/app/api/enterprise-deals/[dealId]/route.ts",
  ["lenderId", "lenderProgramId"],
  "S2-07",
  "PATCH Deal accepts lenderId / lenderProgramId",
);

mustInclude(
  "src/lib/deal-workspace/deal-edit-validation.ts",
  ["validateDealEditFields", "invoicePartyId", "lenderProgramId"],
  "S2-08",
  "Deal edit validation SSOT",
);

mustInclude(
  "src/constants/chanakya-guide/guidance-repository.ts",
  ["c1-lw-edit-deal", "c1-lw-lender-program", "c1-lw-invoice-party"],
  "S2-09",
  "Chanakya guidance for Edit Deal / lender program",
);

// --- Regression: Sprint 1 Invoice Party ---
mustInclude(
  "src/constants/invoice-party.ts",
  ["INVOICE_PARTY_REQUIRED_FROM_STAGE"],
  "R-01",
  "Invoice Party stage gate constant preserved",
);

mustInclude(
  "src/components/catalyst-one/shared/commercial-payee-field.tsx",
  ["InvoicePartyField", "invoicePartyApiClient", "listActive"],
  "R-02",
  "Invoice Party field Master-only path preserved",
);

// --- Regression: Phase 2A Opportunity–Deal ---
mustInclude(
  "server/services/enterprise-deal/enterprise-deal.service.ts",
  ["opportunityId", "BI-3", "lenderId cannot be cleared"],
  "R-03",
  "Deal requires lender (BI-3) preserved",
);

const failed = checks.filter((c) => !c.ok);
console.log(`\nSummary: ${checks.length - failed.length} PASS / ${failed.length} FAIL / ${checks.length} total`);
process.exit(failed.length ? 1 : 0);
