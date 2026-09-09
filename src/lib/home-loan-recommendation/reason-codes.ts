export const HL_BT_REASON_CODES = [
  "LOWEST_APPLICABLE_ROI",
  "LONGER_TENURE_LOWER_EMI",
  "AGE_LIMIT_REDUCED_TENURE",
  "CO_APPLICANT_IMPROVED_ELIGIBILITY",
  "LTV_CAPPED_OFFER",
  "FOIR_CONDITIONAL_MATCH",
  "STRONG_LENDER_SCORE",
  "BALANCE_TRANSFER_SAVING",
  "TOP_UP_SUPPORTED",
  "SPECIALIST_REVIEW_REQUIRED",
] as const;

export type HlBtReasonCode = (typeof HL_BT_REASON_CODES)[number];

export type ReasonContext = {
  tenureMonths?: number | null;
  indicativeEmiRupees?: number | null;
  tentativeOfferRupees?: number | null;
  shortfallRupees?: number | null;
  lenderScore?: number | null;
};

export function buildTwoLineReason(codes: string[], context: ReasonContext = {}): string {
  const unique = [...new Set(codes.filter(Boolean))];
  if (unique.includes("SPECIALIST_REVIEW_REQUIRED") && unique.length === 1) {
    return "This requirement needs specialist review. Alternate lenders, co-applicant options and permissible policy structures will be assessed.";
  }
  const lines: string[] = [];
  for (const code of unique) {
    switch (code) {
      case "LONGER_TENURE_LOWER_EMI":
        lines.push(
          context.tenureMonths && context.indicativeEmiRupees
            ? `This institution permits a tenure of up to ${context.tenureMonths} months for your age profile. The longer tenure reduces your indicative EMI to approximately ₹${context.indicativeEmiRupees.toLocaleString("en-IN")} per month.`
            : "This institution permits a longer tenure for your age profile, which reduces the indicative EMI.",
        );
        break;
      case "AGE_LIMIT_REDUCED_TENURE":
        lines.push(
          context.tenureMonths
            ? `Based on your age, this lender permits an indicative tenure of up to ${context.tenureMonths} months. A co-applicant or lower loan amount may improve the eligibility.`
            : "Based on your age, this lender reduces the indicative tenure. A co-applicant or lower loan amount may improve eligibility.",
        );
        break;
      case "LTV_CAPPED_OFFER":
        lines.push(
          context.tentativeOfferRupees
            ? `The tentative offer is capped at ₹${context.tentativeOfferRupees.toLocaleString("en-IN")} by the applicable LTV ceiling. Final amount depends on the permitted valuation basis.`
            : "The tentative offer is limited by the applicable LTV ceiling. Final amount depends on the permitted valuation basis.",
        );
        break;
      case "FOIR_CONDITIONAL_MATCH":
        lines.push(
          "Income and existing obligations produce a conditional FOIR match against this programme. Final eligibility depends on verified income and obligations.",
        );
        break;
      case "CO_APPLICANT_IMPROVED_ELIGIBILITY":
        lines.push(
          "Combined applicant and co-applicant income improves the eligibility assessment for this programme. Co-applicant income is accepted only where the programme permits it.",
        );
        break;
      case "LOWEST_APPLICABLE_ROI":
        lines.push("This programme currently presents the lowest applicable or indicative ROI among the programmes assessed.");
        break;
      case "STRONG_LENDER_SCORE":
        lines.push(
          context.lenderScore != null
            ? `Catalyst One lender performance score for this institution is ${context.lenderScore}. ROI is ranked separately and is not part of this score.`
            : "This institution has a strong Catalyst One lender performance score. ROI is ranked separately.",
        );
        break;
      case "BALANCE_TRANSFER_SAVING":
        lines.push(
          "This programme supports the proposed Balance Transfer within the preliminary assessment. The final benefit depends on verified outstanding, charges and lender approval.",
        );
        break;
      case "TOP_UP_SUPPORTED":
        lines.push(
          "This programme supports the proposed Balance Transfer and top-up within the preliminary LTV. The final benefit depends on verified outstanding, charges and lender approval.",
        );
        break;
      case "SPECIALIST_REVIEW_REQUIRED":
        lines.push("Specialist review is required before a standard programme result can be confirmed.");
        break;
      default:
        break;
    }
    if (lines.length >= 2) break;
  }
  if (lines.length === 0) {
    return "This programme was assessed from verified Catalyst One inputs. Final pricing and approval remain subject to lender policy.";
  }
  return lines.slice(0, 2).join(" ");
}
