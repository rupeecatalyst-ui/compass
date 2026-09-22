import "server-only";

import { z } from "zod";
import { canonicalizeProductCode } from "@/lib/product-programme-operations/product-aliases";
import { normalizeEcmEmploymentTypeId } from "@/constants/enterprise-contact-master/masters";
import { absoluteRupeesFromStoredString, parseFinancialMagnitudeInput } from "@/lib/enterprise-financial-input";
import type { CustomerAssessmentInput } from "@/lib/home-loan-recommendation/assisted-offer";
import { prisma } from "@server/lib/prisma";
import { recommendLendersCanonical } from "@server/services/lender-recommendation/canonical-lender-recommendation.service";

// Browser declarations are validated for transport compatibility, NOT durable facts.
const amount = z.number().finite().nonnegative().nullable();
export const chanakyaAssessmentDraftSchema = z.object({
  monthlyIncomeRupees: amount,
  existingMonthlyEmiRupees: amount,
  propertyValueRupees: amount,
  propertyType: z.string().max(120).nullable(),
  constitution: z.string().max(120).nullable(),
}).strict();

type Opportunity = {
  organizationId: string;
  productCode: string | null;
  transactionType: string | null;
  requestedAmount: number | null;
  employmentTypeCode: string | null;
  cityLabel?: string | null;
  stateLabel?: string | null;
  primaryBorrowerKind?: string | null;
  primaryContactId?: string | null;
  companyId?: string | null;
  lendingExtension: unknown;
};

type BorrowerSources = {
  contact: { id: string; organizationId: string; dateOfBirth: string | null; roleProfiles: unknown } | null;
  company: { id: string; organizationId: string; constitution: string | null;
    annualTurnover: string | null; yearsInBusiness: string | null } | null;
};

/** Called only after the route's authorized, organization-scoped Opportunity lookup. */
export async function loadChanakyaBorrowerSources(opportunity: Opportunity): Promise<BorrowerSources> {
  const contact = opportunity.primaryBorrowerKind === "individual" && opportunity.primaryContactId
    ? await prisma.ecmContact.findFirst({
      where: { id: opportunity.primaryContactId, organizationId: opportunity.organizationId, isDeleted: false },
      select: { id: true, organizationId: true, dateOfBirth: true, roleProfiles: true },
    }) : null;
  const company = opportunity.primaryBorrowerKind === "company" && opportunity.companyId
    ? await prisma.ecmCompany.findFirst({
      where: { id: opportunity.companyId, organizationId: opportunity.organizationId, isDeleted: false },
      select: { id: true, organizationId: true, constitution: true, annualTurnover: true, yearsInBusiness: true },
    }) : null;
  return { contact, company };
}

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const positive = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

function validDob(value: string | null | undefined, asOf: Date): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && date <= asOf ? value : null;
}

