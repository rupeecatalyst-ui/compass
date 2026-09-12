/**
 * CO-MARKETING-REDESIGN-009 — Decision-ready final review model.
 */

import type { MarketingCampaign, MarketingCampaignVersion } from "@/types/enterprise-marketing-campaign";
import type { MarketingAudiencePreviewResult } from "@/types/enterprise-marketing-audience";
import type { MarketingColumnMap, MarketingDurableAudienceSnapshotRecord, MarketingDurableExecutionLeaseRecord, MarketingDurableLedgerRecord } from "@/types/enterprise-marketing-durability";
import type { MarketingBatchPolicy, MarketingExecutionSummary } from "@/types/enterprise-marketing-execution";
import type { MarketingTestSendHistoryEntry } from "@/lib/enterprise-marketing-engine/test-send-safety";
import type { MarketingReconstructedExecutionState } from "@/lib/enterprise-marketing-engine/durability/reconstruct";
import { hasMarketingUnsubscribeBlock } from "@/lib/enterprise-marketing-engine/visual-editor";
import { estimateMarketingDeliveryPlan } from "@/lib/enterprise-marketing-engine/campaign-builder-shell";
import {
  MARKETING_DEFAULT_BATCH_INTERVAL_MS,
  MARKETING_DEFAULT_BATCH_POLICY,
  MARKETING_DEFAULT_BATCH_SIZE,
} from "@/constants/enterprise-marketing-engine/execution";
import { MARKETING_LIVE_PROVIDER_SENDING_DISABLED } from "@/constants/enterprise-marketing-engine/delivery-operations";
import { ENTERPRISE_MARKETING_EXECUTION_ENABLED } from "@/constants/enterprise-marketing-engine/safety";
import {
  MARKETING_PHASE1_FROM_EMAIL,
  MARKETING_PHASE1_FROM_NAME,
  MARKETING_PHASE1_LIVE_RECIPIENT_CEILING,
  MARKETING_PHASE1_REPLY_TO,
} from "@/constants/enterprise-marketing-engine/hostinger-smtp";

function display(value: string | number | null | undefined): string {
  if (value == null || value === "") return "Unavailable";
  return String(value);
}

export const MARKETING_READINESS_REVIEW_LABELS = [
  "Campaign name",
  "Objective",
  "Owner",
  "Channel",
  "Sender identity",
  "Subject",
  "Preheader",
  "Content version",
  "Unsubscribe status",
  "Source workbook",
  "Source tab",
  "Mapped columns",
  "Total source rows",
  "Valid addresses",
  "Invalid addresses",
  "Duplicates removed",
  "Suppressions",
  "Exclusions",
  "Previously contacted",
  "Final frozen eligible count",
  "Snapshot ID",
  "Snapshot hash",
  "Snapshot time",
  "Batch size",
  "Interval",
  "Daily window",
  "Daily cap",
  "First batch time",
  "Total batches",
  "Estimated completion",
  "Tracking settings",
  "Consent status",
  "Unresolved warnings",
  "Latest test-send result",
  "Approver",
  "Approval timestamp",
] as const;

export type MarketingReadinessReviewField = { label: string; value: string };

export type MarketingReadinessReviewModel = {
  fields: MarketingReadinessReviewField[];
  unresolvedWarnings: string[];
  liveProviderSendingDisabled: true;
  notice: string;
  snapshotFrozen: boolean;
  contentFrozen: boolean;
  defaults: { batchSize: number; intervalMs: number };
};

export type MarketingDeliveryOperationsDisplay = {
  currentBatch: string;
  nextBatch: string;
  completedRecipients: number;
  remainingRecipients: number;
  failures: number;
  lastWorkerHeartbeat: string;
  leaseStatus: string;
  nextScheduledExecution: string;
};

