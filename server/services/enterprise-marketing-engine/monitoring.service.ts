/**
 * CO-MARKETING-REDESIGN-010 — Durable monitoring + recipient explorer application service.
 * ANALYTICS_VIEW. Organisation-scoped. Fail into Unavailable when Prisma ports are absent.
 */

import {
  ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
  MARKETING_PERMISSIONS,
} from "@/constants/enterprise-marketing-engine";
import { MARKETING_RECIPIENT_EXPLORER_PAGE_SIZE } from "@/constants/enterprise-marketing-engine/monitoring";
import {
  MARKETING_DURABLE_PERSISTENCE_UNAVAILABLE,
  MARKETING_MEMORY_FALLBACK_FORBIDDEN,
  getConfiguredMarketingDurabilityPorts,
  resolveMarketingDurabilityPorts,
} from "@/lib/enterprise-marketing-engine/durability";
import { composeMarketingMonitoringDashboard } from "@/lib/enterprise-marketing-engine/monitoring";
import { composeMarketingRecipientExplorer } from "@/lib/enterprise-marketing-engine/recipient-explorer";
import {
  assertMarketingPermission,
  type MarketingPermissionActor,
} from "@/lib/enterprise-marketing-engine/permissions";
import type {
  MarketingDurableAudienceSnapshotRecord,
  MarketingDurableEngagementEventRecord,
  MarketingDurableLedgerRecord,
  MarketingDurableQualificationRecord,
  MarketingDurableSnapshotRecipientRecord,
  MarketingDurableSuppressionRecord,
  MarketingDurableTestSendRecord,
} from "@/types/enterprise-marketing-durability";
import type {
  MarketingMonitoringDashboard,
  MarketingRecipientExplorerPage,
} from "@/types/enterprise-marketing-monitoring";
import { recordMarketingAuditEvent } from "./audit";
import { marketingCampaignStore } from "./campaign-store";
import { marketingQualificationStore } from "./qualification-store";

type DurableBundle = {
  available: boolean;
  snapshots: MarketingDurableAudienceSnapshotRecord[];
  snapshotRecipients: MarketingDurableSnapshotRecipientRecord[];
  ledger: MarketingDurableLedgerRecord[];
  engagements: MarketingDurableEngagementEventRecord[];
  suppressions: MarketingDurableSuppressionRecord[];
  testSends: MarketingDurableTestSendRecord[];
  durableQualifications: MarketingDurableQualificationRecord[];
};

function isDurabilityUnavailable(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  return code === MARKETING_DURABLE_PERSISTENCE_UNAVAILABLE || code === MARKETING_MEMORY_FALLBACK_FORBIDDEN;
}

async function loadDurableBundle(
  organizationId: string,
  campaignIds: string[],
  campaignFilter?: string | null,
): Promise<DurableBundle> {
  const empty: DurableBundle = {
    available: false,
    snapshots: [],
    snapshotRecipients: [],
    ledger: [],
    engagements: [],
    suppressions: [],
    testSends: [],
    durableQualifications: [],
  };
  try {
    const ports = getConfiguredMarketingDurabilityPorts() ?? resolveMarketingDurabilityPorts();
    const ids = campaignFilter?.trim()
      ? campaignIds.filter((id) => id === campaignFilter.trim())
      : campaignIds;
    const snapshots: MarketingDurableAudienceSnapshotRecord[] = [];
    const snapshotRecipients: MarketingDurableSnapshotRecipientRecord[] = [];
    const ledger: MarketingDurableLedgerRecord[] = [];
    const engagements: MarketingDurableEngagementEventRecord[] = [];
    const testSends: MarketingDurableTestSendRecord[] = [];
    for (const campaignId of ids) {
      const campaignSnapshots = await ports.snapshots.listByCampaign(organizationId, campaignId);
      snapshots.push(...campaignSnapshots);
      for (const snapshot of campaignSnapshots) {
        snapshotRecipients.push(
          ...(await ports.snapshotRecipients.listBySnapshot(organizationId, snapshot.id)),
        );
      }
      ledger.push(...(await ports.ledger.listByCampaign(organizationId, campaignId)));
      engagements.push(...(await ports.engagements.listByCampaign(organizationId, campaignId)));
      testSends.push(...(await ports.testSends.listByCampaign(organizationId, campaignId)));
    }
    const suppressions = await ports.suppressions.list(organizationId);
    const durableQualifications = await ports.qualifications.list(organizationId);
    return {
      available: true,
      snapshots,
      snapshotRecipients,
      ledger,
      engagements,
      suppressions,
      testSends,
      durableQualifications,
    };
  } catch (err) {
    if (isDurabilityUnavailable(err)) return empty;
    throw err;
  }
}

export const marketingMonitoringService = {
  async getDashboard(
    actor: MarketingPermissionActor,
    query?: { campaignId?: string | null },
  ): Promise<MarketingMonitoringDashboard> {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.ANALYTICS_VIEW);
    const organizationId = actor.organizationId ?? "default";
    const campaigns = await marketingCampaignStore.list(organizationId);
    const campaignIds = campaigns.map((row) => row.id);
    const campaignFilter = query?.campaignId?.trim() || null;
    const durable = await loadDurableBundle(organizationId, campaignIds, campaignFilter);
    let qualifications = marketingQualificationStore.list(organizationId);
    if (campaignFilter) {
      qualifications = qualifications.filter((row) => row.campaignId === campaignFilter);
    }

    const dashboard = composeMarketingMonitoringDashboard({
      organizationId,
      durableAvailable: durable.available,
      providerConnected: ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
      snapshots: durable.snapshots,
      snapshotRecipients: durable.snapshotRecipients,
      ledger: durable.ledger,
      engagements: durable.engagements,
      suppressions: durable.suppressions,
      testSends: durable.testSends,
      durableQualifications: durable.durableQualifications,
      qualifications,
    });

    recordMarketingAuditEvent({
      kind: "monitoring.dashboard.viewed",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: {
        campaignId: campaignFilter,
        durableAvailable: durable.available,
        providerConnected: ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
      },
    });

    return dashboard;
  },

  async listRecipients(
    actor: MarketingPermissionActor,
    query?: {
      campaignId?: string | null;
      page?: number;
      pageSize?: number;
    },
  ): Promise<MarketingRecipientExplorerPage> {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.ANALYTICS_VIEW);
    const organizationId = actor.organizationId ?? "default";
    const campaigns = await marketingCampaignStore.list(organizationId);
    const durable = await loadDurableBundle(
      organizationId,
      campaigns.map((row) => row.id),
      query?.campaignId,
    );
    const page = composeMarketingRecipientExplorer({
      organizationId,
      durableAvailable: durable.available,
      recipients: durable.snapshotRecipients,
      ledger: durable.ledger,
      campaignId: query?.campaignId,
      page: query?.page,
      pageSize: query?.pageSize ?? MARKETING_RECIPIENT_EXPLORER_PAGE_SIZE,
    });

    recordMarketingAuditEvent({
      kind: "monitoring.recipients.listed",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: {
        campaignId: query?.campaignId ?? null,
        total: page.total,
        page: page.page,
        durableAvailable: durable.available,
      },
    });

    return page;
  },
};
