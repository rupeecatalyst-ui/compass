/**
 * CO-C1-CHANAKYA-DURABLE-HISTORY-009A
 * Redact PII, tokens, and technical payloads before PostgreSQL persistence.
 */

import { redactFacingIntelligenceText } from "@/lib/chanakya-conversation-intelligence/facing-redact";
import { redactContactValuesInText } from "@/lib/chanakya-enterprise-read-context/redact-pii";
import type { ChanakyaConversationEvidenceLink } from "@/types/chanakya-conversation-intelligence";
import type { ChanakyaInterventionCard } from "@/types/chanakya-conversation-intelligence";

const SECRET_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bBearer\s+[A-Za-z0-9._\-+=/]+/gi, replacement: "[REDACTED]" },
  { pattern: /\bAuthorization\s*[:=]\s*[^\s]+/gi, replacement: "[REDACTED]" },
  { pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, replacement: "[REDACTED]" },
  {
    pattern:
      /\b(?:DATABASE_URL|DIRECT_URL|API_KEY|SECRET|PASSWORD|CRON_SECRET|OPENAI_API_KEY|ANTHROPIC_API_KEY)\s*[:=]\s*\S+/gi,
    replacement: "[REDACTED]",
  },
  { pattern: /\bsk-[A-Za-z0-9]{10,}\b/g, replacement: "[REDACTED]" },
];

export function redactChanakyaPersistText(text: string): string {
  let out = redactFacingIntelligenceText(text || "");
  out = redactContactValuesInText(out);
  for (const { pattern, replacement } of SECRET_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function sanitizeChanakyaEvidenceRefs(
  evidence: ChanakyaConversationEvidenceLink[] | undefined,
): ChanakyaConversationEvidenceLink[] {
  if (!Array.isArray(evidence)) return [];
  return evidence.slice(0, 12).map((item) => {
    const href = String(item.href || "").split("?")[0].split("#")[0];
    return {
      label: redactChanakyaPersistText(item.label || ""),
      href: href.startsWith("/") ? href : "",
      opportunityRef: item.opportunityRef?.trim() || null,
      dealRef: item.dealRef?.trim() || null,
      stage: item.stage?.trim() || null,
      lastUpdated: item.lastUpdated?.trim() || null,
      freshness: item.freshness?.trim() || null,
    };
  });
}

export function sanitizeChanakyaFocusEntities(
  cards: ChanakyaInterventionCard[] | undefined,
): ChanakyaInterventionCard[] {
  if (!Array.isArray(cards)) return [];
  return cards.slice(0, 12).map((card) => ({
    ...card,
    customerName: card.customerName ? redactChanakyaPersistText(card.customerName) : null,
    companyName: card.companyName ? redactChanakyaPersistText(card.companyName) : null,
    href: String(card.href || "").split("?")[0],
    opportunityId: card.opportunityId?.trim() || null,
    dealId: card.dealId?.trim() || null,
    opportunityRef: card.opportunityRef?.trim() || null,
    dealRef: card.dealRef?.trim() || null,
  }));
}
