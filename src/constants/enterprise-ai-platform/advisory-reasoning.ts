/**
 * Knowledge & Advisory Reasoning constants (CO-AI-106 / Sprint AI-6).
 */

export const EAI_ADVISORY_REASONING_VERSION = "1.0.0-ai6";

export const EAI_ADVISORY_DISCLAIMERS = [
  "Advisory reasoning guides customers — it does not approve credit.",
  "Eligibility, FOIR, DBR, pricing, and lender policy remain enterprise engines.",
  "SARATHI advice stays short, warm, and within approved financial domains.",
] as const;

/** Max fragments contributing to a single facing response. */
export const EAI_ADVISORY_MAX_FRAGMENTS = 3;

/** Max lines per fragment before micro-communication shaping. */
export const EAI_ADVISORY_MAX_LINES_PER_FRAGMENT = 2;
