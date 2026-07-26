/**
 * Map loan file → EDIE resolve context (product, category, transaction, stage).
 * Working Capital & Construction Funding are intentionally excluded from Phase 1.
 *
 * Soft resolvers (`resolveEdie*`) remain for Document Center display continuity.
 * Strict resolvers (`tryResolveEdie*`) are required for LOD generation — never
 * silently substitute a different product or borrower category.
 */

import type { LoanFile } from "@/types/catalyst-one";
import type {
  EdieCustomerCategory,
  EdieProductRef,
  EdieTransactionType,
  EdieWorkflowStage,
} from "@/types/edie-certified-rules";

export type EdieConstitutionKind =
  | "proprietor"
  | "partnership"
  | "llp"
  | "private_limited";

export type EdieProductResolveFailureCode =
  | "missing"
  | "phase1_excluded"
  | "not_certified";

export type EdieProductResolveResult =
  | { ok: true; productRef: EdieProductRef }
  | {
      ok: false;
      code: EdieProductResolveFailureCode;
      message: string;
      inputLabel: string;
    };

export type EdieCategoryResolveResult =
  | { ok: true; customerCategory: EdieCustomerCategory }
  | { ok: false; code: "missing" | "not_certified"; message: string; inputLabel: string };

export type EdieConstitutionResolveResult =
  | { ok: true; kind: EdieConstitutionKind }
  | { ok: false; code: "missing" | "not_certified"; message: string; inputLabel: string };

const PHASE1_EXCLUDED_MESSAGE =
  "Working Capital and Construction Funding are not included in EDIE Phase 1 certified document checklists. LOD cannot be generated for this product — the system will not substitute another product.";

/** Explicit product-code map (Opportunity Creation catalog → EDIE Phase 1). */
const EDIE_PRODUCT_CODE_MAP: Record<string, EdieProductRef> = {
  HOME_LOAN: "product:home-loan",
  HOME_LOAN_BT: "product:home-loan-bt",
  LAP: "product:lap",
  PERSONAL_LOAN: "product:personal-loan",
  EDUCATION_LOAN: "product:education-loan",
  CAR_LOAN: "product:car-loan",
  GOLD_LOAN: "product:gold-loan",
  LOAN_AGAINST_SECURITIES: "product:loan-against-securities",
  LAS: "product:loan-against-securities",
  UNSECURED_BUSINESS_LOAN: "product:unsecured-business-loan",
  UBL: "product:unsecured-business-loan",
  BUSINESS_LOAN: "product:unsecured-business-loan",
};

const PHASE1_EXCLUDED_CODES = new Set([
  "WORKING_CAPITAL",
  "CONSTRUCTION_FUNDING",
  "CONSTRUCTION_FINANCE",
]);

/**
 * Strict product resolve for LOD — no silent Home Loan fallback.
 * Accepts catalog labels and product codes (e.g. HOME_LOAN, HOME_LOAN_BT).
 */
export function tryResolveEdieProductRef(
  loanProduct?: string | null,
): EdieProductResolveResult {
  const raw = (loanProduct || "").trim();
  const p = raw.toLowerCase();
  if (!p || p === "not specified" || p === "—" || p === "-") {
    return {
      ok: false,
      code: "missing",
      message:
        "Product is required before generating an LOD. Select a certified Phase 1 loan product.",
      inputLabel: "",
    };
  }

  const codeKey = raw
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_");

  if (
    PHASE1_EXCLUDED_CODES.has(codeKey) ||
    codeKey.includes("WORKING_CAPITAL") ||
    codeKey.includes("CONSTRUCTION")
  ) {
    return {
      ok: false,
      code: "phase1_excluded",
      message: PHASE1_EXCLUDED_MESSAGE,
      inputLabel: raw,
    };
  }

  if (EDIE_PRODUCT_CODE_MAP[codeKey]) {
    return { ok: true, productRef: EDIE_PRODUCT_CODE_MAP[codeKey]! };
  }

  if (
    p.includes("working capital") ||
    p.includes("construction funding") ||
    p.includes("construction finance")
  ) {
    return {
      ok: false,
      code: "phase1_excluded",
      message: PHASE1_EXCLUDED_MESSAGE,
      inputLabel: raw,
    };
  }

  if (p.includes("balance transfer") || (p.includes("home") && (p.includes("bt") || p.includes("balance")))) {
    return { ok: true, productRef: "product:home-loan-bt" };
  }
  if (p.includes("lap") || p.includes("loan against property") || p.includes("against property")) {
    return { ok: true, productRef: "product:lap" };
  }
  if (
    p.includes("loan against securities") ||
    p.includes("against securities") ||
    p.includes("las") ||
    p.includes("securities")
  ) {
    return { ok: true, productRef: "product:loan-against-securities" };
  }
  if (p.includes("gold")) return { ok: true, productRef: "product:gold-loan" };
  if (p.includes("education") || p.includes("student")) {
    return { ok: true, productRef: "product:education-loan" };
  }
  if (p.includes("car") || p.includes("auto loan") || p.includes("vehicle")) {
    return { ok: true, productRef: "product:car-loan" };
  }
  if (p.includes("personal")) return { ok: true, productRef: "product:personal-loan" };
  if (
    p.includes("ubl") ||
    p.includes("unsecured business") ||
    (p.includes("business") && p.includes("unsecured")) ||
    p === "business loan (unsecured)" ||
    (p.includes("business loan") && !p.includes("against property") && !p.includes("lap"))
  ) {
    return { ok: true, productRef: "product:unsecured-business-loan" };
  }
  if (p.includes("home")) return { ok: true, productRef: "product:home-loan" };

  return {
    ok: false,
    code: "not_certified",
    message: `No certified EDIE document checklist exists for product "${raw}". LOD will not be generated using a different product. Select a Phase 1 certified product or add this product to the EDIE certified checklist registry.`,
    inputLabel: raw,
  };
}

