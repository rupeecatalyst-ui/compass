/**
 * Enterprise Conversation Memory & Learning constants (CO-AI-115 / Sprint AI-15).
 */

export const EAI_CONVERSATION_MEMORY_ENGINE_VERSION = "1.0.0-ai15";

/** Default TTL for memory entries (30 days). Controlled expiry — not online learning. */
export const EAI_MEMORY_DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Soft caps — keep projections compact for Context Intelligence. */
export const EAI_MEMORY_MAX_FACTS = 40;
export const EAI_MEMORY_MAX_PREFERENCES = 20;
export const EAI_MEMORY_MAX_QUESTIONS = 20;
export const EAI_MEMORY_MAX_RECOMMENDATIONS = 20;
export const EAI_MEMORY_MAX_PROPOSALS = 20;
export const EAI_MEMORY_MAX_CONSULTATIONS = 20;
export const EAI_MEMORY_MAX_AUDIT = 50;

export const EAI_MEMORY_DISCLAIMERS = [
  "Conversation Memory enhances continuity — it does not replace enterprise engines.",
  "Never perform automatic online learning.",
  "Never modify enterprise rules, policies, or certified calculations.",
  "Learning remains controlled and auditable (explicit refresh / human review only).",
  "Action Proposals in memory stay draft/pending — memory never executes CRM/workflow.",
] as const;

export const EAI_MEMORY_FORBIDDEN_LEARNING_MODES = [
  "automatic_online",
  "unsupervised",
  "self_modifying_rules",
] as const;
