/**
 * CO-CHATGPT-GPT-ACTION-001 — GPT Action lane registry (OAuth-only, read-only).
 * Maps gpt-action slugs to canonical integration endpoints and compose handlers.
 */
import type { AiCapability } from "@/constants/enterprise-ai-access";
import {
  CHATGPT_GPT_ACTION_BASE,
  CHATGPT_INTEGRATION_ENDPOINT_CAPABILITIES,
  type ChatGptIntegrationEndpoint,
} from "@/lib/chatgpt-integration/constants";
import type { ChatGptComposeContext } from "@/lib/chatgpt-integration/route-handler";
import { composeChatGptActivityDto } from "@server/services/chatgpt-integration/compose-activity";
import { composeChatGptBuildDto } from "@server/services/chatgpt-integration/compose-build";
import { composeChatGptChanakyaDto } from "@server/services/chatgpt-integration/compose-chanakya";
import { composeChatGptEmailStatusDto } from "@server/services/chatgpt-integration/compose-email-status";
import { composeChatGptEnterpriseReadDto } from "@server/services/chatgpt-integration/compose-enterprise-read";
import { composeChatGptHealthDto } from "@server/services/chatgpt-integration/compose-health";
import { composeChatGptMissionControlDto } from "@server/services/chatgpt-integration/compose-mission-control";
import { composeChatGptPipelineDto } from "@server/services/chatgpt-integration/compose-pipeline";
import { composeChatGptTasksDto } from "@server/services/chatgpt-integration/compose-tasks";

export const CHATGPT_GPT_ACTION_SLUGS = [
  "health",
  "mission-control",
  "chanakya",
  "pipeline",
  "tasks",
  "email-status",
  "activity",
  "build",
  "enterprise-read",
] as const;

export type ChatGptGptActionSlug = (typeof CHATGPT_GPT_ACTION_SLUGS)[number];

export type ChatGptGptActionEndpointDef = {
  slug: ChatGptGptActionSlug;
  /** Canonical v1 path used for OAuth scope + AI capability SSOT. */
  canonicalEndpoint: ChatGptIntegrationEndpoint;
  /** Public GPT Action lane path (OAuth-only). */
  gptActionPath: string;
  capabilities: readonly AiCapability[];
  compose: (ctx: ChatGptComposeContext) => Promise<unknown>;
};

function def(
  slug: ChatGptGptActionSlug,
  canonicalEndpoint: ChatGptIntegrationEndpoint,
  compose: ChatGptGptActionEndpointDef["compose"],
): ChatGptGptActionEndpointDef {
  return {
    slug,
    canonicalEndpoint,
    gptActionPath: `${CHATGPT_GPT_ACTION_BASE}/${slug}`,
    capabilities: CHATGPT_INTEGRATION_ENDPOINT_CAPABILITIES[canonicalEndpoint],
    compose,
  };
}

export const CHATGPT_GPT_ACTION_ENDPOINTS: Record<
  ChatGptGptActionSlug,
  ChatGptGptActionEndpointDef
> = {
  health: def("health", "/api/integrations/chatgpt/v1/health", composeChatGptHealthDto),
  "mission-control": def(
    "mission-control",
    "/api/integrations/chatgpt/v1/mission-control",
    composeChatGptMissionControlDto,
  ),
  chanakya: def("chanakya", "/api/integrations/chatgpt/v1/chanakya", composeChatGptChanakyaDto),
  pipeline: def("pipeline", "/api/integrations/chatgpt/v1/pipeline", composeChatGptPipelineDto),
  tasks: def("tasks", "/api/integrations/chatgpt/v1/tasks", composeChatGptTasksDto),
  "email-status": def(
    "email-status",
    "/api/integrations/chatgpt/v1/email-status",
    composeChatGptEmailStatusDto,
  ),
  activity: def("activity", "/api/integrations/chatgpt/v1/activity", composeChatGptActivityDto),
  build: def("build", "/api/integrations/chatgpt/v1/build", composeChatGptBuildDto),
  "enterprise-read": def(
    "enterprise-read",
    "/api/integrations/chatgpt/v1/enterprise-read",
    composeChatGptEnterpriseReadDto,
  ),
};

export function resolveChatGptGptActionSlug(raw: string): ChatGptGptActionSlug | null {
  return (CHATGPT_GPT_ACTION_SLUGS as readonly string[]).includes(raw)
    ? (raw as ChatGptGptActionSlug)
    : null;
}