/** Pure projection of established sources. Context-only fields are not engine rules. */
export function mapChanakyaOpportunityInputs(
  opportunity: Opportunity,
  sources: BorrowerSources = { contact: null, company: null },
  asOf = new Date(),
) {
  const product = canonicalizeProductCode(opportunity.productCode);
  if (product !== "HOME_LOAN" && product !== "HOME_LOAN_BT") {
    throw new Error("UNSUPPORTED_RECOMMENDATION_PRODUCT");
  }
  if (opportunity.transactionType === "bt_top_up") {
    throw new Error("UNSUPPORTED_RECOMMENDATION_TRANSACTION");
  }
  if (product === "HOME_LOAN_BT" && opportunity.transactionType !== "balance_transfer") {
    throw new Error("UNSUPPORTED_RECOMMENDATION_TRANSACTION");
  }
  if (product === "HOME_LOAN" && opportunity.transactionType === "balance_transfer") {
    throw new Error("UNSUPPORTED_RECOMMENDATION_TRANSACTION");
  }
  const ext = record(opportunity.lendingExtension);
  const contact = opportunity.primaryBorrowerKind === "individual" && sources.contact?.id === opportunity.primaryContactId
    && sources.contact?.organizationId === opportunity.organizationId ? sources.contact : null;
  const company = opportunity.primaryBorrowerKind === "company" && sources.company?.id === opportunity.companyId
    && sources.company?.organizationId === opportunity.organizationId ? sources.company : null;
  const profile = record(record(contact?.roleProfiles).customer);
  const employment = normalizeEcmEmploymentTypeId(opportunity.employmentTypeCode ?? undefined);
  const family = employment === "salaried" ? "salaried"
    : employment === "self-employed-business" || employment === "self-employed-professional" ? "self_employed" : "unknown";
  const turnover = company?.annualTurnover ?? text(profile.annualTurnover);
  const vintage = company?.yearsInBusiness ?? text(profile.yearsInBusiness);
  const customer: CustomerAssessmentInput = {
      journeyKind: product === "HOME_LOAN" ? "home_loan" : "home_loan_balance_transfer",
      requiredAmountRupees: positive(opportunity.requestedAmount),
      employmentFamily: family,
      city: text(opportunity.cityLabel),
      cibilBand: text(ext.approxCibilScore),
      dateOfBirth: validDob(contact?.dateOfBirth, asOf),
      constitution: text(company?.constitution),
      // Contact residentStatus can be system-defaulted: no declaration provenance exists.
      residency: null,
      // No approved native durable capture: do not promote local drafts or COMPASS answers.
      monthlyIncomeRupees: null,
      existingMonthlyEmiRupees: null,
      propertyValueRupees: null,
      propertyType: null,
      constructionStatus: null,
      currentOutstandingRupees: product === "HOME_LOAN_BT" ? positive(ext.btAmount) : null,
      // Intake does not capture certainty, ROI, current EMI or remaining tenure.
      currentOutstandingCertainty: null,
      currentRoiPercent: null,
      currentHomeLoanEmiRupees: null,
      remainingTenureMonths: null,
      coApplicant: null,
      coApplicantDecision: null,
  };
  return {
    product: product as "HOME_LOAN" | "HOME_LOAN_BT", customer,
    // Retained separately; the unchanged Stage 1 contract cannot consume these facts.
    context: {
      applicantKind: text(opportunity.primaryBorrowerKind),
      state: text(opportunity.stateLabel),
      occupation: text(profile.occupation),
      annualTurnoverRupees: turnover == null ? null : absoluteRupeesFromStoredString(turnover) ?? null,
      yearsInBusiness: vintage == null ? null : parseFinancialMagnitudeInput(vintage),
      // Identity/role records only; never infer an income contribution or zero co-applicant EMI.
      participants: Array.isArray(ext.participants) ? ext.participants : null,
    },
  };
}

/**
 * Stage 2 / 4A legacy Opportunity-source path. Not used by Opportunity/LIFE CHANAKYA panels
 * after Stage 5C5. Canonical HL/HLBT panels execute only from a finalized Opportunity Assessment.
 */
export async function recommendForChanakyaOpportunity(
  opportunity: Opportunity,
  draft: z.infer<typeof chanakyaAssessmentDraftSchema>,
  recommend = recommendLendersCanonical,
  loadSources = loadChanakyaBorrowerSources,
) {
  chanakyaAssessmentDraftSchema.parse(draft);
  mapChanakyaOpportunityInputs(opportunity); // Reject unsupported product/transaction before source reads.
  const { product, customer } = mapChanakyaOpportunityInputs(opportunity, await loadSources(opportunity));
  if (customer.employmentFamily === "self_employed") throw new Error("SELF_EMPLOYED_ASSESSMENT_UNSUPPORTED");
  if (product === "HOME_LOAN_BT" && customer.currentOutstandingRupees == null) {
    throw new Error("BT_OUTSTANDING_REQUIRED");
  }
  // Stop before Stage 1 can default missing obligations/outstanding or assess local drafts.
  if (customer.employmentFamily === "unknown" || customer.monthlyIncomeRupees == null || customer.monthlyIncomeRupees <= 0 ||
      customer.existingMonthlyEmiRupees == null || customer.propertyValueRupees == null || customer.propertyValueRupees <= 0 ||
      customer.requiredAmountRupees == null) throw new Error("DURABLE_ASSESSMENT_INPUT_REQUIRED");
  return recommend({ organizationId: opportunity.organizationId, product, customer });
}
