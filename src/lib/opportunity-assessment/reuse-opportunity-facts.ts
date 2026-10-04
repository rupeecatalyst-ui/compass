/**
 * Missing-only Assessment overlay from durable Opportunity / Contact sources.
 * Browser localStorage is never an input. Overlay is display-time only unless the
 * operator explicitly Save Draft / Finalize.
 */

import { resolveContextCustomerFamily } from "@/lib/context-aware-data-collection";
import { cloneAssessmentFact } from "@/lib/opportunity-assessment/facts-schema";
import { canonicalizeRecommendationProductCode } from "@/lib/product-recommendation/product-code";
import { ExactDecimalError, parseExactMoney } from "@/lib/product-programme-operations/money";
import {
  ASSESSMENT_EXPECTED_CIBIL_BANDS,
  ASSESSMENT_PRODUCT_CODES,
  type AssessmentExpectedCibilBand,
  type AssessmentFact,
  type AssessmentFactState,
  type AssessmentProductCode,
  type AssessmentSourceChannel,
  type OpportunityAssessmentFactsV1,
} from "@/types/opportunity-assessment";

export type AssessmentReuseSources = {
  opportunityId?: string | null;
  productCode?: string | null;
  requestedAmount?: number | string | null;
  employmentTypeCode?: string | null;
  approxCibilScore?: string | null;
  cityLabel?: string | null;
  stateLabel?: string | null;
  btAmount?: number | string | null;
  contactId?: string | null;
  dateOfBirth?: string | null;
};

export type AssessmentReuseOptions = {
  revisionKind?: "SAVED" | "FINALIZED" | null;
};

const PROTECTED_STATES: ReadonlySet<AssessmentFactState> = new Set([
  "known",
  "explicitly_unknown",
  "unconfirmed",
  "conflicting",
  "unsupported",
]);

function isMissingSlot(fact: AssessmentFact<unknown>): boolean {
  return fact.state === "missing" && fact.value == null;
}

function reusableFact<T>(
  value: T,
  channel: AssessmentSourceChannel,
  entityType: string,
  entityId: string | null,
  fieldKey: string,
  extra: Partial<AssessmentFact<T>> = {},
): AssessmentFact<T> {
  return {
    value,
    state: extra.state ?? "known",
    sourceChannel: channel,
    sourceEntityType: entityType,
    sourceEntityId: entityId,
    sourceFieldKey: fieldKey,
    sourceUpdatedAt: extra.sourceUpdatedAt ?? null,
    capturedByUserId: extra.capturedByUserId ?? null,
    capturedAt: extra.capturedAt ?? null,
    effectiveAt: extra.effectiveAt ?? extra.capturedAt ?? null,
    confirmedByUserId: extra.confirmedByUserId ?? null,
    confirmedAt: extra.confirmedAt ?? null,
    certainty: extra.certainty ?? "exact",
    knownZeroDeclared: extra.knownZeroDeclared,
    evidenceRef: extra.evidenceRef ?? null,
  };
}

function fillMissing<
  Section extends keyof OpportunityAssessmentFactsV1,
  Key extends keyof OpportunityAssessmentFactsV1[Section],
>(
  facts: OpportunityAssessmentFactsV1,
  section: Section,
  key: Key,
  next: AssessmentFact<unknown>,
): OpportunityAssessmentFactsV1 {
  const current = facts[section][key] as AssessmentFact<unknown>;
  if (!isMissingSlot(current)) return facts;
  if (PROTECTED_STATES.has(current.state)) return facts;
  const cloned = structuredClone(facts);
  (cloned[section] as Record<string, unknown>)[key as string] = cloneAssessmentFact(current, next);
  return cloned;
}

function canonicalAssessmentProduct(code: string | null | undefined): AssessmentProductCode | null {
  const canonical = canonicalizeRecommendationProductCode(code);
  if (!canonical) return null;
  return (ASSESSMENT_PRODUCT_CODES as readonly string[]).includes(canonical)
    ? (canonical as AssessmentProductCode)
    : null;
}

function exactPositiveMoney(input: unknown, field: string): string | null {
  try {
    const parsed = parseExactMoney(input, field);
    if (!parsed || parsed === "0.00" || parsed.startsWith("-")) return null;
    return parsed;
  } catch (error) {
    if (error instanceof ExactDecimalError) return null;
    return null;
  }
}

function calendarDate(value: string | null | undefined): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  const [year, month, day] = match[1].split("-").map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) {
    return null;
  }
  return match[1];
}

function isExpectedCibilBand(value: string): value is AssessmentExpectedCibilBand {
  return (ASSESSMENT_EXPECTED_CIBIL_BANDS as readonly string[]).includes(value);
}

/**
 * Prefill missing Assessment facts only. Never reads browser stated-draft keys.
 * FINALIZED revisions are returned unchanged.
 */
