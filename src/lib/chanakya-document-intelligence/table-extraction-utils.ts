/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-012 — Shared table extraction utilities.
 * Evidence-first hierarchy helpers — never infer unit from magnitude.
 */

import type { ChanakyaDocumentProvenance } from "@/types/chanakya-document-intelligence";

export type TableUnitScale =
  | "rupees"
  | "thousands"
  | "lakhs"
  | "crores"
  | "unknown";

export type DocumentSection =
  | "Balance Sheet"
  | "Balance Sheet Notes"
  | "P&L"
  | "GST"
  | "Other";

export type TableConfidence = "high" | "medium" | "low" | "ambiguous";

export function normalizeLines(text: string): string[] {
  return text
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Detect stated unit/scale from document header — returns unknown when not proven. Never infer from magnitude. */
export function detectUnitScale(text: string): TableUnitScale {
  const head = text.slice(0, 2500).toLowerCase();
  if (
    /\(?\s*(?:rs\.?|₹|inr|amount)\s*in\s*['']?000\s*\)?/.test(head) ||
    /in\s*['']?000/.test(head) ||
    /\(rs\s*in'?000\)/.test(head) ||
    /\brs\.?\s*['']?000\b/.test(head)
  ) {
    return "thousands";
  }
  if (/(?:rs\.?|₹|inr|amount)\s*in\s*(?:lakhs?|lacs?)/.test(head)) return "lakhs";
  if (/(?:rs\.?|₹|inr|amount)\s*in\s*(?:crores?|crs?)/.test(head)) return "crores";
  if (/\(amount in ₹ for all tables\)/i.test(head)) return "rupees";
  if (/\b(?:in\s+)?thousands\b/.test(head) && /(?:rs|₹|inr)/.test(head)) return "thousands";
  // Explicit rupee-only headers (no scale) — still proven currency, scale = rupees.
  if (
    /\(?\s*(?:amount|figures)\s*(?:are\s*)?(?:in\s*)?(?:₹|rs\.?|inr)\s*\)?/.test(head) &&
    !/in\s*(?:['']?000|lakhs?|lacs?|crores?)/.test(head)
  ) {
    return "rupees";
  }
  return "unknown";
}

/**
 * When a BS/P&L row includes a Note column, the first 1–2 digit token is often a note index.
 * Prefer subsequent amount-like tokens (comma-grouped or ≥3 digits) as financial values.
 */
export function selectAmountTokensSkippingNoteIndex(tokens: string[]): {
  value: string | null;
  comparativeValue: string | null;
  skippedNoteIndex: string | null;
} {
  if (!tokens.length) {
    return { value: null, comparativeValue: null, skippedNoteIndex: null };
  }
  let skippedNoteIndex: string | null = null;
  let start = 0;
  const firstDigits = tokens[0]!.replace(/[^\d]/g, "");
  const looksLikeNote =
    /^\d{1,2}$/.test(firstDigits) &&
    tokens.length >= 2 &&
    tokens.slice(1).some((t) => {
      const d = t.replace(/[^\d]/g, "");
      return d.length >= 3 || /,/.test(t);
    });
  if (looksLikeNote) {
    skippedNoteIndex = tokens[0]!;
    start = 1;
  }
  const amounts = tokens.slice(start);
  return {
    value: amounts[0] ?? null,
    comparativeValue: amounts[1] ?? null,
    skippedNoteIndex,
  };
}

/** Map 31 March YYYY balance-sheet date to Indian financial year label. */
export function mapMarchYearEndToFinancialYear(year: number): string {
  const start = year - 1;
  const endShort = String(year).slice(-2);
  return `FY${start}-${endShort}`;
}

export interface YearColumn {
  label: string;
  financialYear: string;
  columnIndex: number;
}

/** Detect comparative year columns from BS/P&L headers. */
export function detectYearColumns(text: string): YearColumn[] {
  const head = text.slice(0, 4000);
  const columns: YearColumn[] = [];
  const patterns = [
    /31\s*March\s*(20\d{2})/gi,
    /as\s*(?:at|on)\s*31\s*March\s*(20\d{2})/gi,
    /year\s*ended\s*31\s*March\s*(20\d{2})/gi,
    /\bFY\s*(20\d{2})\s*[-–\/]\s*(20\d{2})\b/gi,
  ];

  for (const pattern of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(head)) !== null) {
      if (m[2]) {
        columns.push({
          label: `FY${m[1]}-${m[2].slice(-2)}`,
          financialYear: `FY${m[1]}-${m[2].slice(-2)}`,
          columnIndex: columns.length,
        });
      } else if (m[1]) {
        const yr = Number(m[1]);
        const fy = mapMarchYearEndToFinancialYear(yr);
        if (!columns.some((c) => c.financialYear === fy)) {
          columns.push({
            label: `31 March ${yr}`,
            financialYear: fy,
            columnIndex: columns.length,
          });
        }
      }
    }
  }

  // Dedupe by financialYear preserving order
  const seen = new Set<string>();
  return columns.filter((c) => {
    if (seen.has(c.financialYear)) return false;
    seen.add(c.financialYear);
    return true;
  });
}

