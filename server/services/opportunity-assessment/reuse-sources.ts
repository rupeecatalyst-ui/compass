import { parseLeadInformationLendingExtension } from "@/constants/lead-information-workspace";
import type { AssessmentReuseSources } from "@/lib/opportunity-assessment/reuse-opportunity-facts";
import { ecmContactService } from "@server/services/ecm/contact.service";
import { enterpriseOpportunityService } from "@server/services/enterprise-opportunity";

/**
 * Durable Opportunity Registry + Contact DOB only.
 * Never reads Credit Bench stated-draft / localStorage keys.
 */
export async function loadOpportunityAssessmentReuseSources(
  opportunityId: string,
): Promise<AssessmentReuseSources | null> {
  const id = opportunityId.trim();
  if (!id) return null;
  try {
    const opportunity = await enterpriseOpportunityService.getOpportunity(id);
    if (!opportunity?.id) return null;
    const lending = parseLeadInformationLendingExtension(opportunity.lendingExtension);
    const contactId = typeof opportunity.primaryContactId === "string" ? opportunity.primaryContactId : null;
    let dateOfBirth: string | null = null;
    if (contactId) {
      const contact = await ecmContactService.getById(contactId);
      const captured = contact?.dateOfBirth?.trim() ?? "";
      dateOfBirth = captured || null;
    }
    return {
      opportunityId: opportunity.id,
      productCode: typeof opportunity.productCode === "string" ? opportunity.productCode : null,
      requestedAmount: opportunity.requestedAmount ?? null,
      employmentTypeCode: typeof opportunity.employmentTypeCode === "string" ? opportunity.employmentTypeCode : null,
      approxCibilScore: lending.approxCibilScore ?? null,
      cityLabel: typeof opportunity.cityLabel === "string" ? opportunity.cityLabel : null,
      stateLabel: typeof opportunity.stateLabel === "string" ? opportunity.stateLabel : null,
      btAmount: lending.btAmount ?? null,
      contactId,
      dateOfBirth,
    };
  } catch {
    return null;
  }
}
