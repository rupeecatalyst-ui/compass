import type {
  CompassProductCode,
  CompassRecommendationCardDto,
  CompassRecommendationsDto,
} from "@/types/compass-customer-gateway";
import { deriveChanakyaOpportunityRecommendationsFromOptions } from "@/lib/chanakya-opportunity-recommendations";
import { recommendPublishedLendersFromOptions } from "@/lib/enterprise-lender-registry/recommend-from-registry";
import { buildPartnerRecommendationLoanFile } from "@/lib/enterprise-partner-recommendations/project";
import { projectPublicProgrammeMatchInput } from "@/lib/compass-customer-gateway/public-programme-match";
import type { PartnerOpportunityDetailDto } from "@/types/enterprise-partner-business";
import type { PublishedLenderOption } from "@/lib/enterprise-lender-registry/published-directory";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";
import { lenderRegistryService } from "@server/services/lender-registry/lender-registry.service";
import { isPublishedCommercialProgram } from "@/lib/enterprise-lender-registry/program-architecture";
import { recommendationProgrammeIds } from "@/lib/enterprise-lender-registry/programme-versioning";
import {
  projectPublishedProgrammeCommercials,
  validatedRequestedAmountRupees,
} from "@/lib/compass-customer-gateway/public-programme-commercials";
import { authoritativeMinimumRoi } from "@/lib/enterprise-lender-registry/programme-pricing";
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

/**
 * Customer-facing explanation for a successful published-programme match.
 * Programme codes and policy ids stay on the internal ranker reason.
 */
export const PUBLIC_PROGRAMME_MATCH_EXPLANATION =
  "This published programme matches the details you provided.";

/** Validated requested amount: number, numeric string, decimal, or formatted rupee label. */
export function authoritativeRequestedAmountRupees(amount: unknown): number | null {
  return validatedRequestedAmountRupees(amount);
}

export function publicRequestedAmountLabel(amount: unknown): string | null {
  const rupees = authoritativeRequestedAmountRupees(amount);
  return rupees == null ? null : inr(rupees);
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

const CUSTOMER_LENDER_CARD_LIMIT = 12;

function customerMinimumRoi(
  programmeById: Map<string, EnterpriseLenderProgramRecord>,
  programmeId: string | null | undefined,
): number | null {
  if (!programmeId) return null;
  return authoritativeMinimumRoi(programmeById.get(programmeId) ?? {}).percent;
}

/** Eligible cards already. Order is Minimum ROI, then lender name, then programme id. */
function compareCustomerLenderCards(
  left: CompassRecommendationCardDto,
  right: CompassRecommendationCardDto,
  programmeById: Map<string, EnterpriseLenderProgramRecord>,
): number {
  const leftRate = customerMinimumRoi(programmeById, left.programmeId);
  const rightRate = customerMinimumRoi(programmeById, right.programmeId);
  if (leftRate != null && rightRate != null && leftRate !== rightRate) return leftRate - rightRate;
  if (leftRate != null && rightRate == null) return -1;
  if (leftRate == null && rightRate != null) return 1;
  const byName = left.displayName.localeCompare(right.displayName);
  if (byName !== 0) return byName;
  return (left.programmeId ?? "").localeCompare(right.programmeId ?? "");
}

/**
 * Public journey ranker. Eligibility stays with the published-programme matcher.
 * Customer order is Minimum ROI ascending. The shared registry ranker is not reordered.
 */
export function projectRegistryProgrammeRecommendations(input: {
  detail: PartnerOpportunityDetailDto;
  lenders: PublishedLenderOption[];
  programs: EnterpriseLenderProgramRecord[];
  /** EnterpriseOpportunity.requestedAmount. Not a formatted label. */
  requestedAmount?: unknown;
}): CompassRecommendationsDto {
  const file = buildPartnerRecommendationLoanFile(input.detail);
  const ranked = recommendPublishedLendersFromOptions(input.lenders, {
    file,
    programmes: input.programs,
    limit: Math.max(input.lenders.length, 1),
    matchInput: projectPublicProgrammeMatchInput(input.detail),
  });
  const programmeById = new Map(input.programs.map((program) => [program.id, program]));
  const cards: CompassRecommendationCardDto[] = ranked.map((row) => {
    const program = row.programmeId ? programmeById.get(row.programmeId) : undefined;
    const commercials = projectPublishedProgrammeCommercials({
      program,
      requestedAmount: input.requestedAmount,
    });
    return {
    lenderRef: row.lenderRef,
    displayName: row.lenderName,
    rank: row.rank,
    tier: tierForRank(row.rank),
    interestRateLabel: commercials.interestRateLabel,
    estimatedEmiLabel: commercials.estimatedEmiLabel,
    tenureLabel: commercials.tenureLabel,
    matchScore: row.score,
    processingTimeLabel: commercials.processingTimeLabel,
    reasons: [PUBLIC_PROGRAMME_MATCH_EXPLANATION],
    benefits: [],
    tentativeOfferLabel: commercials.tentativeOfferLabel,
    tentativeOfferRupees: commercials.tentativeOfferRupees,
    requestedAmountLabel: commercials.requestedAmountLabel,
    whyThisRecommendation: PUBLIC_PROGRAMME_MATCH_EXPLANATION,
    programmeId: row.programmeId ?? null,
    programmeVersion: row.programmeVersion,
    dtoSource: "enterprise_compass_recommendations" as const,
  };
  });
  const presented = cards
    .sort((left, right) => compareCustomerLenderCards(left, right, programmeById))
    .slice(0, CUSTOMER_LENDER_CARD_LIMIT)
    .map((card, index) => ({
      ...card,
      rank: index + 1,
      tier: tierForRank(index + 1),
    }));
  return {
    status: "ready",
    message: presented.length
      ? "Published programme matches for this requirement."
      : "No published programme matches this requirement.",
    cards: presented,
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
    const collected: EnterpriseLenderProgramRecord[] = [];
    for (let page = 1; page <= 500; page += 1) {
      const listed = await lenderRegistryService.queryPrograms({ page, pageSize: 200, enabled: true });
      collected.push(...listed.items);
      if (listed.items.length < 200) break;
    }
    const allowed = recommendationProgrammeIds(collected);
    programmes = collected.filter(
      (program) => allowed.has(program.id) && isPublishedCommercialProgram(program),
    );
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
