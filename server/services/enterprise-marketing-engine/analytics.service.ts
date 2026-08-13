/**
 * CO-MARKETING-MKT-10 — Campaign analytics application service.
 * Composes ledger + events + config refs. Requires ANALYTICS_VIEW. No audience-row copy.
 */

import {
  ENTERPRISE_MARKETING_EMAIL_MODE,
  ENTERPRISE_MARKETING_HANDOFF_ENABLED,
  ENTERPRISE_MARKETING_WHATSAPP_MODE,
  MARKETING_PERMISSIONS,
} from "@/constants/enterprise-marketing-engine";
import {
  MARKETING_ANALYTICS_DRILLDOWN_PAGE_SIZE,
  MARKETING_ANALYTICS_ENGAGEMENT_PAGE_SIZE,
  marketingChannelEventCapabilities,
} from "@/constants/enterprise-marketing-engine/analytics";
import { deriveMarketingCampaignAnalytics } from "@/lib/enterprise-marketing-engine/analytics/derive-campaign-analytics";
import { redactMarketingFingerprint } from "@/lib/enterprise-marketing-engine/analytics/redact-fingerprint";
import { resolveMarketingAnalyticsTimeRange } from "@/lib/enterprise-marketing-engine/analytics/time-range";
import { isTimestampInRange } from "@/lib/enterprise-marketing-engine/analytics/time-range";
import {
  assertMarketingPermission,
  type MarketingPermissionActor,
} from "@/lib/enterprise-marketing-engine/permissions";
import type {
  MarketingAnalyticsDashboard,
  MarketingEngagementEventType,
  MarketingEngagementExplorerRow,
  MarketingExecutionDrilldownRow,
} from "@/types/enterprise-marketing-analytics";
import type { MarketingChannel } from "@/constants/enterprise-marketing-engine";
import type { MarketingRecipientLedgerStatus } from "@/types/enterprise-marketing-execution";
import { recordMarketingAuditEvent } from "./audit";
import { marketingAudienceDefinitionStore } from "./audience-definition-store";
import { marketingCampaignStore } from "./campaign-store";
import { marketingDataSourceBindingStore } from "./binding-store";
import { marketingDataSourceService } from "./data-source.service";
import { marketingEngagementEventStore } from "./engagement-event-store";
import { marketingExecutionBatchStore } from "./execution-batch-store";
import { marketingExecutionLedgerStore } from "./execution-ledger-store";
import { marketingQualificationStore } from "./qualification-store";
import { marketingSuppressionStore } from "./suppression-store";

async function resolveAudienceEstimates(
  organizationId: string,
  audiences: ReturnType<typeof marketingAudienceDefinitionStore.list>,
): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = {};
  const port = marketingDataSourceService.getPort(organizationId);
  for (const audience of audiences) {
    if (!port.estimateAudience) {
      out[audience.id] = null;
      continue;
    }
    try {
      const estimate = await port.estimateAudience(audience.bindingId, audience.datasetId);
      out[audience.id] =
        typeof estimate.dataRowEstimate === "number"
          ? estimate.dataRowEstimate
          : typeof estimate.approximateRowCount === "number"
            ? estimate.approximateRowCount
            : null;
    } catch {
      out[audience.id] = null;
    }
  }
  return out;
}

