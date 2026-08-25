/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-006 — Structured financial fact extraction from text.
 * Extracts only labeled values present in text. Never invents missing line items.
 */

import type {
  ChanakyaDocumentExtractedFact,
  ChanakyaDocumentProvenance,
} from "@/types/chanakya-document-intelligence";

type FactDef = {
  key: string;
  label: string;
  patterns: RegExp[];
  section?: string;
};

const PNL_DEFS: FactDef[] = [
  {
    key: "revenue",
    label: "Revenue / Turnover",
    section: "P&L",
    patterns: [
      /(?:revenue from operations|total revenue|turnover|net sales|sales)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i,
    ],
  },
  {
    key: "gross_profit",
    label: "Gross Profit",
    section: "P&L",
    patterns: [/(?:gross profit)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i],
  },
  {
    key: "ebitda",
    label: "EBITDA",
    section: "P&L",
    patterns: [/(?:ebitda|ebidta)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i],
  },
  {
    key: "depreciation",
    label: "Depreciation",
    section: "P&L",
    patterns: [
      /(?:depreciation(?:\s*and\s*amortisation)?)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i,
    ],
  },
  {
    key: "ebit",
    label: "EBIT",
    section: "P&L",
    patterns: [
      /(?:\bebit\b|operating profit)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i,
    ],
  },
  {
    key: "interest",
    label: "Interest",
    section: "P&L",
    patterns: [
      /(?:finance costs?|interest(?:\s*expense)?)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i,
    ],
  },
  {
    key: "pbt",
    label: "PBT",
    section: "P&L",
    patterns: [
      /(?:profit before tax|\bpbt\b)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i,
    ],
  },
  {
    key: "tax",
    label: "Tax",
    section: "P&L",
    patterns: [
      /(?:tax expense|provision for tax|current tax|deferred tax)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i,
    ],
  },
  {
    key: "pat",
    label: "PAT / Net Profit",
    section: "P&L",
    patterns: [
      /(?:profit after tax|\bpat\b|net profit|profit for the (?:year|period))[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i,
    ],
  },
];

const BS_DEFS: FactDef[] = [
  {
    key: "share_capital",
    label: "Share Capital",
    section: "Balance Sheet",
    patterns: [/(?:share capital|equity share capital)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i],
  },
  {
    key: "reserves",
    label: "Reserves & Surplus",
    section: "Balance Sheet",
    patterns: [
      /(?:reserves?\s*(?:and|&)\s*surplus|other equity)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i,
    ],
  },
  {
    key: "net_worth",
    label: "Net Worth",
    section: "Balance Sheet",
    patterns: [
      /(?:net worth|shareholders['’]?\s*funds|total equity)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i,
    ],
  },
  {
    key: "borrowings",
    label: "Borrowings",
    section: "Balance Sheet",
    patterns: [
      /(?:total borrowings|borrowings|long[- ]term borrowings)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i,
    ],
  },
  {
    key: "fixed_assets",
    label: "Fixed Assets",
    section: "Balance Sheet",
    patterns: [
      /(?:property,? plant and equipment|fixed assets|ppe)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i,
    ],
  },
  {
    key: "current_assets",
    label: "Current Assets",
    section: "Balance Sheet",
    patterns: [/(?:total current assets|current assets)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i],
  },
  {
    key: "current_liabilities",
    label: "Current Liabilities",
    section: "Balance Sheet",
    patterns: [
      /(?:total current liabilities|current liabilities)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i,
    ],
  },
  {
    key: "trade_receivables",
    label: "Trade Receivables",
    section: "Balance Sheet",
    patterns: [
      /(?:trade receivables|sundry debtors)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i,
    ],
  },
  {
    key: "inventory",
    label: "Inventory",
    section: "Balance Sheet",
    patterns: [/(?:inventories|inventory|stock[- ]in[- ]trade)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i],
  },
  {
    key: "cash_bank",
    label: "Cash / Bank",
    section: "Balance Sheet",
    patterns: [
      /(?:cash and cash equivalents|cash\s*(?:and|&)\s*bank(?:\s*balances)?)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i,
    ],
  },
  {
    key: "total_assets",
    label: "Total Assets",
    section: "Balance Sheet",
    patterns: [/(?:total assets)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i],
  },
  {
    key: "total_liabilities",
    label: "Total Liabilities",
    section: "Balance Sheet",
    patterns: [
      /(?:total liabilities|total equity and liabilities)[\s:\-]*(₹?\s*[\d,]+\.?\d*\s*(?:cr|crore|lakh|lac|lakhs)?)/i,
    ],
  },
];

const BANK_DEFS: FactDef[] = [
  {
    key: "opening_balance",
    label: "Opening Balance",
    section: "Bank Statement",
    patterns: [/(?:opening balance)[\s:\-]*(₹?\s*[\d,]+\.?\d*)/i],
  },
  {
    key: "closing_balance",
    label: "Closing Balance",
    section: "Bank Statement",
    patterns: [/(?:closing balance|available balance)[\s:\-]*(₹?\s*[\d,]+\.?\d*)/i],
  },
  {
    key: "statement_period",
    label: "Statement Period",
    section: "Bank Statement",
    patterns: [
      /(?:statement period|period)[\s:\-]*([0-3]?\d[\/\-][01]?\d[\/\-]\d{2,4}\s*(?:to|-)\s*[0-3]?\d[\/\-][01]?\d[\/\-]\d{2,4})/i,
    ],
  },
];

const GST_DEFS: FactDef[] = [
  {
    key: "gst_taxable_turnover",
    label: "GST Taxable Value / Turnover",
    section: "GST",
    patterns: [
      /(?:total\s*taxable\s*value|taxable\s*value|outward\s*taxable\s*supplies|total\s*turnover)[\s:\-]*(₹?\s*[\d,]+\.?\d*)/i,
    ],
  },
  {
    key: "gst_period",
    label: "GST Filing Period",
    section: "GST",
    patterns: [
      /(?:tax\s*period|return\s*period|period)[\s:\-]*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-]?\d{4}|\d{2}[\/\-]\d{4})/i,
    ],
  },
  {
    key: "gstin",
    label: "GSTIN",
    section: "GST",
    patterns: [/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9])\b/i],
  },
];

