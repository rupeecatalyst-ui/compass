/**
 * CO-CHANAKYA-027 — Lender-facing financial presentation (verify-friendly).
 * Separates clean lender display from internal traceability metadata.
 */

import type {
  ChanakyaCreditFinancialFact,
  ChanakyaCreditIntelligenceContext,
} from "@/types/chanakya-credit-intelligence";
import { formatINRCompact } from "@/lib/format-currency";

export type LenderFinancialFactTrace = {
  field: string;
  label: string;
  value: string;
  period: string | null;
  unit: string | null;
  confidence: string;
  documentId: string;
  documentName: string;
  extractionMethod: string;
  section: string | null;
};

export function isReliableFinancialFact(f: ChanakyaCreditFinancialFact): boolean {
  const conf = f.provenance.confidence?.toLowerCase() ?? "";
  return conf !== "ambiguous" && conf !== "low";
}

export function formatFinancialUnitLabel(unit: string | null | undefined): string {
  if (!unit?.trim()) return "";
  const u = unit.trim().toLowerCase();
  if (u === "thousands" || u === "000" || u.includes("thousand")) return "thousand";
  if (u === "lakhs" || u === "lakh") return "lakh";
  if (u === "crore" || u === "cr") return "crore";
  if (u === "inr") return "INR";
  return unit.trim();
}

/** Lender-facing amount line — e.g. ₹114,630 thousand */
export function formatFinancialAmountForLender(f: ChanakyaCreditFinancialFact): string {
  const unitLabel = formatFinancialUnitLabel(f.unit);
  const raw = String(f.value).trim();

  if (raw && /,/.test(raw)) {
    return unitLabel ? `₹${raw} ${unitLabel}` : `₹${raw}`;
  }

  const numeric = Number(raw.replace(/,/g, ""));
  if (Number.isFinite(numeric) && numeric >= 1_00_00_000 && !unitLabel) {
    return formatINRCompact(numeric);
  }
  const formattedValue = Number.isFinite(numeric)
    ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(numeric)
    : raw;
  return unitLabel ? `₹${formattedValue} ${unitLabel}` : `₹${formattedValue}`;
}

export function buildFinancialFactTrace(f: ChanakyaCreditFinancialFact): LenderFinancialFactTrace {
  return {
    field: f.field,
    label: f.label,
    value: f.value,
    period: f.financialYear,
    unit: f.unit,
    confidence: f.provenance.confidence ?? "unknown",
    documentId: f.provenance.documentId,
    documentName: f.provenance.documentName,
    extractionMethod: f.provenance.extractionMethod ?? "unknown",
    section: f.section ?? null,
  };
}

export function collectVerifiedFinancialTraces(
  ci: ChanakyaCreditIntelligenceContext,
): LenderFinancialFactTrace[] {
  return ci.financialProfile.allFacts.filter(isReliableFinancialFact).map(buildFinancialFactTrace);
}

const TABLE_PRIORITY_FIELDS = [
  "total_assets",
  "revenue",
  "total_income",
  "pat",
  "net_profit",
  "ebitda",
  "depreciation",
  "net_worth",
  "borrowings",
  "current_assets",
  "current_liabilities",
  "finance_cost",
] as const;

function findFactForYear(
  facts: ChanakyaCreditFinancialFact[],
  field: string,
  year: string,
): ChanakyaCreditFinancialFact | null {
  return (
    facts.find((f) => f.field === field && (f.financialYear === year || !f.financialYear)) ?? null
  );
}

/**
 * Markdown table for lender memo — no extraction-method clutter in cells.
 */
export function buildFinancialStatementTable(ci: ChanakyaCreditIntelligenceContext): string[] {
  const years = ci.financialProfile.years;
  if (!years.length) return [];

  const lines: string[] = [
    "**Verified financial statement figures**",
    "",
    `| Line item | ${years.map((y) => y).join(" | ")} |`,
    `| --- | ${years.map(() => "---:").join(" | ")} |`,
  ];

  const fieldSet = new Set<string>();
  for (const field of TABLE_PRIORITY_FIELDS) fieldSet.add(field);
  for (const year of years) {
    for (const f of ci.financialProfile.factsByYear[year] ?? []) {
      if (isReliableFinancialFact(f)) fieldSet.add(f.field);
    }
  }

  const orderedFields = [
    ...TABLE_PRIORITY_FIELDS.filter((f) => fieldSet.has(f)),
    ...[...fieldSet].filter((f) => !(TABLE_PRIORITY_FIELDS as readonly string[]).includes(f)),
  ];

  for (const field of orderedFields) {
    const label =
      ci.financialProfile.factsByYear[years[0]!]?.find((f) => f.field === field)?.label ??
      field.replace(/_/g, " ");
    const cells = years.map((year) => {
      const facts = (ci.financialProfile.factsByYear[year] ?? []).filter(isReliableFinancialFact);
      const fact = findFactForYear(facts, field, year);
      return fact ? formatFinancialAmountForLender(fact) : "—";
    });
    if (cells.every((c) => c === "—")) continue;
    lines.push(`| ${label} | ${cells.join(" | ")} |`);
  }

  lines.push("");
  return lines;
}

export function buildFinancialNarrativeObservations(ci: ChanakyaCreditIntelligenceContext): string[] {
  const out: string[] = [];
  for (const m of ci.financialTrends.metrics) {
    if (!m.available || m.trendStatus !== "AVAILABLE" || !m.interpretation?.trim()) continue;
    out.push(`- **${m.label}:** ${m.interpretation.trim()}`);
  }
  return out;
}
