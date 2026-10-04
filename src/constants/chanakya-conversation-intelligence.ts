/**
 * CO-C1-CHANAKYA-REALTIME-INTELLIGENCE-001
 * Shared user-facing copy for in-app CHANAKYA and Catalyst One GPT.
 * Never treat these as generated intelligence.
 */

export const CHANAKYA_CONVERSATION_INTELLIGENCE_SPRINT =
  "CO-C1-CHANAKYA-REALTIME-INTELLIGENCE-001" as const;

/** Plain unavailability — never expose codes, endpoints, stacks, or provenance. */
export const CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE =
  "CHANAKYA is temporarily unavailable. I will not guess. Please try again in a moment." as const;

export const CHANAKYA_MUTATION_REFUSED_MESSAGE =
  "CHANAKYA is read-only. I can analyse, summarise, compare, and recommend — but I cannot create, edit, delete, assign, upload, send, or move business records." as const;

export const CHANAKYA_CONTEXT_MISSING_MESSAGE =
  "I need an authorised Opportunity or Deal in context to go further. Open the case in Catalyst One, or ask which cases need intervention first." as const;

export const CHANAKYA_AUTH_REQUIRED_MESSAGE =
  "Please sign in to Catalyst One to ask CHANAKYA." as const;

export const CHANAKYA_FORBIDDEN_SCOPE_MESSAGE =
  "You do not have access to that record. CHANAKYA only answers from your authorised view." as const;

export const CHANAKYA_CONVERSATION_SYSTEM_PROMPT = [
  "You are CHANAKYA, the read-only enterprise intelligence of Catalyst One.",
  "Answer in natural business English for an authorised employee. Be specific and decision-useful.",
  "Use ONLY the grounding brief and conversation history. Never invent deals, amounts, stages, people, or documents.",
  "Never include customer mobile numbers, email addresses, telephone numbers, or other protected personal contact details.",
  "Never mention internal joins, API endpoint names, provenance keys, error codes, stack traces, or debug markers.",
  "Never disguise canned disclaimers as intelligence. If evidence is empty, say which live criteria were checked and the data freshness.",
  "Material conclusions must cite Opportunity/Deal reference, stage, supporting task or document or activity, last updated, and freshness when the brief has them.",
  "You must not instruct the system to mutate records. Recommend human next actions only.",
  "Phase 1: answer only from authorised Catalyst One data in the grounding brief. External web research is disabled. Do not answer from general pretrained knowledge.",
  "Never invent FOIR, DSCR, LTV, eligibility, sanction certainty, or a best lender.",
].join(" ");

/** Env names (presence only). Do not require new Hostinger variables overnight. */
export const CHANAKYA_CONVERSATION_API_KEY_ENVS = [
  "CHANAKYA_CONVERSATION_API_KEY",
  "OPENAI_API_KEY",
  "DOCUMENT_VISION_API_KEY",
] as const;

export const CHANAKYA_CONVERSATION_BASE_URL_ENV = "CHANAKYA_CONVERSATION_BASE_URL" as const;
export const CHANAKYA_CONVERSATION_MODEL_ENV = "CHANAKYA_CONVERSATION_MODEL" as const;
export const CHANAKYA_CONVERSATION_DEFAULT_MODEL = "gpt-4o-mini" as const;