/**
 * Soft product resolve (Document Center / legacy). Prefer tryResolveEdieProductRef for LOD.
 * Unknown products still fall back to Home Loan for display continuity only.
 */
export function resolveEdieProductRef(loanProduct?: string): EdieProductRef {
  const strict = tryResolveEdieProductRef(loanProduct);
  if (strict.ok) return strict.productRef;
  return "product:home-loan";
}

/**
 * Strict borrower-category resolve for LOD — no silent Salaried default.
 */
export function tryResolveEdieCustomerCategory(
  employmentType?: string | null,
  entityHint?: string | null,
  explicitCategory?: string | null,
): EdieCategoryResolveResult {
  const explicit = (explicitCategory || "").trim().toLowerCase();
  if (explicit === "salaried" || explicit === "self_employed" || explicit === "company") {
    return { ok: true, customerCategory: explicit };
  }

  const e = (employmentType || "").trim();
  const eLower = e.toLowerCase();
  const h = (entityHint || "").toLowerCase();

  if (
    h.includes("company") ||
    h.includes("corporate") ||
    eLower.includes("company") ||
    eLower.includes("corporate")
  ) {
    return { ok: true, customerCategory: "company" };
  }
  if (
    eLower.includes("self-employed") ||
    eLower.includes("self employed") ||
    eLower.includes("self_employed") ||
    eLower.includes("business") ||
    eLower.includes("professional") ||
    eLower.includes("propriet") ||
    eLower.includes("partner") ||
    eLower.includes("llp")
  ) {
    return { ok: true, customerCategory: "self_employed" };
  }
  if (eLower.includes("salaried") || eLower === "salary" || eLower.includes("nri")) {
    return { ok: true, customerCategory: "salaried" };
  }

  if (!e && !explicit && !h) {
    return {
      ok: false,
      code: "missing",
      message:
        "Borrower Type is required before generating an LOD. Select Salaried, Self-Employed, or Company — the system will not default to Salaried.",
      inputLabel: "",
    };
  }

  return {
    ok: false,
    code: "not_certified",
    message: `Borrower type "${e || explicit || entityHint}" is not mapped to a certified EDIE category (Salaried, Self-Employed, or Company). LOD will not default to Salaried.`,
    inputLabel: e || explicit || entityHint || "",
  };
}

/**
 * Soft category resolve (Document Center / legacy). Prefer tryResolveEdieCustomerCategory for LOD.
 */
export function resolveEdieCustomerCategory(
  employmentType?: string,
  entityHint?: string,
): EdieCustomerCategory {
  const strict = tryResolveEdieCustomerCategory(employmentType, entityHint);
  if (strict.ok) return strict.customerCategory;
  return "salaried";
}

/**
 * Strict constitution resolve for Self-Employed / Company LOD packs.
 * Accepts ECM ids (proprietorship, partnership, llp, private_limited) and labels.
 */
export function tryResolveEdieConstitutionKind(
  constitution?: string | null,
): EdieConstitutionResolveResult {
  const raw = (constitution || "").trim();
  const c = raw.toLowerCase();
  if (!c) {
    return {
      ok: false,
      code: "missing",
      message:
        "Business Constitution is required for Self-Employed / Company borrowers before generating an LOD.",
      inputLabel: "",
    };
  }

  const id = c.replace(/[\s-]+/g, "_");

  if (
    id === "proprietorship" ||
    id === "sole_proprietorship" ||
    c.includes("proprietor") ||
    c.includes("sole")
  ) {
    return { ok: true, kind: "proprietor" };
  }
  if (id === "partnership" || (c.includes("partner") && !c.includes("llp"))) {
    return { ok: true, kind: "partnership" };
  }
  if (id === "llp" || c.includes("llp")) {
    return { ok: true, kind: "llp" };
  }
  if (
    id === "private_limited" ||
    id === "public_limited" ||
    id === "opc" ||
    id === "one_person_company" ||
    c.includes("private") ||
    c.includes("pvt") ||
    c.includes("limited") ||
    c.includes("company") ||
    c.includes("opc")
  ) {
    return { ok: true, kind: "private_limited" };
  }

  return {
    ok: false,
    code: "not_certified",
    message: `Business Constitution "${raw}" does not match a certified EDIE pack (Proprietorship, Partnership, LLP, or Private Limited). LOD will not use a generic fallback checklist.`,
    inputLabel: raw,
  };
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
