/**
 * CO-CHATGPT-INTEGRATION-V1 — Activity composer (aggregated, sanitized).
 */
import "server-only";

import { enterpriseActivityRepository } from "@server/repositories/enterprise-activity/enterprise-activity.repository";
import { truncateText } from "@/lib/chatgpt-integration/sanitize";
import {
  buildChatGptIntegrationMeta,
  type ChatGptComposeContext,
} from "@/lib/chatgpt-integration/route-handler";
import type { ChatGptActivityDto } from "@/types/chatgpt-integration";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function composeChatGptActivityDto(
  ctx: ChatGptComposeContext,
): Promise<ChatGptActivityDto> {
  const since = startOfToday();
  const rows = await enterpriseActivityRepository.list({
    organizationId: ctx.organizationId,
    since,
    limit: 200,
  });

  const byKind = new Map<string, number>();
  for (const row of rows) {
    byKind.set(row.eventKind, (byKind.get(row.eventKind) ?? 0) + 1);
  }

  const highlights = rows.slice(0, 20).map((row) => ({
    id: row.id,
    eventKind: row.eventKind,
    sourceSystem: row.sourceSystem,
    title: truncateText(row.title, 120) ?? row.title,
    summary: truncateText(row.summary, 160),
    occurredAt: row.occurredAt.toISOString(),
  }));

  return {
    ...buildChatGptIntegrationMeta(ctx),
    since: since.toISOString(),
    totalCount: rows.length,
    byEventKind: [...byKind.entries()]
      .map(([kind, count]) => ({ kind, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    highlights,
  };
}