export function applyMissingOnlyOpportunityReuse(
  facts: OpportunityAssessmentFactsV1,
  sources: AssessmentReuseSources | null | undefined,
  options: AssessmentReuseOptions = {},
): OpportunityAssessmentFactsV1 {
  if (options.revisionKind === "FINALIZED") return structuredClone(facts);
  if (!sources) return structuredClone(facts);

  let next = structuredClone(facts);
  const opportunityId = sources.opportunityId?.trim() || null;
  const contactId = sources.contactId?.trim() || null;

  const product = canonicalAssessmentProduct(sources.productCode);
  if (product) {
    next = fillMissing(
      next,
      "loanRequirement",
      "productCode",
      reusableFact(product, "OPPORTUNITY", "EnterpriseOpportunity", opportunityId, "productCode"),
    );
    if (product === "HOME_LOAN_BT") {
      next = fillMissing(
        next,
        "loanRequirement",
        "transactionType",
        reusableFact("balance_transfer", "OPPORTUNITY", "EnterpriseOpportunity", opportunityId, "productCode"),
      );
    }
  }

  const requestedAmount = exactPositiveMoney(sources.requestedAmount, "requestedAmount");
  if (requestedAmount) {
    next = fillMissing(
      next,
      "loanRequirement",
      "requestedAmount",
      reusableFact(requestedAmount, "OPPORTUNITY", "EnterpriseOpportunity", opportunityId, "requestedAmount"),
    );
  }

  const employmentCode = sources.employmentTypeCode?.trim() || "";
  if (employmentCode) {
    const family = resolveContextCustomerFamily(employmentCode);
    if (family === "salaried" || family === "self_employed") {
      const knownFamily = next.borrower.employmentFamily;
      if (isMissingSlot(knownFamily)) {
        next = fillMissing(
          next,
          "borrower",
          "employmentFamily",
          reusableFact(family, "OPPORTUNITY", "EnterpriseOpportunity", opportunityId, "employmentTypeCode"),
        );
        next = fillMissing(
          next,
          "borrower",
          "employmentTypeCode",
          reusableFact(employmentCode, "OPPORTUNITY", "EnterpriseOpportunity", opportunityId, "employmentTypeCode"),
        );
      } else if (
        knownFamily.state === "known" &&
        knownFamily.value === family &&
        isMissingSlot(next.borrower.employmentTypeCode)
      ) {
        next = fillMissing(
          next,
          "borrower",
          "employmentTypeCode",
          reusableFact(employmentCode, "OPPORTUNITY", "EnterpriseOpportunity", opportunityId, "employmentTypeCode"),
        );
      }
    }
  }

  const cibil = sources.approxCibilScore?.trim() || "";
  const cibilSlotsMissing =
    isMissingSlot(next.cibil.kind) &&
    isMissingSlot(next.cibil.exactScore) &&
    isMissingSlot(next.cibil.expectedBand);
  if (cibil && cibilSlotsMissing) {
    if (cibil === "not_known") {
      next = fillMissing(
        next,
        "cibil",
        "kind",
        reusableFact("explicitly_unknown" as const, "OPPORTUNITY", "EnterpriseOpportunity", opportunityId, "approxCibilScore", {
          state: "explicitly_unknown",
          certainty: "not_known",
        }),
      );
    } else if (isExpectedCibilBand(cibil)) {
      next = fillMissing(
        next,
        "cibil",
        "kind",
        reusableFact("expected_band" as const, "OPPORTUNITY", "EnterpriseOpportunity", opportunityId, "approxCibilScore", {
          certainty: "approximate",
        }),
      );
      next = fillMissing(
        next,
        "cibil",
        "expectedBand",
        reusableFact(cibil, "OPPORTUNITY", "EnterpriseOpportunity", opportunityId, "approxCibilScore", {
          certainty: "approximate",
        }),
      );
    }
  }

  const dob = calendarDate(sources.dateOfBirth);
  if (dob) {
    next = fillMissing(
      next,
      "borrower",
      "dateOfBirth",
      reusableFact(dob, "CONTACT", "EcmContact", contactId, "dateOfBirth"),
    );
  }

  const journeyCity = sources.cityLabel?.trim() || "";
  if (journeyCity) {
    next = fillMissing(
      next,
      "borrower",
      "journeyCity",
      reusableFact(journeyCity, "OPPORTUNITY", "EnterpriseOpportunity", opportunityId, "cityLabel"),
    );
  }
  const journeyState = sources.stateLabel?.trim() || "";
  if (journeyState) {
    next = fillMissing(
      next,
      "borrower",
      "journeyState",
      reusableFact(journeyState, "OPPORTUNITY", "EnterpriseOpportunity", opportunityId, "stateLabel"),
    );
  }

  const resolvedProduct = next.loanRequirement.productCode.value;
  if (resolvedProduct === "HOME_LOAN_BT") {
    const outstanding = exactPositiveMoney(sources.btAmount, "btAmount");
    if (outstanding) {
      next = fillMissing(
        next,
        "balanceTransfer",
        "outstandingPrincipal",
        reusableFact(outstanding, "OPPORTUNITY", "EnterpriseOpportunity", opportunityId, "btAmount"),
      );
    }
  }

  return next;
}
