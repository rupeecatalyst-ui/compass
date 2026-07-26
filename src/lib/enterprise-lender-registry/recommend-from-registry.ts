/**
 * CO-LENDER-ARCH-001 — Rank Published Enterprise Lenders for Chanakya / LIFE.
 * SSOT: Enterprise Lender Registry only. Never demo contact lists or hardcoded banks.
 */
import { ensureLenderMasterBootstrapped } from "@/lib/enterprise-lender-registry/bootstrap-master";
import {
  isCanonicalDealLenderOption,
  listPublishedLenderOptions,
  type PublishedLenderOption,
} from "@/lib/enterprise-lender-registry/published-directory";
import type { LoanFile } from "@/types/catalyst-one";

export type RegistryLenderRecommendation = {
  rank: number;
  /** Enterprise Lender Registry primary key */
  enterpriseLenderId: string;
  lenderCode: string;
  lenderName: string;
  /** Stable ref for shortlist / Move to Deal: lender:{registryId} */
  lenderRef: string;
  score: number;
  confidencePct: number;
  stars: number;
  reason: string;
  classification?: string | null;
  institutionCategory: string;
};

function productTokens(product?: string): string[] {
  const p = (product || "").toLowerCase();
  if (!p) return [];
  const tokens: string[] = [];
  if (/home|housing|hl\b/.test(p)) tokens.push("home_loan", "home_loan_bt");
  if (/lap|against property/.test(p)) tokens.push("lap");
  if (/personal/.test(p)) tokens.push("personal_loan");
  if (/business|msme|ubl/.test(p)) tokens.push("business_loan");
  if (/working capital|wc\b/.test(p)) tokens.push("working_capital");
  if (/gold/.test(p)) tokens.push("gold_loan");
  if (/construction/.test(p)) tokens.push("construction_funding");
  if (/bt|balance transfer/.test(p)) tokens.push("home_loan_bt");
  return tokens;
}

function scoreLender(
  lender: PublishedLenderOption,
  file: LoanFile,
): { score: number; reason: string } {
  let score = 62;
  const reasons: string[] = [];
  const tokens = productTokens(file.loanProduct);
  const supported = (lender as PublishedLenderOption & { productsSupported?: string[] })
    .productsSupported;
  // productsSupported may not be on option — use classification / category heuristics
  const cat = (lender.institutionCategory || "").toLowerCase();
  const classif = (lender.classification || "").toLowerCase();

  if (tokens.includes("home_loan") || tokens.includes("home_loan_bt")) {
    if (cat === "hfc" || classif.includes("housing")) {
      score += 18;
      reasons.push("Housing finance fit");
    } else if (cat === "bank") {
      score += 14;
      reasons.push("Bank home-loan strength");
    } else {
      score += 6;
    }
  }
  if (tokens.includes("personal_loan") || tokens.includes("business_loan")) {
    if (cat === "nbfc" || cat === "fintech") {
      score += 12;
      reasons.push("NBFC / Fintech product fit");
    } else if (cat === "bank") {
      score += 10;
      reasons.push("Bank unsecured/business coverage");
    }
  }
  if (tokens.includes("gold_loan") && (cat === "nbfc" || /gold/i.test(lender.displayName))) {
    score += 16;
    reasons.push("Gold loan specialist");
  }
  if (file.lendingType === "secured" && (cat === "bank" || cat === "hfc")) {
    score += 6;
  }
  if (file.city && lender.headquartersLabel) {
    const city = file.city.toLowerCase();
    const hq = lender.headquartersLabel.toLowerCase();
    if (hq.includes(city) || city.includes(hq.split(",")[0] || "")) {
      score += 8;
      reasons.push(`Strong presence near ${file.city}`);
    }
  }
  if (file.loanAmount && file.loanAmount >= 50_00_000 && cat === "bank") {
    score += 5;
    reasons.push("Ticket-size fit for banks");
  }
  void supported;

  score = Math.max(55, Math.min(96, score));
  if (reasons.length === 0) {
    reasons.push("Published Enterprise Lender — eligible for this Opportunity");
  }
  return { score, reason: reasons.slice(0, 2).join(" · ") };
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
 * Rank Published + Active lenders from Enterprise Lender Registry.
 * Unpublished lenders are never included.
 */
export function recommendPublishedLendersFromRegistry(input: {
  file: LoanFile;
  limit?: number;
}): RegistryLenderRecommendation[] {
  if (typeof window !== "undefined") {
    ensureLenderMasterBootstrapped();
  }
  const limit = input.limit ?? 8;
  // Prefer warm session only when it already holds canonical API rows; otherwise empty
  // until async Manual / Move paths hydrate from Prisma.
  const options = listPublishedLenderOptions().filter(isCanonicalDealLenderOption);
  if (options.length === 0) return [];

  const scored = options.map((lender) => {
    const { score, reason } = scoreLender(lender, input.file);
    return { lender, score, reason };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.lender.displayName.localeCompare(b.lender.displayName))
    .slice(0, limit)
    .map((row, index) => {
      const rank = index + 1;
      const confidencePct = Math.max(55, Math.min(96, Math.round(row.score)));
      return {
        rank,
        enterpriseLenderId: row.lender.id,
        lenderCode: row.lender.code,
        lenderName: row.lender.displayName || row.lender.code,
        lenderRef: `lender:${row.lender.id}`,
        score: Math.round(row.score),
        confidencePct,
        stars: starsFromRank(rank, confidencePct),
        reason: row.reason,
        classification: row.lender.classification,
        institutionCategory: row.lender.institutionCategory,
      };
    });
}
