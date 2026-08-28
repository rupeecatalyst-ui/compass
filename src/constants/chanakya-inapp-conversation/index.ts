/**
 * CO-CHANAKYA-PHASE1-INAPP-CONVERSATION-CLOSURE-037 — constants.
 */

import type { ChanakyaConversationPrompt } from "@/types/chanakya-dashboard-intelligence";
import { CHANAKYA_INAPP_CONVERSATION_SPRINT } from "@/types/chanakya-inapp-conversation";

export { CHANAKYA_INAPP_CONVERSATION_SPRINT };

/** Suggested chips — must submit through the real conversation path. */
export const CHANAKYA_INAPP_CONVERSATION_PROMPTS: ChanakyaConversationPrompt[] = [
  { id: "focus-first", label: "What should I focus on first?" },
  { id: "bl-intervention", label: "Which business loans need my intervention?" },
  { id: "sla-delayed", label: "Show me transactions delayed beyond SLA." },
  { id: "why-stuck", label: "Why is this case stuck?" },
  { id: "what-changed", label: "What changed since yesterday?" },
  { id: "analyse-financials", label: "Analyse the financials of this transaction." },
  { id: "lenders-relevant", label: "Which lenders are relevant for this opportunity?" },
];

export const CHANAKYA_INAPP_PHASE2_RATIO_TERMS = [
  "FOIR",
  "DSCR",
  "LTV",
  "DBR",
] as const;

export const CHANAKYA_INAPP_READ_ONLY_LIMITATIONS = [
  "Ask CHANAKYA is read-only and advisory — it never mutates Opportunities, Deals, Tasks, invoices, or approvals.",
  "Answers are composed from CHANAKYA Enterprise Read Context evidence only — no fabricated business facts.",
  "FOIR / DSCR / LTV / DBR remain Phase 2 and are not computed here.",
  "OCR-dependent document text stays OCR_REQUIRED / NOT_AVAILABLE until OCR is configured.",
] as const;
