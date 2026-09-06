import type {
  CompassProductCode,
  CompassRecommendationCardDto,
  CompassRecommendationsDto,
} from "@/types/compass-customer-gateway";
import { deriveChanakyaOpportunityRecommendationsFromOptions } from "@/lib/chanakya-opportunity-recommendations";
import { buildPartnerRecommendationLoanFile } from "@/lib/enterprise-partner-recommendations/project";
import type { PartnerOpportunityDetailDto } from "@/types/enterprise-partner-business";
import type { PublishedLenderOption } from "@/lib/enterprise-lender-registry/published-directory";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";
import { lenderRegistryService } from "@server/services/lender-registry/lender-registry.service";
import { isPublishedCommercialProgram } from "@/lib/enterprise-lender-registry/program-architecture";

function tierForRank(rank: number): CompassRecommendationCardDto["tier"] {
  if (rank <= 1) return "best";
  if (rank <= 2) return "strong";
  return "alternative";
}

export async function projectCompassRecommendations(input: {
  detail: PartnerOpportunityDetailDto;
  productCode: CompassProductCode;
  registryOptions: PublishedLenderOption[];
  city?: string | null;
  approxCibilScore?: string | null;
}): Promise<CompassRecommendationsDto> {
  const file = buildPartnerRecommendationLoanFile(input.detail, {
    city: input.city,
    approxCibilScore: input.approxCibilScore,
  });

  let programmes: EnterpriseLenderProgramRecord[] = [];
  try {
    const listed = await lenderRegistryService.queryPrograms({ pageSize: 500, enabled: true });
    programmes = listed.items.filter(isPublishedCommercialProgram);
  } catch {
    programmes = [];
  }

  const chanakya = deriveChanakyaOpportunityRecommendationsFromOptions({
    file,
    registryOptions: input.registryOptions,
    programmes,
    limit: 5,
  });

  if (!chanakya.ready || chanakya.recommendations.length === 0) {
    const message =
      chanakya.guidance[0] ||
      "We are reviewing your profile. A Rupee Catalyst advisor will share suitable lender options shortly.";
    return {
      status: "pending",
      message,
      cards: [],
      dtoSource: "enterprise_compass_recommendations",
    };
  }

  const cards: CompassRecommendationCardDto[] = chanakya.recommendations.map((row) => ({
    lenderRef: row.lenderRef,
    displayName: row.lenderName,
    rank: row.rank,
    tier: tierForRank(row.rank),
    interestRateLabel: null,
    estimatedEmiLabel: null,
    processingTimeLabel: null,
    reasons: [row.reason].filter(Boolean),
    benefits: row.rank === 1 ? ["Suggested fit"] : [],
    dtoSource: "enterprise_compass_recommendations",
  }));

  return {
    status: "ready",
    message: "Recommended institutions from Chanakya, in priority order.",
    cards,
    dtoSource: "enterprise_compass_recommendations",
  };
}
