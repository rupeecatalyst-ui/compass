/**
 * Chanakya Opportunity Recommendation Engine — canonical SSOT (BAT #10 / #11 / #21 / #25).
 *
 * Single recommendation output for:
 * - Opportunity Workspace → Chanakya Recommendation tab
 * - LIFE Strategic Workspace → Chanakya Recommendation panel
 * - Future: Customer Mobile App recommendation feed
 *
 * CO-LENDER-ARCH-001 — Ranks Published lenders from Enterprise Lender Registry only.
 * Flow: Opportunity → signals → Enterprise Lender Registry (Published) → Ranking.
 * Do not create parallel recommendation calculators in UI modules.
 */

import { getContextAwareVisibility } from "@/lib/context-aware-data-collection";
import {
  recommendPublishedLendersFromOptions,
  recommendPublishedLendersFromRegistry,
} from "@/lib/enterprise-lender-registry/recommend-from-registry";
import type { PublishedLenderOption } from "@/lib/enterprise-lender-registry/published-directory";
import { getCachedOpportunityRecord } from "@/lib/lead-opportunity-journey/opportunity-runtime-adapter";
import { isPropertySectionVisible } from "@/constants/loan-stage-master";
import { isProductSecured } from "@/constants/product-master";
import type { EcwStatedInformationDraft } from "@/types/enterprise-credit-workspace";
import type { LoanFile } from "@/types/catalyst-one";

/** Opportunity Setup section targets for one-click gap navigation (BAT #21). */
export type ChanakyaRecommendationSection =
  | "customer"
  | "loan"
  | "structure"
  | "financial"
  | "business"
  | "property"
  | "chanakya";

export type ChanakyaRecommendationGap = {
  id: string;
  label: string;
  section: ChanakyaRecommendationSection;
};

export type ChanakyaOpportunityRecommendation = {
  rank: number;
  lenderName: string;
  /** Enterprise Lender Registry ref: lender:{enterpriseLenderId} */
  lenderRef: string;
  /** Enterprise Lender Registry primary key when resolved */
  enterpriseLenderId?: string;
  /** Recommendation score 0–100 (reusable by LIFE / Mobile) */
  score: number;
  confidencePct: number;
  /** Display stars 1–5 */
  stars: number;
  reason: string;
};

export type ChanakyaOpportunityRecommendationResult = {
  ready: boolean;
  /** Soft guidance when recommendations cannot be generated yet */
  guidance: string[];
  /** Structured missing inputs for interactive checklist (BAT #21) */
  missingRequirements: ChanakyaRecommendationGap[];
  recommendations: ChanakyaOpportunityRecommendation[];
  analyzedAt: string;
};

type OpportunitySignals = {
  product?: string;
  transactionType?: string;
  lendingType?: string;
  employmentFamily: "salaried" | "self_employed" | "unknown";
  hasIncomeProfile: boolean;
  hasBusinessProfile: boolean;
  propertyType?: string;
  propertyValue?: string;
  approxCibil?: string;
  loanAmount?: number;
  btLender?: string;
  city?: string;
};

function readExtensionSignals(file: LoanFile): Pick<
  OpportunitySignals,
  "approxCibil" | "btLender" | "city"
> {
  const oppId =
    file.enterpriseOpportunityId?.trim() ||
    (file as LoanFile & { opportunityId?: string }).opportunityId?.trim() ||
    file.id;
  const opp = getCachedOpportunityRecord(oppId);
  const ext =
    opp?.lendingExtension && typeof opp.lendingExtension === "object"
      ? (opp.lendingExtension as Record<string, unknown>)
      : {};

  const cibil =
    (typeof ext.approxCibilScore === "string" && ext.approxCibilScore.trim()) ||
    (typeof file.approxCibilScore === "string" && file.approxCibilScore.trim()) ||
    undefined;
  const bt =
    (typeof ext.btInstitutionName === "string" && ext.btInstitutionName.trim()) ||
    file.btInstitutionName?.trim() ||
    undefined;
  // CO-CHANAKYA-001 — Registry cityLabel is journey SSOT; file.city is the projected view.
  const city = file.city?.trim() || opp?.cityLabel?.trim() || undefined;

  return { approxCibil: cibil, btLender: bt, city };
}

