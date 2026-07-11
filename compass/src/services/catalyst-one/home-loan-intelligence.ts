/**
 * Catalyst One home loan intelligence engine.
 * COMPASS renders this output — all lender and advantage data originates here.
 * Replace internals with live Catalyst One API when available.
 */
import type {
  DiscoveryAnswersPayload,
  DiscoveryIntelligenceResult,
  LenderRecommendationResult,
} from "@/services/catalyst-one/types";

function formatInr(value: number): string {
  return value.toLocaleString("en-IN");
}

function calculateEmi(principal: number, annualRate = 8.5, tenureYears = 20): number {
  if (!principal) return 0;
  const r = annualRate / 12 / 100;
  const n = tenureYears * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function computeAdvantageAmount(answers: DiscoveryAnswersPayload): number {
  const baseRate = answers.propertyType === "construction" ? 0.0055 : 0.0045;
  const incomeFactor = answers.monthlyIncome >= 150000 ? 1.08 : 1;
  const ltv = answers.propertyValue ? answers.loanAmount / answers.propertyValue : 0.75;
  const ltvFactor = ltv > 0.8 ? 0.92 : ltv < 0.7 ? 1.05 : 1;
  return Math.round(answers.loanAmount * baseRate * incomeFactor * ltvFactor);
}

function buildLenders(answers: DiscoveryAnswersPayload): LenderRecommendationResult[] {
  const emi = calculateEmi(answers.loanAmount);
  const emiStr = `₹${formatInr(Math.round(emi))} / mo`;

  const incomeBoost = answers.monthlyIncome >= 150000 ? 4 : 0;
  const ltv = answers.propertyValue ? answers.loanAmount / answers.propertyValue : 0.7;
  const ltvPenalty = ltv > 0.8 ? -6 : ltv > 0.75 ? -3 : 0;
  const emiRatio =
    answers.monthlyIncome > 0 ? (emi + answers.existingEmi) / answers.monthlyIncome : 0.5;
  const emiPenalty = emiRatio > 0.5 ? -8 : emiRatio > 0.4 ? -4 : 2;

  const baseBest = 88 + incomeBoost + ltvPenalty + emiPenalty;
  const baseStrong = baseBest - 7;
  const baseAlt = baseBest - 14;

  const employmentReason =
    answers.incomeType === "salaried"
      ? "Strong fit for salaried profiles"
      : answers.incomeType === "business"
        ? "Understands business income patterns"
        : "Suited to professional income profiles";

  return [
    {
      id: "c1-hdfc-hl",
      name: "HDFC Bank",
      logoUrl: null,
      initials: "HD",
      matchScore: Math.min(96, Math.max(62, Math.round(baseBest))),
      interestRate: "8.35%",
      estimatedEmi: emiStr,
      processingTime: "7–10 days",
      reasons: ["Excellent match for your profile", "Competitive pricing", "Fast approval process"],
      benefits: ["Preferred rate band", "Digital sanction support"],
      tier: "best",
    },
    {
      id: "c1-icici-hl",
      name: "ICICI Bank",
      logoUrl: null,
      initials: "IC",
      matchScore: Math.min(92, Math.max(58, Math.round(baseStrong))),
      interestRate: "8.50%",
      estimatedEmi: emiStr,
      processingTime: "10–14 days",
      reasons: [employmentReason, "Flexible tenure options", "Reliable processing timelines"],
      benefits: ["Balance transfer friendly", "Top-up options"],
      tier: "strong",
    },
    {
      id: "c1-sbi-hl",
      name: "SBI Home Loans",
      logoUrl: null,
      initials: "SB",
      matchScore: Math.min(88, Math.max(52, Math.round(baseAlt))),
      interestRate: "8.65%",
      estimatedEmi: emiStr,
      processingTime: "14–18 days",
      reasons: [
        "Trusted public sector lender",
        "Attractive long-term rates",
        "Suitable for conservative borrowers",
      ],
      benefits: ["Long tenure comfort", "Stable rate outlook"],
      tier: "alternative",
    },
  ];
}

function buildSarathiContent(
  answers: DiscoveryAnswersPayload,
  lenders: LenderRecommendationResult[],
): DiscoveryIntelligenceResult["sarathi"] {
  const primary = lenders[0];
  const secondary = lenders[1];
  const city = answers.city || "your city";
  const propertyLabel = answers.propertyType === "construction" ? "construction" : "ready";

  return {
    messages: [
      "I've reviewed the information you've shared and prepared your COMPASS Advantage.",
      `${primary.name} leads at ${primary.matchScore}% — strongest rate, match, and speed for your ${propertyLabel} goal in ${city}.`,
      `${secondary.name} at ${secondary.matchScore}% is a solid alternative — ${secondary.interestRate} with ${secondary.processingTime} processing.`,
      `${primary.name} wins on overall fit today. ${secondary.name} suits you if you prefer ${secondary.benefits[0]?.toLowerCase() ?? "flexibility"}.`,
      `When you're ready, we'll guide documentation and application — calmly, at your pace.`,
    ],
  };
}

export function resolveHomeLoanIntelligence(
  answers: DiscoveryAnswersPayload,
): DiscoveryIntelligenceResult {
  const amount = computeAdvantageAmount(answers);
  const isConstruction = answers.propertyType === "construction";
  const lenders = buildLenders(answers);

  const advantage = isConstruction
    ? {
        title: "Estimated Lifetime COMPASS Advantage",
        amount,
        amountFormatted: `₹${formatInr(amount)}`,
        disclaimer:
          "Since your property is under construction, your estimated COMPASS Advantage will be released progressively as your loan is disbursed across construction stages, subject to the applicable terms and conditions.",
      }
    : {
        title: "Estimated COMPASS Advantage",
        amount,
        amountFormatted: `₹${formatInr(amount)}`,
        disclaimer:
          "Your estimated COMPASS Advantage becomes available upon successful loan disbursement, subject to the applicable terms and conditions.",
      };

  return {
    product: "home-loan",
    advantage,
    lenders,
    sarathi: buildSarathiContent(answers, lenders),
    source: "catalyst-one",
  };
}
