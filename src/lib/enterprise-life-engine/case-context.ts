/**
 * LIFE case context resolver — CF-LIFE-001.
 * Collects engine inputs from Loan / Contact / Role context.
 * Never exposed as editable UI filters.
 *
 * Once Loan Journey is certified, prefer Loan File fields via the same
 * `LifeCaseContextInput` shape — the recommendation UI stays unchanged.
 */

import { loadLoanFiles } from "@/lib/loan-files-storage";
import type { LoanFile } from "@/types/catalyst-one";
import type {
  LifeCaseContext,
  LifeCaseContextInput,
  LifeContextBlocker,
  LifeLenderSelectionCriteria,
} from "@/types/enterprise-life-engine";
import { ROUTES } from "@/constants/routes";

const WEST_CITIES = new Set(
  ["mumbai", "pune", "nagpur", "nashik", "ahmedabad", "surat", "vadodara", "indore"].map((c) =>
    c.toLowerCase(),
  ),
);

const METRO_CITIES = new Set(
  ["mumbai", "delhi", "bengaluru", "bangalore", "chennai", "hyderabad", "kolkata", "pune"].map(
    (c) => c.toLowerCase(),
  ),
);

/** Maps business loan product labels → internal product refs (hidden from UI). */
export function mapLifeProductLabelToRef(loanProduct: string | undefined): string | undefined {
  if (!loanProduct?.trim()) return undefined;
  const p = loanProduct.toLowerCase();
  if (p.includes("lap") || p.includes("against property")) return "product:lap";
  if (p.includes("plot")) return "product:plot-loan";
  if (p.includes("home") || p.includes("housing") || p.includes("hl")) return "product:home-loan";
  // Provisional fallback while Loan Journey product master wiring is incomplete
  return `product:${p.replace(/\s+/g, "-")}`;
}

/** Derives business mapping from city — never shown or entered by the RM. */
export function deriveLifeBusinessMappingRef(city: string | undefined): string | undefined {
  if (!city?.trim()) return undefined;
  const key = city.trim().toLowerCase();
  if (METRO_CITIES.has(key)) return "mapping:metro";
  if (WEST_CITIES.has(key)) return "mapping:west";
  return "mapping:general";
}

function fromLoanFile(file: LoanFile): LifeCaseContext {
  const customerCity = file.city?.trim() || undefined;
  // Until Loan Journey certifies a dedicated property city field, use loan city.
  const propertyCity = customerCity;
  const productLabel = file.loanProduct?.trim() || undefined;
  const productRef = mapLifeProductLabelToRef(productLabel);
  const resolvedCity = propertyCity || customerCity;
  const businessMappingRef = deriveLifeBusinessMappingRef(resolvedCity);

  return {
    source: "loan_file",
    loanFileId: file.id,
    loanFileNumber: file.fileNumber,
    customerName: file.customerName,
    productRef,
    productLabel,
    customerCity,
    propertyCity,
    loanAmount: file.loanAmount || file.requiredAmount || undefined,
    employmentType: file.employmentType || undefined,
    resolvedCity,
    businessMappingRef,
  };
}

/**
 * Resolves recommendation context from available case sources.
 * Priority: explicit Loan File → opportunity/contact provisional → none.
 */
export function resolveLifeCaseContext(input: LifeCaseContextInput = {}): LifeCaseContext {
  if (input.loanFile) {
    return fromLoanFile(input.loanFile);
  }

  if (typeof window !== "undefined") {
    const files = loadLoanFiles();
    if (input.loanFileId) {
      const match = files.find((f) => f.id === input.loanFileId || f.fileNumber === input.loanFileId);
      if (match) return fromLoanFile(match);
    }
    // Temporary: consume best-available open loan context until Loan Journey wiring lands
    const active = files.find((f) => !f.archived && f.status !== "completed") ?? files[0];
    if (active) return fromLoanFile(active);
  }

  if (input.provisional) {
    const productRef =
      input.provisional.productRef ?? mapLifeProductLabelToRef(input.provisional.productLabel);
    const resolvedCity =
      input.provisional.propertyCity || input.provisional.customerCity || undefined;
    return {
      source: input.provisional.source ?? "provisional",
      productRef,
      productLabel: input.provisional.productLabel,
      customerCity: input.provisional.customerCity,
      propertyCity: input.provisional.propertyCity,
      loanAmount: input.provisional.loanAmount,
      employmentType: input.provisional.employmentType,
      resolvedCity,
      businessMappingRef: deriveLifeBusinessMappingRef(resolvedCity),
      customerName: input.provisional.customerName,
      loanFileId: input.provisional.loanFileId,
      loanFileNumber: input.provisional.loanFileNumber,
    };
  }

  return {
    source: "provisional",
  };
}

/**
 * Business-facing blockers when mandatory recommendation inputs are missing.
 * Engine fields are never listed as form fields — only completion guidance.
 */
export function evaluateLifeContextBlockers(context: LifeCaseContext): LifeContextBlocker[] {
  const blockers: LifeContextBlocker[] = [];

  if (!context.productRef && !context.productLabel) {
    blockers.push({
      code: "LIFE_MISSING_PRODUCT",
      title: "Cannot Recommend Lender Yet",
      message: "Loan Product is not selected.",
      actionLabel: "Select Loan Product",
      actionHref: context.loanFileId
        ? `${ROUTES.LOAN_FILES}?file=${encodeURIComponent(context.loanFileId)}`
        : ROUTES.LOAN_FILES,
      actionKind: "select_loan_product",
    });
  }

  if (!context.propertyCity && !context.customerCity && !context.resolvedCity) {
    blockers.push({
      code: "LIFE_MISSING_PROPERTY_CITY",
      title: "Cannot Recommend Lender Yet",
      message: "Property City is required before lender recommendations can be generated.",
      actionLabel: "Complete Property Details",
      actionHref: context.loanFileId
        ? `${ROUTES.LOAN_FILES}?file=${encodeURIComponent(context.loanFileId)}`
        : ROUTES.LOAN_FILES,
      actionKind: "complete_property_details",
    });
  }

  if (!context.loanFileId && context.source === "provisional" && blockers.length === 0) {
    // Edge: empty provisional with product/city somehow — still prefer a loan anchor
    if (!context.productRef) {
      blockers.push({
        code: "LIFE_MISSING_LOAN_CONTEXT",
        title: "Cannot Recommend Lender Yet",
        message: "Open a Loan File so LIFE can recommend lender executives from case context.",
        actionLabel: "Open Loan Files",
        actionHref: ROUTES.LOAN_FILES,
        actionKind: "open_loan_files",
      });
    }
  }

  return blockers;
}

/** Builds hidden engine criteria from resolved case context. */
export function toLifeSelectionCriteria(
  context: LifeCaseContext,
): LifeLenderSelectionCriteria | null {
  if (!context.productRef || !context.resolvedCity) return null;
  return {
    productRef: context.productRef,
    city: context.resolvedCity,
    businessMappingRef: context.businessMappingRef,
    requireActive: true,
  };
}
