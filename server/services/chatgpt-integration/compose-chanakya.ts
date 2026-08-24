/**
 * CO-CHATGPT-INTEGRATION-V1 — CHANAKYA / Radar composer.
 */
import "server-only";

import { EME_PERIOD_LATEST } from "@/constants/enterprise-metrics-engine";
import { EME_MISSION_CONTROL_RADAR_KEY } from "@/constants/mission-control-snapshot";
import {
  buildChatGptIntegrationMeta,
  type ChatGptComposeContext,
} from "@/lib/chatgpt-integration/route-handler";
import type { ChatGptChanakyaDto } from "@/types/chatgpt-integration";
import type { ChanakyaRadarIntelligenceSnapshotPayload } from "@server/services/enterprise-metrics-engine/compose-mission-control-snapshot";
import { enterpriseMetricsEngineService } from "@server/services/enterprise-metrics-engine";

export async function composeChatGptChanakyaDto(
  ctx: ChatGptComposeContext,
): Promise<ChatGptChanakyaDto> {
  const snap =
    await enterpriseMetricsEngineService.getLatestSnapshot<ChanakyaRadarIntelligenceSnapshotPayload>(
      EME_MISSION_CONTROL_RADAR_KEY,
      { organizationId: ctx.organizationId, periodKey: EME_PERIOD_LATEST },
    );

  const payload = snap?.payload ?? null;
  const summary = payload?.summary;
  const dashboard = payload?.dashboard;

  const signals = (dashboard?.intelligence ?? []).slice(0, 10).map((row, index) => ({
    id: row.id ?? `radar-signal-${index + 1}`,
    text: row.label,
    tone:
      row.tone === "danger"
        ? ("danger" as const)
        : row.tone === "warning"
          ? ("warning" as const)
          : row.tone === "success"
            ? ("success" as const)
            : ("info" as const),
    reason: row.hint || undefined,
  }));

  const prioritySummary =
    signals.length > 0
      ? signals
          .slice(0, 3)
          .map((s) => s.text)
          .join(" · ")
      : summary
        ? `Radar health ${summary.healthScore}; direction ${summary.direction}.`
        : "No CHANAKYA radar snapshot is available yet.";

  return {
    ...buildChatGptIntegrationMeta(ctx),
    snapshotAt: snap?.asOf ?? payload?.asOf ?? null,
    radarHealthScore: summary?.healthScore ?? dashboard?.vector.healthScore ?? null,
    radarDirection:
      summary?.direction ??
      (dashboard?.vector.direction != null ? String(dashboard.vector.direction) : null),
    dealCount: summary?.dealCount ?? dashboard?.rows.length ?? 0,
    quadrantCounts: summary?.quadrantCounts ?? {},
    signals,
    prioritySummary,
  };
}
