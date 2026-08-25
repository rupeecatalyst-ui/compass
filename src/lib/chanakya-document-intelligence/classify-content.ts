/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-006 — Content-based document kind classification.
 * Uses readable text when available; falls back to filename/typeRef hints.
 */

import type {
  ChanakyaContentClassification,
  ChanakyaContentDocumentKind,
} from "@/types/chanakya-document-intelligence";

function scoreKind(
  kind: ChanakyaContentDocumentKind,
  score: number,
  signal: string,
  bucket: Map<ChanakyaContentDocumentKind, { score: number; signals: string[] }>,
) {
  const prev = bucket.get(kind) ?? { score: 0, signals: [] };
  prev.score += score;
  if (!prev.signals.includes(signal)) prev.signals.push(signal);
  bucket.set(kind, prev);
}

export function classifyDocumentContent(input: {
  documentId: string;
  displayName: string;
  typeRef: string;
  textExcerpt?: string | null;
}): ChanakyaContentClassification {
  const name = `${input.typeRef} ${input.displayName}`.toLowerCase();
  const text = (input.textExcerpt || "").toLowerCase();
  const hay = `${name}\n${text}`;
  const bucket = new Map<
    ChanakyaContentDocumentKind,
    { score: number; signals: string[] }
  >();

  const rules: Array<{
    kind: ChanakyaContentDocumentKind;
    re: RegExp;
    score: number;
    signal: string;
  }> = [
    { kind: "pan", re: /\bpermanent account number\b|\bincome tax department\b|\bpan\b/, score: 8, signal: "pan_markers" },
    { kind: "aadhaar_identity", re: /\baadhaar\b|\baadhar\b|\bunique identification\b/, score: 8, signal: "aadhaar_markers" },
    { kind: "salary_slip", re: /\bsalary slip\b|\bpayslip\b|\bnet pay\b|\bearnings\b.*\bdeductions\b/, score: 10, signal: "salary_markers" },
    { kind: "form_16", re: /\bform\s*16\b|\btds\b.*\bsalary\b/, score: 10, signal: "form16_markers" },
    { kind: "itr", re: /\bincome tax return\b|\bitr[\s-]*[uv]\b|\backnowledgment number\b/, score: 10, signal: "itr_markers" },
    { kind: "gst", re: /\bgstr\b|\bgst return\b|\bgoods and services tax\b/, score: 10, signal: "gst_markers" },
    { kind: "pnl", re: /\bprofit\s*(and|&)\s*loss\b|\bstatement of profit\b|\brevenue from operations\b/, score: 12, signal: "pnl_markers" },
    { kind: "balance_sheet", re: /\bbalance sheet\b|\bstatement of financial position\b/, score: 12, signal: "bs_markers" },
    { kind: "audited_financials", re: /\baudited financial\b|\bindependent auditor\b/, score: 8, signal: "audit_fin_markers" },
    { kind: "auditor_report", re: /\bauditor.?s?\s*report\b|\bemphasis of matter\b|\bqualified opinion\b/, score: 12, signal: "auditor_markers" },
    { kind: "director_report", re: /\bdirector.?s?\s*report\b|\bboard.?s?\s*report\b/, score: 12, signal: "director_markers" },
    { kind: "bank_statement", re: /\bbank statement\b|\baccount statement\b|\bopening balance\b.*\bclosing balance\b/, score: 12, signal: "bank_markers" },
    { kind: "loan_statement", re: /\bloan statement\b|\boutstanding principal\b|\bemi schedule\b/, score: 10, signal: "loan_stmt_markers" },
    { kind: "property", re: /\bsale deed\b|\btitle deed\b|\bproperty papers\b|\bsale agreement\b/, score: 10, signal: "property_markers" },
    { kind: "valuation", re: /\bvaluation report\b|\bmarket value\b|\bvaluer\b/, score: 10, signal: "valuation_markers" },
  ];

  for (const rule of rules) {
    if (rule.re.test(hay)) scoreKind(rule.kind, rule.score, rule.signal, bucket);
  }

  let best: ChanakyaContentDocumentKind = "other";
  let bestScore = 0;
  let signals: string[] = [];
  for (const [kind, v] of bucket) {
    if (v.score > bestScore) {
      best = kind;
      bestScore = v.score;
      signals = v.signals;
    }
  }

  const confidence: ChanakyaContentClassification["confidence"] =
    bestScore >= 12 ? "high" : bestScore >= 8 ? "medium" : bestScore > 0 ? "low" : "low";

  if (bestScore === 0) {
    signals = ["filename_typeRef_only_no_content_match"];
  }

  return {
    documentId: input.documentId,
    kind: best,
    confidence: bestScore === 0 ? "low" : confidence,
    signals,
  };
}
