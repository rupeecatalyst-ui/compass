/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-012 — Evidence-first financial table extraction.
 * PDF text → section → row → column/year → unit → value → confidence → provenance.
 */

import type {
  ChanakyaDocumentExtractedFact,
  ChanakyaDocumentProvenance,
} from "@/types/chanakya-document-intelligence";
import {
  detectUnitScale,
  detectYearColumns,
  isMostlyNumericBlockLine,
  isNoteReferenceLine,
  isTableColumnHeaderLine,
  labelMatches,
  mapMarchYearEndToFinancialYear,
  normalizeLabel,
  normalizeLines,
  parseNumericTokens,
  selectAmountTokensSkippingNoteIndex,
  shouldRejectAsNoteOrRowIndex,
  splitDocumentSections,
  type DocumentSection,
  type TableConfidence,
  type TableUnitScale,
  unitScaleToFactUnit,
} from "./table-extraction-utils";

type RowDef = {
  key: string;
  label: string;
  aliases: string[];
  allowedSections: DocumentSection[];
};

const BS_ROW_DEFS: RowDef[] = [
  {
    key: "share_capital",
    label: "Share Capital",
    aliases: ["share capital", "equity share capital"],
    allowedSections: ["Balance Sheet", "Balance Sheet Notes"],
  },
  {
    key: "reserves",
    label: "Reserves & Surplus",
    aliases: ["reserves and surplus", "reserves surplus", "reserves anci surplus"],
    allowedSections: ["Balance Sheet"],
  },
  {
    key: "net_worth",
    label: "Net Worth",
    aliases: [
      "net worth",
      "shareholders funds",
      "shareholders' funds",
      "total equity",
    ],
    allowedSections: ["Balance Sheet"],
  },
  {
    key: "borrowings",
    label: "Borrowings",
    aliases: [
      "long term borrowings",
      "long-term borrowings",
      "short term borrowings",
      "short-term borrowings",
      "total borrowings",
      "borrowings",
    ],
    allowedSections: ["Balance Sheet"],
  },
  {
    key: "trade_payables",
    label: "Trade Payables",
    aliases: ["trade payables", "trade payable"],
    allowedSections: ["Balance Sheet"],
  },
  {
    key: "trade_receivables",
    label: "Trade Receivables",
    aliases: ["trade receivables", "sundry debtors"],
    allowedSections: ["Balance Sheet"],
  },
  {
    key: "inventory",
    label: "Inventory",
    aliases: ["inventories", "inventory", "stock in trade"],
    allowedSections: ["Balance Sheet"],
  },
  {
    key: "cash_bank",
    label: "Cash / Bank",
    aliases: [
      "cash and cash equivalents",
      "cash and bank balances",
      "cash and bank",
      "bank balances",
    ],
    allowedSections: ["Balance Sheet"],
  },
  {
    key: "total_assets",
    label: "Total Assets",
    aliases: ["total assets"],
    allowedSections: ["Balance Sheet"],
  },
  {
    key: "total_liabilities",
    label: "Total Liabilities",
    aliases: ["total equity and liabilities", "total liabilities"],
    allowedSections: ["Balance Sheet"],
  },
  {
    key: "current_assets",
    label: "Current Assets",
    aliases: ["total current assets", "current assets"],
    allowedSections: ["Balance Sheet"],
  },
  {
    key: "current_liabilities",
    label: "Current Liabilities",
    aliases: ["total current liabilities", "current liabilities"],
    allowedSections: ["Balance Sheet"],
  },
  {
    key: "fixed_assets",
    label: "Fixed Assets",
    aliases: ["property plant and equipment", "fixed assets"],
    allowedSections: ["Balance Sheet"],
  },
];

