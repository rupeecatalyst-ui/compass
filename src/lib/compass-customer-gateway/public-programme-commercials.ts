import { toIntegerRupees } from "@/constants/enterprise-product-master/requested-amount-limits";
import { calculateMonthlyEmi } from "@/lib/loan-emi-utils";

export type PublishedProgrammeCommercialSource = {
  roiPercent?: number | null;
  minRoiPercent?: number | null;
  maxRoiPercent?: number | null;
  maxFundingAmount?: number | null;
  maxTenureMonths?: number | null;
  averageTatDays?: number | null;
};

export type PublicProgrammeCommercials = {
  interestRateLabel: string | null;
  estimatedEmiLabel: string | null;
  tenureLabel: string | null;
  processingTimeLabel: string | null;
  tentativeOfferLabel: string | null;
  tentativeOfferRupees: number | null;
  requestedAmountLabel: string | null;
  rateSource: "roiPercent" | "roiRange" | "minRoiPercent" | "absent";
  eligibleAmountSource: "published-ceiling-and-requested" | "absent";
  emiSource: "calculated" | "absent";
  tenureSource: "maxTenureMonths" | "absent";
  processingTimeSource: "averageTatDays" | "absent";
  requestedAmountSource: "validated" | "absent";
};

function finite(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (
    value &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  ) {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function inr(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

/**
 * Enterprise requested amount.
 * Plain numbers, numeric strings, and decimal objects are authoritative.
 * A formatted label is accepted only when it is not a plain decimal string,
 * using the existing integer-rupee parser.
 */
export function validatedRequestedAmountRupees(amount: unknown): number | null {
  const direct = finite(amount);
  if (direct != null && direct > 0) return Math.round(direct);
  if (typeof amount === "string") {
    const trimmed = amount.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
      return null;
    }
    return toIntegerRupees(trimmed);
  }
  return null;
}

export function projectPublishedProgrammeCommercials(input: {
  program: PublishedProgrammeCommercialSource | null | undefined;
  requestedAmount: unknown;
}): PublicProgrammeCommercials {
  const program = input.program;
  const requested = validatedRequestedAmountRupees(input.requestedAmount);
  const roi = finite(program?.roiPercent);
  const minRoi = finite(program?.minRoiPercent);
  const maxRoi = finite(program?.maxRoiPercent);
  const maxFunding = finite(program?.maxFundingAmount);
  const tenureMonths = finite(program?.maxTenureMonths);
  const tatDays = finite(program?.averageTatDays);

  let interestRateLabel: string | null = null;
  let rateSource: PublicProgrammeCommercials["rateSource"] = "absent";
  let emiRate: number | null = null;
  if (roi != null) {
    interestRateLabel = `${roi}%`;
    rateSource = "roiPercent";
    emiRate = roi;
  } else if (minRoi != null && maxRoi != null) {
    interestRateLabel = `${minRoi}% – ${maxRoi}%`;
    rateSource = "roiRange";
  } else if (minRoi != null) {
    interestRateLabel = `${minRoi}%`;
    rateSource = "minRoiPercent";
    emiRate = minRoi;
  }

  const eligible =
    requested != null && maxFunding != null && maxFunding > 0
      ? Math.min(requested, maxFunding)
      : null;
  const emiPrincipal = eligible ?? requested;
  const emi =
    emiPrincipal != null && emiRate != null && emiRate > 0 && tenureMonths != null && tenureMonths > 0
      ? calculateMonthlyEmi(emiPrincipal, emiRate, tenureMonths)
      : null;

  return {
    interestRateLabel,
    estimatedEmiLabel: emi != null ? inr(emi) : null,
    tenureLabel: tenureMonths != null && tenureMonths > 0 ? `${tenureMonths} months` : null,
    processingTimeLabel: tatDays != null && tatDays > 0 ? `${tatDays} days` : null,
    tentativeOfferLabel: eligible != null ? inr(eligible) : null,
    tentativeOfferRupees: eligible,
    requestedAmountLabel: requested != null ? inr(requested) : null,
    rateSource,
    eligibleAmountSource: eligible != null ? "published-ceiling-and-requested" : "absent",
    emiSource: emi != null ? "calculated" : "absent",
    tenureSource: tenureMonths != null && tenureMonths > 0 ? "maxTenureMonths" : "absent",
    processingTimeSource: tatDays != null && tatDays > 0 ? "averageTatDays" : "absent",
    requestedAmountSource: requested != null ? "validated" : "absent",
  };
}
