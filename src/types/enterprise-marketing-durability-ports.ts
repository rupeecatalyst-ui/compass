/**
 * CO-MARKETING-REDESIGN-002 — Durable Marketing repository ports.
 * Organisation-scoped. Prisma is the production adapter. Memory is a test fixture only.
 */

import type {
  MarketingDurableAudienceDefinitionRecord,
  MarketingDurableAudienceSnapshotRecord,
  MarketingDurableAuditEventRecord,
  MarketingDurableDeliveryBatchRecord,
  MarketingDurableEngagementEventRecord,
  MarketingDurableExecutionLeaseRecord,
  MarketingDurableLedgerRecord,
  MarketingDurableQualificationRecord,
  MarketingDurableSheetBindingRecord,
  MarketingDurableSnapshotRecipientRecord,
  MarketingDurableSuppressionRecord,
  MarketingDurableTestSendRecord,
  MarketingLeasePauseState,
} from "./enterprise-marketing-durability";

export const MARKETING_CLAIM_REJECT_REASONS = [
  "already_terminal",
  "in_flight",
  "already_claimed",
  "retry_not_allowed",
  "retry_delayed",
  "concurrency",
  "org_mismatch",
  "stopped",
] as const;

export type MarketingClaimRejectReason = (typeof MARKETING_CLAIM_REJECT_REASONS)[number];

export type MarketingRecipientClaimInput = {
  organizationId: string;
  campaignId: string;
  campaignVersionId: string;
  snapshotId: string;
  snapshotRecipientId: string;
  channel: string;
  normalizedEmail: string;
  sourceStableKey: string;
  idempotencyKey: string;
  batchId: string;
  batchNumber: number;
  workerId: string;
};

export type MarketingRecipientClaimResult =
  | { ok: true; duplicate: false; record: MarketingDurableLedgerRecord }
  | {
      ok: false;
      duplicate: true;
      record: MarketingDurableLedgerRecord | null;
      reason: MarketingClaimRejectReason;
    };

export type MarketingBatchClaimInput = {
  organizationId: string;
  campaignId: string;
  snapshotId: string;
  batchNumber: number;
  scheduledAt: string;
  plannedSize: number;
  workerId: string;
  dryRun?: boolean;
};

export type MarketingBatchClaimResult =
  | { ok: true; duplicate: false; record: MarketingDurableDeliveryBatchRecord }
  | {
      ok: false;
      duplicate: true;
      record: MarketingDurableDeliveryBatchRecord | null;
      reason: MarketingClaimRejectReason;
    };

export interface MarketingSheetBindingRepository {
  upsert(record: MarketingDurableSheetBindingRecord): Promise<MarketingDurableSheetBindingRecord>;
  getForOrg(id: string, organizationId: string): Promise<MarketingDurableSheetBindingRecord | null>;
  list(organizationId: string): Promise<MarketingDurableSheetBindingRecord[]>;
}

export interface MarketingAudienceDefinitionRepository {
  upsert(record: MarketingDurableAudienceDefinitionRecord): Promise<MarketingDurableAudienceDefinitionRecord>;
  getForOrg(id: string, organizationId: string): Promise<MarketingDurableAudienceDefinitionRecord | null>;
  list(organizationId: string): Promise<MarketingDurableAudienceDefinitionRecord[]>;
}

export interface MarketingAudienceSnapshotRepository {
  insert(record: MarketingDurableAudienceSnapshotRecord): Promise<MarketingDurableAudienceSnapshotRecord>;
  getForOrg(id: string, organizationId: string): Promise<MarketingDurableAudienceSnapshotRecord | null>;
  listByCampaign(organizationId: string, campaignId: string): Promise<MarketingDurableAudienceSnapshotRecord[]>;
}

export interface MarketingSnapshotRecipientRepository {
  insertMany(records: MarketingDurableSnapshotRecipientRecord[]): Promise<number>;
  listBySnapshot(organizationId: string, snapshotId: string): Promise<MarketingDurableSnapshotRecipientRecord[]>;
  listUnprocessed(
    organizationId: string,
    snapshotId: string,
    completedRecipientIds: ReadonlySet<string>,
  ): Promise<MarketingDurableSnapshotRecipientRecord[]>;
}

