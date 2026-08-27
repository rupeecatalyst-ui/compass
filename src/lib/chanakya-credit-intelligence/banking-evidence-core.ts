/**
 * CO-CHANAKYA-023 — Banking evidence tier, period completeness, and trend (verify-friendly).
 * Evidence-first · presence alone is not banking intelligence.
 */

import type {
  ChanakyaBankDocumentAvailabilityState,
  ChanakyaBankEvidenceTier,
} from "@/types/chanakya-document-intelligence";
import type {
  ChanakyaCreditBankAccountSummary,
  ChanakyaCreditBankingTrend,
  ChanakyaCreditSectionAvailability,
  ChanakyaCreditTrendDirection,
} from "@/types/chanakya-credit-intelligence";

const PRESENT_STATES = new Set<ChanakyaBankDocumentAvailabilityState>([
  "metadata_only",
  "binary_unavailable",
  "inline_binary",
  "object_store_binary",
  "readable",
  "unreadable",
  "ocr_required",
]);

const CORE_FINANCIAL_KEYS = new Set([
  "opening_balance",
  "closing_balance",
  "total_credits",
  "total_debits",
]);

export function accountHasCoreFinancialFacts(input: {
  openingBalance: string | null;
  closingBalance: string | null;
  totalCredits: string | null;
  totalDebits: string | null;
}): boolean {
  return Boolean(
    input.openingBalance ||
      input.closingBalance ||
      input.totalCredits ||
      input.totalDebits,
  );
}

export function resolveBankEvidenceTier(input: {
  availabilityState: ChanakyaBankDocumentAvailabilityState;
  hasCoreFinancialFacts: boolean;
}): ChanakyaBankEvidenceTier {
  if (
    input.availabilityState === "readable" &&
    input.hasCoreFinancialFacts
  ) {
    return "FINANCIALLY_USEFUL";
  }
  if (input.availabilityState === "readable") return "READABLE";
  if (PRESENT_STATES.has(input.availabilityState)) return "PRESENT";
  return "PRESENT";
}

export function resolveAggregateBankEvidenceTier(
  tiers: ChanakyaBankEvidenceTier[],
): ChanakyaBankEvidenceTier {
  if (tiers.includes("FINANCIALLY_USEFUL")) return "FINANCIALLY_USEFUL";
  if (tiers.includes("READABLE")) return "READABLE";
  if (tiers.includes("PRESENT")) return "PRESENT";
  return "PRESENT";
}

/** Detect explicit partial/incomplete statement periods — do not annualize or infer averages. */
export function assessStatementPeriodCompleteness(input: {
  statementPeriod: string | null;
  sourceText?: string | null;
}): { complete: boolean; reason: string | null } {
  const period = (input.statementPeriod ?? "").trim();
  const text = (input.sourceText ?? "").toLowerCase();

  if (/\b(partial|incomplete|provisional)\b/i.test(period)) {
    return {
      complete: false,
      reason: "Statement period explicitly marked partial or incomplete.",
    };
  }
  if (/\b(partial statement|incomplete period|provisional statement)\b/i.test(text)) {
    return {
      complete: false,
      reason: "Document labels the statement period as partial or incomplete.",
    };
  }

  const range = period.match(
    /([0-3]?\d[\/\-][01]?\d[\/\-]\d{2,4})\s*(?:to|-)\s*([0-3]?\d[\/\-][01]?\d[\/\-]\d{2,4})/i,
  );
  if (range?.[1] && range[2]) {
    const start = parseStatementDate(range[1]);
    const end = parseStatementDate(range[2]);
    if (start && end) {
      const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
      if (days >= 0 && days < 20) {
        return {
          complete: false,
          reason: "Statement period spans fewer than 20 days — treated as incomplete for average-balance inference.",
        };
      }
    }
  }

  return { complete: true, reason: null };
}