const NUMERIC_TOKEN =
  /^\(?-?\d{1,3}(?:,\d{2,3})*(?:\.\d+)?\)?$|^\(?-?\d+(?:\.\d+)?\)?$/;

export function isNumericToken(token: string): boolean {
  const t = token.replace(/\s/g, "").trim();
  if (!t || t.length > 20) return false;
  return NUMERIC_TOKEN.test(t);
}

export function parseNumericTokens(line: string): string[] {
  return line
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => isNumericToken(t));
}

/** Table column header — not a data row. */
export function isTableColumnHeaderLine(line: string): boolean {
  const t = line.trim().toLowerCase();
  if (/^particulars\b/.test(t) && /\bnote\b/.test(t)) return true;
  if (/^particulars\b/.test(t) && /\b31\s*march\b/.test(t)) return true;
  if (/^note\b/.test(t) && /\b31\s*march\b/.test(t)) return true;
  return false;
}

/** Note index line — e.g. "13" or "13 Trade receivables" without amounts on same line. */
export function isNoteReferenceLine(line: string): boolean {
  const t = line.trim();
  if (/^\d{1,2}$/.test(t)) return true;
  const m = t.match(/^(\d{1,2})\s+([A-Za-z].+)$/);
  if (!m) return false;
  const nums = parseNumericTokens(t);
  // Label with note prefix but no financial amounts on the line
  return nums.length === 0 || (nums.length === 1 && nums[0] === m[1]);
}

export function isMostlyNumericBlockLine(line: string): boolean {
  const tokens = line.split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  const numeric = tokens.filter((t) => isNumericToken(t)).length;
  return numeric >= 1 && numeric / tokens.length >= 0.6;
}

export function looksLikeBalanceSheetHeader(text: string): boolean {
  return (
    /balance\s*sheet|statement of financial position/i.test(text) ||
    /ba[lf1][ae]?n[ce]*\s*s[he]{2}t/i.test(text) ||
    /bafance\s*sheet/i.test(text)
  );
}

export function looksLikeProfitAndLossHeader(text: string): boolean {
  return /statement of profit|profit\s*(and|&)\s*loss|profit and loss account/i.test(
    text,
  );
}

export function looksLikeNotesHeader(text: string): boolean {
  return /notes forming part|notes to (?:the )?financial statements|schedule forming part/i.test(
    text,
  );
}

