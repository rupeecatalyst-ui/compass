/**
 * CO-CHATGPT-INTEGRATION-V1 — Health composer.
 */
import "server-only";

import { resolveOpsHealthSnapshot } from "@/lib/ops/resolve-ops-health";
import { resolveBuildInformationPayload } from "@/lib/build-information/resolve-server";
import { shortGitHash } from "@/types/build-information";
import { enterpriseMetricsEngineService } from "@server/services/enterprise-metrics-engine";
import {
  buildChatGptIntegrationMeta,
  type ChatGptComposeContext,
} from "@/lib/chatgpt-integration/route-handler";
import type { ChatGptHealthBand, ChatGptHealthDto } from "@/types/chatgpt-integration";

function mapBand(value: string): ChatGptHealthBand {
  if (
    value === "healthy" ||
    value === "degraded" ||
    value === "impaired" ||
    value === "down" ||
    value === "unknown"
  ) {
    return value;
  }
  return "unknown";
}

export async function composeChatGptHealthDto(
  ctx: ChatGptComposeContext,
): Promise<ChatGptHealthDto> {
  const [ops, build, eme] = await Promise.all([
    resolveOpsHealthSnapshot(),
    resolveBuildInformationPayload(),
    enterpriseMetricsEngineService.getAdminStatus(ctx.organizationId),
  ]);

  const overall: ChatGptHealthBand =
    ops.applicationStatus === "healthy" && ops.apiHealth === "healthy"
      ? "healthy"
      : ops.applicationStatus === "down" || ops.apiHealth === "impaired"
        ? "impaired"
        : "degraded";

  return {
    ...buildChatGptIntegrationMeta(ctx),
    overallHealth: overall,
    summary: ops.summary,
    apiHealth: mapBand(ops.apiHealth),
    databaseHealth: mapBand(ops.databaseStatus),
    persistenceMode: ops.persistenceMode,
    databaseConnected: ops.databaseConnected,
    errorRatePct: ops.errorRatePct,
    averageResponseMs: ops.averageResponseMs,
    recentErrorCount: ops.recentErrors.length,
    activeUsersEstimate: ops.activeUsersEstimate ?? 0,
    backgroundJobs: {
      metricsEngineStatus: mapBand(eme.healthStatus),
      lastMetricsRunAt: eme.lastCalculationTime,
      lastMetricsStatus: eme.lastStatus,
      missionControlSnapshotAt: eme.missionControl?.lastSnapshotAt ?? null,
      chanakyaRadarSnapshotAt: eme.chanakyaRadar?.lastSnapshotAt ?? null,
    },
    deployment: {
      version: build.applicationVersion,
      gitCommitShort: shortGitHash(build.gitCommitHash),
      environment: build.deploymentEnvironment,
    },
  };
}
