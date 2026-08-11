/**
 * CO-WP-PERF-002 — Home desk projection without N× getOpportunity / empty ECM scan.
 * Reuses Business Pipeline store details already built for the partner.
 */
import type { PartnerOpportunityDetailDto } from "@/types/enterprise-partner-business";
import { partnerOwnershipService } from "./partner-ownership.service";
import {
  resolvePartnerBindingForUser,
} from "./partner-binding.service";
import { partnerBusinessService } from "./partner-business.service";

/** Access the in-module store via pipeline side-effect (same request). */
export async function ensurePartnerOpportunityStoreForHome(
  userId: string,
  opportunityIds: Set<string>,
): Promise<{ opportunities: PartnerOpportunityDetailDto[]; customerCount: number }> {
  // Pipeline already ran (or will be memo/TTL cached) before this helper.
  await partnerBusinessService.getBusinessPipeline(userId);

  const binding = await resolvePartnerBindingForUser(userId);
  const partnerId = binding.partner.id;
  const organizationId = binding.partner.organizationId;

  const ownedCustomers = await partnerOwnershipService.listOwnedCustomerIds({
    organizationId,
    wealthPartnerId: partnerId,
  });

  const details = await partnerBusinessService.listCachedOpportunityDetailsForHome(
    userId,
    [...opportunityIds],
  );

  return {
    opportunities: details,
    customerCount: ownedCustomers.length,
  };
}