export function splitDocumentSections(text: string): Record<DocumentSection, string> {
  const lower = text.toLowerCase();
  const pnlIdx = lower.search(
    /statement of profit(?:\s*and\s*loss|\s*&\s*loss)|profit and loss account/,
  );
  const notesIdx = lower.search(
    /notes forming part|notes to (?:the )?financial statements|schedule forming part/,
  );
  let bsIdx = lower.search(/balance sheet|statement of financial position/);
  if (bsIdx < 0) {
    bsIdx = text.search(/ba[lf1][ae]?n[ce]*\s*s[he]{2}t|bafance\s*sheet/i);
  }

  const sections: Record<DocumentSection, string> = {
    "Balance Sheet": "",
    "Balance Sheet Notes": "",
    "P&L": "",
    GST: "",
    Other: text,
  };

  if (bsIdx >= 0) {
    const bsEnd =
      pnlIdx > bsIdx ? pnlIdx : notesIdx > bsIdx ? notesIdx : text.length;
    sections["Balance Sheet"] = text.slice(bsIdx, bsEnd);
  } else if (pnlIdx > 0) {
    // OCR missed BS header — treat content before P&L as balance sheet body.
    sections["Balance Sheet"] = text.slice(0, pnlIdx);
  }
  if (pnlIdx >= 0) {
    const pnlEnd = notesIdx > pnlIdx ? notesIdx : text.length;
    sections["P&L"] = text.slice(pnlIdx, pnlEnd);
  }
  if (notesIdx >= 0) {
    sections["Balance Sheet Notes"] = text.slice(notesIdx);
  }

  return sections;
}

export function normalizeLabel(line: string): string {
  return line
    .toLowerCase()
    .replace(/^\d{1,2}\s+/, "")
    .replace(/[^\w\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function labelMatches(normalized: string, aliases: string[]): boolean {
  return aliases.some(
    (a) => normalized === a || normalized.startsWith(`${a} `) || normalized.includes(a),
  );
}

export function unitScaleToFactUnit(scale: TableUnitScale): string | null {
  switch (scale) {
    case "thousands":
      return "thousands";
    case "lakhs":
      return "lakh";
    case "crores":
      return "crore";
    case "rupees":
      return "inr";
    default:
      return null;
  }
}

export function mapTableConfidenceToProvenance(
  confidence: TableConfidence,
): ChanakyaDocumentProvenance["confidence"] {
  return confidence;
}

export function shouldRejectAsNoteOrRowIndex(
  key: string,
  value: string,
  line: string,
): string | null {
  const digitsOnly = value.replace(/[^\d]/g, "");
  if (/^\d{1,2}$/.test(digitsOnly) && digitsOnly.length <= 2) {
    return "Rejected — value matches note/row index, not a financial amount";
  }
  const noteOnLabel = line.trim().match(/^(\d{1,2})\s+/);
  if (noteOnLabel && digitsOnly === noteOnLabel[1]) {
    return "Rejected — value matches note index on label line";
  }
  if (isNoteReferenceLine(line) && !/\d{3,}/.test(value.replace(/[^\d]/g, ""))) {
    return "Rejected — line is a note reference without proven amount";
  }
  const amountKeys = new Set([
    "trade_receivables",
    "inventory",
    "total_assets",
    "revenue",
    "depreciation",
  ]);
  if (amountKeys.has(key)) {
    const num = Number(value.replace(/,/g, ""));
    if (Number.isFinite(num) && num > 0 && num < 100 && !/,/.test(value)) {
      return "Rejected — implausible magnitude without unit proof for material line item";
    }
  }
  return null;
}

/** Map GST calendar month + year label (e.g. 2025-26, February) to financial year. */
export function mapGstPeriodToFinancialYear(yearLabel: string, month: string): string | null {
  const ym = yearLabel.match(/(20\d{2})\s*[-–]\s*(20\d{2}|\d{2})/);
  if (!ym) return null;
  const startYear = Number(ym[1]);
  const monthNorm = month.toLowerCase().slice(0, 3);
  const monthOrder: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };
  const m = monthOrder[monthNorm];
  if (!m) return `FY${startYear}-${String(startYear + 1).slice(-2)}`;
  // Indian FY: Apr–Mar. Year label 2025-26 → FY2025-26
  if (m >= 4) return `FY${startYear}-${String(startYear + 1).slice(-2)}`;
  return `FY${startYear - 1}-${String(startYear).slice(-2)}`;
}

export function formatGstReturnPeriod(yearLabel: string, month: string): string {
  return `${month.trim()} ${yearLabel.trim()}`;
}
