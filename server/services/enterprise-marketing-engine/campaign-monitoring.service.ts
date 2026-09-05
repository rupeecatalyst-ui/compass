/**
 * CO-MARKETING-REDESIGN-015 — Campaign monitoring workspace application service.
 * ANALYTICS_VIEW for reads. Retry stays dry-run. Organisation "default" is rejected.
 */

import {
  ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
} from "@/constants/enterprise-marketing-engine/safety";
import { MARKETING_PERMISSIONS } from "@/constants/enterprise-marketing-engine/permissions";
import { MARKETING_CAMPAIGN_RECIPIENT_PAGE_SIZE } from "@/constants/enterprise-marketing-engine/campaign-monitoring";
import {
  MARKETING_DURABLE_PERSISTENCE_UNAVAILABLE,
  MARKETING_MEMORY_FALLBACK_FORBIDDEN,
  getConfiguredMarketingDurabilityPorts,
  resolveMarketingDurabilityPorts,
} from "@/lib/enterprise-marketing-engine/durability";
import { composeMarketingCampaignMonitoringSummary } from "@/lib/enterprise-marketing-engine/campaign-monitoring";
import { composeMarketingCampaignRecipientExplorer } from "@/lib/enterprise-marketing-engine/campaign-recipient-explorer";
import { composeMarketingRecipientTimeline } from "@/lib/enterprise-marketing-engine/recipient-timeline";
import {
  classifyMarketingBounceCategory,
  marketingIdentitiesMatch,
  marketingRecipientHasComplaint,
  marketingRecipientIsPermanentlySuppressed,
  marketingRecipientIsUnsubscribed,
} from "@/lib/enterprise-marketing-engine/campaign-monitoring-classify";
import {
  assertMarketingMonitoringRetryPermitted,
  retryMarketingMonitoringRecipient,
} from "@/lib/enterprise-marketing-engine/monitoring-retry";
import { assertMarketingDeliveryConfirmation } from "@/lib/enterprise-marketing-engine/delivery-operations";
import {
  assertMarketingPermission,
  hasMarketingPermission,
  type MarketingPermissionActor,
} from "@/lib/enterprise-marketing-engine/permissions";
import type {
  MarketingDurableAudienceSnapshotRecord,
  MarketingDurableEngagementEventRecord,
  MarketingDurableLedgerRecord,
  MarketingDurableQualificationRecord,
  MarketingDurableSnapshotRecipientRecord,
  MarketingDurableSuppressionRecord,
} from "@/types/enterprise-marketing-durability";
import type {
  MarketingCampaignMonitoringSummary,
  MarketingCampaignRecipientExplorerFilters,
  MarketingCampaignRecipientExplorerPage,
  MarketingRecipientTimeline,
} from "@/types/enterprise-marketing-campaign-monitoring";
import { recordMarketingAuditEvent } from "./audit";
import { marketingCampaignStore } from "./campaign-store";
import { marketingConsentService } from "./consent.service";
import { marketingQualificationStore } from "./qualification-store";
import { marketingSuppressionStore } from "./suppression-store";

type DurableBundle = {
  available: boolean;
  snapshots: MarketingDurableAudienceSnapshotRecord[];
  snapshotRecipients: MarketingDurableSnapshotRecipientRecord[];
  ledger: MarketingDurableLedgerRecord[];
  engagements: MarketingDurableEngagementEventRecord[];
  suppressions: MarketingDurableSuppressionRecord[];
  durableQualifications: MarketingDurableQualificationRecord[];
};

function orgId(actorOrg?: string | null) {
  const trimmed = (actorOrg ?? "").trim();
  if (!trimmed || trimmed === "default") {
    throw Object.assign(new Error("Marketing requires an authenticated organization"), {
      statusCode: 400,
      code: "ORGANIZATION_REQUIRED",
    });
  }
  return trimmed;
}

function isDurabilityUnavailable(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  return code === MARKETING_DURABLE_PERSISTENCE_UNAVAILABLE || code === MARKETING_MEMORY_FALLBACK_FORBIDDEN;
}

function capabilitiesFor(actor: MarketingPermissionActor) {
  return {
    retry: hasMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_RETRY),
    suppress: hasMarketingPermission(actor, MARKETING_PERMISSIONS.SUPPRESSION_MANAGE),
    viewSuppression: hasMarketingPermission(actor, MARKETING_PERMISSIONS.SUPPRESSION_VIEW),
    openQualification: hasMarketingPermission(actor, MARKETING_PERMISSIONS.ANALYTICS_VIEW),
  };
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
      durableQualifications,
    };
  } catch (err) {
    if (isDurabilityUnavailable(err)) return empty;
    throw err;
  }
}

async function campaignScope(organizationId: string, campaignId?: string | null) {
  const campaigns = await marketingCampaignStore.list(organizationId);
  return {
    campaignIds: campaigns.map((row) => row.id),
    campaignFilter: campaignId?.trim() || null,
  };
}