function parseStatementDate(raw: string): Date | null {
  const m = raw.match(/^([0-3]?\d)[\/\-]([01]?\d)[\/\-](\d{2,4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]) - 1;
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  const d = new Date(year, month, day);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function mayDeriveAverageBalanceFromOpenClose(input: {
  statementPeriodComplete: boolean;
  openingBalance: string | null;
  closingBalance: string | null;
  statedAverage: string | null;
}): boolean {
  if (input.statedAverage) return true;
  if (!input.statementPeriodComplete) return false;
  return Boolean(input.openingBalance && input.closingBalance);
}

export function buildBankingTrendFromAccounts(
  accounts: ChanakyaCreditBankAccountSummary[],
): ChanakyaCreditBankingTrend {
  const useful = accounts.filter(
    (a) =>
      a.evidenceTier === "FINANCIALLY_USEFUL" &&
      a.statementPeriodComplete &&
      a.closingBalance,
  );

  if (useful.length < 2) {
    return {
      availability: "NOT_AVAILABLE",
      direction: "NOT_AVAILABLE",
      observations: [],
    };
  }

  const sorted = [...useful].sort((a, b) =>
    (a.statementPeriod ?? "").localeCompare(b.statementPeriod ?? ""),
  );

  const observations: string[] = [];
  let direction: ChanakyaCreditTrendDirection = "NOT_AVAILABLE";

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = parseBankAmount(sorted[i - 1]!.closingBalance);
    const curr = parseBankAmount(sorted[i]!.closingBalance);
    if (prev == null || curr == null) continue;
    const delta = curr - prev;
    if (Math.abs(delta) < 1) {
      observations.push(
        `Closing balance broadly unchanged between ${sorted[i - 1]!.statementPeriod} and ${sorted[i]!.statementPeriod}.`,
      );
      direction = "FLAT";
    } else if (delta > 0) {
      observations.push(
        `Closing balance increased from ${sorted[i - 1]!.closingBalance} (${sorted[i - 1]!.statementPeriod}) to ${sorted[i]!.closingBalance} (${sorted[i]!.statementPeriod}).`,
      );
      direction = direction === "DOWN" ? "NOT_AVAILABLE" : "UP";
    } else {
      observations.push(
        `Closing balance decreased from ${sorted[i - 1]!.closingBalance} (${sorted[i - 1]!.statementPeriod}) to ${sorted[i]!.closingBalance} (${sorted[i]!.statementPeriod}).`,
      );
      direction = direction === "UP" ? "NOT_AVAILABLE" : "DOWN";
    }
  }

  const creditAccounts = useful.filter((a) => a.totalCredits);
  if (creditAccounts.length >= 2) {
    const first = parseBankAmount(creditAccounts[0]!.totalCredits);
    const last = parseBankAmount(creditAccounts[creditAccounts.length - 1]!.totalCredits);
    if (first != null && last != null && first > 0) {
      const ratio = last / first;
      if (ratio >= 1.15) {
        observations.push(
          "Total credits increased across consecutive readable statement periods.",
        );
      } else if (ratio <= 0.85) {
        observations.push(
          "Total credits decreased across consecutive readable statement periods.",
        );
      }
    }
  }

  return {
    availability: observations.length ? "AVAILABLE" : "NOT_AVAILABLE",
    direction,
    observations,
  };
}

function parseBankAmount(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value.replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function isFinanciallyUsefulBankAccount(
  account: Pick<
    ChanakyaCreditBankAccountSummary,
    "evidenceTier" | "openingBalance" | "closingBalance" | "totalCredits" | "totalDebits"
  >,
): boolean {
  return (
    account.evidenceTier === "FINANCIALLY_USEFUL" &&
    accountHasCoreFinancialFacts(account)
  );
}

export function bankingTierAllowsAnalysis(
  tier: ChanakyaBankEvidenceTier,
): boolean {
  return tier === "FINANCIALLY_USEFUL";
}

export function sectionAvailabilityFromTier(
  tier: ChanakyaBankEvidenceTier,
): ChanakyaCreditSectionAvailability {
  if (tier === "FINANCIALLY_USEFUL") return "AVAILABLE";
  if (tier === "READABLE") return "PARTIAL";
  return "NOT_AVAILABLE";
}

export { CORE_FINANCIAL_KEYS };
