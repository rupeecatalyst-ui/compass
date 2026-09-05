/**
 * CO-MARKETING-REDESIGN-002 — Restart-safe reconstruction from durable records.
 * Page refresh has no effect: state is read from repositories, not process memory.
 */

import type { MarketingDurabilityPorts } from "@/types/enterprise-marketing-durability-ports";
import { isTerminalSuccessfulDelivery } from "./retry-policy";

export type MarketingReconstructedExecutionState = {
  organizationId: string;
  campaignId: string;
  snapshotId: string | null;
  snapshotRecipientCount: number;
  currentBatchNumber: number | null;
  streamCursor: string | null;
  pauseState: string | null;
  attemptTotal: number;
  completedRecipientIds: string[];
  suppressionCount: number;
};

export async function reconstructMarketingExecutionState(
  ports: MarketingDurabilityPorts,
  organizationId: string,
  campaignId: string,
): Promise<MarketingReconstructedExecutionState> {
  const snapshots = await ports.snapshots.listByCampaign(organizationId, campaignId);
  const latest = snapshots.sort((a, b) => b.frozenAt.localeCompare(a.frozenAt))[0] ?? null;
  const recipients = latest
    ? await ports.snapshotRecipients.listBySnapshot(organizationId, latest.id)
    : [];
  const batches = await ports.batches.listByCampaign(organizationId, campaignId);
  const currentBatch = [...batches].reverse().find((batch) => batch.status === "processing") ?? batches.at(-1) ?? null;
  const lease = await ports.leases.getByCampaign(organizationId, campaignId);
  const ledger = await ports.ledger.listByCampaign(organizationId, campaignId);
  const suppressions = await ports.suppressions.list(organizationId);
  const completedRecipientIds = ledger
    .filter((row) => isTerminalSuccessfulDelivery(row.status))
    .map((row) => row.snapshotRecipientId);

  return {
    organizationId,
    campaignId,
    snapshotId: latest?.id ?? lease?.snapshotId ?? null,
    snapshotRecipientCount: recipients.length,
    currentBatchNumber: currentBatch?.batchNumber ?? lease?.lastCompletedBatchNumber ?? null,
    streamCursor: lease?.streamCursor ?? null,
    pauseState: lease?.pauseState ?? null,
    attemptTotal: ledger.reduce((sum, row) => sum + row.attemptCount, 0),
    completedRecipientIds,
    suppressionCount: suppressions.length,
  };
}

export function nextUnprocessedSnapshotRecipients<T extends { id: string }>(
  recipients: T[],
  completedRecipientIds: ReadonlySet<string>,
): T[] {
  return recipients.filter((row) => !completedRecipientIds.has(row.id));
}
