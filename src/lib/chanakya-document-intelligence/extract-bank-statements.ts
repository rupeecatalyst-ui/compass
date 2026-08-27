/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-013 — Evidence-first bank statement extraction.
 * Only emits values supported by labelled statement content — never fabricates.
 */

import type {
  ChanakyaDocumentExtractedFact,
  ChanakyaDocumentProvenance,
} from "@/types/chanakya-document-intelligence";
import { normalizeLines } from "./table-extraction-utils";

type BankFactDef = {
  key: string;
  label: string;
  patterns: RegExp[];
  minAmount?: number;
};

const BANK_PATTERNS: BankFactDef[] = [
  {
    key: "bank_name",
    label: "Bank Name",
    patterns: [
      /\b(Axis Bank|HDFC Bank|ICICI Bank|State Bank of India|SBI|Kotak Mahindra Bank|Yes Bank|IndusInd Bank|Punjab National Bank|Bank of Baroda)\b/i,
    ],
  },
  {
    key: "account_type",
    label: "Account Type",
    patterns: [
      /(?:account type|a\/c type|type of account)[\s:\-]*((?:current|savings|overdraft|od|cc|cash credit)[\s\w]*)/i,
      /\b(Current Account|Saving Account|Savings Account|Overdraft|OD Account|Cash Credit)\b/i,
    ],
  },
  {
    key: "statement_period",
    label: "Statement Period",
    patterns: [
      /(?:statement period|period from|from)[\s:\-]*([0-3]?\d[\/\-][01]?\d[\/\-]\d{2,4}\s*(?:to|-)\s*[0-3]?\d[\/\-][01]?\d[\/\-]\d{2,4})/i,
      /(?:for the period)[\s:\-]*([0-3]?\d[\/\-][01]?\d[\/\-]\d{2,4}\s*(?:to|-)\s*[0-3]?\d[\/\-][01]?\d[\/\-]\d{2,4})/i,
    ],
  },
  {
    key: "opening_balance",
    label: "Opening Balance",
    patterns: [
      /(?:opening balance|balance brought forward|b\/f balance|balance b\/f)[\s:\-]*(₹?\s*[\d,]+\.?\d*)/i,
    ],
    minAmount: 0,
  },
  {
    key: "closing_balance",
    label: "Closing Balance",
    patterns: [
      /(?:closing balance|balance carried forward|c\/f balance|available balance)[\s:\-]*(₹?\s*[\d,]+\.?\d*)/i,
    ],
    minAmount: 0,
  },
  {
    key: "total_credits",
    label: "Total Credits",
    patterns: [
      /(?:total credits?|credit total|total credit amount)[\s:\-]*(₹?\s*[\d,]+\.?\d*)/i,
    ],
    minAmount: 1,
  },
  {
    key: "total_debits",
    label: "Total Debits",
    patterns: [
      /(?:total debits?|debit total|total debit amount)[\s:\-]*(₹?\s*[\d,]+\.?\d*)/i,
    ],
    minAmount: 1,
  },
  {
    key: "average_balance",
    label: "Average Balance",
    patterns: [
      /(?:average (?:monthly )?balance|avg balance)[\s:\-]*(₹?\s*[\d,]+\.?\d*)/i,
    ],
    minAmount: 0,
  },
  {
    key: "transaction_count",
    label: "Transaction Count",
    patterns: [
      /(?:no\.?\s*of transactions|number of transactions|transaction count)[\s:\-]*(\d+)/i,
    ],
  },
];

