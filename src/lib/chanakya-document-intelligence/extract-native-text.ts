/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-005 / 008 — Native text helpers.
 * PDF extraction lives in extract-pdf-text.ts (unpdf). The legacy CID probe
 * is retained only as a private diagnostic — never for content_read.
 */

import { CHANAKYA_DOC_TEXT_EXCERPT_MAX_CHARS } from "@/constants/chanakya-document-intelligence";

function truncate(text: string, max = CHANAKYA_DOC_TEXT_EXCERPT_MAX_CHARS): string {
  const t = text.replace(/\u0000/g, "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n…[truncated]`;
}

function looksMostlyPrintable(text: string): boolean {
  if (!text.trim()) return false;
  let printable = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    if (c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127) || c >= 160) {
      printable += 1;
    }
  }
  return printable / text.length >= 0.85;
}

export function extractNativeTextFromBytes(input: {
  bytes: Uint8Array;
  mimeType: string;
  displayName: string;
}): { text: string; method: "native_text" } | null {
  const mime = (input.mimeType || "").toLowerCase();
  const name = (input.displayName || "").toLowerCase();
  const isText =
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/csv" ||
    /\.(txt|csv|json|md|log)$/i.test(name);
  if (!isText) return null;

  const decoded = Buffer.from(input.bytes).toString("utf8");
  if (!looksMostlyPrintable(decoded)) return null;
  const text = truncate(decoded);
  if (!text) return null;
  return { text, method: "native_text" };
}

/**
 * @deprecated CO-CHANAKYA-DOCUMENT-READING-008 — Do not use for content_read.
 * Legacy PDF literal-string probe produced CID/binary noise. Prefer
 * `extractPdfTextFromBytes` from `./extract-pdf-text`.
 */
export function probePdfTextLayer(input: {
  bytes: Uint8Array;
}): { text: string; method: "pdf_text_layer"; sparse: boolean } | null {
  const raw = Buffer.from(input.bytes).toString("latin1");
  if (!raw.startsWith("%PDF")) return null;

  const literals: string[] = [];
  const re = /\((?:\\.|[^\\)]){2,200}\)/g;
  let match: RegExpExecArray | null;
  let guard = 0;
  while ((match = re.exec(raw)) !== null && guard < 4_000) {
    guard += 1;
    const inner = match[0].slice(1, -1);
    const decoded = inner
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\")
      .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
    if (/[A-Za-z0-9]/.test(decoded) && decoded.trim().length >= 2) {
      literals.push(decoded);
    }
  }

  const joined = literals.join(" ").replace(/[ \t]{2,}/g, " ").trim();
  if (!joined) return null;

  const sparse = joined.replace(/\s+/g, " ").length < 80;
  return {
    text: truncate(joined),
    method: "pdf_text_layer",
    sparse,
  };
}
