/**
 * Evaluate Document Completion Score for a loan file (Phase 1B — presentation gates).
 * Mirrors Document Center scoring so gates stay consistent.
 */

import {
  listEdieDocumentRules,
  registerEdieDocumentRule,
  resolveEdieDocumentRulesForContext,
} from "@/lib/enterprise-document-intelligence-engine";
import {
  computeDocumentCompletionScore,
  resolveApplicableWeights,
  type DocumentCompletionScore,
} from "@/lib/document-completion/score";
import type { LoanFile } from "@/types/catalyst-one";

const RECEIPT_KEY = "catalyst.document-center.receipts";

function seedDocumentRulesIfEmpty() {
  if (listEdieDocumentRules().length > 0) return;
  registerEdieDocumentRule({
    ruleCode: "EDIE-HL-SAL-001",
    ruleName: "Home loan salaried KYC pack",
    productRef: "product:home-loan",
    employmentType: "salaried",
    constitution: "individual",
    customerCategory: "standard",
    loanStage: "origination",
    documentTypeRefs: [
      "doc:pan",
      "doc:aadhaar",
      "doc:salary-slip",
      "doc:bank-statement",
      "doc:property-papers",
    ],
    uploadMethod: "both",
    enabled: true,
    createdBy: "system",
  });
  registerEdieDocumentRule({
    ruleCode: "EDIE-HL-SE-001",
    ruleName: "Home loan self-employed pack",
    productRef: "product:home-loan",
    employmentType: "self_employed",
    constitution: "individual",
    customerCategory: "standard",
    loanStage: "origination",
    documentTypeRefs: [
      "doc:pan",
      "doc:itr",
      "doc:bank-statement",
      "doc:gst",
      "doc:property-papers",
    ],
    uploadMethod: "individual",
    enabled: true,
    createdBy: "system",
  });
}

function loadReceipts(fileId: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`${RECEIPT_KEY}:${fileId}`);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function evaluateDocumentCompletionForLoanFile(
  file: LoanFile | null | undefined,
): DocumentCompletionScore {
  seedDocumentRulesIfEmpty();

  if (!file) {
    return computeDocumentCompletionScore({ items: [] });
  }

  const employmentKey = (() => {
    const e = (file.employmentType || "salaried").toLowerCase();
    if (e.includes("self")) return "self_employed";
    return "salaried";
  })();

  const productRef = file.loanProduct?.toLowerCase().includes("lap")
    ? "product:lap"
    : "product:home-loan";

  const rules = resolveEdieDocumentRulesForContext({
    productRef,
    employmentType: employmentKey,
    constitution: "individual",
    customerCategory: "standard",
    loanStage: "origination",
  });
  const typeRefs = [...new Set(rules.flatMap((r) => r.documentTypeRefs))];
  const weights = resolveApplicableWeights({
    documentTypeRefs: typeRefs,
    employmentType: employmentKey,
  });

  const receipts = loadReceipts(file.id);
  const items = weights.map((w) => ({
    typeRef: w.typeRef,
    label: w.label,
    weight: w.weight,
    mandatory: w.mandatory,
    critical: w.critical,
    complete: Boolean(receipts[w.typeRef]),
  }));

  if (file.documents?.length) {
    for (const d of file.documents) {
      const name = d.name.toLowerCase();
      for (const item of items) {
        if (
          !item.complete &&
          name.includes(item.label.toLowerCase().split(" ")[0]!)
        ) {
          item.complete =
            d.status === "received" ||
            d.status === "verified" ||
            d.status === "pending";
        }
      }
    }
  }

  return computeDocumentCompletionScore({ items });
}
