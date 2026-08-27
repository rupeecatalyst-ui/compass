/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-012 — GSTR-1 / GSTR-3B evidence-first extraction.
 * GSTIN repetition is identity corroboration only — not separate financial facts.
 */

import type {
  ChanakyaDocumentExtractedFact,
  ChanakyaDocumentProvenance,
} from "@/types/chanakya-document-intelligence";
import {
  formatGstReturnPeriod,
  mapGstPeriodToFinancialYear,
  normalizeLines,
  type TableConfidence,
} from "./table-extraction-utils";

function detectReturnType(text: string): "GSTR-1" | "GSTR-3B" | "GSTR-9" | "UNKNOWN" {
  const t = text.toLowerCase();
  if (/gstr[\s-]*3b/.test(t)) return "GSTR-3B";
  if (/gstr[\s-]*1\b/.test(t)) return "GSTR-1";
  if (/gstr[\s-]*9/.test(t)) return "GSTR-9";
  return "UNKNOWN";
}

function extractGstHeader(text: string): {
  gstin: string | null;
  yearLabel: string | null;
  month: string | null;
  returnType: string;
} {
  const gstinMatch =
    text.match(/GSTIN(?:\s*of\s*the\s*supplier)?\s*[:\s]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9])/i) ||
    text.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9])\b/);
  const yearMatch = text.match(/\bYear\s*(20\d{2}\s*[-–]\s*(?:20\d{2}|\d{2}))/i);
  const monthMatch = text.match(/\bPeriod\s*([A-Za-z]+)/i);
  return {
    gstin: gstinMatch?.[1]?.toUpperCase() ?? null,
    yearLabel: yearMatch?.[1]?.replace(/\s+/g, "") ?? null,
    month: monthMatch?.[1] ?? null,
    returnType: detectReturnType(text),
  };
}

function extractOutwardTaxableValue(text: string): {
  value: string | null;
  confidence: TableConfidence;
  sourceLine: string | null;
} {
  const lines = normalizeLines(text);
  const patterns = [
    /outward taxable supplies/i,
    /total taxable value/i,
    /taxable turnover/i,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!patterns.some((p) => p.test(line))) continue;

    // Value may be on same line after label — require amount > 1000 to avoid partial tokens
    const sameLineMatch = line.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/g);
    if (sameLineMatch?.length) {
      const candidate = sameLineMatch.find((n) => Number(n.replace(/,/g, "")) > 1000);
      if (candidate) {
        return { value: candidate, confidence: "medium", sourceLine: line };
      }
    }

    // Value on next 1–3 lines (GSTR-3B table layout)
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const next = lines[j]!;
      if (/outward taxable|integrated tax|central tax/i.test(next) && j > i + 1) break;
      const m = next.match(/^(\d+(?:,\d{3})*(?:\.\d+)?)/);
      if (m?.[1] && Number(m[1].replace(/,/g, "")) > 100) {
        return {
          value: m[1],
          confidence: "high",
          sourceLine: next,
        };
      }
    }
  }

  return { value: null, confidence: "ambiguous", sourceLine: null };
}

