import {
  listMissingBtInformation,
  parseCertainty,
  parseCertaintyAmount,
  parseCertaintyDate,
  parseCertaintyMonths,
  parseCertaintyPercent,
  parseRateType,
  type RateType,
  type ValueCertainty,
} from "./bt-journey";

export type AssessmentFact = { label: string; value: string };

export type BtAssessmentDisplay = {
  existingLoan: AssessmentFact[];
  property: AssessmentFact[];
  repaymentConduct: AssessmentFact[];
  topUpRequirement: AssessmentFact[];
  missingInformation: string[];
  calculationInputs: AssessmentFact[];
};

function labelCertainty(certainty: ValueCertainty | null | undefined): string {
  if (certainty === "approximate") return " (approximate)";
  if (certainty === "not_known") return "";
  if (certainty === "exact") return " (exact)";
  return "";
}

function money(value: number | null, certainty?: ValueCertainty | null): string {
  if (certainty === "not_known" || value == null) return "Not known";
  return `₹${value.toLocaleString("en-IN")}${labelCertainty(certainty)}`;
}

function text(value: string | null | undefined, fallback = "Not specified"): string {
  if (!value || !String(value).trim()) return fallback;
  return String(value).replace(/_/g, " ");
}

function percent(value: number | null, certainty?: ValueCertainty | null): string {
  if (certainty === "not_known" || value == null) return "Not known";
  return `${value}% p.a.${labelCertainty(certainty)}`;
}

function months(value: number | null, certainty?: ValueCertainty | null): string {
  if (certainty === "not_known" || value == null) return "Not known";
  return `${value} months${labelCertainty(certainty)}`;
}

function rateTypeLabel(value: RateType | null): string {
  if (!value || value === "not_known") return "Not known";
  if (value === "floating") return "Floating";
  if (value === "fixed") return "Fixed";
  return "Hybrid";
}

