/**
 * CO-MARKETING-REDESIGN-002 — In-memory durability adapters.
 * Explicit test fixture only. Never selected as a production fallback.
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
} from "@/types/enterprise-marketing-durability";
import type {
  MarketingBatchClaimInput,
  MarketingDurabilityPorts,
  MarketingRecipientClaimInput,
} from "@/types/enterprise-marketing-durability-ports";
import { MARKETING_EXECUTION_LEASE_TTL_MS } from "@/constants/enterprise-marketing-engine/execution";
import { decideMarketingBatchClaim, decideMarketingRecipientClaim } from "../claim";
import { MARKETING_APPROVED_RETRY_POLICY } from "../retry-policy";

export const MARKETING_MEMORY_FIXTURE_KIND = "memory-test-fixture" as const;

export type MarketingDurabilitySerializedState = {
  bindings: MarketingDurableSheetBindingRecord[];
  audienceDefinitions: MarketingDurableAudienceDefinitionRecord[];
  snapshots: MarketingDurableAudienceSnapshotRecord[];
  snapshotRecipients: MarketingDurableSnapshotRecipientRecord[];
  batches: MarketingDurableDeliveryBatchRecord[];
  ledger: MarketingDurableLedgerRecord[];
  leases: MarketingDurableExecutionLeaseRecord[];
  suppressions: MarketingDurableSuppressionRecord[];
  engagements: MarketingDurableEngagementEventRecord[];
  testSends: MarketingDurableTestSendRecord[];
  qualifications: MarketingDurableQualificationRecord[];
  audit: MarketingDurableAuditEventRecord[];
};

export type MarketingDurabilityMemoryFixture = MarketingDurabilityPorts & {
  kind: typeof MARKETING_MEMORY_FIXTURE_KIND;
  exportState(): MarketingDurabilitySerializedState;
};

function nowIso() {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function withOrg<T extends { organizationId: string }>(row: T | undefined, organizationId: string): T | null {
  if (!row || row.organizationId !== organizationId) return null;
  return clone(row);
}

function indexPut<T extends { id: string }>(map: Map<string, T>, row: T) {
  map.set(row.id, clone(row));
}

async function withKeyLock(
  locks: Map<string, Promise<void>>,
  key: string,
  fn: () => Promise<unknown> | unknown,
) {
  const previous = locks.get(key) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = previous.then(() => gate);
  locks.set(key, chained);
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}

export function createMemoryMarketingDurabilityPorts(
  seed?: Partial<MarketingDurabilitySerializedState>,
): MarketingDurabilityMemoryFixture {
  const bindings = new Map<string, MarketingDurableSheetBindingRecord>();
  const audienceDefinitions = new Map<string, MarketingDurableAudienceDefinitionRecord>();
  const snapshots = new Map<string, MarketingDurableAudienceSnapshotRecord>();
  const snapshotRecipients = new Map<string, MarketingDurableSnapshotRecipientRecord>();
  const batches = new Map<string, MarketingDurableDeliveryBatchRecord>();
  const ledger = new Map<string, MarketingDurableLedgerRecord>();
  const leases = new Map<string, MarketingDurableExecutionLeaseRecord>();
  const suppressions = new Map<string, MarketingDurableSuppressionRecord>();
  const engagements = new Map<string, MarketingDurableEngagementEventRecord>();
  const testSends = new Map<string, MarketingDurableTestSendRecord>();
  const qualifications = new Map<string, MarketingDurableQualificationRecord>();
  const audit: MarketingDurableAuditEventRecord[] = [];
  const claimLocks = new Map<string, Promise<void>>();
  const batchLocks = new Map<string, Promise<void>>();
  const leaseLocks = new Map<string, Promise<void>>();
  let seq = 0;

  const load = <T extends { id: string }>(rows: T[] | undefined, map: Map<string, T>) => {
    for (const row of rows ?? []) map.set(row.id, clone(row));
  };
  load(seed?.bindings, bindings);
  load(seed?.audienceDefinitions, audienceDefinitions);
  load(seed?.snapshots, snapshots);
  load(seed?.snapshotRecipients, snapshotRecipients);
  load(seed?.batches, batches);
  load(seed?.ledger, ledger);
  load(seed?.leases, leases);
  load(seed?.suppressions, suppressions);
  load(seed?.engagements, engagements);
  load(seed?.testSends, testSends);
  load(seed?.qualifications, qualifications);
  if (seed?.audit) audit.push(...seed.audit.map(clone));

  function nextId(prefix: string) {
    seq += 1;
    return `${prefix}-${seq}`;
  }

  const fixture: MarketingDurabilityMemoryFixture = {
    kind: MARKETING_MEMORY_FIXTURE_KIND,
    bindings: {
      async upsert(record) {
        if (record.organizationId !== record.organizationId.trim()) {
          throw new Error("organizationId required");
        }
        const existing = [...bindings.values()].find(
          (row) => row.organizationId === record.organizationId && row.spreadsheetId === record.spreadsheetId,
        );
        const next = {
          ...record,
          id: record.id || existing?.id || nextId("bind"),
          createdAt: existing?.createdAt ?? record.createdAt,
          updatedAt: nowIso(),
        };
        indexPut(bindings, next);
        return clone(next);
      },
      async getForOrg(id, organizationId) {
        return withOrg(bindings.get(id), organizationId);
      },
      async list(organizationId) {
        return [...bindings.values()]
          .filter((row) => row.organizationId === organizationId)
          .map(clone);
      },
    },
    audienceDefinitions: {
      async upsert(record) {
        const next = { ...record, id: record.id || nextId("aud"), updatedAt: nowIso() };
        indexPut(audienceDefinitions, next);
        return clone(next);
      },
      async getForOrg(id, organizationId) {
        return withOrg(audienceDefinitions.get(id), organizationId);
      },
      async list(organizationId) {
        return [...audienceDefinitions.values()]
          .filter((row) => row.organizationId === organizationId)
          .map(clone);
      },
    },
    snapshots: {
      async insert(record) {
        const next = { ...record, id: record.id || nextId("snap") };
        indexPut(snapshots, next);
        return clone(next);
      },
      async getForOrg(id, organizationId) {
        return withOrg(snapshots.get(id), organizationId);
      },
      async listByCampaign(organizationId, campaignId) {
        return [...snapshots.values()]
          .filter((row) => row.organizationId === organizationId && row.campaignId === campaignId)
          .map(clone);
      },
    },
    snapshotRecipients: {
      async insertMany(records) {
        for (const record of records) {
          if (
            [...snapshotRecipients.values()].some(
              (row) =>
                row.snapshotId === record.snapshotId &&
                (row.normalizedEmail === record.normalizedEmail ||
                  row.sourceStableKey === record.sourceStableKey),
            )
          ) {
            continue;
          }
          indexPut(snapshotRecipients, { ...record, id: record.id || nextId("rcpt") });
        }
        return records.length;
      },
      async listBySnapshot(organizationId, snapshotId) {
        return [...snapshotRecipients.values()]
          .filter((row) => row.organizationId === organizationId && row.snapshotId === snapshotId)
          .map(clone);
      },
      async listUnprocessed(organizationId, snapshotId, completedRecipientIds) {
        return [...snapshotRecipients.values()]
          .filter(
            (row) =>
              row.organizationId === organizationId &&
              row.snapshotId === snapshotId &&
              !completedRecipientIds.has(row.id),
          )
          .map(clone);
      },
    },
    batches: {
      async tryClaim(input: MarketingBatchClaimInput) {
        const lockKey = `${input.organizationId}:${input.campaignId}:${input.batchNumber}`;
        return (await withKeyLock(batchLocks, lockKey, () => {
          const existing =
            [...batches.values()].find(
              (row) =>
                row.organizationId === input.organizationId &&
                row.campaignId === input.campaignId &&
                row.batchNumber === input.batchNumber,
            ) ?? null;
          const decision = decideMarketingBatchClaim(existing);
          if (decision.action === "reject") {
            return { ok: false, duplicate: true, record: existing ? clone(existing) : null, reason: decision.reason };
          }
          const ts = nowIso();
          const record: MarketingDurableDeliveryBatchRecord = existing
            ? {
                ...existing,
                status: "processing",
                updatedAt: ts,
                updatedByUserId: input.workerId,
              }
            : {
                id: nextId("batch"),
                organizationId: input.organizationId,
                campaignId: input.campaignId,
                snapshotId: input.snapshotId,
                batchNumber: input.batchNumber,
                scheduledAt: input.scheduledAt,
                processedAt: null,
                status: "processing",
                dryRun: input.dryRun ?? true,
                createdByUserId: input.workerId,
                updatedByUserId: input.workerId,
                createdAt: ts,
                updatedAt: ts,
              };
          indexPut(batches, record);
          return { ok: true, duplicate: false, record: clone(record) };
        })) as Awaited<ReturnType<MarketingDurabilityPorts["batches"]["tryClaim"]>>;
      },
      async getForOrg(id, organizationId) {
        return withOrg(batches.get(id), organizationId);
      },
      async getByCampaignNumber(organizationId, campaignId, batchNumber) {
        const row = [...batches.values()].find(
          (item) =>
            item.organizationId === organizationId &&
            item.campaignId === campaignId &&
            item.batchNumber === batchNumber,
        );
        return row ? clone(row) : null;
      },
      async listByCampaign(organizationId, campaignId) {
        return [...batches.values()]
          .filter((row) => row.organizationId === organizationId && row.campaignId === campaignId)
          .sort((a, b) => a.batchNumber - b.batchNumber)
          .map(clone);
      },
      async finalize(organizationId, id, patch) {
        const existing = withOrg(batches.get(id), organizationId);
        if (!existing) return null;
        const next = { ...existing, ...patch, updatedAt: nowIso() };
        indexPut(batches, next);
        return clone(next);
      },
    },
    ledger: {
      async tryClaim(input: MarketingRecipientClaimInput) {
        const lockKey = `${input.organizationId}:${input.idempotencyKey}`;
        return (await withKeyLock(claimLocks, lockKey, () => {
          const existing =
            [...ledger.values()].find(
              (row) =>
                row.organizationId === input.organizationId && row.idempotencyKey === input.idempotencyKey,
            ) ?? null;
          if (existing && existing.organizationId !== input.organizationId) {
            return { ok: false, duplicate: true, record: null, reason: "org_mismatch" };
          }
          const lease = [...leases.values()].find(
            (row) => row.organizationId === input.organizationId && row.campaignId === input.campaignId,
          );
          if (lease?.pauseState === "STOPPED") {
            return { ok: false, duplicate: true, record: existing ? clone(existing) : null, reason: "stopped" };
          }
          const decision = decideMarketingRecipientClaim(existing, Date.now(), MARKETING_APPROVED_RETRY_POLICY);
          if (decision.action === "reject") {
            return { ok: false, duplicate: true, record: existing ? clone(existing) : null, reason: decision.reason };
          }
          const ts = nowIso();
          const base = existing ?? {
            id: nextId("led"),
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
            status: "processing" as const,
            scheduledAt: ts,
            claimedAt: ts,
            processedAt: null,
            attemptCount: 0,
            providerMessageId: null,
            openedAt: null,
            clickedAt: null,
            repliedAt: null,
            unsubscribedAt: null,
            suppressionReason: null,
            linkedContactId: null,
            linkedOpportunityId: null,
            createdByUserId: input.workerId,
            updatedByUserId: input.workerId,
            createdAt: ts,
            updatedAt: ts,
          };
          const record: MarketingDurableLedgerRecord = {
            ...base,
            status: "processing",
            batchId: input.batchId,
            batchNumber: input.batchNumber,
            claimedAt: ts,
            attemptCount: decision.action === "retry_failed" || decision.action === "insert" || decision.action === "claim_existing"
              ? (decision.action === "insert" ? 1 : existing!.attemptCount + 1)
              : base.attemptCount,
            updatedByUserId: input.workerId,
            updatedAt: ts,
          };
          indexPut(ledger, record);
          return { ok: true, duplicate: false, record: clone(record) };
        })) as Awaited<ReturnType<MarketingDurabilityPorts["ledger"]["tryClaim"]>>;
      },
      async getByIdempotencyKey(organizationId, idempotencyKey) {
        const row = [...ledger.values()].find(
          (item) => item.organizationId === organizationId && item.idempotencyKey === idempotencyKey,
        );
        return row ? clone(row) : null;
      },
      async listByCampaign(organizationId, campaignId) {
        return [...ledger.values()]
          .filter((row) => row.organizationId === organizationId && row.campaignId === campaignId)
          .map(clone);
      },
      async finalize(organizationId, idempotencyKey, patch) {
        const existing = [...ledger.values()].find(
          (row) => row.organizationId === organizationId && row.idempotencyKey === idempotencyKey,
        );
        if (!existing) return null;
        const next = { ...existing, ...patch, updatedAt: nowIso() };
        indexPut(ledger, next);
        return clone(next);
      },
    },
    leases: {
      async getByCampaign(organizationId, campaignId) {
        const row = [...leases.values()].find(
          (item) => item.organizationId === organizationId && item.campaignId === campaignId,
        );
        return row ? clone(row) : null;
      },
      async upsert(record) {
        const existing = [...leases.values()].find(
          (item) => item.organizationId === record.organizationId && item.campaignId === record.campaignId,
        );
        const next = {
          ...record,
          id: record.id || existing?.id || nextId("lease"),
          createdAt: existing?.createdAt ?? record.createdAt,
          updatedAt: nowIso(),
        };
        if (existing && existing.id !== next.id) leases.delete(existing.id);
        indexPut(leases, next);
        return clone(next);
      },
      async tryAcquire(organizationId, campaignId, holderId, ttlMs) {
        const lockKey = `${organizationId}:${campaignId}`;
        return (await withKeyLock(leaseLocks, lockKey, () => {
          const existing = [...leases.values()].find(
            (item) => item.organizationId === organizationId && item.campaignId === campaignId,
          );
          if (!existing) return false;
          const now = Date.now();
          if (
            existing.leaseHolder &&
            existing.leaseExpiresAt &&
            Date.parse(existing.leaseExpiresAt) > now &&
            existing.leaseHolder !== holderId
          ) {
            return false;
          }
          indexPut(leases, {
            ...existing,
            leaseHolder: holderId,
            leaseExpiresAt: new Date(now + (ttlMs || MARKETING_EXECUTION_LEASE_TTL_MS)).toISOString(),
            updatedAt: nowIso(),
          });
          return true;
        })) as boolean;
      },
      async release(organizationId, campaignId, holderId) {
        const existing = [...leases.values()].find(
          (item) => item.organizationId === organizationId && item.campaignId === campaignId,
        );
        if (!existing) return;
        if (existing.leaseHolder && existing.leaseHolder !== holderId) return;
        indexPut(leases, {
          ...existing,
          leaseHolder: null,
          leaseExpiresAt: null,
          updatedAt: nowIso(),
        });
      },
      async setPauseState(organizationId, campaignId, pauseState: MarketingLeasePauseState, patch) {
        const existing = [...leases.values()].find(
          (item) => item.organizationId === organizationId && item.campaignId === campaignId,
        );
        if (!existing) return null;
        const next = { ...existing, ...patch, pauseState, updatedAt: nowIso() };
        indexPut(leases, next);
        return clone(next);
      },
    },
    suppressions: {
      async upsert(record) {
        const existing = [...suppressions.values()].find(
          (row) =>
            row.organizationId === record.organizationId &&
            row.identityFingerprint === record.identityFingerprint &&
            row.channel === record.channel,
        );
        const next = { ...record, id: record.id || existing?.id || nextId("sup"), updatedAt: nowIso() };
        if (existing && existing.id !== next.id) suppressions.delete(existing.id);
        indexPut(suppressions, next);
        return clone(next);
      },
      async list(organizationId) {
        return [...suppressions.values()].filter((row) => row.organizationId === organizationId).map(clone);
      },
      async findMatch(organizationId, identityFingerprint, channel) {
        const row = [...suppressions.values()].find(
          (item) =>
            item.organizationId === organizationId &&
            item.identityFingerprint === identityFingerprint &&
            (item.channel === channel || item.channel === "ALL"),
        );
        return row ? clone(row) : null;
      },
    },
    engagements: {
      async record(record) {
        const existing = [...engagements.values()].find(
          (row) =>
            row.organizationId === record.organizationId && row.providerEventId === record.providerEventId,
        );
        if (existing) return { event: clone(existing), duplicate: true };
        const next = { ...record, id: record.id || nextId("eng") };
        indexPut(engagements, next);
        return { event: clone(next), duplicate: false };
      },
      async listByCampaign(organizationId, campaignId) {
        return [...engagements.values()]
          .filter((row) => row.organizationId === organizationId && row.campaignId === campaignId)
          .map(clone);
      },
    },
    testSends: {
      async record(record) {
        const existing = [...testSends.values()].find(
          (row) => row.organizationId === record.organizationId && row.idempotencyKey === record.idempotencyKey,
        );
        if (existing) return clone(existing);
        const next = { ...record, id: record.id || nextId("test") };
        indexPut(testSends, next);
        return clone(next);
      },
      async listByCampaign(organizationId, campaignId) {
        return [...testSends.values()]
          .filter((row) => row.organizationId === organizationId && row.campaignId === campaignId)
          .map(clone);
      },
    },
    qualifications: {
      async upsert(record) {
        const existing = [...qualifications.values()].find(
          (row) =>
            row.organizationId === record.organizationId &&
            row.campaignId === record.campaignId &&
            row.recipientFingerprint === record.recipientFingerprint,
        );
        const next = { ...record, id: record.id || existing?.id || nextId("qual"), updatedAt: nowIso() };
        if (existing && existing.id !== next.id) qualifications.delete(existing.id);
        indexPut(qualifications, next);
        return clone(next);
      },
      async getForOrg(id, organizationId) {
        return withOrg(qualifications.get(id), organizationId);
      },
      async list(organizationId) {
        return [...qualifications.values()].filter((row) => row.organizationId === organizationId).map(clone);
      },
    },
    audit: {
      async append(record) {
        const next = { ...record, id: record.id || nextId("audit") };
        audit.push(clone(next));
        return clone(next);
      },
      async list(organizationId, campaignId) {
        return audit
          .filter(
            (row) =>
              row.organizationId === organizationId &&
              (campaignId == null || row.campaignId === campaignId),
          )
          .map(clone);
      },
    },
    exportState() {
      return {
        bindings: [...bindings.values()].map(clone),
        audienceDefinitions: [...audienceDefinitions.values()].map(clone),
        snapshots: [...snapshots.values()].map(clone),
        snapshotRecipients: [...snapshotRecipients.values()].map(clone),
        batches: [...batches.values()].map(clone),
        ledger: [...ledger.values()].map(clone),
        leases: [...leases.values()].map(clone),
        suppressions: [...suppressions.values()].map(clone),
        engagements: [...engagements.values()].map(clone),
        testSends: [...testSends.values()].map(clone),
        qualifications: [...qualifications.values()].map(clone),
        audit: audit.map(clone),
      };
    },
  };

  return fixture;
}