function collectSignals(
  file: LoanFile,
  stated?: EcwStatedInformationDraft,
): OpportunitySignals {
  const family = getContextAwareVisibility(file.employmentType).family;
  const ext = readExtensionSignals(file);
  return {
    product: file.loanProduct?.trim() || undefined,
    transactionType: file.transactionType?.trim() || undefined,
    lendingType: file.lendingType?.trim() || undefined,
    employmentFamily:
      family === "salaried" || family === "self_employed" ? family : "unknown",
    hasIncomeProfile: Boolean(
      stated?.statedIncomeMonthly?.trim() || file.businessDetails?.monthlySalary,
    ),
    hasBusinessProfile: Boolean(
      stated?.statedTurnover?.trim() ||
        stated?.statedNatureOfBusiness?.trim() ||
        file.businessDetails?.annualTurnover,
    ),
    propertyType: stated?.statedPropertyType?.trim() || file.propertyType?.trim() || undefined,
    propertyValue: stated?.statedPropertyValue?.trim() || undefined,
    approxCibil: ext.approxCibil,
    loanAmount: file.requiredAmount || file.loanAmount || undefined,
    btLender: ext.btLender,
    city: ext.city,
  };
}

function propertySectionRequired(file: LoanFile): boolean {
  if (isProductSecured(file.loanProduct ?? "")) return true;
  if (file.lendingType && isPropertySectionVisible(file.lendingType)) return true;
  return false;
}

/**
 * Mandatory Opportunity inputs for Chanakya lender recommendations (BAT #21).
 * Section ids map to Opportunity Setup tabs for one-click navigation.
 */
export function listChanakyaRecommendationGaps(
  file: LoanFile,
  stated?: EcwStatedInformationDraft,
): ChanakyaRecommendationGap[] {
  const signals = collectSignals(file, stated);
  const gaps: ChanakyaRecommendationGap[] = [];

  if (!signals.product) {
    gaps.push({ id: "product", label: "Product", section: "loan" });
  }
  if (!signals.loanAmount || signals.loanAmount <= 0) {
    gaps.push({
      id: "amount",
      label: "Required Loan Amount",
      section: "loan",
    });
  }
  if (signals.lendingType !== "secured" && signals.lendingType !== "unsecured") {
    gaps.push({ id: "lending_type", label: "Lending Type", section: "loan" });
  }
  if (signals.employmentFamily === "unknown") {
    gaps.push({
      id: "employment",
      label: "Employment Type",
      section: "loan",
    });
  }
  if (!signals.approxCibil) {
    gaps.push({
      id: "cibil",
      label: "Expected CIBIL Score",
      section: "loan",
    });
  }
  if (!signals.city) {
    gaps.push({ id: "city", label: "City", section: "customer" });
  }
  if (signals.transactionType === "balance_transfer" && !signals.btLender) {
    gaps.push({
      id: "bt_lender",
      label: "Existing Lender",
      section: "loan",
    });
  }
  if (propertySectionRequired(file)) {
    if (!signals.propertyType) {
      gaps.push({
        id: "property_type",
        label: "Property Type",
        section: "property",
      });
    }
    if (!signals.propertyValue) {
      gaps.push({
        id: "property_value",
        label: "Property Value",
        section: "property",
      });
    }
  }

  return gaps;
}

function buildReason(lenderName: string, baseReason: string, signals: OpportunitySignals): string {
  const fragments: string[] = [];

  if (signals.product) {
    const p = signals.product.toLowerCase();
    if (p.includes("lap") || p.includes("against property")) {
      fragments.push(`Strong ${signals.product} policy`);
    } else {
      fragments.push(`${signals.product} programme fit`);
    }
  }

  if (signals.employmentFamily === "salaried" && signals.hasIncomeProfile) {
    fragments.push("suitable income profile");
  } else if (signals.employmentFamily === "salaried") {
    fragments.push("salaried customer profile");
  } else if (signals.employmentFamily === "self_employed" && signals.hasBusinessProfile) {
    fragments.push("self-employed business profile aligned");
  } else if (signals.employmentFamily === "self_employed") {
    fragments.push("self-employed customer profile");
  }

  if (signals.approxCibil) {
    fragments.push("expected CIBIL aligned");
  }

  if (signals.propertyType) {
    fragments.push(`${signals.propertyType} coverage`);
  }

  if (signals.transactionType === "balance_transfer") {
    fragments.push(
      signals.btLender
        ? `Balance Transfer from ${signals.btLender}`
        : "Balance Transfer path supported",
    );
  } else if (signals.transactionType === "fresh") {
    fragments.push("fresh transaction path");
  }

  if (signals.lendingType === "secured") {
    fragments.push("secured lending fit");
  } else if (signals.lendingType === "unsecured") {
    fragments.push("unsecured programme path");
  }

  if (fragments.length === 0) {
    const fallback = baseReason.trim();
    if (fallback && fallback !== "Preferred Lender Fit") {
      return `${lenderName} — ${fallback}.`;
    }
    return `High probability based on customer profile and transaction type.`;
  }

  const head = fragments[0]!;
  const rest = fragments.slice(1);
  if (rest.length === 0) return `${head}.`;
  return `${head}, ${rest.join(", ")}.`;
}