export const marketingAnalyticsService = {
  async getDashboard(
    actor: MarketingPermissionActor,
    query: {
      preset?: string | null;
      from?: string | null;
      to?: string | null;
      campaignId?: string | null;
      channel?: string | null;
    },
  ): Promise<MarketingAnalyticsDashboard> {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.ANALYTICS_VIEW);
    const organizationId = actor.organizationId ?? "default";
    const range = resolveMarketingAnalyticsTimeRange(query);
    let campaigns = marketingCampaignStore.list(organizationId);
    if (query.campaignId?.trim()) {
      campaigns = campaigns.filter((c) => c.id === query.campaignId!.trim());
    }
    if (query.channel?.trim()) {
      const ch = query.channel.trim().toUpperCase();
      campaigns = campaigns.filter((c) => c.channel === ch);
    }
    const audiences = marketingAudienceDefinitionStore.list(organizationId);
    const audienceEstimates = await resolveAudienceEstimates(organizationId, audiences);
    const dashboard = deriveMarketingCampaignAnalytics({
      range,
      campaigns,
      audiences,
      bindings: marketingDataSourceBindingStore.list(organizationId),
      ledger: marketingExecutionLedgerStore.listForCampaigns(campaigns.map((c) => c.id)),
      batches: marketingExecutionBatchStore.listForCampaigns(campaigns.map((c) => c.id)),
      events: marketingEngagementEventStore.list(organizationId),
      suppressions: marketingSuppressionStore.list(organizationId),
      qualifications: marketingQualificationStore.list(organizationId),
      channelCapabilities: marketingChannelEventCapabilities({
        emailMode: ENTERPRISE_MARKETING_EMAIL_MODE,
        whatsappMode: ENTERPRISE_MARKETING_WHATSAPP_MODE,
        handoffEnabled: ENTERPRISE_MARKETING_HANDOFF_ENABLED,
      }),
      handoffEnabled: ENTERPRISE_MARKETING_HANDOFF_ENABLED,
      audienceEstimates,
    });

    recordMarketingAuditEvent({
      kind: "analytics.dashboard.viewed",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: {
        preset: range.preset,
        campaignCount: campaigns.length,
        eventCount: dashboard.engagement.length,
        campaignId: query.campaignId ?? null,
        channel: query.channel ?? null,
      },
    });

    return dashboard;
  },

  listEngagement(
    actor: MarketingPermissionActor,
    query: {
      preset?: string | null;
      from?: string | null;
      to?: string | null;
      campaignId?: string | null;
      channel?: string | null;
      type?: string | null;
      page?: number;
      pageSize?: number;
    },
  ): {
    rows: MarketingEngagementExplorerRow[];
    total: number;
    page: number;
    pageSize: number;
  } {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.ANALYTICS_VIEW);
    const organizationId = actor.organizationId ?? "default";
    const range = resolveMarketingAnalyticsTimeRange(query);
    const pageSize = Math.min(
      Math.max(1, query.pageSize ?? MARKETING_ANALYTICS_ENGAGEMENT_PAGE_SIZE),
      100,
    );
    const page = Math.max(1, query.page ?? 1);
    const campaigns = marketingCampaignStore.list(organizationId);
    const nameById = new Map(campaigns.map((c) => [c.id, c.name]));

    let events = marketingEngagementEventStore
      .list(organizationId)
      .filter((e) => isTimestampInRange(e.occurredAt, range));
    if (query.campaignId?.trim()) {
      events = events.filter((e) => e.campaignId === query.campaignId!.trim());
    }
    if (query.channel?.trim()) {
      const ch = query.channel.trim().toUpperCase() as MarketingChannel;
      events = events.filter((e) => e.channel === ch);
    }
    if (query.type?.trim()) {
      const t = query.type.trim().toUpperCase() as MarketingEngagementEventType;
      events = events.filter((e) => e.type === t);
    }

    const total = events.length;
    const start = (page - 1) * pageSize;
    const rows = events.slice(start, start + pageSize).map((e) => ({
      id: e.id,
      campaignId: e.campaignId,
      campaignName: nameById.get(e.campaignId) ?? e.campaignId,
      channel: e.channel,
      type: e.type,
      occurredAt: e.occurredAt,
      fingerprintPreview: redactMarketingFingerprint(e.recipientFingerprint),
      errorCode: e.errorCode ?? null,
    }));

    recordMarketingAuditEvent({
      kind: "analytics.engagement.listed",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { total, page, pageSize, campaignId: query.campaignId ?? null },
    });

    return { rows, total, page, pageSize };
  },

  listExecutionDrilldown(
    actor: MarketingPermissionActor,
    query: {
      preset?: string | null;
      from?: string | null;
      to?: string | null;
      campaignId: string;
      status?: string | null;
      page?: number;
      pageSize?: number;
    },
  ): {
    rows: MarketingExecutionDrilldownRow[];
    total: number;
    page: number;
    pageSize: number;
  } {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.ANALYTICS_VIEW);
    const organizationId = actor.organizationId ?? "default";
    const campaignId = query.campaignId.trim();
    const campaign = marketingCampaignStore.getForOrg(campaignId, organizationId);
    if (!campaign) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const range = resolveMarketingAnalyticsTimeRange(query);
    const pageSize = Math.min(
      Math.max(1, query.pageSize ?? MARKETING_ANALYTICS_DRILLDOWN_PAGE_SIZE),
      100,
    );
    const page = Math.max(1, query.page ?? 1);

    let entries = marketingExecutionLedgerStore
      .listByCampaign(campaignId)
      .filter((e) => isTimestampInRange(e.processedAt ?? e.updatedAt, range));
    if (query.status?.trim()) {
      const status = query.status.trim() as MarketingRecipientLedgerStatus;
      entries = entries.filter((e) => e.status === status);
    }
    entries.sort((a, b) =>
      (b.processedAt ?? b.updatedAt).localeCompare(a.processedAt ?? a.updatedAt),
    );

    const total = entries.length;
    const start = (page - 1) * pageSize;
    const rows = entries.slice(start, start + pageSize).map((e) => ({
      id: e.id,
      campaignId: e.campaignId,
      campaignName: campaign.name,
      channel: e.channel,
      status: e.status,
      fingerprintPreview: redactMarketingFingerprint(e.recipientFingerprint),
      batchId: e.batchId ?? null,
      processedAt: e.processedAt ?? null,
      lastError: e.lastError ?? null,
    }));

    recordMarketingAuditEvent({
      kind: "analytics.execution.drilldown",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { campaignId, total, page, pageSize, status: query.status ?? null },
    });

    return { rows, total, page, pageSize };
  },
};
