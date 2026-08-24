/**
 * CO-CHATGPT-INTEGRATION-V1 — Mission Control composer.
 */
import "server-only";

import { EME_PERIOD_LATEST } from "@/constants/enterprise-metrics-engine";
import { EME_MISSION_CONTROL_SNAPSHOT_KEY } from "@/constants/mission-control-snapshot";
import {
  buildChatGptIntegrationMeta,
  type ChatGptComposeContext,
} from "@/lib/chatgpt-integration/route-handler";
import type {
  ChatGptAttentionItem,
  ChatGptMissionControlDto,
} from "@/types/chatgpt-integration";
import type { MissionControlExecutiveSnapshotPayload } from "@server/services/enterprise-metrics-engine/compose-mission-control-snapshot";
import { enterpriseMetricsEngineService } from "@server/services/enterprise-metrics-engine";

function collectAttentionItems(
  payload: MissionControlExecutiveSnapshotPayload | null | undefined,
): ChatGptAttentionItem[] {
  if (!payload) return [];
  const items: ChatGptAttentionItem[] = [];

  for (const insight of payload.ebi?.insights ?? []) {
    items.push({
      id: insight.id,
      text: insight.text,
      tone: insight.tone,
      reason: insight.reason,
      recommendedAction: insight.recommendedAction,
    });
  }

  for (const section of payload.intelligence?.sections ?? []) {
    for (const card of section.cards) {
      for (const insight of card.insights ?? []) {
        items.push({
          id: insight.id,
          text: insight.text,
          tone: insight.tone,
          reason: insight.reason,
          recommendedAction: insight.recommendedAction,
        });
      }
    }
  }

  return items.slice(0, 12);
}

export async function composeChatGptMissionControlDto(
  ctx: ChatGptComposeContext,
): Promise<ChatGptMissionControlDto> {
  const snap = await enterpriseMetricsEngineService.getLatestSnapshot<MissionControlExecutiveSnapshotPayload>(
    EME_MISSION_CONTROL_SNAPSHOT_KEY,
    { organizationId: ctx.organizationId, periodKey: EME_PERIOD_LATEST },
  );

  const payload = snap?.payload ?? null;
  const ebi = payload?.ebi;

  const operationalIndicators = [
    {
      label: "Active opportunities",
      value: ebi?.executive.activeOpportunities ?? 0,
    },
    {
      label: "Active deals",
      value: ebi?.executive.activeDeals ?? 0,
    },
    {
      label: "Pipeline value",
      value: ebi?.executive.pipelineValue ?? 0,
    },
    {
      label: "Tasks due today",
      value: ebi?.operational.tasksDueToday ?? 0,
    },
    {
      label: "Overdue tasks",
      value: ebi?.operational.overdueTasks ?? 0,
    },
    {
      label: "Deals awaiting documents",
      value: ebi?.operational.dealsAwaitingDocuments ?? 0,
    },
  ];

  const trends = (ebi?.executive.dealsByStage ?? []).slice(0, 8).map((row) => ({
    label: row.name,
    value: row.count,
  }));

  return {
    ...buildChatGptIntegrationMeta(ctx),
    snapshotAt: snap?.asOf ?? payload?.asOf ?? null,
    snapshotVersion: payload?.version ?? null,
    businessHealthScore: ebi?.health.overallScore ?? null,
    businessHealthStatus: ebi?.health.status ?? null,
    operationalIndicators,
    attentionItems: collectAttentionItems(payload),
    trends,
  };
}
