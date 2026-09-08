/**
 * CO-MARKETING-REDESIGN-002 — Prisma-backed durability adapters.
 * Production-only. Does not import in-memory stores. Fail closed if the client surface is missing.
 */

import type {
  MarketingDurableAudienceDefinitionRecord,
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
} from "@/types/enterprise-marketing-durability";
import type { MarketingDurabilityPorts } from "@/types/enterprise-marketing-durability-ports";
import { marketingDurabilityUnavailable } from "../errors";
import { decideMarketingBatchClaim, decideMarketingRecipientClaim } from "../claim";
import { MARKETING_APPROVED_RETRY_POLICY } from "../retry-policy";
import {
  asMarketingDurabilityPrisma,
  isPrismaUniqueConflict,
  type MarketingDurabilityPrismaSurface,
} from "./prisma-surface";

export const MARKETING_PRISMA_ADAPTER_KIND = "prisma" as const;

function requireDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function createPrismaMarketingDurabilityPorts(
  client: MarketingDurabilityPrismaSurface,
): MarketingDurabilityPorts {
  const db = asMarketingDurabilityPrisma(client);
  if (!db) {
    throw marketingDurabilityUnavailable("Prisma Marketing durability delegates are not available");
  }

  return {
    kind: MARKETING_PRISMA_ADAPTER_KIND,
    bindings: {
      async upsert(record) {
        const data = {
          id: record.id,
          organizationId: record.organizationId,
          displayName: record.displayName,
          spreadsheetId: record.spreadsheetId,
          driveFileId: record.driveFileId,
          authorised: record.authorised,
          authRef: record.authRef,
          status: record.status,
          createdByUserId: record.createdByUserId,
          updatedByUserId: record.updatedByUserId,
          createdAt: requireDate(record.createdAt),
          updatedAt: requireDate(record.updatedAt),
        };
        const row = (await db.enterpriseMarketingSheetBinding.upsert({
          where: { id: record.id },
          create: data,
          update: data,
        })) as MarketingDurableSheetBindingRecord;
        return {
          ...record,
          ...row,
          createdAt: requireDate((row as { createdAt?: Date | string }).createdAt ?? record.createdAt).toISOString(),
          updatedAt: requireDate((row as { updatedAt?: Date | string }).updatedAt ?? record.updatedAt).toISOString(),
        };
      },
      async getForOrg(id, organizationId) {
        return (await db.enterpriseMarketingSheetBinding.findFirst({
          where: { id, organizationId },
        })) as MarketingDurableSheetBindingRecord | null;
      },
      async list(organizationId) {
        return (await db.enterpriseMarketingSheetBinding.findMany({
          where: { organizationId },
        })) as MarketingDurableSheetBindingRecord[];
      },
    },
    audienceDefinitions: {
      async upsert(record) {
        const data = {
          id: record.id,
          organizationId: record.organizationId,
          campaignId: null,
          bindingId: record.bindingId,
          name: record.name || "Audience",
          description: record.description ?? null,
          sourceTabId: record.sourceTabId,
          sourceTabName: record.sourceTabName,
          columnMapJson: record.columnMap,
          filterDefinitionJson: record.filterDefinition ?? {},
          exclusionJson: record.exclusionDefinition ?? null,
          suppressionPolicyJson: record.suppressionPolicy ?? {},
          eligibilityRulesJson: record.eligibilityRules ?? {},
          createdByUserId: record.createdByUserId,
          updatedByUserId: record.updatedByUserId,
          createdAt: requireDate(record.createdAt),
          updatedAt: requireDate(record.updatedAt),
        };
        const row = (await db.enterpriseMarketingAudienceDefinition.upsert({
          where: { id: record.id },
          create: data,
          update: data,
        })) as Record<string, unknown>;
        return {
          ...record,
          id: String(row.id ?? record.id),
          columnMap: (row.columnMapJson as MarketingDurableAudienceDefinitionRecord["columnMap"]) ?? record.columnMap,
        };
      },
      async getForOrg(id, organizationId) {
        return (await db.enterpriseMarketingAudienceDefinition.findFirst({
          where: { id, organizationId },
        })) as MarketingDurableAudienceDefinitionRecord | null;
      },
      async list(organizationId) {
        return (await db.enterpriseMarketingAudienceDefinition.findMany({
          where: { organizationId },
        })) as MarketingDurableAudienceDefinitionRecord[];
      },
    },
    snapshots: {
      async insert(record) {
        return (await db.enterpriseMarketingAudienceSnapshot.create({
          data: record,
        })) as Awaited<ReturnType<MarketingDurabilityPorts["snapshots"]["insert"]>>;
      },
      async getForOrg(id, organizationId) {
        return (await db.enterpriseMarketingAudienceSnapshot.findFirst({
          where: { id, organizationId },
        })) as Awaited<ReturnType<MarketingDurabilityPorts["snapshots"]["getForOrg"]>>;
      },
      async listByCampaign(organizationId, campaignId) {
        return (await db.enterpriseMarketingAudienceSnapshot.findMany({
          where: { organizationId, campaignId },
        })) as Awaited<ReturnType<MarketingDurabilityPorts["snapshots"]["listByCampaign"]>>;
      },
    },
    snapshotRecipients: {
      async insertMany(records: MarketingDurableSnapshotRecipientRecord[]) {
        let inserted = 0;
        for (const record of records) {
          try {
            await db.enterpriseMarketingSnapshotRecipient.create({ data: record });
            inserted += 1;
          } catch (error) {
            if (!isPrismaUniqueConflict(error)) throw error;
          }
        }
        return inserted;
      },
      async listBySnapshot(organizationId, snapshotId) {
        return (await db.enterpriseMarketingSnapshotRecipient.findMany({
          where: { organizationId, snapshotId },
        })) as MarketingDurableSnapshotRecipientRecord[];
      },
      async listUnprocessed(organizationId, snapshotId, completedRecipientIds) {
        const rows = (await db.enterpriseMarketingSnapshotRecipient.findMany({
          where: { organizationId, snapshotId },
        })) as MarketingDurableSnapshotRecipientRecord[];
        return rows.filter((row) => !completedRecipientIds.has(row.id));
      },
    },
    batches: {
      async tryClaim(input) {
        return db.$transaction(async (tx) => {
          const existing = (await tx.enterpriseMarketingDeliveryBatch.findFirst({
            where: {
              organizationId: input.organizationId,
              campaignId: input.campaignId,
              batchNumber: input.batchNumber,
            },
          })) as MarketingDurableDeliveryBatchRecord | null;
          const decision = decideMarketingBatchClaim(existing);
          if (decision.action === "reject") {
            return { ok: false, duplicate: true, record: existing, reason: decision.reason };
          }
          if (existing && decision.action === "claim_existing") {
            const claimed = await tx.enterpriseMarketingDeliveryBatch.updateMany({
              where: {
                id: existing.id,
                organizationId: input.organizationId,
                status: { in: ["scheduled", "queued"] },
              },
              data: { status: "processing", updatedAt: new Date() },
            });
            if (claimed.count !== 1) {
              const latest = (await tx.enterpriseMarketingDeliveryBatch.findFirst({
                where: { id: existing.id, organizationId: input.organizationId },
              })) as MarketingDurableDeliveryBatchRecord | null;
              return { ok: false, duplicate: true, record: latest, reason: "concurrency" };
            }
            const record = (await tx.enterpriseMarketingDeliveryBatch.findFirst({
              where: { id: existing.id, organizationId: input.organizationId },
            })) as MarketingDurableDeliveryBatchRecord;
            return { ok: true, duplicate: false, record };
          }
          try {
            const record = (await tx.enterpriseMarketingDeliveryBatch.create({
              data: {
                organizationId: input.organizationId,
                campaignId: input.campaignId,
                snapshotId: input.snapshotId,
                batchNumber: input.batchNumber,
                scheduledAt: requireDate(input.scheduledAt),
                plannedSize: input.plannedSize,
                status: "processing",
                dryRun: input.dryRun ?? true,
              },
            })) as MarketingDurableDeliveryBatchRecord;
            return { ok: true, duplicate: false, record };
          } catch (error) {
            if (!isPrismaUniqueConflict(error)) throw error;
            const latest = (await tx.enterpriseMarketingDeliveryBatch.findFirst({
              where: {
                organizationId: input.organizationId,
                campaignId: input.campaignId,
                batchNumber: input.batchNumber,
              },
            })) as MarketingDurableDeliveryBatchRecord | null;
            return { ok: false, duplicate: true, record: latest, reason: "concurrency" };
          }
        });
      },
      async getForOrg(id, organizationId) {
        return (await db.enterpriseMarketingDeliveryBatch.findFirst({
          where: { id, organizationId },
        })) as MarketingDurableDeliveryBatchRecord | null;
      },
      async getByCampaignNumber(organizationId, campaignId, batchNumber) {
        return (await db.enterpriseMarketingDeliveryBatch.findFirst({
          where: { organizationId, campaignId, batchNumber },
        })) as MarketingDurableDeliveryBatchRecord | null;
      },
      async listByCampaign(organizationId, campaignId) {
        return (await db.enterpriseMarketingDeliveryBatch.findMany({
          where: { organizationId, campaignId },
        })) as MarketingDurableDeliveryBatchRecord[];
      },
      async finalize(organizationId, id, patch) {
        const updated = await db.enterpriseMarketingDeliveryBatch.updateMany({
          where: { id, organizationId },
          data: patch,
        });
        if (updated.count !== 1) return null;
        return (await db.enterpriseMarketingDeliveryBatch.findFirst({
          where: { id, organizationId },
        })) as MarketingDurableDeliveryBatchRecord | null;
      },
    },
    ledger: {
      async tryClaim(input) {
        return db.$transaction(async (tx) => {
          const lease = (await tx.enterpriseMarketingExecutionLease.findFirst({
            where: { organizationId: input.organizationId, campaignId: input.campaignId },
          })) as MarketingDurableExecutionLeaseRecord | null;
          if (lease?.pauseState === "STOPPED") {
            return { ok: false, duplicate: true, record: null, reason: "stopped" };
          }
          const existing = (await tx.enterpriseMarketingRecipientLedger.findFirst({
            where: { organizationId: input.organizationId, idempotencyKey: input.idempotencyKey },
          })) as MarketingDurableLedgerRecord | null;
          const decision = decideMarketingRecipientClaim(existing, Date.now(), MARKETING_APPROVED_RETRY_POLICY);
          if (decision.action === "reject") {
            return { ok: false, duplicate: true, record: existing, reason: decision.reason };
          }
          if (existing && (decision.action === "claim_existing" || decision.action === "retry_failed")) {
            const retryWhere =
              decision.action === "retry_failed"
                ? { status: { in: ["failed", "deferred", "bounced"] } }
                : { status: { in: ["eligible", "queued", "scheduled", "processing"] } };
            const claimed = await tx.enterpriseMarketingRecipientLedger.updateMany({
              where: {
                id: existing.id,
                organizationId: input.organizationId,
                ...retryWhere,
              },
              data: {
                status: "processing",
                batchId: input.batchId,
                batchNumber: input.batchNumber,
                claimedAt: new Date(),
                attemptCount: { increment: 1 },
                updatedAt: new Date(),
              },
            });
            if (claimed.count !== 1) {
              const latest = (await tx.enterpriseMarketingRecipientLedger.findFirst({
                where: { id: existing.id, organizationId: input.organizationId },
              })) as MarketingDurableLedgerRecord | null;
              return { ok: false, duplicate: true, record: latest, reason: "concurrency" };
            }
            const record = (await tx.enterpriseMarketingRecipientLedger.findFirst({
              where: { id: existing.id, organizationId: input.organizationId },
            })) as MarketingDurableLedgerRecord;
            return { ok: true, duplicate: false, record };
          }
          try {
            const record = (await tx.enterpriseMarketingRecipientLedger.create({
              data: {
                organizationId: input.organizationId,
                campaignId: input.campaignId,
                campaignVersionId: input.campaignVersionId,
                snapshotId: input.snapshotId,
                snapshotRecipientId: input.snapshotRecipientId,
                channel: input.channel,
                normalizedEmail: input.normalizedEmail,
                sourceStableKey: input.sourceStableKey,
                idempotencyKey: input.idempotencyKey,
                batchId: input.batchId,
                batchNumber: input.batchNumber,
                status: "processing",
                attemptCount: 1,
                claimedAt: new Date(),
              },
            })) as MarketingDurableLedgerRecord;
            return { ok: true, duplicate: false, record };
          } catch (error) {
            if (!isPrismaUniqueConflict(error)) throw error;
            const latest = (await tx.enterpriseMarketingRecipientLedger.findFirst({
              where: { organizationId: input.organizationId, idempotencyKey: input.idempotencyKey },
            })) as MarketingDurableLedgerRecord | null;
            return { ok: false, duplicate: true, record: latest, reason: "concurrency" };
          }
        });
      },
      async getByIdempotencyKey(organizationId, idempotencyKey) {
        return (await db.enterpriseMarketingRecipientLedger.findFirst({
          where: { organizationId, idempotencyKey },
        })) as MarketingDurableLedgerRecord | null;
      },
      async listByCampaign(organizationId, campaignId) {
        return (await db.enterpriseMarketingRecipientLedger.findMany({
          where: { organizationId, campaignId },
        })) as MarketingDurableLedgerRecord[];
      },
      async finalize(organizationId, idempotencyKey, patch) {
        const updated = await db.enterpriseMarketingRecipientLedger.updateMany({
          where: { organizationId, idempotencyKey },
          data: patch,
        });
        if (updated.count !== 1) return null;
        return (await db.enterpriseMarketingRecipientLedger.findFirst({
          where: { organizationId, idempotencyKey },
        })) as MarketingDurableLedgerRecord | null;
      },
    },
    leases: {
      async getByCampaign(organizationId, campaignId) {
        return (await db.enterpriseMarketingExecutionLease.findFirst({
          where: { organizationId, campaignId },
        })) as MarketingDurableExecutionLeaseRecord | null;
      },
      async upsert(record) {
        return (await db.enterpriseMarketingExecutionLease.upsert({
          where: { campaignId: record.campaignId },
          create: record,
          update: record,
        })) as MarketingDurableExecutionLeaseRecord;
      },
      async tryAcquire(organizationId, campaignId, holderId, ttlMs) {
        return db.$transaction(async (tx) => {
          const existing = (await tx.enterpriseMarketingExecutionLease.findFirst({
            where: { organizationId, campaignId },
          })) as MarketingDurableExecutionLeaseRecord | null;
          if (!existing) return false;
          const now = Date.now();
          if (
            existing.leaseHolder &&
            existing.leaseExpiresAt &&
            Date.parse(String(existing.leaseExpiresAt)) > now &&
            existing.leaseHolder !== holderId
          ) {
            return false;
          }
          const claimed = await tx.enterpriseMarketingExecutionLease.updateMany({
            where: { id: existing.id, organizationId },
            data: {
              leaseHolder: holderId,
              leaseExpiresAt: new Date(now + ttlMs),
              updatedAt: new Date(),
            },
          });
          return claimed.count === 1;
        });
      },
      async release(organizationId, campaignId, holderId) {
        await db.enterpriseMarketingExecutionLease.updateMany({
          where: { organizationId, campaignId, leaseHolder: holderId },
          data: { leaseHolder: null, leaseExpiresAt: null, updatedAt: new Date() },
        });
      },
      async setPauseState(organizationId, campaignId, pauseState, patch) {
        const updated = await db.enterpriseMarketingExecutionLease.updateMany({
          where: { organizationId, campaignId },
          data: { pauseState, ...patch, updatedAt: new Date() },
        });
        if (updated.count !== 1) return null;
        return (await db.enterpriseMarketingExecutionLease.findFirst({
          where: { organizationId, campaignId },
        })) as MarketingDurableExecutionLeaseRecord | null;
      },
    },
    suppressions: {
      async upsert(record) {
        return (await db.enterpriseMarketingSuppression.upsert({
          where: { id: record.id },
          create: record,
          update: record,
        })) as MarketingDurableSuppressionRecord;
      },
      async list(organizationId) {
        return (await db.enterpriseMarketingSuppression.findMany({
          where: { organizationId },
        })) as MarketingDurableSuppressionRecord[];
      },
      async findMatch(organizationId, identityFingerprint, channel) {
        return (await db.enterpriseMarketingSuppression.findFirst({
          where: { organizationId, identityFingerprint, channel },
        })) as MarketingDurableSuppressionRecord | null;
      },
    },
    engagements: {
      async record(record) {
        const existing = (await db.enterpriseMarketingEngagementEvent.findFirst({
          where: { organizationId: record.organizationId, providerEventId: record.providerEventId },
        })) as MarketingDurableEngagementEventRecord | null;
        if (existing) return { event: existing, duplicate: true };
        try {
          const event = (await db.enterpriseMarketingEngagementEvent.create({
            data: record,
          })) as MarketingDurableEngagementEventRecord;
          return { event, duplicate: false };
        } catch (error) {
          if (!isPrismaUniqueConflict(error)) throw error;
          const latest = (await db.enterpriseMarketingEngagementEvent.findFirst({
            where: { organizationId: record.organizationId, providerEventId: record.providerEventId },
          })) as MarketingDurableEngagementEventRecord;
          return { event: latest, duplicate: true };
        }
      },
      async listByCampaign(organizationId, campaignId) {
        return (await db.enterpriseMarketingEngagementEvent.findMany({
          where: { organizationId, campaignId },
        })) as MarketingDurableEngagementEventRecord[];
      },
    },
    testSends: {
      async record(record) {
        return (await db.enterpriseMarketingTestSend.upsert({
          where: {
            organizationId_idempotencyKey: {
              organizationId: record.organizationId,
              idempotencyKey: record.idempotencyKey,
            },
          },
          create: record,
          update: record,
        })) as MarketingDurableTestSendRecord;
      },
      async listByCampaign(organizationId, campaignId) {
        return (await db.enterpriseMarketingTestSend.findMany({
          where: { organizationId, campaignId },
        })) as MarketingDurableTestSendRecord[];
      },
    },
    qualifications: {
      async upsert(record) {
        return (await db.enterpriseMarketingQualification.upsert({
          where: { id: record.id },
          create: record,
          update: record,
        })) as MarketingDurableQualificationRecord;
      },
      async getForOrg(id, organizationId) {
        return (await db.enterpriseMarketingQualification.findFirst({
          where: { id, organizationId },
        })) as MarketingDurableQualificationRecord | null;
      },
      async list(organizationId) {
        return (await db.enterpriseMarketingQualification.findMany({
          where: { organizationId },
        })) as MarketingDurableQualificationRecord[];
      },
    },
    audit: {
      async append(record) {
        return (await db.enterpriseMarketingAuditEvent.create({
          data: {
            ...record,
            detailJson: record.detailJson ?? {},
          },
        })) as MarketingDurableAuditEventRecord;
      },
      async list(organizationId, campaignId) {
        return (await db.enterpriseMarketingAuditEvent.findMany({
          where: campaignId ? { organizationId, campaignId } : { organizationId },
        })) as MarketingDurableAuditEventRecord[];
      },
    },
  };
}

export { asMarketingDurabilityPrisma };
