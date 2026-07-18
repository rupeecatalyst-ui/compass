/**
 * Map loan file → EDIE resolve context (product, category, transaction, stage).
 * Working Capital & Construction Funding are intentionally excluded from Phase 1.
 */

import type { LoanFile } from "@/types/catalyst-one";
import type {
  EdieCustomerCategory,
  EdieProductRef,
  EdieTransactionType,
  EdieWorkflowStage,
} from "@/types/edie-certified-rules";

export function resolveEdieProductRef(loanProduct?: string): EdieProductRef {
  const p = (loanProduct || "").toLowerCase().trim();

  // Explicitly excluded from Phase 1 — fall through to nearest credit pack only if mislabeled
  if (p.includes("working capital") || p.includes("construction funding") || p.includes("construction finance")) {
    return "product:home-loan";
  }

  if (p.includes("balance transfer") || (p.includes("home") && (p.includes("bt") || p.includes("balance")))) {
    return "product:home-loan-bt";
  }
  if (p.includes("lap") || p.includes("loan against property") || p.includes("against property")) {
    return "product:lap";
  }
  if (
    p.includes("loan against securities") ||
    p.includes("against securities") ||
    p.includes("las") ||
    p.includes("securities")
  ) {
    return "product:loan-against-securities";
  }
  if (p.includes("gold")) return "product:gold-loan";
  if (p.includes("education") || p.includes("student")) return "product:education-loan";
  if (p.includes("car") || p.includes("auto loan") || p.includes("vehicle")) {
    return "product:car-loan";
  }
  if (p.includes("personal")) return "product:personal-loan";
  if (
    p.includes("ubl") ||
    p.includes("unsecured business") ||
    (p.includes("business") && p.includes("unsecured")) ||
    p === "business loan (unsecured)" ||
    (p.includes("business loan") && !p.includes("against property") && !p.includes("lap"))
  ) {
    return "product:unsecured-business-loan";
  }
  if (p.includes("home")) return "product:home-loan";
  return "product:home-loan";
}

export function resolveEdieCustomerCategory(
  employmentType?: string,
  entityHint?: string,
): EdieCustomerCategory {
  const e = (employmentType || "").toLowerCase();
  const h = (entityHint || "").toLowerCase();
  if (
    h.includes("company") ||
    h.includes("corporate") ||
    e.includes("company") ||
    e.includes("corporate")
  ) {
    return "company";
  }
  if (e.includes("self") || e.includes("business") || e.includes("professional")) {
    return "self_employed";
  }
  return "salaried";
}

export function resolveEdieTransactionType(
  file: Pick<LoanFile, "transactionType" | "loanProduct">,
): EdieTransactionType {
  if (file.transactionType === "balance_transfer") return "balance_transfer";
  const p = (file.loanProduct || "").toLowerCase();
  if (p.includes("balance transfer") || (p.includes("home") && p.includes("bt"))) {
    return "balance_transfer";
  }
  return "fresh";
}

/**
 * Derive workflow stage from loan file + lender cases for Critical activation.
 */
export function resolveEdieWorkflowStage(file: LoanFile): EdieWorkflowStage {
  const stage = (file.stage || "").toLowerCase();
  const lenders = file.lenders ?? [];
  const any = (pred: (s: string) => boolean) =>
    lenders.some((l) => l.status === "active" && pred((l.caseStage || "").toLowerCase()));

  if (stage === "won" || any((s) => s === "disbursed")) return "disbursement";
  if (stage === "closure_wip" || any((s) => s === "closure_wip")) return "accounting";
  if (stage === "final_approved" || any((s) => s === "final_approved")) return "final_approval";
  if (stage === "soft_approved" || any((s) => s === "soft_approved")) return "soft_approval";
  if (
    stage === "logged_in" ||
    stage === "credit_wip" ||
    any((s) => s === "logged_in_wip" || s === "soft_approved")
  ) {
    return "before_lender_login";
  }
  if (stage === "pre_login" || stage === "raw_lead") return "pre_login";
  return "before_lender_login";
}

export function resolveEdieConstitution(file: LoanFile): string | undefined {
  return (
    file.businessDetails?.constitution ||
    file.participants?.find((p) => p.entityType === "company")?.constitution ||
    undefined
  );
}