export function buildBtAssessmentDisplay(raw: Record<string, unknown>): BtAssessmentDisplay {
  const sanctioned = parseCertaintyAmount(raw.originalSanctionedAmount, raw.originalSanctionedCertainty);
  const outstanding = parseCertaintyAmount(raw.outstandingLoanAmount, raw.outstandingCertainty);
  const start = parseCertaintyDate(raw.loanStartDate, raw.loanStartDateCertainty);
  const roi = parseCertaintyPercent(raw.currentRoi, raw.currentRoiCertainty);
  const emi = parseCertaintyAmount(raw.currentEmi, raw.currentEmiCertainty);
  const remaining = parseCertaintyMonths(raw.remainingTenureMonths, raw.remainingTenureCertainty);
  const originalTenure = parseCertaintyMonths(raw.originalTenureMonths, raw.originalTenureCertainty);
  const propertyValue = parseCertaintyAmount(raw.propertyValue, raw.propertyValueCertainty);
  const rateType = parseRateType(raw.rateType);
  const topUpChoice = typeof raw.topUpChoice === "string" ? raw.topUpChoice : null;
  const repaymentTrack = typeof raw.repaymentTrack === "string" ? raw.repaymentTrack : null;

  const existingLoan: AssessmentFact[] = [
    { label: "Current lender", value: text(typeof raw.currentLender === "string" ? raw.currentLender : null, "Not known") },
    { label: "Original sanctioned amount", value: money(sanctioned.valueRupees, sanctioned.certainty) },
    { label: "Current principal outstanding", value: money(outstanding.valueRupees, outstanding.certainty) },
    {
      label: "Loan start / disbursement date",
      value: start.certainty === "not_known" || !start.isoDate ? "Not known" : `${start.isoDate}${labelCertainty(start.certainty)}`,
    },
    { label: "Current ROI", value: percent(roi.valuePercent, roi.certainty) },
    { label: "Interest-rate type", value: rateTypeLabel(rateType) },
    { label: "Current EMI", value: money(emi.valueRupees, emi.certainty) },
    { label: "Remaining tenure", value: months(remaining.months, remaining.certainty) },
  ];
  if (originalTenure.months != null || originalTenure.certainty === "not_known") {
    existingLoan.push({
      label: "Original tenure",
      value: months(originalTenure.months, originalTenure.certainty),
    });
  }

  const property: AssessmentFact[] = [
    { label: "Estimated property value", value: money(propertyValue.valueRupees, propertyValue.certainty) },
    { label: "City", value: text(typeof raw.city === "string" ? raw.city : null) },
    { label: "Pincode", value: text(typeof raw.pincode === "string" ? raw.pincode : null, "Not known") },
    { label: "Property type", value: text(typeof raw.propertyKind === "string" ? raw.propertyKind : typeof raw.propertyType === "string" ? raw.propertyType : null) },
    { label: "Construction status", value: text(typeof raw.constructionStatus === "string" ? raw.constructionStatus : null) },
    { label: "Occupancy", value: text(typeof raw.occupancy === "string" ? raw.occupancy : null) },
    { label: "Possession status", value: text(typeof raw.possessionStatus === "string" ? raw.possessionStatus : null) },
    { label: "Registration status", value: text(typeof raw.registrationStatus === "string" ? raw.registrationStatus : null, "Not applicable / not captured") },
  ];

  const delayed = raw.delayedEmiCount;
  const repaymentConduct: AssessmentFact[] = [
    { label: "On-time EMIs (declared)", value: text(repaymentTrack, "Not specified") },
  ];
  if (repaymentTrack === "no" || delayed != null) {
    repaymentConduct.push({
      label: "Delayed / missed EMI count",
      value: delayed == null ? "Not known" : String(delayed),
    });
  }

  const topUpRequirement: AssessmentFact[] = [
    {
      label: "Requirement",
      value:
        topUpChoice === "with_topup"
          ? "Balance Transfer with Top-up"
          : topUpChoice === "bt_only"
            ? "Balance Transfer only"
            : "Not specified",
    },
  ];
  if (topUpChoice === "with_topup") {
    const topUp = parseCertaintyAmount(raw.topUpAmount, raw.topUpAmountCertainty);
    topUpRequirement.push({ label: "Requested top-up amount", value: money(topUp.valueRupees, topUp.certainty) });
    topUpRequirement.push({
      label: "Top-up purpose",
      value: text(typeof raw.topUpPurpose === "string" ? raw.topUpPurpose : null, "Not asked — no verified programme requires it"),
    });
  }

  const missingInformation = listMissingBtInformation({
    currentLender: typeof raw.currentLender === "string" ? raw.currentLender : null,
    originalSanctionedAmount: sanctioned.valueRupees,
    originalSanctionedCertainty: sanctioned.certainty,
    outstandingLoanAmount: outstanding.valueRupees,
    outstandingCertainty: outstanding.certainty,
    loanStartDate: start.isoDate,
    loanStartDateCertainty: start.certainty,
    currentRoi: roi.valuePercent,
    currentRoiCertainty: roi.certainty,
    rateType,
    currentEmi: emi.valueRupees,
    currentEmiCertainty: emi.certainty,
    remainingTenureMonths: remaining.months,
    remainingTenureCertainty: remaining.certainty,
    repaymentTrack,
    propertyValue: propertyValue.valueRupees,
    propertyValueCertainty: propertyValue.certainty,
    city: typeof raw.city === "string" ? raw.city : null,
    pincode: typeof raw.pincode === "string" ? raw.pincode : null,
    propertyKind: typeof raw.propertyKind === "string" ? raw.propertyKind : null,
    constructionStatus: typeof raw.constructionStatus === "string" ? raw.constructionStatus : null,
    occupancy: typeof raw.occupancy === "string" ? raw.occupancy : null,
    possessionStatus: typeof raw.possessionStatus === "string" ? raw.possessionStatus : null,
  });

  const calculationInputs: AssessmentFact[] = [
    { label: "Transfer outstanding used", value: money(outstanding.valueRupees, outstanding.certainty) },
    { label: "Existing Home Loan EMI (comparison only)", value: money(emi.valueRupees, emi.certainty) },
    { label: "Other EMIs (FOIR)", value: money(parseCertaintyAmount(raw.existingEmi, "exact").valueRupees, "exact") },
    { label: "Loan start date for seasoning", value: start.isoDate ? `${start.isoDate}${labelCertainty(start.certainty)}` : "Not known — no universal seasoning applied" },
    { label: "Rate type", value: rateTypeLabel(rateType) },
    { label: "Indicative saving", value: "Shown only when EMI, remaining tenure and ROI are known. Fees are never invented." },
  ];

  return {
    existingLoan,
    property,
    repaymentConduct,
    topUpRequirement,
    missingInformation,
    calculationInputs,
  };
}

export function parseCertaintyOrNull(value: unknown): ValueCertainty | null {
  return parseCertainty(value);
}
