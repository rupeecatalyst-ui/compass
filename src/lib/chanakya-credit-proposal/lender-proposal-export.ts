/**
 * CO-CHANAKYA-028 — Lender proposal export sanitization (download / print safety).
 * Strips customer PII and internal-only phrases from lender export surfaces.
 */

const EMAIL_PATTERN = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi;
const MOBILE_IN_PATTERN =
  /\b(?:\+91[\s-]?)?(?:91[\s-]?)?[6-9]\d[\s-]?\d{4}[\s-]?\d{4}\b/g;
const INTERNAL_LEAK_PATTERNS = [
  /internal recommendation/gi,
  /internal review only/gi,
  /strengthen assessment/gi,
  /Catalyst One/gi,
  /CHANAKYA internal/gi,
];

/** Remove customer email/mobile and internal-only markers from export text. */
export function sanitizeLenderExportMarkdown(text: string): string {
  let out = text;
  for (const re of INTERNAL_LEAK_PATTERNS) {
    out = out.replace(re, "[redacted]");
  }
  out = out.replace(EMAIL_PATTERN, "[email withheld]");
  out = out.replace(MOBILE_IN_PATTERN, "[mobile withheld]");
  return out.trim();
}

/** True when text is safe for lender download (no obvious PII / internal leaks). */
export function assertLenderExportSafe(text: string): boolean {
  if (EMAIL_PATTERN.test(text)) return false;
  EMAIL_PATTERN.lastIndex = 0;
  if (MOBILE_IN_PATTERN.test(text)) return false;
  MOBILE_IN_PATTERN.lastIndex = 0;
  return !INTERNAL_LEAK_PATTERNS.some((re) => re.test(text));
}
