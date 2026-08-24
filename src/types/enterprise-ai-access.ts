/**
 * CO-AI-ACCESS-001 — User AI capability contracts.
 */

import type { AiCapability } from "@/constants/enterprise-ai-access";

export type UserAiCapabilities = Record<AiCapability, boolean>;

export type UserAiCapabilitiesDto = {
  userId: string;
  capabilities: UserAiCapabilities;
  /** V1 — always false regardless of stored value. */
  actionsAvailableInV1: false;
  updatedAt: string | null;
};

export type UpdateUserAiCapabilitiesInput = {
  AI_ACCESS?: boolean;
  AI_TEXT?: boolean;
  AI_VOICE?: boolean;
  AI_CHANAKYA?: boolean;
  AI_CATALYST_INTELLIGENCE?: boolean;
  /** Ignored in V1 — always forced OFF. */
  AI_ACTIONS?: boolean;
};

export type AiAccessActor = {
  userId: string;
  email: string;
  role: string;
  isActive?: boolean;
};
