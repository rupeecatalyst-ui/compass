/**
 * SARATHI Conversation Experience constants (CO-AI-111 + CO-SARATHI-UX-002).
 */

export const EAI_CONVERSATION_EXPERIENCE_VERSION = "3.3.0-reasoning-001";

/** Customer-facing welcome (premium consultation — no engineering terminology). */
export const EAI_SARATHI_WELCOME = {
  brand: "SARATHI",
  tagline: "Your Financial Intelligence Partner",
  message: `Hello.

I'm SARATHI.

Your Financial Intelligence Partner.

How can I help you today?`,
} as const;

export const EAI_SARATHI_SUMMARY_PREFACE = "Here's what I understand.";

/**
 * @deprecated CO-SARATHI-VISION-001 WAVE-1 — questionnaire starters retired.
 * Do not mount as UI chips. Kept for historical verify/docs only.
 */
export const EAI_SARATHI_SUGGESTED_QUESTIONS = [
  "I need a Home Loan",
  "I want a Balance Transfer",
  "I need a Loan Against Property",
  "I need Working Capital",
  "I need a Personal Loan",
] as const;

/** @deprecated Prefer adaptive natural-timing soft floors (CO-SARATHI-UX-002). */
export const EAI_CONVERSATION_TYPING_MIN_MS = 180;
export const EAI_CONVERSATION_TYPING_MAX_MS = 2200;

/** Configurable progressive thinking labels (mirrored in natural-timing). */
export const EAI_SARATHI_PROGRESSIVE_THINKING = {
  standard: [
    "Understanding your requirement…",
    "Reviewing available information…",
  ],
  complex: [
    "Understanding your requirement…",
    "Reviewing available information…",
    "Preparing my recommendation…",
  ],
  recommendation: [
    "Reviewing what we've discussed…",
    "Preparing my recommendation…",
  ],
} as const;

/** @deprecated Internal notes — never show in primary conversation chrome */
export const EAI_CONVERSATION_DISCLAIMERS = [
  "SARATHI Conversation Experience is text-only.",
  "Action Proposal cards are recommendations — never CRM or workflow execution.",
  "All turns operate through the Enterprise AI Platform.",
] as const;

/** localStorage key for session continuity (UI + continuity ids). */
export const EAI_SARATHI_CONTINUITY_STORAGE_KEY = "eai.sarathi.continuity.v3";
