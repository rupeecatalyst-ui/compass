/**
 * CO-CHANAKYA-CREDIT-CERTIFICATION-019F — Financial fact quality gates.
 * Promotes only reliable table-extracted facts into credit intelligence / proposals.
 */

import type { ChanakyaDocumentExtractedFact } from "@/types/chanakya-document-intelligence";
import type {
  ChanakyaCreditFinancialFactQuality,
  ChanakyaCreditFinancialFactQualityItem,
  ChanakyaCreditSectionAvailability,
} from "@/types/chanakya-credit-intelligence";
import { classifyFinancialTokenDisposition } from "@/lib/chanakya-document-intelligence/extract-financial-tables";
import type { DocumentSection } from "@/lib/chanakya-document-intelligence/table-extraction-utils";

const FINANCIAL_KEYS = new Set([
  "revenue",
  "gross_profit",
  "ebitda",
  "depreciation",
  "ebit",
  "interest",
  "pbt",
  "tax",
  "pat",
  "other_income",
  "share_capital",
  "reserves",
  "net_worth",
  "borrowings",
  "trade_payables",
  "trade_receivables",
  "inventory",
  "cash_bank",
  "total_assets",
  "total_liabilities",
  "current_assets",
  "current_liabilities",
  "fixed_assets",
  "accumulated_depreciation_note",
]);

const NOTE_ARTIFACT_KEYS = new Set(["trade_receivables", "inventory"]);

/** High/medium confidence only — used for financial profile and lender-facing intelligence. */
export function isReliableForFinancialIntelligence(
  f: ChanakyaDocumentExtractedFact,
): boolean {
  const conf = f.provenance.confidence?.toLowerCase() ?? "";
  if (conf !== "high" && conf !== "medium") return false;
  if (f.lenderFacingEligible === false) return false;
  if (f.key === "depreciation" && f.provenance.sectionOrTable !== "P&L") return false;
  if (f.key === "accumulated_depreciation_note") return false;
  return true;
}

/** Trend/ratio math — confidence + section gates; does not require lenderFacingEligible (012 contract). */
export function isReliableForTrendComputation(
  f: ChanakyaDocumentExtractedFact,
): boolean {
  const conf = f.provenance.confidence?.toLowerCase() ?? "";
  if (conf !== "high" && conf !== "medium") return false;
  if (f.key === "depreciation" && f.provenance.sectionOrTable !== "P&L") return false;
  if (f.key === "accumulated_depreciation_note") return false;
  if (
    NOTE_ARTIFACT_KEYS.has(f.key) &&
    /^\d{1,2}$/.test(f.value.replace(/,/g, "").trim())
  ) {
    return false;
  }
  return true;
}

function sectionAvailability(count: number): ChanakyaCreditSectionAvailability {
  if (count === 0) return "NOT_AVAILABLE";
  return "AVAILABLE";
}

function detectRejectedPattern(
  f: ChanakyaDocumentExtractedFact,
): string | null {
  if (!FINANCIAL_KEYS.has(f.key)) return null;
  const section = (f.provenance.sectionOrTable ?? "Other") as DocumentSection;
  const disposition = classifyFinancialTokenDisposition({
    key: f.key,
    value: f.value,
    line: `${f.label} ${f.value}`,
    section,
    unitScale:
      f.unit === "thousands"
        ? "thousands"
        : f.unit === "lakh"
          ? "lakhs"
          : f.unit === "crore"
            ? "crores"
            : f.unit === "inr"
              ? "rupees"
              : "unknown",
    hasYearAssociation: Boolean(f.periodLabel),
  });
  if (disposition === "rejected") {
    return `Rejected by table quality gate (${f.key}=${f.value})`;
  }
  if (
    NOTE_ARTIFACT_KEYS.has(f.key) &&
    /^\d{1,2}$/.test(f.value.replace(/,/g, "").trim())
  ) {
    return "Rejected — note/row index artefact (e.g. 13) not promoted as amount";
  }
  return null;
}

export function buildFinancialFactQuality(
  facts: ChanakyaDocumentExtractedFact[],
): ChanakyaCreditFinancialFactQuality {
  const items: ChanakyaCreditFinancialFactQualityItem[] = [];
  const limitations: string[] = [];

  for (const f of facts) {
    if (!FINANCIAL_KEYS.has(f.key)) continue;

    const base = {
      metric: f.key,
      value: f.value,
      period: f.periodLabel ?? null,
      unit: f.unit ?? null,
      documentId: f.provenance.documentId,
      documentName: f.provenance.displayName,
      section: f.provenance.sectionOrTable,
      extractionMethod: f.provenance.extractionMethod,
      confidence: f.provenance.confidence,
      reason: null as string | null,
    };

    const rejectedReason = detectRejectedPattern(f);
    if (rejectedReason) {
      items.push({ ...base, disposition: "rejected_pattern", reason: rejectedReason });
      continue;
    }

    if (isReliableForFinancialIntelligence(f)) {
      items.push({ ...base, disposition: "promoted", reason: null });
      continue;
    }

    let reason = "Downgraded — insufficient row/column association or confidence";
    if (f.provenance.confidence === "low" && !f.unit) {
      reason = "Downgraded — unit could not be established from document header";
    } else if (f.provenance.confidence === "ambiguous") {
      reason = "Downgraded — ambiguous row/column association";
    } else if (f.key === "depreciation" && f.provenance.sectionOrTable !== "P&L") {
      reason = "Downgraded — depreciation outside P&L section";
    }
    items.push({ ...base, disposition: "downgraded", reason });
  }

  const promotedCount = items.filter((i) => i.disposition === "promoted").length;
  const downgradedCount = items.filter((i) => i.disposition === "downgraded").length;
  const rejectedCount = items.filter((i) => i.disposition === "rejected_pattern").length;

  if (rejectedCount > 0) {
    limitations.push(
      `${rejectedCount} financial table token(s) rejected as note/row artefacts — not promoted to credit intelligence.`,
    );
  }
  if (downgradedCount > 0) {
    limitations.push(
      `${downgradedCount} financial fact(s) downgraded due to ambiguous association, missing unit, or section mismatch — excluded from trends and lender calculations.`,
    );
  }

  const recvArtifact = items.find(
    (i) =>
      i.metric === "trade_receivables" &&
      i.disposition === "rejected_pattern" &&
      i.value === "13",
  );
  const invArtifact = items.find(
    (i) =>
      i.metric === "inventory" &&
      i.disposition === "rejected_pattern" &&
      i.value === "13",
  );
  if (recvArtifact) {
    limitations.push(
      "Trade Receivables value 13 was treated as a note reference — not used as a financial amount.",
    );
  }
  if (invArtifact) {
    limitations.push(
      "Inventory value 13 was treated as a note reference — not used as a financial amount.",
    );
  }

  return {
    availability: sectionAvailability(promotedCount + downgradedCount + rejectedCount),
    promotedCount,
    downgradedCount,
    rejectedCount,
    items,
    limitations,
  };
}