const PNL_ROW_DEFS: RowDef[] = [
  {
    key: "revenue",
    label: "Revenue / Turnover",
    aliases: ["revenue from operations", "total revenue", "turnover", "net sales"],
    allowedSections: ["P&L"],
  },
  {
    key: "other_income",
    label: "Other Income",
    aliases: ["other income"],
    allowedSections: ["P&L"],
  },
  {
    key: "gross_profit",
    label: "Gross Profit",
    aliases: ["gross profit"],
    allowedSections: ["P&L"],
  },
  {
    key: "ebitda",
    label: "EBITDA",
    aliases: ["ebitda"],
    allowedSections: ["P&L"],
  },
  {
    key: "depreciation",
    label: "Depreciation",
    aliases: [
      "depreciation and amortization expenses",
      "depreciation and amortisation expenses",
      "depreciation amortization",
    ],
    allowedSections: ["P&L"],
  },
  {
    key: "ebit",
    label: "EBIT",
    aliases: ["ebit", "operating profit", "profit from operations"],
    allowedSections: ["P&L"],
  },
  {
    key: "interest",
    label: "Finance Cost",
    aliases: [
      "finance costs",
      "finance cost",
      "interest expense",
      "interest and finance charges",
    ],
    allowedSections: ["P&L"],
  },
  {
    key: "pat",
    label: "PAT / Net Profit",
    aliases: [
      "profit loss after tax",
      "profit after tax",
      "profit /(loss) after tax",
      "net profit",
      "profit for the year",
      "profit for the period",
    ],
    allowedSections: ["P&L"],
  },
  {
    key: "pbt",
    label: "PBT",
    aliases: ["profit before tax", "profit loss before tax"],
    allowedSections: ["P&L"],
  },
];

/** Accumulated depreciation in notes — never promoted to P&L. */
const BS_NOTE_ROW_DEFS: RowDef[] = [
  {
    key: "accumulated_depreciation_note",
    label: "Accumulated Depreciation (Note)",
    aliases: ["depreciation"],
    allowedSections: ["Balance Sheet Notes"],
  },
];

type ExtractedRow = {
  def: RowDef;
  value: string;
  comparativeValue?: string | null;
  financialYear: string | null;
  comparativeYear?: string | null;
  section: DocumentSection;
  confidence: TableConfidence;
  sourceLine: string;
  extractionStage: string;
};

const materialKeysWithoutUnitProof = new Set([
  "total_assets",
  "revenue",
  "pat",
  "trade_receivables",
  "inventory",
  "borrowings",
  "net_worth",
]);

function confidenceFromContext(input: {
  inline: boolean;
  unitScale: TableUnitScale;
  financialYear: string | null;
  rejected: boolean;
  key: string;
}): TableConfidence {
  if (input.rejected) return "ambiguous";
  if (input.unitScale === "unknown" && materialKeysWithoutUnitProof.has(input.key)) {
    return input.financialYear ? "low" : "ambiguous";
  }
  if (input.inline && input.financialYear && input.unitScale !== "unknown") return "high";
  if (input.inline && input.financialYear) return "medium";
  if (input.financialYear && input.unitScale !== "unknown") return "medium";
  if (!input.financialYear || input.unitScale === "unknown") return "low";
  return "medium";
}

function tryInlineRow(
  line: string,
  defs: RowDef[],
  section: DocumentSection,
  unitScale: TableUnitScale,
  yearColumns: ReturnType<typeof detectYearColumns>,
): ExtractedRow | null {
  if (isNoteReferenceLine(line) || isTableColumnHeaderLine(line)) return null;

  const normalized = normalizeLabel(line);
  const def = defs.find(
    (d) => d.allowedSections.includes(section) && labelMatches(normalized, d.aliases),
  );
  if (!def) return null;

  // Label + optional note index + 1–2 year amount columns on the same line.
  const nums = parseNumericTokens(line);
  if (!nums.length) return null;
  const selected = selectAmountTokensSkippingNoteIndex(nums);
  if (!selected.value) return null;

  const value = selected.value;
  const comparativeValue = selected.comparativeValue;
  const reject = shouldRejectAsNoteOrRowIndex(def.key, value, line);
  if (reject) return null;

  const primaryYear = yearColumns[0]?.financialYear ?? null;
  const comparativeYear = yearColumns[1]?.financialYear ?? null;

  return {
    def,
    value,
    comparativeValue,
    financialYear: primaryYear,
    comparativeYear,
    section,
    confidence: confidenceFromContext({
      inline: true,
      unitScale,
      financialYear: primaryYear,
      rejected: false,
      key: def.key,
    }),
    sourceLine: line,
    extractionStage: selected.skippedNoteIndex
      ? "inline_row_skip_note_index"
      : "inline_row",
  };
}

