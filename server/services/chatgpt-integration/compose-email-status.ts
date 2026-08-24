/**
 * CO-CHATGPT-INTEGRATION-V1 — Inbound email status composer (no credentials).
 */
import "server-only";

import { prisma } from "@server/lib/prisma";
import { isInboundImapPasswordConfigured } from "@/lib/enterprise-inbound-email/imap-secret-resolver";
import { truncateText } from "@/lib/chatgpt-integration/sanitize";
import {
  buildChatGptIntegrationMeta,
  type ChatGptComposeContext,
} from "@/lib/chatgpt-integration/route-handler";
import type { ChatGptEmailStatusDto, ChatGptHealthBand } from "@/types/chatgpt-integration";

function mapEmailStatus(input: {
  enabled: boolean;
  passwordConfigured: boolean;
  failuresLast24h: number;
  lastProbeOk: boolean | null;
}): ChatGptHealthBand {
  if (!input.enabled) return "unknown";
  if (!input.passwordConfigured) return "degraded";
  if (input.failuresLast24h > 0) return "degraded";
  if (input.lastProbeOk === false) return "impaired";
  return "healthy";
}

export async function composeChatGptEmailStatusDto(
  ctx: ChatGptComposeContext,
): Promise<ChatGptEmailStatusDto> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const configRow = await prisma.enterpriseInboundEmailServerConfig.findUnique({
    where: { organizationId: ctx.organizationId },
  });
  const enabled =
    configRow?.enabled ??
    (process.env.INBOUND_EMAIL_ENABLED?.trim().toLowerCase() === "true" ||
      process.env.INBOUND_EMAIL_ENABLED?.trim() === "1");
  const passwordConfigured = isInboundImapPasswordConfigured();

  const [processedLast24h, failuresLast24h, lastSuccess, lastFailure, reviewQueue] =
    await Promise.all([
      prisma.enterpriseInboundEmailMessage.count({
        where: {
          organizationId: ctx.organizationId,
          processedAt: { gte: since },
          failureReason: null,
        },
      }),
      prisma.enterpriseInboundEmailMessage.count({
        where: {
          organizationId: ctx.organizationId,
          receivedAt: { gte: since },
          failureReason: { not: null },
        },
      }),
      prisma.enterpriseInboundEmailMessage.findFirst({
        where: {
          organizationId: ctx.organizationId,
          processedAt: { not: null },
          failureReason: null,
        },
        orderBy: { processedAt: "desc" },
        select: { processedAt: true },
      }),
      prisma.enterpriseInboundEmailMessage.findFirst({
        where: {
          organizationId: ctx.organizationId,
          failureReason: { not: null },
        },
        orderBy: { receivedAt: "desc" },
        select: { failureReason: true },
      }),
      prisma.enterpriseInboundEmailMessage.count({
        where: {
          organizationId: ctx.organizationId,
          matchStatus: { in: ["unmatched", "needs_review"] },
        },
      }),
    ]);

  const overallStatus = mapEmailStatus({
    enabled,
    passwordConfigured,
    failuresLast24h,
    lastProbeOk: configRow?.lastProbeOk ?? null,
  });

  return {
    ...buildChatGptIntegrationMeta(ctx),
    overallStatus,
    inboundEnabled: enabled,
    passwordConfigured,
    lastSuccessfulProcessingAt: lastSuccess?.processedAt?.toISOString() ?? null,
    processedLast24h,
    failuresLast24h,
    unmatchedReviewQueueCount: reviewQueue,
    lastFailureReason: truncateText(lastFailure?.failureReason ?? null, 200),
    lastProbeAt: configRow?.lastProbeAt?.toISOString() ?? null,
    lastProbeOk: configRow?.lastProbeOk ?? null,
  };
}