export const marketingCampaignMonitoringService = {
  async getSummary(
    actor: MarketingPermissionActor,
    query?: { campaignId?: string | null },
  ): Promise<MarketingCampaignMonitoringSummary> {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.ANALYTICS_VIEW);
    const organizationId = orgId(actor.organizationId);
    const scope = await campaignScope(organizationId, query?.campaignId);
    const durable = await loadDurableBundle(organizationId, scope.campaignIds, scope.campaignFilter);
    let qualifications = marketingQualificationStore.list(organizationId);
    if (scope.campaignFilter) {
      qualifications = qualifications.filter((row) => row.campaignId === scope.campaignFilter);
    }
    const summary = composeMarketingCampaignMonitoringSummary({
      organizationId,
      campaignId: scope.campaignFilter,
      durableAvailable: durable.available,
      providerConnected: ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
      snapshots: durable.snapshots,
      snapshotRecipients: durable.snapshotRecipients,
      ledger: durable.ledger,
      engagements: durable.engagements,
      durableSuppressions: durable.suppressions,
      consentRecords: marketingSuppressionStore.list(organizationId),
      durableQualifications: durable.durableQualifications,
      qualifications,
      capabilities: capabilitiesFor(actor),
    });
    recordMarketingAuditEvent({
      kind: "monitoring.dashboard.viewed",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: {
        campaignId: scope.campaignFilter,
        durableAvailable: durable.available,
        providerConnected: ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
      },
    });
    return summary;
  },

  async listRecipients(
    actor: MarketingPermissionActor,
    query?: {
      campaignId?: string | null;
      page?: number;
      pageSize?: number;
      filters?: MarketingCampaignRecipientExplorerFilters;
    },
  ): Promise<MarketingCampaignRecipientExplorerPage> {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.ANALYTICS_VIEW);
    const organizationId = orgId(actor.organizationId);
    const scope = await campaignScope(organizationId, query?.campaignId);
    const durable = await loadDurableBundle(organizationId, scope.campaignIds, scope.campaignFilter);
    const page = composeMarketingCampaignRecipientExplorer({
      organizationId,
      durableAvailable: durable.available,
      campaignId: scope.campaignFilter,
      recipients: durable.snapshotRecipients,
      ledger: durable.ledger,
      engagements: durable.engagements,
      durableSuppressions: durable.suppressions,
      consentRecords: marketingSuppressionStore.list(organizationId),
      durableQualifications: durable.durableQualifications,
      qualifications: marketingQualificationStore.list(organizationId),
      filters: query?.filters,
      page: query?.page,
      pageSize: query?.pageSize ?? MARKETING_CAMPAIGN_RECIPIENT_PAGE_SIZE,
    });
    recordMarketingAuditEvent({
      kind: "monitoring.recipients.listed",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: {
        campaignId: scope.campaignFilter,
        total: page.total,
        page: page.page,
        durableAvailable: durable.available,
      },
    });
    return page;
  },

  async getTimeline(
    actor: MarketingPermissionActor,
    recipientId: string,
  ): Promise<MarketingRecipientTimeline> {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.ANALYTICS_VIEW);
    const organizationId = orgId(actor.organizationId);
    const scope = await campaignScope(organizationId, null);
    const durable = await loadDurableBundle(organizationId, scope.campaignIds, null);
    const timeline = composeMarketingRecipientTimeline({
      organizationId,
      recipientId,
      durableAvailable: durable.available,
      recipients: durable.snapshotRecipients,
      ledger: durable.ledger,
      engagements: durable.engagements,
      durableSuppressions: durable.suppressions,
      consentRecords: marketingSuppressionStore.list(organizationId),
      durableQualifications: durable.durableQualifications,
      qualifications: marketingQualificationStore.list(organizationId),
    });
    if (!timeline) {
      throw Object.assign(new Error("Recipient timeline is unavailable"), {
        statusCode: 404,
        code: "RECIPIENT_NOT_FOUND",
      });
    }
    recordMarketingAuditEvent({
      kind: "monitoring.timeline.viewed",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { recipientId, eventCount: timeline.events.length },
    });
    return timeline;
  },

  async resolveRecipientFingerprint(
    actor: MarketingPermissionActor,
    recipientId: string,
  ): Promise<{ fingerprint: string; campaignId: string }> {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.ANALYTICS_VIEW);
    const organizationId = orgId(actor.organizationId);
    const scope = await campaignScope(organizationId, null);
    const durable = await loadDurableBundle(organizationId, scope.campaignIds, null);
    const recipient = durable.snapshotRecipients.find(
      (row) => row.id === recipientId && row.organizationId === organizationId,
    );
    if (!recipient) {
      throw Object.assign(new Error("Recipient record is unavailable"), {
        statusCode: 404,
        code: "RECIPIENT_NOT_FOUND",
      });
    }
    return {
      fingerprint: recipient.recipientFingerprint || `email:${recipient.normalizedEmail}`,
      campaignId: recipient.campaignId,
    };
  },

  async suppressionHistory(actor: MarketingPermissionActor, recipientId: string) {
    const resolved = await this.resolveRecipientFingerprint(actor, recipientId);
    return marketingConsentService.history(actor, resolved.fingerprint);
  },

  async suppressRecipient(
    actor: MarketingPermissionActor,
    input: { recipientId: string; reason: string },
  ) {
    const resolved = await this.resolveRecipientFingerprint(actor, input.recipientId);
    return marketingConsentService.add(actor, {
      fingerprint: resolved.fingerprint,
      reason: input.reason,
      kind: "MANUAL_SUPPRESSION",
      source: "MANUAL",
      campaignId: resolved.campaignId,
      duration: "PERMANENT",
    });
  },

  openQualification(actor: MarketingPermissionActor, input: { recipientId?: string; qualificationId?: string }) {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.ANALYTICS_VIEW);
    const organizationId = orgId(actor.organizationId);
    if (input.qualificationId?.trim()) {
      const row = marketingQualificationStore.getForOrg(input.qualificationId.trim(), organizationId);
      if (!row) {
        return { available: false as const, reason: "Unavailable" as const, qualification: null, href: null };
      }
      return {
        available: true as const,
        reason: null,
        qualification: {
          id: row.id,
          campaignId: row.campaignId,
          businessState: row.businessState,
          processState: row.processState,
        },
        href: `/admin/marketing/responses?qualificationId=${encodeURIComponent(row.id)}`,
      };
    }
    return { available: false as const, reason: "Unavailable" as const, qualification: null, href: null };
  },

  async retryRecipient(
    actor: MarketingPermissionActor,
    input: {
      campaignId: string;
      ledgerId: string;
      confirmed?: boolean;
      confirmationPhrase?: string;
    },
  ) {
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_RETRY);
    const organizationId = orgId(actor.organizationId);
    assertMarketingDeliveryConfirmation({
      action: "RETRY",
      confirmed: input.confirmed,
      confirmationPhrase: input.confirmationPhrase,
    });
    const durable = await loadDurableBundle(organizationId, [input.campaignId], input.campaignId);
    if (!durable.available) {
      throw Object.assign(new Error("Unavailable — durable delivery records are not connected"), {
        statusCode: 503,
        code: MARKETING_DURABLE_PERSISTENCE_UNAVAILABLE,
      });
    }
    const ledger = durable.ledger.find((row) => row.id === input.ledgerId && row.organizationId === organizationId);
    if (!ledger) {
      throw Object.assign(new Error("Recipient ledger record is unavailable"), {
        statusCode: 404,
        code: "LEDGER_NOT_FOUND",
      });
    }
    const relatedEngagements = durable.engagements.filter((event) => event.ledgerId === ledger.id);
    const consentRecords = marketingSuppressionStore.list(organizationId).filter((row) =>
      marketingIdentitiesMatch(row.fingerprint, ledger.normalizedEmail),
    );
    const durableSuppressions = durable.suppressions.filter((row) =>
      marketingIdentitiesMatch(row.identityFingerprint, ledger.normalizedEmail),
    );
    const bounceCategory = classifyMarketingBounceCategory({
      ledger,
      engagements: relatedEngagements,
      durableSuppressions,
      consentRecords,
    });
    const retryInput = {
      status: ledger.status,
      attemptCount: ledger.attemptCount,
      bounceCategory,
      unsubscribed: marketingRecipientIsUnsubscribed({
        ledger,
        engagements: relatedEngagements,
        consentRecords,
      }),
      complaint: marketingRecipientHasComplaint({
        ledger,
        engagements: relatedEngagements,
        consentRecords,
      }),
      permanentlySuppressed: marketingRecipientIsPermanentlySuppressed({
        ledger,
        durableSuppressions,
        consentRecords,
      }),
    };
    assertMarketingMonitoringRetryPermitted(retryInput);
    const ports = getConfiguredMarketingDurabilityPorts() ?? resolveMarketingDurabilityPorts();
    const result = await retryMarketingMonitoringRecipient({
      ports,
      organizationId,
      campaignId: input.campaignId,
      ledgerId: input.ledgerId,
      workerId: actor.userId ?? "campaign-monitoring",
      bounceCategory,
      unsubscribed: retryInput.unsubscribed,
      complaint: retryInput.complaint,
      permanentlySuppressed: retryInput.permanentlySuppressed,
    });
    if (!result.retried) {
      throw Object.assign(new Error("Retry could not be claimed for this recipient"), {
        statusCode: 409,
        code: "RETRY_NOT_PERMITTED",
        reason: result.reason,
      });
    }
    recordMarketingAuditEvent({
      kind: "monitoring.retry.claimed",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: {
        campaignId: input.campaignId,
        ledgerId: input.ledgerId,
        retried: result.retried,
        actuallySent: false,
      },
    });
    return { ...result, actuallySent: false as const };
  },
};