function tryLabelFollowedByValues(
  lines: string[],
  startIdx: number,
  def: RowDef,
  section: DocumentSection,
  unitScale: TableUnitScale,
  yearColumns: ReturnType<typeof detectYearColumns>,
): ExtractedRow | null {
  const line = lines[startIdx]!;
  if (isNoteReferenceLine(line) || isTableColumnHeaderLine(line)) return null;

  const values: string[] = [];
  for (let j = startIdx + 1; j < Math.min(startIdx + 6, lines.length); j++) {
    const candidate = lines[j]!;
    if (isNoteReferenceLine(candidate)) continue;
    if (/^[a-zA-Z]/.test(candidate) && !isMostlyNumericBlockLine(candidate)) break;
    const nums = parseNumericTokens(candidate);
    if (nums.length) {
      values.push(...nums);
      if (values.length >= 2) break;
    }
  }
  if (!values.length) return null;

  const selected = selectAmountTokensSkippingNoteIndex(values);
  if (!selected.value) return null;
  const value = selected.value;
  const comparativeValue = selected.comparativeValue;
  const reject = shouldRejectAsNoteOrRowIndex(def.key, value, line);
  if (reject) return null;

  const primaryYear = yearColumns[0]?.financialYear ?? null;
  const comparativeYear = yearColumns[1]?.financialYear ?? null;

  return {
    def,
    value,
    comparativeValue,
    financialYear: primaryYear,
    comparativeYear,
    section,
    confidence: confidenceFromContext({
      inline: false,
      unitScale,
      financialYear: primaryYear,
      rejected: false,
      key: def.key,
    }),
    sourceLine: line,
    extractionStage: "label_followed_by_values",
  };
}

function extractFromSection(input: {
  sectionText: string;
  section: DocumentSection;
  defs: RowDef[];
  unitScale: TableUnitScale;
  yearColumns: ReturnType<typeof detectYearColumns>;
}): ExtractedRow[] {
  const lines = normalizeLines(input.sectionText);
  const found = new Map<string, ExtractedRow>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (isTableColumnHeaderLine(line)) continue;
    const inline = tryInlineRow(
      line,
      input.defs,
      input.section,
      input.unitScale,
      input.yearColumns,
    );
    if (inline && !found.has(inline.def.key)) {
      found.set(inline.def.key, inline);
      continue;
    }

    const normalized = normalizeLabel(line);
    const def = input.defs.find(
      (d) =>
        d.allowedSections.includes(input.section) &&
        labelMatches(normalized, d.aliases),
    );
    if (!def || found.has(def.key)) continue;

    const followed = tryLabelFollowedByValues(
      lines,
      i,
      def,
      input.section,
      input.unitScale,
      input.yearColumns,
    );
    if (followed) found.set(def.key, followed);
  }

  return [...found.values()];
}

