/**
 * CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009
 * Phase 1 conversational CHANAKYA — copy, flags, suggested questions, retention.
 */

import type { ChanakyaSuggestedQuestion } from "@/types/chanakya-conversational-intelligence";
import { CHANAKYA_CONVERSATIONAL_INTELLIGENCE_SPRINT } from "@/types/chanakya-conversational-intelligence";

export { CHANAKYA_CONVERSATIONAL_INTELLIGENCE_SPRINT };

/** Four calendar days of unsaved chat history. Canonical retention constant. */
export const CHANAKYA_CHAT_RETENTION_MS = 4 * 24 * 60 * 60 * 1000;

export const CHANAKYA_CHAT_RETENTION_DAYS = 4 as const;

/** Bounded expired-session deletes — never lock the whole table. */
export const CHANAKYA_CHAT_CLEANUP_BATCH_SIZE = 50;

export const CHANAKYA_CHAT_OPPORTUNISTIC_CLEANUP_BATCH = 8;

export const CHANAKYA_DURABLE_HISTORY_SPRINT = "CO-C1-CHANAKYA-DURABLE-HISTORY-009A" as const;

export const CHANAKYA_CHAT_RETENTION_NOTICE =
  "Unsaved chats are private to you, kept for four days, then deleted. Deleting a chat never changes Catalyst One records." as const;

export const CHANAKYA_PHASE1_OUT_OF_DOMAIN_MESSAGE =
  "I’m sorry, but I’m currently designed to assist only with information available in Catalyst One. I’m unable to help with this particular request." as const;

export const CHANAKYA_PHASE1_NOT_IN_CATALYST_ONE_MESSAGE =
  "This information is not currently available in Catalyst One." as const;

export const CHANAKYA_PHASE1_MIXED_REFUSAL_SUFFIX =
  " I’m unable to help with the rest of that request from outside Catalyst One." as const;

export const CHANAKYA_PHASE1_SELECT_TRANSACTION_MESSAGE =
  "Please select an authorised Opportunity or Deal so I can continue from Catalyst One records." as const;

export const CHANAKYA_PHASE1_READ_ONLY_INDICATOR =
  "Read-only · advisory only · never mutates Catalyst One records" as const;

/** CO-C1-CHANAKYA-PROPOSAL-PHASE1-009B — chat Save as Draft is deferred, not a blocker. */
export const CHANAKYA_PHASE1_CHAT_SAVE_DEFERRED_NOTICE =
  "CHANAKYA chat Save as Draft is intentionally deferred in Phase 1 pending an approved Proposal Registry; proposal generation remains operational." as const;

export const CHANAKYA_PHASE1_WEB_RESEARCH_ENV = "CHANAKYA_WEB_RESEARCH_ENABLED" as const;

/** Internal allow-list for Phase 1 generation. Never browse the public web. */
export const CHANAKYA_PHASE1_INTERNAL_SOURCE_ALLOWLIST = [
  "enterprise_read_compiler",
  "opportunity_360",
  "deal_360",
  "enterprise_document_registry",
  "document_requests_readiness",
  "edie_structured_facts",
  "credit_workbench_analysis",
  "lender_product_program_matrix",
  "enterprise_lender_master",
  "enterprise_task_engine",
  "enterprise_activity_registry",
  "chanakya_radar",
  "mission_control_authorised",
  "accounting_read_only",
] as const;

export const CHANAKYA_SUGGESTED_QUESTION_GROUP_LABELS: Record<
  ChanakyaSuggestedQuestion["group"],
  string
> = {
  today: "Today",
  transactions: "Transactions",
  documents: "Documents",
  lenders_products: "Lenders & Products",
  analysis: "Analysis",
};

export const CHANAKYA_SUGGESTED_QUESTIONS: ChanakyaSuggestedQuestion[] = [
  { id: "focus-first", group: "today", label: "What should I focus on first?" },
  { id: "what-changed", group: "today", label: "What changed since yesterday?" },
  { id: "sla-delayed", group: "transactions", label: "Show me transactions delayed beyond SLA." },
  {
    id: "bl-intervention",
    group: "transactions",
    label: "Which business loans need my intervention?",
  },
  { id: "why-stuck", group: "transactions", label: "Why is this case stuck?" },
  {
    id: "docs-required",
    group: "documents",
    label: "Which documents are required for this transaction?",
  },
  {
    id: "docs-pending-applicant",
    group: "documents",
    label: "Which applicant documents are pending?",
  },
  {
    id: "docs-coapplicant",
    group: "documents",
    label: "What is required from the co-applicant?",
  },
  {
    id: "docs-company",
    group: "documents",
    label: "What company documents are missing?",
  },
  {
    id: "docs-status",
    group: "documents",
    label: "Which documents are received, under review, rejected, expired, or accepted?",
  },
  {
    id: "docs-ready",
    group: "documents",
    label: "Why is this transaction not document-ready?",
  },
  {
    id: "docs-request-next",
    group: "documents",
    label: "What should we request next?",
  },
  {
    id: "docs-lender-program",
    group: "documents",
    label: "What documents does this lender program require?",
  },
  {
    id: "lenders-relevant",
    group: "lenders_products",
    label: "Which lenders are relevant for this opportunity?",
  },
  {
    id: "analyse-financials",
    group: "analysis",
    label: "Analyse the financials of this transaction.",
  },
  {
    id: "make-proposal",
    group: "analysis",
    label: "Make a proposal for this transaction.",
  },
];

export const CHANAKYA_CONVERSATION_STREAM_PATH = "/api/chanakya/conversation/stream" as const;
export const CHANAKYA_CONVERSATION_SESSIONS_PATH = "/api/chanakya/conversation/sessions" as const;
export const CHANAKYA_CONVERSATION_PROPOSAL_DRAFT_PATH =
  "/api/chanakya/conversation/proposal-draft" as const;
