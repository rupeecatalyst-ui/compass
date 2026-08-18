/**
 * CO-WP-REC-001 — Project Chanakya / Registry recommendations for Catalyst Connect.
 *
 * Uses Enterprise Lender Registry ranking SSOT only.
 * Strips credit score, numeric lender scores, risk/policy internals.
 */

import { recommendPublishedLendersFromOptions } from "@/lib/enterprise-lender-registry/recommend-from-registry";
import type { PublishedLenderOption } from "@/lib/enterprise-lender-registry/published-directory";
import type { LoanFile } from "@/types/catalyst-one";
import type { PartnerOpportunityDetailDto } from "@/types/enterprise-partner-business";
import type {
  PartnerOpportunityRecommendationsDto,
  PartnerRecommendationCardDto,
  PartnerRecommendationDocumentReadinessDto,
  PartnerRecommendationGuidanceDto,
} from "@/types/enterprise-partner-recommendations";
import { isApproxCibilScoreBand } from "@/constants/cibil-score-master";
import type { ApproxCibilScoreBand } from "@/types/cibil-score-master";
import {
  PARTNER_RECOMMENDATION_ENGINE_VERSION,
  PARTNER_RECOMMENDATION_FORBIDDEN_GAP_IDS,
  PARTNER_RECOMMENDATION_GAP_MESSAGES,
  PARTNER_RECOMMENDATION_PRESENTATION,
} from "@/constants/enterprise-partner-recommendations";
import { listChanakyaRecommendationGaps } from "@/lib/chanakya-opportunity-recommendations";

const DTO_SOURCE = "enterprise_partner_recommendation_engine" as const;
const DTO_NOTICE =
  "Customer-friendly recommendation projection from Catalyst One Recommendation Engine. Catalyst Connect must not recalculate or invent cards.";

function parseAmountLabel(label: string | null | undefined): number | undefined {
  if (!label?.trim()) return undefined;
  const raw = label.replace(/,/g, "").toLowerCase();
  const num = Number(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(num) || num <= 0) return undefined;
  if (/\bcr\b|crore/.test(raw)) return Math.round(num * 1_00_00_000);
  if (/\bl\b|lakh|lac/.test(raw)) return Math.round(num * 1_00_000);
  if (num < 1000) return Math.round(num * 1_00_000);
  return Math.round(num);
}

function mapEmployment(code: string | undefined): string {
  const c = (code || "").trim().toLowerCase();
  if (c === "salaried") return "salaried";
  if (c.includes("self-employed") || c.includes("self_employed")) return "self_employed";
  return c || "unknown";
}

/**
 * Minimal LoanFile-shaped projection for Registry ranking — structure only.
 * Does not invent credit scores or risk fields.
 */
function readApproxCibilBand(
  detail: PartnerOpportunityDetailDto,
  approxCibilScore?: string | null,
): ApproxCibilScoreBand | undefined {
  const raw =
    (approxCibilScore || "").trim() ||
    (detail.borrowerFields?.approxCibilScore || "").trim() ||
    (detail.productFields?.approxCibilScore || "").trim();
  if (!raw || !isApproxCibilScoreBand(raw)) return undefined;
  return raw;
}

export function buildPartnerRecommendationLoanFile(
  detail: PartnerOpportunityDetailDto,
  opts?: { city?: string | null; approxCibilScore?: string | null },
): LoanFile {
  const borrower = detail.borrowerFields ?? {};
  const product = detail.productFields ?? {};
  const amount =
    parseAmountLabel(detail.requiredAmountLabel) ||
    parseAmountLabel(product.requestedAmountLabel) ||
    0;
  const lendingRaw = (product.lendingType || "").trim().toLowerCase();
  const lendingType =
    lendingRaw === "secured" || lendingRaw === "unsecured" ? lendingRaw : undefined;
  const transactionRaw = (product.transactionType || "").trim().toLowerCase();
  const transactionType =
    transactionRaw === "balance_transfer" || transactionRaw === "fresh"
      ? transactionRaw
      : undefined;
  const city =
    (opts?.city || "").trim() ||
    (borrower.city || "").trim() ||
    (product.propertyCity || "").trim() ||
    "";

  return {
    id: detail.opportunityId,
    fileNumber: detail.reference || detail.opportunityId,
    customerId: detail.customerId,
    customerName: detail.customerDisplayName || "Not Specified",
    customerMobile: "",
    customerEmail: "",
    city,
    state: "",
    employmentType: mapEmployment(borrower.employmentTypeCode),
    lendingType: lendingType as LoanFile["lendingType"],
    transactionType: transactionType as LoanFile["transactionType"],
    loanProduct: detail.productLabel || detail.productCode || "",
    loanAmount: amount,
    requiredAmount: amount,
    lender: "",
    stage: "raw_lead",
    relationshipManager: detail.ownerLabel || "",
    priority: "medium",
    daysInStage: 0,
    expectedRevenue: 0,
    revenuePercent: 0,
    revenueReceived: 0,
    expectedDisbursement: "",
    loginDate: "",
    expectedLoginDate: "",
    sanctionAmount: 0,
    disbursementAmount: 0,
    interestRate: 0,
    tenure: 0,
    status: "on_track",
    progress: 0,
    createdAt: detail.createdAt || new Date().toISOString(),
    enterpriseOpportunityId: detail.opportunityId,
    propertyType: product.propertyType || undefined,
    businessDetails: {
      monthlySalary: parseAmountLabel(borrower.monthlyIncomeLabel),
      annualTurnover: parseAmountLabel(borrower.annualTurnoverLabel),
    },
    btInstitutionName:
      product.currentLendingInstitution?.trim() ||
      borrower.currentLendingInstitution?.trim() ||
      undefined,
    approxCibilScore: readApproxCibilBand(detail, opts?.approxCibilScore),
  } as LoanFile;
}