function rowsToFacts(
  rows: ExtractedRow[],
  provenanceBase: Omit<
    ChanakyaDocumentProvenance,
    "sectionOrTable" | "extractionMethod" | "confidence" | "page"
  > &
    Partial<Pick<ChanakyaDocumentProvenance, "extractionMethod" | "confidence">>,
  unitScale: TableUnitScale,
): ChanakyaDocumentExtractedFact[] {
  const facts: ChanakyaDocumentExtractedFact[] = [];
  const unit = unitScaleToFactUnit(unitScale);

  for (const row of rows) {
    if (row.confidence === "ambiguous") continue;

    const lenderFacingEligible =
      row.confidence === "high" ||
      (row.confidence === "medium" &&
        !(row.def.key === "depreciation" && row.section !== "P&L"));

    facts.push({
      id: `${provenanceBase.documentId}:${row.def.key}:${row.financialYear ?? "na"}`,
      key: row.def.key,
      label: row.def.label,
      value: row.value,
      unit,
      periodLabel: row.financialYear,
      provenance: {
        ...provenanceBase,
        page: null,
        sectionOrTable: row.section,
        extractionMethod: "table_extraction",
        confidence: row.confidence,
      },
      lenderFacingEligible,
    });

    if (row.comparativeValue && row.comparativeYear) {
      facts.push({
        id: `${provenanceBase.documentId}:${row.def.key}:${row.comparativeYear}`,
        key: row.def.key,
        label: row.def.label,
        value: row.comparativeValue,
        unit,
        periodLabel: row.comparativeYear,
        provenance: {
          ...provenanceBase,
          page: null,
          sectionOrTable: row.section,
          extractionMethod: "table_extraction",
          confidence: row.confidence === "high" ? "medium" : row.confidence,
        },
        lenderFacingEligible: row.confidence !== "low",
      });
    }
  }

  return facts;
}

/**
 * Extract financial statement facts using table/section understanding.
 * Returns [] when text insufficient — never fabricates.
 */
export function extractFinancialTableFacts(input: {
  text: string;
  provenance: Omit<
    ChanakyaDocumentProvenance,
    "sectionOrTable" | "extractionMethod" | "confidence" | "page"
  > &
    Partial<Pick<ChanakyaDocumentProvenance, "extractionMethod" | "confidence">>;
}): ChanakyaDocumentExtractedFact[] {
  const text = input.text?.trim();
  if (!text || text.length < 40) return [];

  const lower = text.toLowerCase();
  const looksFinancial =
    /balance sheet|statement of financial position|statement of profit|profit and loss|ba[lf1][ae]?n[ce]*\s*s[he]{2}t|bafance\s*sheet/.test(
      lower,
    ) || /ba[lf1][ae]?n[ce]*\s*s[he]{2}t|bafance\s*sheet/i.test(text);
  if (!looksFinancial) return [];

  const unitScale = detectUnitScale(text);
  const yearColumns = detectYearColumns(text);
  const sections = splitDocumentSections(text);

  const rows: ExtractedRow[] = [
    ...extractFromSection({
      sectionText: sections["Balance Sheet"],
      section: "Balance Sheet",
      defs: BS_ROW_DEFS,
      unitScale,
      yearColumns,
    }),
    ...extractFromSection({
      sectionText: sections["P&L"],
      section: "P&L",
      defs: PNL_ROW_DEFS,
      unitScale,
      yearColumns,
    }),
    ...extractFromSection({
      sectionText: sections["Balance Sheet Notes"],
      section: "Balance Sheet Notes",
      defs: BS_NOTE_ROW_DEFS,
      unitScale,
      yearColumns,
    }),
  ];

  return rowsToFacts(rows, input.provenance, unitScale);
}

/** Exported for deterministic tests — classify a raw token disposition. */
export function classifyFinancialTokenDisposition(input: {
  key: string;
  value: string;
  line: string;
  section: DocumentSection;
  unitScale: TableUnitScale;
  hasYearAssociation: boolean;
}): "reliable" | "ambiguous" | "rejected" {
  const reject = shouldRejectAsNoteOrRowIndex(input.key, input.value, input.line);
  if (reject) return "rejected";
  if (isNoteReferenceLine(input.line)) return "rejected";
  if (input.key === "depreciation" && input.section === "Balance Sheet Notes") {
    return "rejected";
  }
  if (!input.hasYearAssociation && ["total_assets", "revenue", "pat"].includes(input.key)) {
    return "ambiguous";
  }
  if (input.unitScale === "unknown" && Number(input.value.replace(/,/g, "")) > 999) {
    return "ambiguous";
  }
  if (input.key === "accumulated_depreciation_note") return "reliable";
  return "reliable";
}

export { mapMarchYearEndToFinancialYear, detectUnitScale, detectYearColumns };
