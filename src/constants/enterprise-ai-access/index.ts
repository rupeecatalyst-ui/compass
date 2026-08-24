/**
 * CO-AI-ACCESS-001 — User-level AI capability keys (explicit grants only).
 */

export const AI_CAPABILITIES = {
  AI_ACCESS: "AI_ACCESS",
  AI_TEXT: "AI_TEXT",
  AI_VOICE: "AI_VOICE",
  AI_CHANAKYA: "AI_CHANAKYA",
  AI_CATALYST_INTELLIGENCE: "AI_CATALYST_INTELLIGENCE",
  AI_ACTIONS: "AI_ACTIONS",
} as const;

export type AiCapability = (typeof AI_CAPABILITIES)[keyof typeof AI_CAPABILITIES];

export const AI_CAPABILITY_LABELS: Record<AiCapability, string> = {
  AI_ACCESS: "AI Access",
  AI_TEXT: "Text",
  AI_VOICE: "Voice",
  AI_CHANAKYA: "Chanakya",
  AI_CATALYST_INTELLIGENCE: "Catalyst One Intelligence",
  AI_ACTIONS: "Actions",
};

/** Roles that may grant/revoke AI capabilities for other users. */
export const AI_ACCESS_GRANTOR_ROLES = ["SUPER_ADMIN", "ADMIN"] as const;

export type AiAccessGrantorRole = (typeof AI_ACCESS_GRANTOR_ROLES)[number];

export function canGrantAiAccess(actorRole: string | undefined | null): boolean {
  const role = (actorRole ?? "").toUpperCase();
  return AI_ACCESS_GRANTOR_ROLES.includes(role as AiAccessGrantorRole);
}
