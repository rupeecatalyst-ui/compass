/**
 * CO-C1-CHANAKYA-REALTIME-INTELLIGENCE-001
 * Value-level redaction for facing answers, session persistence, and logs.
 */

import { redactContactValuesInText } from "@/lib/chanakya-enterprise-read-context/redact-pii";

const TECHNICAL_LEAK_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bNOT_AVAILABLE\b/g, replacement: "not recorded" },
  { pattern: /\bTRUE_EMPTY\b/g, replacement: "none found" },
  { pattern: /\bFALLBACK_FAILURE\b/g, replacement: "temporarily unavailable" },
  { pattern: /\bOCR_REQUIRED\b/g, replacement: "document text is not yet readable" },
  { pattern: /\bcompile_error:[A-Z0-9_]+\b/gi, replacement: "" },
  { pattern: /\bCHANAKYA_PII_LEAK\b/g, replacement: "" },
  { pattern: /\/api\/[a-z0-9_\-./]+/gi, replacement: "" },
  { pattern: /\bprovenance\s*[:=]\s*[^\n]+/gi, replacement: "" },
  { pattern: /\bchanakya_enterprise_read_context[^\s]*/gi, replacement: "" },
  { pattern: /\btransactionAttention:[A-Z_]+\b/g, replacement: "" },
  { pattern: /\battentionRows:EMPTY\b/g, replacement: "" },
  { pattern: /\[stub\][^\n]*/gi, replacement: "" },
];

export function redactFacingIntelligenceText(text: string): string {
  let out = redactContactValuesInText(text || "");
  for (const { pattern, replacement } of TECHNICAL_LEAK_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function containsCustomerContactPii(text: string): boolean {
  return /(?:\b[\w.+-]+@[\w-]+\.[\w.-]+\b|(?:\+91[\s-]?)?[6-9]\d{9}\b)/i.test(
    text || "",
  );
}

export function containsTechnicalFallbackLeak(text: string): boolean {
  return /NOT_AVAILABLE|compile_error:|\/api\/chanakya|Provenance:|chanakya_enterprise_read_context|\[stub\]/i.test(
    text || "",
  );
}
