/**
 * CO-CHANAKYA-DOCUMENT-READING-008 — Extracted-text quality gate.
 * Non-empty ≠ readable. CID/binary noise must not become content_read.
 */

export interface ExtractedTextQuality {
  usable: boolean;
  /** Sparse but some real words — content_read_partial. */
  partial: boolean;
  empty: boolean;
  reason: string;
  alphaWordCount: number;
  digitCount: number;
  hasMeaningfulLabels: boolean;
}

const MEANINGFUL_LABEL_RE =
  /\b(?:total\s+assets|total\s+liabilities|share\s+capital|reserves?(?:\s*(?:and|&)\s*surplus)?|revenue(?:\s+from\s+operations)?|turnover|gross\s+profit|ebitda|profit\s+before\s+tax|profit\s+after\s+tax|net\s+profit|balance\s+sheet|statement\s+of\s+profit|opening\s+balance|closing\s+balance|gst|gstr|assessment\s+year|income\s+tax|borrowings|net\s+worth|inventory|trade\s+receivables|cash\s+and\s+cash\s+equivalents|particulars|equity|liabilities|assets)\b/i;

/** Tokens that often appear in CID/metadata noise — not evidence of reading. */
const NOISE_TOKEN_RE = /^(?:cid|obj|endobj|stream|endstream|xref|trailer|canon|hbv)$/i;

/**
 * Decide whether extracted text is genuine document content.
 */
export function assessExtractedTextQuality(text: string): ExtractedTextQuality {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return {
      usable: false,
      partial: false,
      empty: true,
      reason: "No text extracted from document.",
      alphaWordCount: 0,
      digitCount: 0,
      hasMeaningfulLabels: false,
    };
  }

  const alphaWords = trimmed.match(/[A-Za-z][A-Za-z0-9'’-]{2,}/g) || [];
  const meaningfulWords = alphaWords.filter((w) => !NOISE_TOKEN_RE.test(w));
  const digitCount = (trimmed.match(/\d/g) || []).length;
  const hasMeaningfulLabels = MEANINGFUL_LABEL_RE.test(trimmed);
  const alphaWordCount = meaningfulWords.length;

  // Short random-looking token soup (BAT-007 CID noise pattern).
  const avgLen =
    alphaWordCount === 0
      ? 0
      : meaningfulWords.reduce((s, w) => s + w.length, 0) / alphaWordCount;
  const uniqueRatio =
    alphaWordCount === 0
      ? 0
      : new Set(meaningfulWords.map((w) => w.toLowerCase())).size / alphaWordCount;

  if (hasMeaningfulLabels && alphaWordCount >= 8) {
    return {
      usable: true,
      partial: false,
      empty: false,
      reason: "Meaningful document labels detected in extracted text.",
      alphaWordCount,
      digitCount,
      hasMeaningfulLabels: true,
    };
  }

  if (hasMeaningfulLabels && alphaWordCount >= 3) {
    return {
      usable: true,
      partial: true,
      empty: false,
      reason: "Some meaningful labels present but text is sparse.",
      alphaWordCount,
      digitCount,
      hasMeaningfulLabels: true,
    };
  }

  // Plenty of dictionary-ish words without financial labels (e.g. letters, MOA).
  if (alphaWordCount >= 40 && avgLen >= 4.2 && uniqueRatio >= 0.35) {
    return {
      usable: true,
      partial: true,
      empty: false,
      reason: "Substantial readable prose extracted (no financial labels detected).",
      alphaWordCount,
      digitCount,
      hasMeaningfulLabels: false,
    };
  }

  if (alphaWordCount < 12 || avgLen < 3.5 || uniqueRatio > 0.95) {
    return {
      usable: false,
      partial: false,
      empty: false,
      reason:
        "Extracted text looks like CID/binary noise or non-semantic fragments — not treated as content_read.",
      alphaWordCount,
      digitCount,
      hasMeaningfulLabels: false,
    };
  }

  return {
    usable: false,
    partial: false,
    empty: false,
    reason: "Extracted text failed readability quality gate.",
    alphaWordCount,
    digitCount,
    hasMeaningfulLabels: false,
  };
}
