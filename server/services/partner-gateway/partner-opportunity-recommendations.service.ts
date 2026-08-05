/**
 * CO-WP-REC-001 / CO-WP-LENDER-API-002 — Partner Opportunity Recommendations service.
 * Lender options loaded via Partner Gateway Prisma path — never relative /api/lender-registry.
 */
import { projectPartnerOpportunityRecommendations } from "@/lib/enterprise-partner-recommendations";
import type { PartnerOpportunityRecommendationsDto } from "@/types/enterprise-partner-recommendations";
import { partnerBusinessService } from "./partner-business.service";
import { partnerLenderMasterService } from "./partner-lender-master.service";

export const partnerOpportunityRecommendationsService = {
  async getRecommendations(
    userId: string,
    opportunityId: string,
  ): Promise<PartnerOpportunityRecommendationsDto> {
    const detail = await partnerBusinessService.getOpportunity(userId, opportunityId);
    const customers = await partnerBusinessService.searchCustomers(userId, "");
    const customer = customers.find((c) => c.customerId === detail.customerId);
    const registryOptions = await partnerLenderMasterService.listPublishedOptionsForPartner();
    return projectPartnerOpportunityRecommendations(detail, {
      city: customer?.city,
      registryOptions,
    });
  },
};
