/**
 * CO-CHANAKYA-INTELLIGENCE-001 — Dashboard mode labels + conversation prompts.
 */

import type { ChanakyaConversationPrompt } from "@/types/chanakya-dashboard-intelligence";

export const CHANAKYA_DASHBOARD_INTELLIGENCE_SPRINT =
  "CO-CHANAKYA-INTELLIGENCE-001" as const;

export const CHANAKYA_DASHBOARD_MODE_PARAM = "view" as const;
export const CHANAKYA_DASHBOARD_MODE_VALUE = "intelligence" as const;

export const CHANAKYA_INTELLIGENCE_PARTNER_TITLE = "CHANAKYA" as const;
export const CHANAKYA_INTELLIGENCE_PARTNER_SUBTITLE =
  "Your Catalyst One Intelligence Partner" as const;

/** Suggested questions — open Guide / future conversation within auth boundary. */
export const CHANAKYA_INTELLIGENCE_CONVERSATION_PROMPTS: ChanakyaConversationPrompt[] = [
  { id: "sla-delayed", label: "Show me all transactions delayed beyond SLA." },
  { id: "bl-intervention", label: "Which business loans need my intervention?" },
  { id: "why-stuck", label: "Why is this case stuck?" },
  { id: "analyse-financials", label: "Analyse the financials of this transaction." },
  { id: "intervene-today", label: "Which cases should I personally intervene in today?" },
  { id: "focus-first", label: "What should I focus on first?" },
];

export const CHANAKYA_INTELLIGENCE_DOCUMENT_FAMILIES = [
  "P&L",
  "Balance Sheet",
  "Bank Statements",
  "ITR",
  "GST returns",
  "Other financial documents",
] as const;

export const CHANAKYA_INTELLIGENCE_PERMITTED_CONTEXT = [
  "Customer",
  "Opportunity",
  "Product",
  "Lenders",
  "Pipeline stage",
  "Activities",
  "Tasks",
  "Documents",
  "Credit information",
  "Financial statements",
  "Timeline / SLA",
] as const;
