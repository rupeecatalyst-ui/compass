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
import type { HomeLoanRecommendationEngineResult } from "@/lib/home-loan-recommendation/engine";

function tierForRank(rank: number): CompassRecommendationCardDto["tier"] {
  if (rank <= 1) return "best";
  if (rank <= 2) return "strong";
  return "alternative";
}

function inr(value: number | null | undefined): string | null {
  if (value == null) return null;
  return `₹${value.toLocaleString("en-IN")}`;
}

export function projectHlBtEngineRecommendations(
  result: HomeLoanRecommendationEngineResult,
): CompassRecommendationsDto {
  if (result.outcome === "assisted_offer" || result.cards.length === 0) {
    return {
      status: "pending",
      message:
        result.assisted?.body ||
        "We will review alternate lenders and permissible policy structures to identify the best possible offer.",
      cards: [],
      assistedOffer: result.assisted
        ? {
            headline: result.assisted.headline,
            body: result.assisted.body,
            requestedAmountRupees: result.assisted.requestedAmountRupees,
            ltvSupportedAmountRupees: result.assisted.ltvSupportedAmountRupees,
            incomeSupportedAmountRupees: result.assisted.incomeSupportedAmountRupees,
            eligibilityGapRupees: result.assisted.eligibilityGapRupees,
            enhancementRoutes: result.assisted.enhancementRoutes,
            specialistReviewRequired: true,
          }
        : null,
      needsCoApplicantPrompt: result.needsCoApplicantPrompt,
      cibilNotKnownDisclaimer: result.cibilNotKnownDisclaimer,
      dtoSource: "enterprise_compass_recommendations",
    };
  }

  const cards: CompassRecommendationCardDto[] = result.cards.map((row, index) => ({
    lenderRef: `lender:${row.lenderId}`,
    displayName: row.lenderName,
    rank: index + 1,
    tier: tierForRank(index + 1),
    interestRateLabel:
      row.applicableRoiPercent != null
        ? `${row.roiIsIndicative ? "Indicative ROI " : ""}${row.applicableRoiPercent}%`
        : "Indicative ROI not available",
    estimatedEmiLabel: row.indicativeEmiRupees != null ? inr(row.indicativeEmiRupees) : null,
    processingTimeLabel: null,
    reasons: [row.customerExplanation].filter(Boolean),
    benefits: row.matchState === "exact_match" ? ["Exact programme fit"] : [],
    tentativeOfferLabel: inr(row.tentativeOfferRupees),
    tentativeOfferRupees: row.tentativeOfferRupees,
    requestedAmountLabel: inr(row.requiredAmountRupees),
    shortfallLabel: row.shortfallRupees ? inr(row.shortfallRupees) : null,
    tenureLabel:
      row.tenureMonths != null
        ? `${row.tenureMonths} months (${Math.round((row.tenureMonths / 12) * 10) / 10} years)`
        : null,
    foirLabel: row.foirPercent != null ? `${row.foirPercent}%` : null,
    whyThisRecommendation: row.customerExplanation,
    matchState: row.matchState,
    programmeVersion: row.programmeVersion,
    dtoSource: "enterprise_compass_recommendations",
  }));

  return {
    status: "ready",
    message: "Recommended institutions from verified Catalyst One programmes, assessed lender by lender.",
    cards,
    assistedOffer: null,
    needsCoApplicantPrompt: false,
    cibilNotKnownDisclaimer: result.cibilNotKnownDisclaimer,
    dtoSource: "enterprise_compass_recommendations",
  };
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
