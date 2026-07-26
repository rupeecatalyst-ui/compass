/**
 * LIFE case context resolver — CF-LIFE-001 / FS-01.
 * Collects engine inputs from Opportunity runtime (+ optional Deal attachment).
 * Never exposed as editable UI filters.
 */

import { loadLoanFiles } from "@/lib/loan-files-storage";
import {
  getActiveOpportunityContext,
} from "@/lib/lead-opportunity-journey/active-context";
import {
  getCachedOpportunityRecord,
  isOpportunityRuntimeCase,
  peekOpportunityRuntimeCase,
  resolveOpportunityRuntimeCaseSync,
} from "@/lib/lead-opportunity-journey/opportunity-runtime-adapter";
import type { LoanFile } from "@/types/catalyst-one";
import type {
  LifeCaseContext,
  LifeCaseContextInput,
  LifeContextBlocker,
  LifeLenderSelectionCriteria,
} from "@/types/enterprise-life-engine";
import { buildDealWorkspaceHref } from "@/lib/loan-journey/adr-018-routing";
import { buildCanonicalJourneyStageHref } from "@/constants/canonical-journey-header";

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
  const oppId =
    file.enterpriseOpportunityId?.trim() ||
    (file as LoanFile & { opportunityId?: string }).opportunityId?.trim() ||
    (isOpportunityRuntimeCase(file) ? file.id : undefined);
  const oppCity = oppId
    ? getCachedOpportunityRecord(oppId)?.cityLabel?.trim() || undefined
    : undefined;
  // CO-CHANAKYA-001 — Prefer projected file.city (from Opportunity.cityLabel); Registry fallback.
  const customerCity = file.city?.trim() || oppCity || undefined;
  // Until Loan Journey certifies a dedicated property city field, use loan city.
  const propertyCity = customerCity;
  const productLabel = file.loanProduct?.trim() || undefined;
  const productRef = mapLifeProductLabelToRef(productLabel);
  const resolvedCity = propertyCity || customerCity;
  const businessMappingRef = deriveLifeBusinessMappingRef(resolvedCity);
  const opportunityRuntime = isOpportunityRuntimeCase(file);

  return {
    source: opportunityRuntime ? "opportunity" : "loan_file",
    loanFileId: opportunityRuntime ? undefined : file.id,
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
 * FS-01 priority: explicit file → Opportunity runtime → legacy LoanFile by id → provisional.
 * Never picks an unrelated open LoanFile as authority.
 */
export function resolveLifeCaseContext(input: LifeCaseContextInput = {}): LifeCaseContext {
  if (input.loanFile) {
    return fromLoanFile(input.loanFile);
  }

  if (typeof window !== "undefined") {
    const active = getActiveOpportunityContext();
    const opportunityId = active?.opportunityId?.trim();
    if (opportunityId) {
      const runtime =
        peekOpportunityRuntimeCase(opportunityId) ||
        resolveOpportunityRuntimeCaseSync({ opportunityId });
      if (runtime) return fromLoanFile(runtime);
    }

    const files = loadLoanFiles();
    if (input.loanFileId) {
      const match = files.find(
        (f) => f.id === input.loanFileId || f.fileNumber === input.loanFileId,
      );
      if (match) return fromLoanFile(match);
    }
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
      title: "Let's finish the Loan Product first",
      message:
        "I need the loan product on this file before I can recommend the right lender executives.",
      actionLabel: "Continue Loan Journey",
      actionHref: context.loanFileId
        ? buildDealWorkspaceHref({ fileId: context.loanFileId, tab: "lenders" })
        : buildCanonicalJourneyStageHref("lead_creation", {
            opportunityId: getActiveOpportunityContext()?.opportunityId ?? null,
            fileId: null,
          }),
      actionKind: "select_loan_product",
    });
  }

  if (!context.propertyCity && !context.customerCity && !context.resolvedCity) {
    blockers.push({
      code: "LIFE_MISSING_PROPERTY_CITY",
      title: "City helps me match lenders",
      message:
        "Add the customer or property city on the Loan File so I can recommend executives in the right geography.",
      actionLabel: "Continue Loan Journey",
      actionHref: context.loanFileId
        ? buildDealWorkspaceHref({ fileId: context.loanFileId, tab: "lenders" })
        : buildCanonicalJourneyStageHref("lead_creation", {
            opportunityId: getActiveOpportunityContext()?.opportunityId ?? null,
            fileId: null,
          }),
      actionKind: "complete_property_details",
    });
  }

  if (!context.loanFileId && context.source === "provisional" && blockers.length === 0) {
    if (!context.productRef) {
      blockers.push({
        code: "LIFE_MISSING_LOAN_CONTEXT",
        title: "Open an Opportunity with me",
        message:
          "Start or open an Opportunity so I can recommend lender executives from real case context.",
        actionLabel: "Open Opportunities",
        actionHref: buildCanonicalJourneyStageHref("life", {
          opportunityId: getActiveOpportunityContext()?.opportunityId ?? null,
          fileId: null,
        }),
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