function partnerFriendlyReason(lenderName: string, registryReason: string, productLabel: string): string {
  const base = registryReason.trim();
  if (base && !/score|cibil|risk|policy engine|credit workbench/i.test(base)) {
    return productLabel
      ? `${lenderName} — ${base}. Good fit for ${productLabel}.`
      : `${lenderName} — ${base}.`;
  }
  return productLabel
    ? `${lenderName} is a suggested programme fit for ${productLabel}.`
    : `${lenderName} is a suggested programme fit for this customer.`;
}

function projectGuidance(file: LoanFile): PartnerRecommendationGuidanceDto[] {
  const gaps = listChanakyaRecommendationGaps(file);
  const out: PartnerRecommendationGuidanceDto[] = [];
  for (const gap of gaps) {
    if (PARTNER_RECOMMENDATION_FORBIDDEN_GAP_IDS.has(gap.id)) continue;
    const message = PARTNER_RECOMMENDATION_GAP_MESSAGES[gap.id];
    if (!message?.trim()) continue;
    if (gap.id !== "product" && gap.id !== "amount" && gap.id !== "bt_lender") continue;
    out.push({ id: gap.id, message });
  }
  return out;
}

function partnerReady(file: LoanFile): boolean {
  const product = file.loanProduct?.trim();
  const amount = file.requiredAmount || file.loanAmount || 0;
  return Boolean(product) && amount > 0;
}

function documentReadinessOf(
  detail: PartnerOpportunityDetailDto,
): PartnerRecommendationDocumentReadinessDto | undefined {
  const lod = detail.lod;
  if (!lod?.summary) return undefined;
  return {
    required: lod.summary.required,
    uploaded: lod.summary.uploaded,
    pending: lod.summary.pending,
  };
}

export async function projectPartnerOpportunityRecommendations(
  detail: PartnerOpportunityDetailDto,
  opts?: {
    city?: string | null;
    approxCibilScore?: string | null;
    limit?: number;
    /**
     * CO-WP-LENDER-API-002 — Partner Gateway must inject Prisma-backed options.
     * Never call relative /api/lender-registry from Partner server routes.
     */
    registryOptions: PublishedLenderOption[];
  },
): Promise<PartnerOpportunityRecommendationsDto> {
  const presentation = { ...PARTNER_RECOMMENDATION_PRESENTATION };
  const file = buildPartnerRecommendationLoanFile(detail, opts);
  const analyzedAt = new Date().toISOString();
  const guidance = projectGuidance(file);
  const ready = partnerReady(file);
  const documentReadiness = documentReadinessOf(detail);
  const limit = Math.max(1, Math.min(25, opts?.limit ?? 5));

  if (!ready) {
    return {
      version: PARTNER_RECOMMENDATION_ENGINE_VERSION,
      dtoSource: DTO_SOURCE,
      dtoNotice: DTO_NOTICE,
      opportunityId: detail.opportunityId,
      ready: false,
      analyzedAt,
      presentation,
      guidance:
        guidance.length > 0
          ? guidance
          : [{ id: "incomplete", message: "Complete Initial Data Collection to see suggestions." }],
      recommendations: [],
      documentReadiness,
    };
  }

  const ranked = recommendPublishedLendersFromOptions(opts?.registryOptions ?? [], {
    file,
    limit,
  });

  const recommendations: PartnerRecommendationCardDto[] = ranked.map((row, index) => {
    const displayName = row.lenderName;
    const lenderId = row.enterpriseLenderId;
    return {
      id: `rec-${lenderId || row.lenderRef || index}`,
      title: displayName,
      displayName,
      lenderId,
      reason: partnerFriendlyReason(displayName, row.reason, detail.productLabel || ""),
      badgeLabel: index === 0 ? presentation.suggestedBadgeLabel : null,
      ctaLabel: presentation.cardCtaLabel,
      deepLink: null,
      rank: row.rank,
      sortOrder: row.rank,
      lenderRef: row.lenderRef,
    };
  });

  if (recommendations.length === 0) {
    return {
      version: PARTNER_RECOMMENDATION_ENGINE_VERSION,
      dtoSource: DTO_SOURCE,
      dtoNotice: DTO_NOTICE,
      opportunityId: detail.opportunityId,
      ready: false,
      analyzedAt,
      presentation,
      guidance: [
        {
          id: "empty_registry",
          message: presentation.emptyMessage,
        },
      ],
      recommendations: [],
      documentReadiness,
    };
  }

  return {
    version: PARTNER_RECOMMENDATION_ENGINE_VERSION,
    dtoSource: DTO_SOURCE,
    dtoNotice: DTO_NOTICE,
    opportunityId: detail.opportunityId,
    ready: true,
    analyzedAt,
    presentation,
    guidance,
    recommendations,
    documentReadiness,
  };
}