export function composeMarketingReadinessReview(input: {
  campaign: MarketingCampaign;
  version: MarketingCampaignVersion;
  ownerUserId?: string | null;
  workbookName?: string | null;
  tabName?: string | null;
  columnMap?: MarketingColumnMap | null;
  preview?: Pick<MarketingAudiencePreviewResult, "counts"> | null;
  snapshot?: (MarketingDurableAudienceSnapshotRecord & {
    snapshotHash?: string;
    sourceRowCount?: number;
    validEmailCount?: number;
    duplicateCount?: number;
    invalidCount?: number;
    suppressedCount?: number;
    previouslyContactedCount?: number;
  }) | null;
  excludedCount?: number | null;
  unresolvedWarnings?: string[];
  latestTestSend?: MarketingTestSendHistoryEntry | null;
  batchPolicy?: MarketingBatchPolicy | null;
}): MarketingReadinessReviewModel {
  const policy = input.batchPolicy ?? input.campaign.batchPolicy ?? MARKETING_DEFAULT_BATCH_POLICY;
  const counts = input.preview?.counts;
  const snapshot = input.snapshot;
  const eligible = snapshot?.eligibleCount ?? counts?.eligible ?? null;
  const delivery = estimateMarketingDeliveryPlan({
    startAt: policy.startAt ?? input.campaign.schedulePlaceholder.startAt ?? "",
    batchSize: policy.batchSize,
    intervalMs: policy.intervalMs,
    dailyMax: policy.dailyMax,
    eligibleCount: eligible,
  });
  const mapped = input.columnMap
    ? Object.entries(input.columnMap)
        .filter(([, value]) => value && typeof value === "string")
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")
    : "Unavailable";
  const unsubscribe = hasMarketingUnsubscribeBlock(input.version.content)
    ? "Structural unsubscribe present"
    : "Missing structural unsubscribe";
  const warnings = input.unresolvedWarnings ?? [];
  const fields: MarketingReadinessReviewField[] = [
    { label: "Campaign name", value: display(input.campaign.name) },
    { label: "Objective", value: display(input.campaign.objective) },
    { label: "Owner", value: display(input.ownerUserId ?? input.campaign.routingPlaceholder.ownerUserId) },
    { label: "Channel", value: display(input.campaign.channel) },
    { label: "Sender identity", value: `${input.campaign.sender.fromName} <${input.campaign.sender.fromAddress}>` },
    { label: "Subject", value: display(input.version.subject) },
    { label: "Preheader", value: display(input.version.previewText) },
    { label: "Content version", value: `v${input.version.versionNumber}${input.version.immutable ? " frozen" : " draft"}` },
    { label: "Unsubscribe status", value: unsubscribe },
    { label: "Source workbook", value: display(input.workbookName ?? snapshot?.sourceWorkbookId) },
    { label: "Source tab", value: display(input.tabName ?? snapshot?.sourceTabName) },
    { label: "Mapped columns", value: mapped || "Unavailable" },
    { label: "Total source rows", value: display(snapshot?.sourceRowCount ?? counts?.totalRows) },
    { label: "Valid addresses", value: display(snapshot?.validEmailCount ?? counts?.validEmails) },
    { label: "Invalid addresses", value: display(snapshot?.invalidCount ?? counts?.invalidEmails) },
    { label: "Duplicates removed", value: display(snapshot?.duplicateCount ?? counts?.duplicate) },
    { label: "Suppressions", value: display(snapshot?.suppressedCount ?? counts?.suppressed) },
    { label: "Exclusions", value: display(input.excludedCount ?? counts?.excludedByFilter) },
    { label: "Previously contacted", value: display(snapshot?.previouslyContactedCount ?? counts?.previouslyContacted) },
    { label: "Final frozen eligible count", value: display(snapshot?.eligibleCount ?? eligible) },
    { label: "Snapshot ID", value: display(snapshot?.id) },
    { label: "Snapshot hash", value: display(snapshot?.snapshotHash) },
    { label: "Snapshot time", value: display(snapshot?.frozenAt ?? snapshot?.extractedAt) },
    { label: "Batch size", value: display(policy.batchSize) },
    { label: "Interval", value: `${Math.round(policy.intervalMs / 60000)} minutes` },
    { label: "Daily window", value: `${policy.sendWindowStart}–${policy.sendWindowEnd} ${policy.timezone}` },
    { label: "Daily cap", value: display(policy.dailyMax) },
    { label: "First batch time", value: delivery.firstBatch },
    { label: "Total batches", value: delivery.batchCount },
    { label: "Estimated completion", value: delivery.completionEstimate },
    { label: "Tracking settings", value: input.version.trackingEnabled ? "Tracking enabled" : "Tracking disabled" },
    { label: "Consent status", value: input.columnMap?.consent ? `Mapped: ${input.columnMap.consent}` : "Consent column not mapped" },
    { label: "Unresolved warnings", value: warnings.length ? warnings.join("; ") : "None" },
    {
      label: "Latest test-send result",
      value: input.latestTestSend
        ? `${input.latestTestSend.adapterResult} · actuallySent=${input.latestTestSend.actuallySent}`
        : "No test-send yet",
    },
    { label: "Approver", value: display(input.campaign.governance.approvedByUserId) },
    { label: "Approval timestamp", value: display(input.campaign.governance.approvedAt) },
    { label: "Live execution", value: "OFF" },
    { label: "Provider connect", value: "OFF" },
    { label: "Phase-1 live recipient ceiling", value: String(MARKETING_PHASE1_LIVE_RECIPIENT_CEILING) },
    {
      label: "Phase-1 sender identity",
      value: `${MARKETING_PHASE1_FROM_NAME} <${MARKETING_PHASE1_FROM_EMAIL}> · reply ${MARKETING_PHASE1_REPLY_TO}`,
    },
    { label: "Email provider adapter", value: "Hostinger SMTP · live gates OFF" },
  ];

  return {
    fields,
    unresolvedWarnings: warnings,
    liveProviderSendingDisabled: true,
    notice: ENTERPRISE_MARKETING_EXECUTION_ENABLED
      ? "Live execution flag is on — this programme still must not send."
      : MARKETING_LIVE_PROVIDER_SENDING_DISABLED,
    snapshotFrozen: Boolean(snapshot?.id && snapshot.frozenAt),
    contentFrozen: Boolean(input.version.immutable && input.version.frozenAt),
    defaults: { batchSize: MARKETING_DEFAULT_BATCH_SIZE, intervalMs: MARKETING_DEFAULT_BATCH_INTERVAL_MS },
  };
}

