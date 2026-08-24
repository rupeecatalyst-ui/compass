/**
 * CO-CHATGPT-INTEGRATION-V1 — Integration constants.
 */

import {
  AI_CAPABILITIES,
  type AiCapability,
} from "@/constants/enterprise-ai-access";
import type { AiAccessActor } from "@/types/enterprise-ai-access";

export const CHATGPT_INTEGRATION_MODULE = "ChatGPTIntegration" as const;

export const CHATGPT_INTEGRATION_API_KEY_ENV = "CHATGPT_INTEGRATION_API_KEY" as const;

/** Executive intelligence — not high-frequency extraction. */
export const CHATGPT_INTEGRATION_RATE_LIMIT_WINDOW_MS = 60_000;
export const CHATGPT_INTEGRATION_RATE_LIMIT_MAX_REQUESTS = 60;

export const CHATGPT_INTEGRATION_VERSION = "v1" as const;

export const CHATGPT_INTEGRATION_ALLOWED_ENDPOINTS = [
  "/api/integrations/chatgpt/v1/health",
  "/api/integrations/chatgpt/v1/mission-control",
  "/api/integrations/chatgpt/v1/chanakya",
  "/api/integrations/chatgpt/v1/pipeline",
  "/api/integrations/chatgpt/v1/tasks",
  "/api/integrations/chatgpt/v1/email-status",
  "/api/integrations/chatgpt/v1/activity",
  "/api/integrations/chatgpt/v1/build",
] as const;

export type ChatGptIntegrationEndpoint =
  (typeof CHATGPT_INTEGRATION_ALLOWED_ENDPOINTS)[number];

/** Capability requirements per integration endpoint (after AI_ACCESS). */
export const CHATGPT_INTEGRATION_ENDPOINT_CAPABILITIES: Record<
  ChatGptIntegrationEndpoint,
  readonly AiCapability[]
> = {
  "/api/integrations/chatgpt/v1/health": [AI_CAPABILITIES.AI_CATALYST_INTELLIGENCE],
  "/api/integrations/chatgpt/v1/mission-control": [AI_CAPABILITIES.AI_CATALYST_INTELLIGENCE],
  "/api/integrations/chatgpt/v1/chanakya": [AI_CAPABILITIES.AI_CHANAKYA],
  "/api/integrations/chatgpt/v1/pipeline": [AI_CAPABILITIES.AI_CATALYST_INTELLIGENCE],
  "/api/integrations/chatgpt/v1/tasks": [AI_CAPABILITIES.AI_CATALYST_INTELLIGENCE],
  "/api/integrations/chatgpt/v1/email-status": [AI_CAPABILITIES.AI_CATALYST_INTELLIGENCE],
  "/api/integrations/chatgpt/v1/activity": [AI_CAPABILITIES.AI_CATALYST_INTELLIGENCE],
  "/api/integrations/chatgpt/v1/build": [AI_CAPABILITIES.AI_CATALYST_INTELLIGENCE],
};

/** Text interface gate for integration reads (voice-ready; voice not used in V1 routes). */
export const CHATGPT_INTEGRATION_TEXT_CAPABILITY = AI_CAPABILITIES.AI_TEXT;