const ITR_DEFS: FactDef[] = [
  {
    key: "assessment_year",
    label: "Assessment Year",
    section: "ITR",
    patterns: [/(?:assessment\s*year|a\.?\s*y\.?)[\s:\-]*(20\d{2}\s*[-–\/]\s*20?\d{2}|20\d{2}\s*[-–\/]\s*\d{2})/i],
  },
  {
    key: "declared_income",
    label: "Declared / Total Income",
    section: "ITR",
    patterns: [
      /(?:total\s*income|gross\s*total\s*income|income\s*from\s*business)[\s:\-]*(₹?\s*[\d,]+\.?\d*)/i,
    ],
  },
  {
    key: "taxpayer_name",
    label: "Taxpayer / Assessee Name",
    section: "ITR",
    patterns: [/(?:name\s*of\s*(?:the\s*)?(?:assessee|taxpayer)|assessee\s*name)[\s:\-]*([A-Za-z][A-Za-z0-9 .,&'-]{2,80})/i],
  },
];

const AUDITOR_DEFS: FactDef[] = [
  {
    key: "auditor_opinion",
    label: "Auditor Opinion / Observation",
    section: "Auditor Report",
    patterns: [
      /((?:unqualified|qualified|adverse|disclaimer of)\s*opinion[^\n.]{0,120})/i,
      /(emphasis of matter[^\n.]{0,160})/i,
      /(going concern[^\n.]{0,160})/i,
    ],
  },
];

function detectPeriod(text: string): string | null {
  const fy = text.match(/\bFY\s*20(\d{2})\s*[-–\/]?\s*(\d{2})?\b/i);
  if (fy) {
    return fy[2] ? `FY20${fy[1]}-${fy[2]}` : `FY20${fy[1]}`;
  }
  const yearEnded = text.match(
    /year ended\s+(\d{1,2}\s+\w+\s+20\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]20\d{2})/i,
  );
  if (yearEnded) return `Year ended ${yearEnded[1]}`;
  return null;
}

function detectUnitHint(raw: string): string | null {
  const t = raw.toLowerCase();
  if (/\bcrore|\bcr\b/.test(t)) return "crore";
  if (/\blakh|\blac|\blakhs\b/.test(t)) return "lakh";
  if (/₹|rs\.?|inr/.test(t)) return "inr";
  return null;
}

function isPlausibleExtractedValue(key: string, value: string): boolean {
  const v = value.replace(/\s+/g, " ").trim();
  if (!v || v.length < 1) return false;
  if (/^[,.\-\s₹RsINR]+$/i.test(v)) return false;
  // Non-amount keys (names, periods, opinions, GSTIN)
  if (
    /gstin|taxpayer|period|assessment|opinion|statement_period|gst_period/.test(
      key,
    )
  ) {
    return v.length >= 2;
  }
  // Amount-like values must include a meaningful numeric token
  if (!/\d/.test(v)) return false;
  const digits = v.replace(/[^\d]/g, "");
  if (digits.length < 2) return false;
  return true;
}

function extractByDefs(
  text: string,
  defs: FactDef[],
  provenanceBase: Omit<
    ChanakyaDocumentProvenance,
    "sectionOrTable" | "extractionMethod" | "confidence" | "page"
  > &
    Partial<Pick<ChanakyaDocumentProvenance, "extractionMethod" | "confidence">>,
): ChanakyaDocumentExtractedFact[] {
  const periodLabel = detectPeriod(text);
  const out: ChanakyaDocumentExtractedFact[] = [];
  for (const def of defs) {
    for (const pattern of def.patterns) {
      const m = text.match(pattern);
      if (!m?.[1]) continue;
      const value = m[1].replace(/\s+/g, " ").trim();
      if (!isPlausibleExtractedValue(def.key, value)) continue;
      out.push({
        id: `${provenanceBase.documentId}:${def.key}`,
        key: def.key,
        label: def.label,
        value,
        unit: detectUnitHint(value),
        periodLabel,
        provenance: {
          ...provenanceBase,
          page: null,
          sectionOrTable: def.section ?? null,
          extractionMethod: provenanceBase.extractionMethod ?? "table_extraction",
          confidence: provenanceBase.confidence ?? "medium",
        },
        lenderFacingEligible: true,
      });
      break;
    }
  }
  return out;
}

/**
 * Extract structured facts only from provided text.
 * Returns [] when text is empty — never fabricates.
 */
export function extractStructuredFactsFromText(input: {
  text: string;
  provenance: Omit<
    ChanakyaDocumentProvenance,
    "sectionOrTable" | "extractionMethod" | "confidence" | "page"
  > & {
    extractionMethod?: ChanakyaDocumentProvenance["extractionMethod"];
    confidence?: ChanakyaDocumentProvenance["confidence"];
  };
}): ChanakyaDocumentExtractedFact[] {
  const text = input.text?.trim();
  if (!text || text.length < 20) return [];

  const base = {
    documentId: input.provenance.documentId,
    opportunityId: input.provenance.opportunityId,
    displayName: input.provenance.displayName,
    typeRef: input.provenance.typeRef,
    mimeType: input.provenance.mimeType,
    documentVersionHint: input.provenance.documentVersionHint,
    extractionMethod: input.provenance.extractionMethod ?? ("table_extraction" as const),
    confidence: input.provenance.confidence ?? ("medium" as const),
  };

  const lower = text.toLowerCase();
  const facts: ChanakyaDocumentExtractedFact[] = [];

  const looksPnl =
    /profit\s*(and|&)\s*loss|statement of profit|revenue from operations|ebitda|profit after tax/.test(
      lower,
    );
  const looksBs = /balance sheet|statement of financial position|share capital|total assets/.test(
    lower,
  );
  const looksBank =
    /bank statement|account statement|passbook|statement of account/.test(lower) &&
    /opening balance|closing balance|available balance/.test(lower);
  const looksAuditor = /auditor.?s?\s*report|emphasis of matter|qualified opinion|going concern/.test(
    lower,
  );

  const looksGst = /\bgst\b|\bgstr\b|goods and services tax|gstin/.test(lower);
  const looksItr =
    /income tax return|\bitr[\s-]*[uv]\b|assessment year|assessee/.test(lower);

  if (looksPnl) facts.push(...extractByDefs(text, PNL_DEFS, base));
  if (looksBs) facts.push(...extractByDefs(text, BS_DEFS, base));
  if (looksBank) facts.push(...extractByDefs(text, BANK_DEFS, base));
  if (looksAuditor) facts.push(...extractByDefs(text, AUDITOR_DEFS, base));
  if (looksGst) facts.push(...extractByDefs(text, GST_DEFS, base));
  if (looksItr) facts.push(...extractByDefs(text, ITR_DEFS, base));

  // If document looks financial but section markers weak, still try both P&L+BS carefully.
  if (!looksPnl && !looksBs && /turnover|net worth|borrowings|gross profit/.test(lower)) {
    facts.push(...extractByDefs(text, [...PNL_DEFS, ...BS_DEFS], base));
  }

  // Deduplicate by key (first wins).
  const seen = new Set<string>();
  return facts.filter((f) => {
    if (seen.has(f.key)) return false;
    seen.add(f.key);
    return true;
  });
}