export function projectMarketingDeliveryOperations(
  summary: MarketingExecutionSummary | null,
): MarketingDeliveryOperationsDisplay {
  if (!summary?.lease) {
    return emptyDeliveryOperationsDisplay();
  }
  const counts = summary.ledgerCounts;
  const completed = (counts.processed ?? 0) + (counts.delivered ?? 0);
  const remaining = counts.eligible ?? 0;
  const held = summary.lease.leaseHolder ? `held by ${summary.lease.leaseHolder}` : "idle";
  return {
    currentBatch: display(summary.lease.lastBatchId),
    nextBatch: display(summary.lease.nextRunAt),
    completedRecipients: completed,
    remainingRecipients: remaining,
    failures: counts.failed ?? 0,
    lastWorkerHeartbeat: display(summary.lease.updatedAt ?? summary.lease.leaseExpiresAt),
    leaseStatus: `${held}${summary.lease.errorState ? ` · ${summary.lease.errorState}` : ""}`,
    nextScheduledExecution: display(summary.lease.nextRunAt),
  };
}

export function projectMarketingDeliveryOperationsFromDurable(input: {
  reconstructed?: MarketingReconstructedExecutionState | null;
  lease?: MarketingDurableExecutionLeaseRecord | null;
  ledger?: MarketingDurableLedgerRecord[];
}): MarketingDeliveryOperationsDisplay {
  const lease = input.lease ?? null;
  const reconstructed = input.reconstructed ?? null;
  if (!lease && !reconstructed) return emptyDeliveryOperationsDisplay();
  const ledger = input.ledger ?? [];
  const completed = ledger.filter((row) => row.status === "sent" || row.status === "delivered").length;
  const remaining = ledger.filter((row) =>
    row.status === "eligible" || row.status === "queued" || row.status === "scheduled",
  ).length;
  const failures = ledger.filter((row) => row.status === "failed" || row.status === "deferred" || row.status === "bounced").length;
  const held = lease?.leaseHolder ? `held by ${lease.leaseHolder}` : "idle";
  const pause = lease?.pauseState ?? reconstructed?.pauseState ?? "No lease";
  return {
    currentBatch: display(reconstructed?.currentBatchNumber ?? lease?.lastCompletedBatchNumber),
    nextBatch: display(lease?.nextRunAt),
    completedRecipients: completed,
    remainingRecipients: remaining,
    failures,
    lastWorkerHeartbeat: display(lease?.updatedAt ?? lease?.leaseExpiresAt),
    leaseStatus: `${pause} · ${held}`,
    nextScheduledExecution: display(lease?.nextRunAt),
  };
}

function emptyDeliveryOperationsDisplay(): MarketingDeliveryOperationsDisplay {
  return {
    currentBatch: "Unavailable",
    nextBatch: "Unavailable",
    completedRecipients: 0,
    remainingRecipients: 0,
    failures: 0,
    lastWorkerHeartbeat: "Unavailable",
    leaseStatus: "No lease",
    nextScheduledExecution: "Unavailable",
  };
}