function confidenceFromScore(score: number, signals: OpportunitySignals): number {
  let pct = Math.max(55, Math.min(96, Math.round(score)));
  if (signals.hasIncomeProfile || signals.hasBusinessProfile) pct = Math.min(96, pct + 2);
  if (signals.approxCibil) pct = Math.min(96, pct + 2);
  if (signals.propertyType) pct = Math.min(96, pct + 1);
  return pct;
}

function starsFromRank(rank: number, confidencePct: number): number {
  if (rank === 1) return 5;
  if (rank === 2) return 4;
  if (rank === 3) return confidencePct >= 70 ? 3 : 2;
  if (confidencePct >= 80) return 3;
  if (confidencePct >= 65) return 2;
  return 1;
}

/**
 * Canonical ranked lender recommendations from Opportunity data.
 * Read-only decision support — does not mutate Opportunity or Deal state.
 */
export function deriveChanakyaOpportunityRecommendations(input: {
  file: LoanFile;
  stated?: EcwStatedInformationDraft;
}): ChanakyaOpportunityRecommendationResult {
  const analyzedAt = new Date().toISOString();
  const signals = collectSignals(input.file, input.stated);
  const missingRequirements = listChanakyaRecommendationGaps(input.file, input.stated);

  if (missingRequirements.length > 0) {
    return {
      ready: false,
      missingRequirements,
      guidance: missingRequirements.map((g) => `Complete ${g.label}.`),
      recommendations: [],
      analyzedAt,
    };
  }

  // CO-LENDER-ARCH-001 — Enterprise Lender Registry (Published ∧ Active) only.
  const ranked = recommendPublishedLendersFromRegistry({
    file: input.file,
    limit: 8,
  }).map((row) => {
    const confidencePct = confidenceFromScore(row.score, signals);
    return {
      rank: row.rank,
      lenderName: row.lenderName,
      lenderRef: row.lenderRef,
      enterpriseLenderId: row.enterpriseLenderId,
      score: row.score,
      confidencePct,
      stars: starsFromRank(row.rank, confidencePct),
      reason: buildReason(row.lenderName, row.reason, signals),
    };
  });

  if (ranked.length === 0) {
    return {
      ready: false,
      missingRequirements: [],
      guidance: [
        "No Published lenders in Enterprise Lender Registry yet. Publish lenders in Administration → Lender Registry, then return here.",
      ],
      recommendations: [],
      analyzedAt,
    };
  }

  return {
    ready: true,
    missingRequirements: [],
    guidance: [],
    recommendations: ranked,
    analyzedAt,
  };
}

/**
 * Server-side Chanakya recommendations — same readiness + ranking rules as canonical derive,
 * with Prisma-injected Published lender options (COMPASS / Partner Gateway).
 */
export function deriveChanakyaOpportunityRecommendationsFromOptions(input: {
  file: LoanFile;
  stated?: EcwStatedInformationDraft;
  registryOptions: PublishedLenderOption[];
  limit?: number;
}): ChanakyaOpportunityRecommendationResult {
  const analyzedAt = new Date().toISOString();
  const signals = collectSignals(input.file, input.stated);
  const missingRequirements = listChanakyaRecommendationGaps(input.file, input.stated);

  if (missingRequirements.length > 0) {
    return {
      ready: false,
      missingRequirements,
      guidance: missingRequirements.map((g) => `Complete ${g.label}.`),
      recommendations: [],
      analyzedAt,
    };
  }

  const limit = Math.max(1, Math.min(25, input.limit ?? 8));
  const ranked = recommendPublishedLendersFromOptions(input.registryOptions, {
    file: input.file,
    limit,
  }).map((row) => {
    const confidencePct = confidenceFromScore(row.score, signals);
    return {
      rank: row.rank,
      lenderName: row.lenderName,
      lenderRef: row.lenderRef,
      enterpriseLenderId: row.enterpriseLenderId,
      score: row.score,
      confidencePct,
      stars: starsFromRank(row.rank, confidencePct),
      reason: buildReason(row.lenderName, row.reason, signals),
    };
  });

  if (ranked.length === 0) {
    return {
      ready: false,
      missingRequirements: [],
      guidance: [
        "No Published lenders in Enterprise Lender Registry yet. Publish lenders in Administration → Lender Registry, then return here.",
      ],
      recommendations: [],
      analyzedAt,
    };
  }

  return {
    ready: true,
    missingRequirements: [],
    guidance: [],
    recommendations: ranked,
    analyzedAt,
  };
}

