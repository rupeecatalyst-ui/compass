/**
 * CO-CHATGPT-INTEGRATION-V1 — Pipeline composer (aggregated, no CRM dump).
 */
import "server-only";

import { composeBusinessIntelligenceSnapshot } from "@/lib/enterprise-business-intelligence/compose";
import { prisma } from "@server/lib/prisma";
import {
  buildChatGptIntegrationMeta,
  type ChatGptComposeContext,
} from "@/lib/chatgpt-integration/route-handler";
import type { ChatGptPipelineDto } from "@/types/chatgpt-integration";

async function countRecentOpportunities24h(organizationId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.enterpriseOpportunity.count({
    where: {
      organizationId,
      createdAt: { gte: since },
      isDeleted: false,
    },
  });
}

export async function composeChatGptPipelineDto(
  ctx: ChatGptComposeContext,
): Promise<ChatGptPipelineDto> {
  const ebi = composeBusinessIntelligenceSnapshot();
  const recentlyCreatedOpportunities24h = await countRecentOpportunities24h(ctx.organizationId);

  return {
    ...buildChatGptIntegrationMeta(ctx),
    activeOpportunities: ebi.executive.activeOpportunities,
    activeDeals: ebi.executive.activeDeals,
    pipelineValue: ebi.executive.pipelineValue,
    conversionRatioPct: ebi.executive.conversionRatioPct,
    stageDistribution: ebi.executive.dealsByStage.map((row) => ({
      stage: row.name,
      count: row.count,
    })),
    recentlyCreatedOpportunities24h,
    attentionRequired: {
      overdueTasks: ebi.operational.overdueTasks,
      dealsAwaitingDocuments: ebi.operational.dealsAwaitingDocuments,
      dealsAwaitingLenderAction: ebi.operational.dealsAwaitingLenderAction,
      inactiveOpportunities: ebi.operational.inactiveOpportunities,
    },
    lenderStageSummary: ebi.executive.dealsByStage.slice(0, 12).map((row) => ({
      stage: row.name,
      count: row.count,
    })),
  };
}