function extractTaxLiability(text: string): string | null {
  const m = text.match(
    /(?:total tax liability|tax payable)[^\d]{0,40}(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/i,
  );
  return m?.[1] ?? null;
}

/**
 * Extract GST return facts from readable GSTR text.
 * Emits at most one GSTIN identity fact per document; turnover requires labelled value.
 */
export function extractGstReturnFacts(input: {
  text: string;
  provenance: Omit<
    ChanakyaDocumentProvenance,
    "sectionOrTable" | "extractionMethod" | "confidence" | "page"
  > &
    Partial<Pick<ChanakyaDocumentProvenance, "extractionMethod" | "confidence">>;
}): ChanakyaDocumentExtractedFact[] {
  const text = input.text?.trim();
  if (!text || text.length < 30) return [];

  const lower = text.toLowerCase();
  if (!/\bgst\b|\bgstr\b|goods and services tax/.test(lower)) return [];

  const header = extractGstHeader(text);
  const turnover = extractOutwardTaxableValue(text);
  const taxLiability = extractTaxLiability(text);
  const facts: ChanakyaDocumentExtractedFact[] = [];
  const base = input.provenance;

  if (header.gstin) {
    facts.push({
      id: `${base.documentId}:gstin`,
      key: "gstin",
      label: "GSTIN",
      value: header.gstin,
      unit: null,
      periodLabel: header.yearLabel && header.month
        ? formatGstReturnPeriod(header.yearLabel, header.month)
        : header.yearLabel,
      provenance: {
        ...base,
        page: null,
        sectionOrTable: "GST",
        extractionMethod: "table_extraction",
        confidence: "high",
      },
      lenderFacingEligible: false,
    });
  }

  if (header.yearLabel && header.month) {
    const period = formatGstReturnPeriod(header.yearLabel, header.month);
    const fy = mapGstPeriodToFinancialYear(header.yearLabel, header.month);
    facts.push({
      id: `${base.documentId}:gst_period`,
      key: "gst_period",
      label: "GST Filing Period",
      value: period,
      unit: null,
      periodLabel: fy,
      provenance: {
        ...base,
        page: null,
        sectionOrTable: "GST",
        extractionMethod: "table_extraction",
        confidence: "high",
      },
      lenderFacingEligible: true,
    });

    if (header.returnType !== "UNKNOWN") {
      facts.push({
        id: `${base.documentId}:gst_return_type`,
        key: "gst_return_type",
        label: "GST Return Type",
        value: header.returnType,
        unit: null,
        periodLabel: period,
        provenance: {
          ...base,
          page: null,
          sectionOrTable: `GST / ${header.returnType}`,
          extractionMethod: "table_extraction",
          confidence: "high",
        },
        lenderFacingEligible: true,
      });
    }
  }

  if (turnover.value && turnover.confidence !== "ambiguous") {
    const returnPeriodLabel =
      header.yearLabel && header.month
        ? formatGstReturnPeriod(header.yearLabel, header.month)
        : null;
    const fy =
      header.yearLabel && header.month
        ? mapGstPeriodToFinancialYear(header.yearLabel, header.month)
        : null;
    facts.push({
      id: `${base.documentId}:gst_taxable_turnover`,
      key: "gst_taxable_turnover",
      label: "GST Taxable Value / Turnover",
      value: turnover.value,
      unit: "inr",
      // Period label retains filing month/year for traceability — not annualized.
      periodLabel: returnPeriodLabel ?? fy,
      provenance: {
        ...base,
        page: null,
        sectionOrTable:
          header.returnType !== "UNKNOWN" ? `GST / ${header.returnType}` : "GST",
        extractionMethod: "table_extraction",
        confidence: turnover.confidence,
      },
      lenderFacingEligible: turnover.confidence === "high" || turnover.confidence === "medium",
    });
  }

  if (taxLiability) {
    const returnPeriodLabel =
      header.yearLabel && header.month
        ? formatGstReturnPeriod(header.yearLabel, header.month)
        : null;
    facts.push({
      id: `${base.documentId}:gst_tax_liability`,
      key: "gst_tax_liability",
      label: "GST Tax Liability",
      value: taxLiability,
      unit: "inr",
      periodLabel: returnPeriodLabel,
      provenance: {
        ...base,
        page: null,
        sectionOrTable:
          header.returnType !== "UNKNOWN" ? `GST / ${header.returnType}` : "GST",
        extractionMethod: "table_extraction",
        confidence: "medium",
      },
      lenderFacingEligible: true,
    });
  }

  return facts;
}

/** Count GSTIN occurrences — for tests proving repetition is not multiplied financial evidence. */
export function countGstinOccurrences(text: string): number {
  const matches = text.match(
    /\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/gi,
  );
  return matches?.length ?? 0;
}
