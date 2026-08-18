/**
 * CO-WP-REC-001 / CO-WP-LENDER-API-002 — Partner Opportunity Recommendations service.
 * Lender options loaded via Partner Gateway Prisma path — never relative /api/lender-registry.
 * Ranking consumes Opportunity Registry + lendingExtension.approxCibilScore (C1 SSOT).
 */
import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { isApproxCibilScoreBand } from "@/constants/cibil-score-master";
import { projectPartnerOpportunityRecommendations } from "@/lib/enterprise-partner-recommendations";
import type { PartnerOpportunityRecommendationsDto } from "@/types/enterprise-partner-recommendations";
import { partnerBusinessService } from "./partner-business.service";
import { partnerLenderMasterService } from "./partner-lender-master.service";

async function readApproxCibilFromOpportunity(opportunityId: string): Promise<string | undefined> {
  if (!isDatabaseAvailable()) return undefined;
  const row = await prisma.enterpriseOpportunity.findFirst({
    where: { id: opportunityId, isDeleted: false },
    select: { lendingExtension: true, snapshot: true },
  });
  if (!row) return undefined;
  const ext =
    row.lendingExtension && typeof row.lendingExtension === "object" && !Array.isArray(row.lendingExtension)
      ? (row.lendingExtension as Record<string, unknown>)
      : {};
  const fromExt = typeof ext.approxCibilScore === "string" ? ext.approxCibilScore.trim() : "";
  if (fromExt && isApproxCibilScoreBand(fromExt)) return fromExt;

  const snap =
    row.snapshot && typeof row.snapshot === "object" && !Array.isArray(row.snapshot)
      ? (row.snapshot as Record<string, unknown>)
      : {};
  const borrower =
    snap.partnerBorrowerFields && typeof snap.partnerBorrowerFields === "object"
      ? (snap.partnerBorrowerFields as Record<string, unknown>)
      : {};
  const fromSnap =
    typeof borrower.approxCibilScore === "string" ? borrower.approxCibilScore.trim() : "";
  if (fromSnap && isApproxCibilScoreBand(fromSnap)) return fromSnap;
  return undefined;
}

export const partnerOpportunityRecommendationsService = {
  async getRecommendations(
    userId: string,
    opportunityId: string,
    opts?: { limit?: number },
  ): Promise<PartnerOpportunityRecommendationsDto> {
    const detail = await partnerBusinessService.getOpportunity(userId, opportunityId);
    const customers = await partnerBusinessService.searchCustomers(userId, "");
    const customer = customers.find((c) => c.customerId === detail.customerId);
    const registryOptions = await partnerLenderMasterService.listPublishedOptionsForPartner();
    const approxCibilScore = await readApproxCibilFromOpportunity(detail.opportunityId);
    return projectPartnerOpportunityRecommendations(detail, {
      city: customer?.city,
      registryOptions,
      approxCibilScore,
      limit: opts?.limit,
    });
  },
};
