/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-014 — Credit-relevant scanned document prioritization.
 */

import type { ChanakyaContentDocumentKind } from "@/types/chanakya-document-intelligence";

export type CreditOcrPriority = "high" | "medium" | "low";

export function classifyCreditOcrDocument(input: {
  displayName: string;
  typeRef?: string;
  mimeType?: string;
}): {
  priority: CreditOcrPriority;
  category: ChanakyaContentDocumentKind;
  creditRelevant: boolean;
} {
  const h = `${input.typeRef || ""} ${input.displayName}`.toLowerCase();

  if (/\b(?:ack\d+|itr[\s_-]*ack|acknowledgement)\b/i.test(h)) {
    return { priority: "high", category: "itr", creditRelevant: true };
  }
  if (/\bitr\b|income\s*tax\s*return|form\s*26as/i.test(h)) {
    return { priority: "high", category: "itr", creditRelevant: true };
  }
  if (/auditor|audit\s*report|ca\s*report|statutory\s*audit/i.test(h)) {
    return { priority: "high", category: "auditor_report", creditRelevant: true };
  }
  if (/director.?s?\s*report/i.test(h)) {
    return { priority: "high", category: "director_report", creditRelevant: true };
  }
  if (/balance\s*sheet|p\s*&\s*l|profit|audited|financial\s*statement|trial\s*balance/i.test(h)) {
    return { priority: "high", category: "audited_financials", creditRelevant: true };
  }
  if (/valuation|valuer|property\s*report/i.test(h)) {
    return { priority: "high", category: "valuation", creditRelevant: true };
  }
  if (/property|sale\s*deed|title|agreement|noc|collateral|sanction\s*plan/i.test(h)) {
    return { priority: "medium", category: "property", creditRelevant: true };
  }
  if (/bank[\s_-]*statement|passbook/i.test(h)) {
    return { priority: "high", category: "bank_statement", creditRelevant: true };
  }
  if (/gst|gstr/i.test(h)) {
    return { priority: "medium", category: "gst", creditRelevant: true };
  }
  if (/aadhaar|aadhar|pan|passport|identity/i.test(h)) {
    return { priority: "low", category: "aadhaar_identity", creditRelevant: false };
  }

  return { priority: "low", category: "other", creditRelevant: false };
}

export function isCreditRelevantScannedDocument(input: {
  displayName: string;
  typeRef?: string;
}): boolean {
  return classifyCreditOcrDocument(input).creditRelevant;
}