function parseAmount(value: string): number | null {
  const n = Number(value.replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function isPlausibleBankAmount(key: string, value: string, minAmount = 0): boolean {
  if (key === "transaction_count") {
    const n = Number(value.replace(/\D/g, ""));
    return Number.isFinite(n) && n >= 0 && n <= 100_000;
  }
  if (key === "bank_name" || key === "account_type" || key === "statement_period") {
    return value.trim().length >= 2;
  }
  const num = parseAmount(value);
  if (num == null) return false;
  if (num < minAmount) return false;
  // Reject note/page indices masquerading as balances.
  if (/^\d{1,2}$/.test(value.replace(/[^\d]/g, "")) && key.includes("balance")) {
    return false;
  }
  return true;
}

function countLikelyTransactionRows(lines: string[]): number | null {
  const dateAmount =
    /^[0-3]?\d[\/\-][01]?\d[\/\-]\d{2,4}\s+.+\s+(?:CR|DR|Cr|Dr)\s+[\d,]+\.?\d*/i;
  let count = 0;
  for (const line of lines) {
    if (dateAmount.test(line)) count += 1;
  }
  return count >= 3 ? count : null;
}

function detectEmiPatterns(text: string): string[] {
  const indicators: string[] = [];
  const patterns = [
    { re: /\bEMI\b/i, label: "EMI debit narration observed" },
    { re: /\bNACH\b.*(?:debit|dr)/i, label: "NACH debit narration observed" },
    { re: /\bECS\b.*(?:debit|dr)/i, label: "ECS debit narration observed" },
    { re: /\bLOAN\b.*(?:repay|emi|instalment)/i, label: "Loan repayment narration observed" },
  ];
  for (const p of patterns) {
    if (p.re.test(text)) indicators.push(p.label);
  }
  return [...new Set(indicators)];
}

function detectChequeReturnPatterns(text: string): string[] {
  const indicators: string[] = [];
  if (/\bCHQ(?:UE)?\s*RET(?:URN)?\b/i.test(text)) {
    indicators.push("Cheque return narration observed");
  }
  if (/\bINSUFFICIENT FUNDS\b/i.test(text)) {
    indicators.push("Insufficient funds narration observed");
  }
  return indicators;
}

function detectConcentration(lines: string[]): string[] {
  const creditCounterparties = new Map<string, number>();
  for (const line of lines) {
    const m = line.match(
      /^[0-3]?\d[\/\-][01]?\d[\/\-]\d{2,4}\s+(?:UPI|NEFT|RTGS|IMPS)[\/\-]?\s*(.+?)\s+(?:CR|Cr)\s+([\d,]+\.?\d*)/i,
    );
    if (m?.[1]) {
      const cp = m[1].trim().slice(0, 40);
      creditCounterparties.set(cp, (creditCounterparties.get(cp) ?? 0) + 1);
    }
  }
  const sorted = [...creditCounterparties.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length >= 2 && sorted[0]![1] >= 5) {
    return [
      `Repeated credit narration from "${sorted[0]![0]}" (${sorted[0]![1]} occurrences) — concentration observation only.`,
    ];
  }
  return [];
}

function extractByPatterns(
  text: string,
  provenanceBase: Omit<
    ChanakyaDocumentProvenance,
    "sectionOrTable" | "extractionMethod" | "confidence" | "page"
  > &
    Partial<Pick<ChanakyaDocumentProvenance, "extractionMethod" | "confidence">>,
): ChanakyaDocumentExtractedFact[] {
  const facts: ChanakyaDocumentExtractedFact[] = [];
  for (const def of BANK_PATTERNS) {
    for (const pattern of def.patterns) {
      const m = text.match(pattern);
      if (!m?.[1]) continue;
      const value = m[1].replace(/\s+/g, " ").trim();
      if (!isPlausibleBankAmount(def.key, value, def.minAmount ?? 0)) continue;
      facts.push({
        id: `${provenanceBase.documentId}:${def.key}`,
        key: def.key,
        label: def.label,
        value,
        unit: def.key.includes("count") ? null : "inr",
        periodLabel: null,
        provenance: {
          ...provenanceBase,
          page: null,
          sectionOrTable: "Bank Statement",
          extractionMethod: "table_extraction",
          confidence: "high",
        },
        lenderFacingEligible: true,
      });
      break;
    }
  }
  return facts;
}

/**
 * Extract bank statement facts from readable text only.
 */
export function extractBankStatementFacts(input: {
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
  const looksBank =
    /bank statement|account statement|passbook|statement of account|opening balance|closing balance|axis bank|hdfc bank/.test(
      lower,
    );
  if (!looksBank) return [];

  // Malformed / corrupted extracts — reject when no labelled balance anchors exist.
  const hasLabelledBalanceAnchor =
    /(?:opening balance|closing balance|balance brought forward|balance carried forward)/i.test(
      text,
    );
  if (!hasLabelledBalanceAnchor && !/(?:total credits?|total debits?)/i.test(text)) {
    return [];
  }

  const lines = normalizeLines(text);
  const facts = extractByPatterns(text, input.provenance);

  const txCount = countLikelyTransactionRows(lines);
  if (txCount != null && !facts.some((f) => f.key === "transaction_count")) {
    facts.push({
      id: `${input.provenance.documentId}:transaction_count`,
      key: "transaction_count",
      label: "Transaction Count",
      value: String(txCount),
      unit: null,
      periodLabel: null,
      provenance: {
        ...input.provenance,
        page: null,
        sectionOrTable: "Bank Statement",
        extractionMethod: "table_extraction",
        confidence: "medium",
      },
      lenderFacingEligible: true,
    });
  }

  for (const emi of detectEmiPatterns(text)) {
    facts.push({
      id: `${input.provenance.documentId}:emi:${facts.length}`,
      key: "emi_indicator",
      label: "EMI / Loan Indicator",
      value: emi,
      provenance: {
        ...input.provenance,
        page: null,
        sectionOrTable: "Bank Statement",
        extractionMethod: "table_extraction",
        confidence: "medium",
      },
      lenderFacingEligible: true,
    });
  }

  for (const chq of detectChequeReturnPatterns(text)) {
    facts.push({
      id: `${input.provenance.documentId}:chq:${facts.length}`,
      key: "cheque_return_indicator",
      label: "Cheque Return Indicator",
      value: chq,
      provenance: {
        ...input.provenance,
        page: null,
        sectionOrTable: "Bank Statement",
        extractionMethod: "table_extraction",
        confidence: "medium",
      },
      lenderFacingEligible: true,
    });
  }

  for (const obs of detectConcentration(lines)) {
    facts.push({
      id: `${input.provenance.documentId}:concentration:${facts.length}`,
      key: "concentration_observation",
      label: "Concentration Observation",
      value: obs,
      provenance: {
        ...input.provenance,
        page: null,
        sectionOrTable: "Bank Statement",
        extractionMethod: "table_extraction",
        confidence: "low",
      },
      lenderFacingEligible: true,
    });
  }

  const seen = new Set<string>();
  return facts.filter((f) => {
    if (seen.has(f.key) && !f.key.endsWith("_indicator") && f.key !== "concentration_observation") {
      return false;
    }
    seen.add(f.key);
    return true;
  });
}
