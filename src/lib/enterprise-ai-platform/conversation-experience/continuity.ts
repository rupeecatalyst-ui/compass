/**
 * Session continuity helpers (CO-AI-111 / CO-AI-112).
 */

import { EAI_SARATHI_CONTINUITY_STORAGE_KEY } from "@/constants/enterprise-ai-platform/conversation-experience";
import { EAI_WEALTH_PARTNER_CONTINUITY_STORAGE_KEY } from "@/constants/enterprise-ai-platform/wealth-partner-behaviour";
import type { EaiConversationContinuityState } from "@/types/enterprise-ai-conversation-experience";
import type { EaiPersonaPackId } from "@/types/enterprise-ai-platform";

export function createEaiConversationContinuityKey(
  personaPackId: EaiPersonaPackId = "sarathi_customer",
): string {
  const prefix =
    personaPackId === "sarathi_wealth_partner" ? "sarathi_wp" : "sarathi";
  return `${prefix}_${crypto.randomUUID()}`;
}

function storageKeyFor(personaPackId?: EaiPersonaPackId): string {
  return personaPackId === "sarathi_wealth_partner"
    ? EAI_WEALTH_PARTNER_CONTINUITY_STORAGE_KEY
    : EAI_SARATHI_CONTINUITY_STORAGE_KEY;
}

export function loadEaiSarathiContinuityFromStorage(
  personaPackId: EaiPersonaPackId = "sarathi_customer",
): EaiConversationContinuityState | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(storageKeyFor(personaPackId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as EaiConversationContinuityState;
    if (!parsed?.continuityKey || !parsed?.conversationId || !Array.isArray(parsed.messages)) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export function saveEaiSarathiContinuityToStorage(
  state: EaiConversationContinuityState,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKeyFor(state.personaPackId), JSON.stringify(state));
  } catch {
    // Ignore quota / private mode failures — conversation still works in-memory.
  }
}

export function clearEaiSarathiContinuityStorage(
  personaPackId: EaiPersonaPackId = "sarathi_customer",
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKeyFor(personaPackId));
  } catch {
    // no-op
  }
}
