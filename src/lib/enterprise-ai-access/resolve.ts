/**
 * CO-AI-ACCESS-001 — Resolve user AI capabilities from persisted JSON.
 * All capabilities default OFF. Roles do NOT grant AI access.
 */

import {
  AI_CAPABILITIES,
  type AiCapability,
} from "@/constants/enterprise-ai-access";
import type { UserAiCapabilities } from "@/types/enterprise-ai-access";

export function defaultUserAiCapabilities(): UserAiCapabilities {
  return {
    AI_ACCESS: false,
    AI_TEXT: false,
    AI_VOICE: false,
    AI_CHANAKYA: false,
    AI_CATALYST_INTELLIGENCE: false,
    AI_ACTIONS: false,
  };
}

const CAPABILITY_KEYS = Object.values(AI_CAPABILITIES) as AiCapability[];

export function parseUserAiCapabilitiesJson(raw: unknown): UserAiCapabilities {
  const base = defaultUserAiCapabilities();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;

  const record = raw as Record<string, unknown>;
  for (const key of CAPABILITY_KEYS) {
    if (record[key] === true) base[key] = true;
  }

  // V1 read-only — actions never enabled.
  base.AI_ACTIONS = false;

  if (!base.AI_ACCESS) {
    base.AI_TEXT = false;
    base.AI_VOICE = false;
    base.AI_CHANAKYA = false;
    base.AI_CATALYST_INTELLIGENCE = false;
  }

  return base;
}

export function serializeUserAiCapabilities(
  capabilities: UserAiCapabilities,
): Record<AiCapability, boolean> {
  const normalized = { ...capabilities, AI_ACTIONS: false };
  if (!normalized.AI_ACCESS) {
    normalized.AI_TEXT = false;
    normalized.AI_VOICE = false;
    normalized.AI_CHANAKYA = false;
    normalized.AI_CATALYST_INTELLIGENCE = false;
  }
  return normalized;
}

export function hasAiCapability(
  capabilities: UserAiCapabilities,
  capability: AiCapability,
): boolean {
  if (capability === AI_CAPABILITIES.AI_ACTIONS) return false;
  if (!capabilities.AI_ACCESS) return false;
  return capabilities[capability] === true;
}

export function assertAiCapabilities(
  capabilities: UserAiCapabilities,
  required: readonly AiCapability[],
): void {
  if (!capabilities.AI_ACCESS) {
    throw Object.assign(new Error("AI access is not enabled for this user."), {
      statusCode: 403,
      code: "AI_ACCESS_DENIED",
    });
  }

  for (const cap of required) {
    if (cap === AI_CAPABILITIES.AI_ACTIONS) {
      throw Object.assign(new Error("AI Actions are not available in Read-Only V1."), {
        statusCode: 403,
        code: "AI_ACTIONS_UNAVAILABLE",
      });
    }
    if (!hasAiCapability(capabilities, cap)) {
      throw Object.assign(new Error(`Missing AI capability: ${cap}`), {
        statusCode: 403,
        code: "AI_CAPABILITY_DENIED",
        capability: cap,
      });
    }
  }
}

export function mergeAiCapabilityPatch(
  current: UserAiCapabilities,
  patch: Partial<UserAiCapabilities>,
): UserAiCapabilities {
  const next = { ...current, ...patch, AI_ACTIONS: false };

  if (patch.AI_ACCESS === false) {
    next.AI_TEXT = false;
    next.AI_VOICE = false;
    next.AI_CHANAKYA = false;
    next.AI_CATALYST_INTELLIGENCE = false;
  }

  return serializeUserAiCapabilities(next);
}
