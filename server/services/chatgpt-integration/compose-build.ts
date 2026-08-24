/**
 * CO-CHATGPT-INTEGRATION-V1 — Build / deployment composer (no secrets).
 */
import "server-only";

import { resolveOpsHealthSnapshot } from "@/lib/ops/resolve-ops-health";
import { resolveBuildInformationPayload } from "@/lib/build-information/resolve-server";
import { shortGitHash } from "@/types/build-information";
import {
  buildChatGptIntegrationMeta,
  type ChatGptComposeContext,
} from "@/lib/chatgpt-integration/route-handler";
import type { ChatGptBuildDto, ChatGptHealthBand } from "@/types/chatgpt-integration";

function mapBuildHealth(applicationStatus: string): ChatGptHealthBand {
  if (applicationStatus === "healthy") return "healthy";
  if (applicationStatus === "degraded") return "degraded";
  if (applicationStatus === "impaired") return "impaired";
  if (applicationStatus === "down") return "down";
  return "unknown";
}

export async function composeChatGptBuildDto(
  ctx: ChatGptComposeContext,
): Promise<ChatGptBuildDto> {
  const [build, ops] = await Promise.all([
    resolveBuildInformationPayload(),
    resolveOpsHealthSnapshot(),
  ]);

  return {
    ...buildChatGptIntegrationMeta(ctx),
    applicationVersion: build.applicationVersion,
    gitCommitShort: shortGitHash(build.gitCommitHash),
    gitBranch: build.gitBranch,
    buildTimestamp: build.buildTimestamp,
    deploymentTimestamp: build.deploymentTimestamp,
    deploymentEnvironment: build.deploymentEnvironment,
    persistenceMode: build.persistenceMode,
    databaseConnected: build.databaseConnected,
    dealRegistryStatus: build.dealRegistryStatus,
    healthStatus: mapBuildHealth(ops.applicationStatus),
  };
}
