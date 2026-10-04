/**
 * CO-MARKETING-REDESIGN-020 — In-memory recovery store.
 * Records attempts, quarantine, and heartbeats. Not a production persistence adapter.
 */

import type {
  MarketingDeliveryAttemptRecord,
  MarketingQuarantineRecord,
  MarketingWorkerHeartbeat,
} from "@/types/enterprise-marketing-recovery";

export type MarketingRecoveryStore = {
  recordAttempt(record: Omit<MarketingDeliveryAttemptRecord, "id" | "dryRun"> & { id?: string }): MarketingDeliveryAttemptRecord;
  listAttempts(organizationId: string, campaignId: string): MarketingDeliveryAttemptRecord[];
  attemptsForKey(organizationId: string, idempotencyKey: string): MarketingDeliveryAttemptRecord[];
  quarantine(record: Omit<MarketingQuarantineRecord, "id" | "reviewRequired"> & { id?: string }): MarketingQuarantineRecord;
  listQuarantine(organizationId: string, campaignId?: string | null): MarketingQuarantineRecord[];
  heartbeat(record: MarketingWorkerHeartbeat): MarketingWorkerHeartbeat;
  lastHeartbeat(organizationId: string, campaignId: string): MarketingWorkerHeartbeat | null;
};

export function createMemoryMarketingRecoveryStore(): MarketingRecoveryStore {
  const attempts: MarketingDeliveryAttemptRecord[] = [];
  const quarantines: MarketingQuarantineRecord[] = [];
  const heartbeats: MarketingWorkerHeartbeat[] = [];
  let seq = 0;

  return {
    recordAttempt(record) {
      seq += 1;
      const next: MarketingDeliveryAttemptRecord = {
        ...record,
        id: record.id ?? `attempt-${seq}`,
        dryRun: true,
      };
      attempts.push(next);
      return next;
    },
    listAttempts(organizationId, campaignId) {
      return attempts.filter(
        (row) => row.organizationId === organizationId && row.campaignId === campaignId,
      );
    },
    attemptsForKey(organizationId, idempotencyKey) {
      return attempts.filter(
        (row) => row.organizationId === organizationId && row.idempotencyKey === idempotencyKey,
      );
    },
    quarantine(record) {
      seq += 1;
      const existing = quarantines.find(
        (row) =>
          row.organizationId === record.organizationId && row.idempotencyKey === record.idempotencyKey,
      );
      if (existing) return existing;
      const next: MarketingQuarantineRecord = {
        ...record,
        id: record.id ?? `quarantine-${seq}`,
        reviewRequired: true,
      };
      quarantines.push(next);
      return next;
    },
    listQuarantine(organizationId, campaignId) {
      return quarantines.filter(
        (row) =>
          row.organizationId === organizationId &&
          (campaignId == null || row.campaignId === campaignId),
      );
    },
    heartbeat(record) {
      heartbeats.push(record);
      return record;
    },
    lastHeartbeat(organizationId, campaignId) {
      return (
        [...heartbeats]
          .reverse()
          .find((row) => row.organizationId === organizationId && row.campaignId === campaignId) ?? null
      );
    },
  };
}