export interface MarketingDeliveryBatchRepository {
  tryClaim(input: MarketingBatchClaimInput): Promise<MarketingBatchClaimResult>;
  getForOrg(id: string, organizationId: string): Promise<MarketingDurableDeliveryBatchRecord | null>;
  getByCampaignNumber(
    organizationId: string,
    campaignId: string,
    batchNumber: number,
  ): Promise<MarketingDurableDeliveryBatchRecord | null>;
  listByCampaign(organizationId: string, campaignId: string): Promise<MarketingDurableDeliveryBatchRecord[]>;
  finalize(
    organizationId: string,
    id: string,
    patch: Partial<Pick<MarketingDurableDeliveryBatchRecord, "status" | "processedAt">>,
  ): Promise<MarketingDurableDeliveryBatchRecord | null>;
}

export interface MarketingRecipientLedgerRepository {
  tryClaim(input: MarketingRecipientClaimInput): Promise<MarketingRecipientClaimResult>;
  getByIdempotencyKey(
    organizationId: string,
    idempotencyKey: string,
  ): Promise<MarketingDurableLedgerRecord | null>;
  listByCampaign(organizationId: string, campaignId: string): Promise<MarketingDurableLedgerRecord[]>;
  finalize(
    organizationId: string,
    idempotencyKey: string,
    patch: Partial<
      Pick<
        MarketingDurableLedgerRecord,
        "status" | "processedAt" | "providerMessageId" | "suppressionReason"
      >
    >,
  ): Promise<MarketingDurableLedgerRecord | null>;
}

export interface MarketingExecutionLeaseRepository {
  getByCampaign(organizationId: string, campaignId: string): Promise<MarketingDurableExecutionLeaseRecord | null>;
  upsert(record: MarketingDurableExecutionLeaseRecord): Promise<MarketingDurableExecutionLeaseRecord>;
  tryAcquire(organizationId: string, campaignId: string, holderId: string, ttlMs: number): Promise<boolean>;
  release(organizationId: string, campaignId: string, holderId: string): Promise<void>;
  setPauseState(
    organizationId: string,
    campaignId: string,
    pauseState: MarketingLeasePauseState,
    patch?: Partial<Pick<MarketingDurableExecutionLeaseRecord, "nextRunAt" | "streamCursor">>,
  ): Promise<MarketingDurableExecutionLeaseRecord | null>;
}

export interface MarketingSuppressionRepository {
  upsert(record: MarketingDurableSuppressionRecord): Promise<MarketingDurableSuppressionRecord>;
  list(organizationId: string): Promise<MarketingDurableSuppressionRecord[]>;
  findMatch(
    organizationId: string,
    identityFingerprint: string,
    channel: string,
  ): Promise<MarketingDurableSuppressionRecord | null>;
}

export interface MarketingEngagementRepository {
  record(record: MarketingDurableEngagementEventRecord): Promise<{
    event: MarketingDurableEngagementEventRecord;
    duplicate: boolean;
  }>;
  listByCampaign(organizationId: string, campaignId: string): Promise<MarketingDurableEngagementEventRecord[]>;
}

export interface MarketingTestSendRepository {
  record(record: MarketingDurableTestSendRecord): Promise<MarketingDurableTestSendRecord>;
  listByCampaign(organizationId: string, campaignId: string): Promise<MarketingDurableTestSendRecord[]>;
}

export interface MarketingQualificationRepository {
  upsert(record: MarketingDurableQualificationRecord): Promise<MarketingDurableQualificationRecord>;
  getForOrg(id: string, organizationId: string): Promise<MarketingDurableQualificationRecord | null>;
  list(organizationId: string): Promise<MarketingDurableQualificationRecord[]>;
}

export interface MarketingAuditEventRepository {
  append(record: MarketingDurableAuditEventRecord): Promise<MarketingDurableAuditEventRecord>;
  list(organizationId: string, campaignId?: string | null): Promise<MarketingDurableAuditEventRecord[]>;
}

export type MarketingDurabilityPorts = {
  kind: "prisma" | "memory-test-fixture";
  bindings: MarketingSheetBindingRepository;
  audienceDefinitions: MarketingAudienceDefinitionRepository;
  snapshots: MarketingAudienceSnapshotRepository;
  snapshotRecipients: MarketingSnapshotRecipientRepository;
  batches: MarketingDeliveryBatchRepository;
  ledger: MarketingRecipientLedgerRepository;
  leases: MarketingExecutionLeaseRepository;
  suppressions: MarketingSuppressionRepository;
  engagements: MarketingEngagementRepository;
  testSends: MarketingTestSendRepository;
  qualifications: MarketingQualificationRepository;
  audit: MarketingAuditEventRepository;
};
