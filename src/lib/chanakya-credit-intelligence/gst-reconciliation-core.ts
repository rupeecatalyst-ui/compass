/**
 * CO-CHANAKYA-022 — GST vs financial period alignment & comparison outcomes.
 * Evidence-first — never invents annual GST aggregates from incomplete monthly returns.
 */

import type {
  ChanakyaGstComparisonOutcome,
  ChanakyaGstPeriodAlignment,
} from "@/types/chanakya-credit-intelligence";

export type { ChanakyaGstComparisonOutcome, ChanakyaGstPeriodAlignment };

const MONTH_TOKEN =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/i;

/** True when a GST return period string looks like a calendar month filing (not annual). */
export function isMonthlyGstReturnPeriod(period: string | null | undefined): boolean {
  if (!period?.trim()) return false;
  return MONTH_TOKEN.test(period);
}

/** True when a financial period is an annual FY / year-ended label. */
export function isAnnualFinancialPeriod(period: string | null | undefined): boolean {
  if (!period?.trim()) return false;
  const t = period.trim();
  if (/\bFY\s*20\d{2}/i.test(t)) return true;
  if (/year\s*ended/i.test(t)) return true;
  if (/^20\d{2}\s*[-–\/]\s*(20\d{2}|\d{2})$/.test(t) && !MONTH_TOKEN.test(t)) return true;
  return false;
}

/**
 * Assess whether GST turnover can be numerically compared to financial revenue.
 * Monthly GST vs annual financial revenue → MISMATCH / NOT_COMPARABLE (never silent).
 * Incomplete monthly coverage is never annualized for comparison.
 */
export function assessGstFinancialPeriodAlignment(input: {
  financialPeriod: string | null;
  gstPeriods: Array<string | null | undefined>;
  gstReturnCountWithTurnover: number;
}): {
  alignment: ChanakyaGstPeriodAlignment;
  comparable: boolean;
  explanation: string | null;
} {
  const gstPeriods = input.gstPeriods.filter((p): p is string => Boolean(p?.trim()));
  const monthlyCount = gstPeriods.filter((p) => isMonthlyGstReturnPeriod(p)).length;
  const financialAnnual = isAnnualFinancialPeriod(input.financialPeriod);

  if (!input.financialPeriod && gstPeriods.length === 0) {
    return {
      alignment: "NOT_AVAILABLE",
      comparable: false,
      explanation: null,
    };
  }

  if (!input.financialPeriod || input.gstReturnCountWithTurnover === 0) {
    return {
      alignment: "INSUFFICIENT",
      comparable: false,
      explanation:
        "GST vs financial reconciliation is not available — one or both turnover sources lack reliable values.",
    };
  }

  if (financialAnnual && monthlyCount > 0) {
    const coverageNote =
      monthlyCount < 12
        ? `${monthlyCount} monthly GST return period(s) cannot be compared to annual financial revenue without inventing an annual GST aggregate.`
        : `Monthly GST return periods are present but annual GST aggregate is not computed unless source data explicitly supports full-year alignment.`;
    return {
      alignment: "MISMATCH",
      comparable: false,
      explanation: `Period mismatch: financial revenue is annual (${input.financialPeriod}) while GST evidence is monthly (${gstPeriods.slice(0, 3).join("; ")}${gstPeriods.length > 3 ? "; …" : ""}). ${coverageNote}`,
    };
  }

  if (financialAnnual && monthlyCount === 0 && gstPeriods.length === 1) {
    const gstLooksAnnual = /FY|GSTR-9|annual|20\d{2}\s*[-–]\s*20\d{2}/i.test(gstPeriods[0]!);
    if (!gstLooksAnnual && !isMonthlyGstReturnPeriod(gstPeriods[0]!)) {
      return {
        alignment: "INSUFFICIENT",
        comparable: false,
        explanation: `GST period "${gstPeriods[0]}" is not proven to align with annual financial period ${input.financialPeriod}.`,
      };
    }
  }

  if (financialAnnual && monthlyCount === 0 && gstPeriods.length === 0) {
    return {
      alignment: "INSUFFICIENT",
      comparable: false,
      explanation: "GST return period labels are missing — cannot verify alignment with financial year.",
    };
  }

  return {
    alignment: "ALIGNED",
    comparable: true,
    explanation: null,
  };
}

export function mapNumericRatioToComparisonOutcome(ratio: number | null): {
  outcome: ChanakyaGstComparisonOutcome;
  status: "CORROBORATED" | "BROADLY_CONSISTENT" | "VARIANCE_IDENTIFIED" | "NOT_RECONCILABLE";
} {
  if (ratio == null || !Number.isFinite(ratio)) {
    return { outcome: "NOT_COMPARABLE", status: "NOT_RECONCILABLE" };
  }
  if (ratio >= 0.98) return { outcome: "MATCH", status: "CORROBORATED" };
  if (ratio >= 0.85) return { outcome: "MATCH", status: "BROADLY_CONSISTENT" };
  return { outcome: "VARIANCE", status: "VARIANCE_IDENTIFIED" };
}

/** Explicit: never sum monthly GST into annual turnover for reconciliation unless caller proves full FY coverage. */
export function mayAnnualizeMonthlyGstReturns(input: {
  monthlyReturnCount: number;
  requireFullYear?: boolean;
}): boolean {
  const requireFull = input.requireFullYear !== false;
  if (requireFull) return input.monthlyReturnCount >= 12;
  return false;
}
