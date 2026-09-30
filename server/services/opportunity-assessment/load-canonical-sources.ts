import { parseLeadInformationLendingExtension } from "@/constants/lead-information-workspace";
import type { CanonicalAssessmentSources } from "@server/services/opportunity-assessment/canonical-snapshot";
import { ecmContactService } from "@server/services/ecm/contact.service";
import { enterpriseOpportunityService } from "@server/services/enterprise-opportunity";

export async function loadCanonicalAssessmentSources(opportunityId: string): Promise<{
  sources: CanonicalAssessmentSources;
  lendingExtension: Record<string, unknown>;
} | null> {
  const id = opportunityId.trim();
  if (!id) return null;
  const opportunity = await enterpriseOpportunityService.getOpportunity(id);
  if (!opportunity?.id) return null;
  const lending = parseLeadInformationLendingExtension(opportunity.lendingExtension);
  const rawLending =
    opportunity.lendingExtension && typeof opportunity.lendingExtension === "object" && !Array.isArray(opportunity.lendingExtension)
      ? { ...(opportunity.lendingExtension as Record<string, unknown>) }
      : {};
  let dateOfBirth: string | null = null;
  const contactId = typeof opportunity.primaryContactId === "string" ? opportunity.primaryContactId : null;
  if (contactId) {
    const contact = await ecmContactService.getById(contactId);
    dateOfBirth = contact?.dateOfBirth?.trim() || null;
  }
  return {
    lendingExtension: rawLending,
    sources: {
      opportunityId: opportunity.id,
      productCode: opportunity.productCode ?? null,
      transactionType: opportunity.transactionType ?? null,
      employmentTypeCode: opportunity.employmentTypeCode ?? null,
      requestedAmount: opportunity.requestedAmount ?? null,
      requestedTenureMonths: opportunity.requestedTenureMonths ?? null,
      monthlyIncomeRupees: opportunity.monthlyIncomeRupees ?? null,
      existingMonthlyObligationsRupees: opportunity.existingMonthlyObligationsRupees ?? null,
      propertyValueRupees: opportunity.propertyValueRupees ?? null,
      propertyCategory: opportunity.propertyCategory ?? null,
      constructionStatus: opportunity.constructionStatus ?? null,
      residency: opportunity.residency ?? null,
      cityLabel: opportunity.cityLabel ?? null,
      stateLabel: opportunity.stateLabel ?? null,
      borrowerAgeYears: opportunity.borrowerAgeYears ?? null,
      dateOfBirth,
      contactId,
      approxCibilScore: lending.approxCibilScore ?? null,
      btAmount: lending.btAmount ?? null,
      btInstitutionId: lending.btInstitutionId ?? null,
      btInstitutionName: lending.btInstitutionName ?? null,
      currentRoiPercent: opportunity.currentRoiPercent ?? null,
      currentHomeLoanEmiRupees: opportunity.currentHomeLoanEmiRupees ?? null,
      remainingTenureMonths: opportunity.remainingTenureMonths ?? null,
      loanStartDate: opportunity.loanStartDate ?? null,
      repaymentTrack: opportunity.repaymentTrack ?? null,
      delayedEmiCount: opportunity.delayedEmiCount ?? null,
      rowVersion: opportunity.rowVersion ?? null,
    },
  };
}
