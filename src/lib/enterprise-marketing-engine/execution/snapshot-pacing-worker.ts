/**
 * CO-MARKETING-REDESIGN-004 — Restart-safe snapshot pacing worker.
 * Executes one planned batch from the frozen audience snapshot.
 * Never rereads the live Google Sheet. Provider adapters stay dry-run.
 */

import { ENTERPRISE_MARKETING_EXECUTION_ENABLED } from "@/constants/enterprise-marketing-engine";
import { MARKETING_EXECUTION_LEASE_TTL_MS } from "@/constants/enterprise-marketing-engine/execution";
import { assertMarketingPhase1LiveAudienceCeiling } from "@/lib/enterprise-marketing-engine/phase1-live-ceiling";
import { zonedDateKey } from "@/lib/enterprise-marketing-engine/execution/batch-schedule";
import {
  computeMarketingSnapshotPacingPlan,
  type MarketingPacingBatchPlanItem,
  type MarketingSnapshotPacingPlan,
} from "@/lib/enterprise-marketing-engine/execution/snapshot-pacing-plan";
import { decideMarketingRecipientClaim, classifyMarketingRecipientClaim } from "@/lib/enterprise-marketing-engine/durability/claim";
import {
  canRetryFailedMarketingDelivery,
  isTerminalNoRetryStatus,
  nextMarketingRetryAtIso,
} from "@/lib/enterprise-marketing-engine/durability/retry-policy";
import { expireAbandonedMarketingLease } from "@/lib/enterprise-marketing-engine/durability/lease-recovery";
import { classifyMarketingDeliveryFailure } from "@/lib/enterprise-marketing-engine/durability/failure-classification";
import type { MarketingRecoveryStore } from "@/lib/enterprise-marketing-engine/durability/recovery-store";
import type { MarketingRecoveryFailureKind } from "@/types/enterprise-marketing-recovery";
import type {
  MarketingDurableLedgerRecord,
  MarketingDurableSnapshotRecipientRecord,
} from "@/types/enterprise-marketing-durability";
import type { MarketingDurabilityPorts } from "@/types/enterprise-marketing-durability-ports";
import type { MarketingBatchPolicy } from "@/types/enterprise-marketing-execution";

export type MarketingPacingProviderProbe = {
  liveProviderCalls: number;
  dryRunDeliveries: number;
};

export function createMarketingPacingProviderProbe(): MarketingPacingProviderProbe {
  return { liveProviderCalls: 0, dryRunDeliveries: 0 };
}

export type MarketingPacingDeliveryOutcome = {
  status: "sent" | "failed" | "skipped";
  retryable: boolean;
  dryRun: true;
  providerMessageId: string | null;
  liveProviderInvoked: false;
};

export type MarketingPacingDeliverer = (
  recipient: MarketingDurableSnapshotRecipientRecord,
) => Promise<MarketingPacingDeliveryOutcome>;

export function createMarketingPacingDryRunDeliverer(
  probe: MarketingPacingProviderProbe,
): MarketingPacingDeliverer {
  return async (recipient) => {
    probe.dryRunDeliveries += 1;
    const email = recipient.normalizedEmail.toLowerCase();
    if (email.includes("permanent-fail")) {
      return {
        status: "skipped",
        retryable: false,
        dryRun: true,
        providerMessageId: null,
        liveProviderInvoked: false,
      };
    }
    if (email.includes("retry-fail") || email.includes("retry@")) {
      return {
        status: "failed",
        retryable: true,
        dryRun: true,
        providerMessageId: null,
        liveProviderInvoked: false,
      };
    }
    return {
      status: "sent",
      retryable: false,
      dryRun: true,
      providerMessageId: `dry-run-${recipient.id}`,
      liveProviderInvoked: false,
    };
  };
}

export type MarketingSnapshotPacingTickResult = {
  campaignId: string;
  snapshotId: string | null;
  batchId: string;
  batchNumber: number | null;
  dryRun: true;
  liveSheetReread: false;
  liveProviderInvoked: false;
  skippedReason: string | null;
  claimed: number;
  selected: number;
  eligible: number;
  suppressed: number;
  processed: number;
  failed: number;
  skipped: number;
  retried: number;
  nextRunAt: string | null;
  streamCursor: string | null;
  campaignComplete: boolean;
  leaseAcquired: boolean;
  recovered: boolean;
  plan: MarketingSnapshotPacingPlan | null;
};

function nowIso(now: Date) {
  return now.toISOString();
}

function emptyTick(
  campaignId: string,
  reason: string,
  extras?: Partial<MarketingSnapshotPacingTickResult>,
): MarketingSnapshotPacingTickResult {
  return {
    campaignId,
    snapshotId: extras?.snapshotId ?? null,
    batchId: extras?.batchId ?? "",
    batchNumber: extras?.batchNumber ?? null,
    dryRun: true,
    liveSheetReread: false,
    liveProviderInvoked: false,
    skippedReason: reason,
    claimed: 0,
    selected: 0,
    eligible: 0,
    suppressed: 0,
    processed: 0,
    failed: 0,
    skipped: 0,
    retried: 0,
    nextRunAt: extras?.nextRunAt ?? null,
    streamCursor: extras?.streamCursor ?? null,
    campaignComplete: extras?.campaignComplete === true,
    leaseAcquired: extras?.leaseAcquired === true,
    recovered: extras?.recovered === true,
    plan: extras?.plan ?? null,
  };
}

function sortSnapshotRecipients(
  rows: MarketingDurableSnapshotRecipientRecord[],
): MarketingDurableSnapshotRecipientRecord[] {
  return [...rows].sort((a, b) => {
    const key = a.sourceStableKey.localeCompare(b.sourceStableKey);
    if (key !== 0) return key;
    return a.id.localeCompare(b.id);
  });
}

function recipientIsPending(
  existing: MarketingDurableLedgerRecord | undefined,
  nowMs: number,
): boolean {
  return classifyMarketingRecipientClaim(existing ?? null, nowMs) === "open";
}

function allRecipientsTerminal(
  recipients: MarketingDurableSnapshotRecipientRecord[],
  byId: Map<string, MarketingDurableLedgerRecord>,
): boolean {
  return recipients.every((row) => {
    const ledger = byId.get(row.id);
    if (!ledger) return false;
    if (isTerminalNoRetryStatus(ledger.status)) return true;
    if (
      (ledger.status === "failed" || ledger.status === "deferred" || ledger.status === "bounced") &&
      !canRetryFailedMarketingDelivery(ledger.status, ledger.attemptCount)
    ) {
      return true;
    }
    return false;
  });
}

async function ensureLease(
  ports: MarketingDurabilityPorts,
  input: {
    organizationId: string;
    campaignId: string;
    snapshotId: string;
    now: Date;
    timezone: string;
  },
) {
  const existing = await ports.leases.getByCampaign(input.organizationId, input.campaignId);
  const ts = nowIso(input.now);
  if (existing) return existing;
  return ports.leases.upsert({
    id: `lease-${input.campaignId}`,
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    snapshotId: input.snapshotId,
    nextRunAt: ts,
    streamCursor: null,
    lastCompletedBatchNumber: null,
    pauseState: "ACTIVE",
    leaseHolder: null,
    leaseExpiresAt: null,
    dailyProcessedCount: 0,
    dailyCountResetDate: zonedDateKey(input.now, input.timezone),
    lastError: null,
    createdByUserId: null,
    updatedByUserId: null,
    createdAt: ts,
    updatedAt: ts,
  });
}

async function appendAudit(
  ports: MarketingDurabilityPorts,
  organizationId: string,
  campaignId: string,
  kind: string,
  actorUserId: string | null,
  now: Date,
) {
  await ports.audit.append({
    id: `audit-${campaignId}-${kind}-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    organizationId,
    campaignId,
    actorUserId,
    kind,
    createdAt: nowIso(now),
  });
}

export async function runMarketingSnapshotPacingTick(input: {
  ports: MarketingDurabilityPorts;
  organizationId: string;
  campaignId: string;
  campaignVersionId: string;
  channel: string;
  policy: MarketingBatchPolicy;
  holderId: string;
  now?: Date;
  forceRun?: boolean;
  adminTriggered?: boolean;
  campaignStatus?: string;
  deliver?: MarketingPacingDeliverer;
  probe?: MarketingPacingProviderProbe;
  shouldSuppressDelivery?: (recipient: MarketingDurableSnapshotRecipientRecord) => boolean;
  recovery?: MarketingRecoveryStore;
}): Promise<MarketingSnapshotPacingTickResult> {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const probe = input.probe ?? createMarketingPacingProviderProbe();
  const deliver = input.deliver ?? createMarketingPacingDryRunDeliverer(probe);
  const { ports, organizationId, campaignId } = input;

  const snapshots = await ports.snapshots.listByCampaign(organizationId, campaignId);
  const snapshot = [...snapshots].sort((a, b) => b.frozenAt.localeCompare(a.frozenAt))[0];
  if (!snapshot) {
    throw Object.assign(
      new Error(
        "Approved campaigns must execute from a frozen audience snapshot. The live Sheet is not reread.",
      ),
      { statusCode: 400, code: "SNAPSHOT_REQUIRED" },
    );
  }

  const recipients = sortSnapshotRecipients(
    await ports.snapshotRecipients.listBySnapshot(organizationId, snapshot.id),
  );
  if (ENTERPRISE_MARKETING_EXECUTION_ENABLED) {
    assertMarketingPhase1LiveAudienceCeiling(recipients.length);
    throw Object.assign(new Error("Live marketing send is disabled"), {
      statusCode: 403,
      code: "LIVE_SEND_BLOCKED",
    });
  }
  const plan = computeMarketingSnapshotPacingPlan({
    eligibleCount: recipients.length,
    policy: input.policy,
    now: input.policy.startAt ? new Date(input.policy.startAt) : now,
  });

  let lease = await ensureLease(ports, {
    organizationId,
    campaignId,
    snapshotId: snapshot.id,
    now,
    timezone: input.policy.timezone,
  });

  if (input.campaignStatus === "PAUSED" || lease.pauseState === "PAUSED") {
    await appendAudit(ports, organizationId, campaignId, "execution.paused", input.holderId, now);
    return emptyTick(campaignId, "campaign_paused", {
      snapshotId: snapshot.id,
      nextRunAt: lease.nextRunAt,
      streamCursor: lease.streamCursor,
      campaignComplete: false,
      plan,
    });
  }
  if (input.campaignStatus === "STOPPED" || lease.pauseState === "STOPPED") {
    await appendAudit(ports, organizationId, campaignId, "execution.stopped", input.holderId, now);
    return emptyTick(campaignId, "campaign_stopped", {
      snapshotId: snapshot.id,
      nextRunAt: null,
      streamCursor: lease.streamCursor,
      campaignComplete: false,
      plan,
    });
  }

  const expired = await expireAbandonedMarketingLease({
    ports,
    organizationId,
    campaignId,
    now,
    actorUserId: input.holderId,
  });
  if (expired.expired) {
    lease = (await ports.leases.getByCampaign(organizationId, campaignId)) ?? lease;
  }

  const acquired = await ports.leases.tryAcquire(
    organizationId,
    campaignId,
    input.holderId,
    MARKETING_EXECUTION_LEASE_TTL_MS,
  );
  if (!acquired) {
    await appendAudit(
      ports,
      organizationId,
      campaignId,
      "execution.lease.rejected",
      input.holderId,
      now,
    );
    return emptyTick(campaignId, "lease_held_by_other_worker", {
      snapshotId: snapshot.id,
      nextRunAt: lease.nextRunAt,
      streamCursor: lease.streamCursor,
      plan,
    });
  }

  let released = false;
  try {
    await appendAudit(ports, organizationId, campaignId, "execution.lease.acquired", input.holderId, now);
    input.recovery?.heartbeat({
      organizationId,
      campaignId,
      workerId: input.holderId,
      at: nowIso(now),
    });
    lease = (await ports.leases.getByCampaign(organizationId, campaignId)) ?? lease;

    const ledgerRows = await ports.ledger.listByCampaign(organizationId, campaignId);
    const byRecipient = new Map(ledgerRows.map((row) => [row.snapshotRecipientId, row]));
    const recovered = ledgerRows.some(
      (row) =>
        row.status === "processing" &&
        decideMarketingRecipientClaim(row, nowMs).action === "claim_existing",
    );
    if (recovered) {
      await appendAudit(
        ports,
        organizationId,
        campaignId,
        "execution.worker.recovered",
        input.holderId,
        now,
      );
    }

    if (allRecipientsTerminal(recipients, byRecipient)) {
      const nextLease = await ports.leases.upsert({
        ...lease,
        snapshotId: snapshot.id,
        nextRunAt: null,
        lastCompletedBatchNumber: plan.batches.at(-1)?.batchNumber ?? lease.lastCompletedBatchNumber,
        lastError: null,
        updatedAt: nowIso(now),
        updatedByUserId: input.holderId,
      });
      await appendAudit(
        ports,
        organizationId,
        campaignId,
        "execution.campaign.completed",
        input.holderId,
        now,
      );
      return emptyTick(campaignId, "campaign_complete", {
        snapshotId: snapshot.id,
        nextRunAt: null,
        streamCursor: nextLease.streamCursor,
        campaignComplete: true,
        leaseAcquired: true,
        recovered,
        plan,
      });
    }

    let dueBatch: MarketingPacingBatchPlanItem | null = null;
    let pending: MarketingDurableSnapshotRecipientRecord[] = [];
    let selected: MarketingDurableSnapshotRecipientRecord[] = [];
    for (const batch of plan.batches) {
      const slice = recipients.slice(batch.offset, batch.offset + batch.size);
      const open = slice.filter((row) => recipientIsPending(byRecipient.get(row.id), nowMs));
      if (open.length === 0) continue;
      dueBatch = batch;
      pending = open;
      selected = slice;
      break;
    }

    if (!dueBatch) {
      const delayed = recipients.filter(
        (row) => classifyMarketingRecipientClaim(byRecipient.get(row.id) ?? null, nowMs) === "delayed",
      );
      if (delayed.length > 0) {
        const nextRetry = delayed
          .map((row) => nextMarketingRetryAtIso(byRecipient.get(row.id)?.processedAt, byRecipient.get(row.id)?.attemptCount ?? 0))
          .filter((value): value is string => Boolean(value))
          .sort()[0] ?? null;
        await ports.leases.upsert({
          ...lease,
          snapshotId: snapshot.id,
          nextRunAt: nextRetry,
          updatedAt: nowIso(now),
          updatedByUserId: input.holderId,
        });
        return emptyTick(campaignId, "retry_backoff", {
          snapshotId: snapshot.id,
          nextRunAt: nextRetry,
          streamCursor: lease.streamCursor,
          leaseAcquired: true,
          recovered,
          plan,
        });
      }
      return emptyTick(campaignId, "campaign_complete", {
        snapshotId: snapshot.id,
        campaignComplete: true,
        leaseAcquired: true,
        recovered,
        plan,
      });
    }

    const dayKey = zonedDateKey(now, input.policy.timezone);
    const resetNeeded = (lease.dailyCountResetDate ?? dayKey) !== dayKey;
    const usedToday = resetNeeded ? 0 : (lease.dailyProcessedCount ?? 0);
    const remainingCap = Math.max(0, (input.policy.dailyMax ?? 500) - usedToday);
    if (remainingCap <= 0) {
      return emptyTick(campaignId, "daily_cap_exhausted", {
        snapshotId: snapshot.id,
        batchNumber: dueBatch.batchNumber,
        nextRunAt: lease.nextRunAt,
        streamCursor: lease.streamCursor,
        leaseAcquired: true,
        recovered,
        plan,
      });
    }
    if (pending.length > remainingCap) {
      pending = pending.slice(0, remainingCap);
    }

    if (!input.forceRun && Date.parse(dueBatch.scheduledAt) > nowMs) {
      await ports.leases.upsert({
        ...lease,
        snapshotId: snapshot.id,
        nextRunAt: dueBatch.scheduledAt,
        updatedAt: nowIso(now),
        updatedByUserId: input.holderId,
      });
      return emptyTick(campaignId, "not_due_yet", {
        snapshotId: snapshot.id,
        batchNumber: dueBatch.batchNumber,
        nextRunAt: dueBatch.scheduledAt,
        streamCursor: lease.streamCursor,
        leaseAcquired: true,
        recovered,
        plan,
      });
    }

    const existingBatch = await ports.batches.getByCampaignNumber(
      organizationId,
      campaignId,
      dueBatch.batchNumber,
    );
    let batchRecord = existingBatch;
    if (existingBatch?.status === "processed" || existingBatch?.status === "completed") {
      // Recipients still pending (retries). Reuse the durable batch row.
      batchRecord = existingBatch;
    } else if (existingBatch?.status === "processing") {
      batchRecord = existingBatch;
    } else {
      const claimedBatch = await ports.batches.tryClaim({
        organizationId,
        campaignId,
        snapshotId: snapshot.id,
        batchNumber: dueBatch.batchNumber,
        scheduledAt: dueBatch.scheduledAt,
        plannedSize: dueBatch.size,
        workerId: input.holderId,
        dryRun: true,
      });
      if (!claimedBatch.ok || !claimedBatch.record) {
        return emptyTick(campaignId, "batch_claim_rejected", {
          snapshotId: snapshot.id,
          batchNumber: dueBatch.batchNumber,
          leaseAcquired: true,
          recovered,
          plan,
        });
      }
      batchRecord = claimedBatch.record;
    }

    await appendAudit(ports, organizationId, campaignId, "execution.batch.started", input.holderId, now);

    let claimed = 0;
    let processed = 0;
    let failed = 0;
    let skipped = 0;
    let retried = 0;
    let suppressed = 0;
    let lastCursor: string | null = lease.streamCursor;

    for (const recipient of pending) {
      await ports.leases.tryAcquire(
        organizationId,
        campaignId,
        input.holderId,
        MARKETING_EXECUTION_LEASE_TTL_MS,
      );
      const prior = byRecipient.get(recipient.id);
      const claim = await ports.ledger.tryClaim({
        organizationId,
        campaignId,
        campaignVersionId: input.campaignVersionId,
        snapshotId: snapshot.id,
        snapshotRecipientId: recipient.id,
        channel: input.channel,
        normalizedEmail: recipient.normalizedEmail,
        sourceStableKey: recipient.sourceStableKey,
        idempotencyKey: `${organizationId}:${campaignId}:${input.channel}:${recipient.normalizedEmail}`,
        batchId: batchRecord.id,
        batchNumber: dueBatch.batchNumber,
        workerId: input.holderId,
      });
      if (!claim.ok) {
        skipped += 1;
        continue;
      }
      claimed += 1;
      if (prior && (prior.status === "failed" || prior.status === "deferred" || prior.status === "bounced")) {
        retried += 1;
      }
      input.recovery?.recordAttempt({
        organizationId,
        campaignId,
        snapshotRecipientId: recipient.id,
        idempotencyKey: claim.record.idempotencyKey,
        attemptNumber: claim.record.attemptCount,
        workerId: input.holderId,
        failureKind: null,
        retryable: false,
        status: "claimed",
        createdAt: nowIso(now),
      });
      if (input.shouldSuppressDelivery?.(recipient)) {
        await ports.ledger.finalize(organizationId, claim.record.idempotencyKey, {
          status: "suppressed",
          processedAt: nowIso(now),
          providerMessageId: null,
        });
        input.recovery?.recordAttempt({
          organizationId,
          campaignId,
          snapshotRecipientId: recipient.id,
          idempotencyKey: claim.record.idempotencyKey,
          attemptNumber: claim.record.attemptCount,
          workerId: input.holderId,
          failureKind: "permanent_suppression",
          retryable: false,
          status: "suppressed",
          createdAt: nowIso(now),
        });
        suppressed += 1;
        lastCursor = recipient.id;
        continue;
      }
      let outcome: MarketingPacingDeliveryOutcome;
      let failureKind: MarketingRecoveryFailureKind | null = null;
      try {
        outcome = await deliver(recipient);
      } catch (error) {
        failureKind =
          error && typeof error === "object" && "failureKind" in error
            ? ((error as { failureKind?: MarketingRecoveryFailureKind }).failureKind ?? "worker_crash")
            : "worker_crash";
        outcome = {
          status: "failed",
          retryable: true,
          dryRun: true,
          providerMessageId: null,
          liveProviderInvoked: false,
        };
      }
      if (outcome.liveProviderInvoked || probe.liveProviderCalls > 0) {
        throw Object.assign(new Error("Live provider invocation is forbidden in dry-run pacing"), {
          statusCode: 500,
          code: "LIVE_PROVIDER_FORBIDDEN",
        });
      }
      const outcomeKind =
        failureKind ??
        (typeof outcome === "object" && outcome && "failureKind" in outcome
          ? ((outcome as { failureKind?: MarketingRecoveryFailureKind }).failureKind ?? null)
          : null);
      const classified = classifyMarketingDeliveryFailure({
        kind: outcomeKind ?? (outcome.retryable ? "temporary_provider_rejection" : outcome.status === "sent" ? "terminal_success" : "invalid_recipient"),
        attemptCount: claim.record.attemptCount,
        unsubscribed: outcomeKind === "unsubscribe",
        complaint: outcomeKind === "complaint",
        hardBounce: outcomeKind === "hard_bounce",
        permanentlySuppressed: outcomeKind === "permanent_suppression",
      });
      const nextStatus =
        outcome.status === "sent"
          ? "sent"
          : classified.retryable
            ? "failed"
            : outcome.status === "skipped"
              ? "skipped"
              : "failed";
      await ports.ledger.finalize(organizationId, claim.record.idempotencyKey, {
        status: nextStatus,
        processedAt: nowIso(now),
        providerMessageId: outcome.providerMessageId,
        suppressionReason: classified.quarantine ? classified.reason : outcomeKind,
      });
      input.recovery?.recordAttempt({
        organizationId,
        campaignId,
        snapshotRecipientId: recipient.id,
        idempotencyKey: claim.record.idempotencyKey,
        attemptNumber: claim.record.attemptCount,
        workerId: input.holderId,
        failureKind: outcomeKind,
        retryable: classified.retryable,
        status: nextStatus === "sent" ? "sent" : classified.quarantine ? "quarantined" : nextStatus,
        createdAt: nowIso(now),
      });
      if (classified.quarantine) {
        input.recovery?.quarantine({
          organizationId,
          campaignId,
          snapshotRecipientId: recipient.id,
          idempotencyKey: claim.record.idempotencyKey,
          normalizedEmail: recipient.normalizedEmail,
          reason:
            classified.reason === "invalid_recipient"
              ? "invalid_recipient"
              : classified.reason === "permanent_provider_rejection"
                ? "permanent_provider_rejection"
                : "exhausted_retries",
          attemptCount: claim.record.attemptCount,
          createdAt: nowIso(now),
        });
      }
      if (nextStatus === "sent") processed += 1;
      else if (nextStatus === "failed") failed += 1;
      else skipped += 1;
      lastCursor = recipient.id;
    }

    const ledgerAfter = await ports.ledger.listByCampaign(organizationId, campaignId);
    const byRecipientAfter = new Map(ledgerAfter.map((row) => [row.snapshotRecipientId, row]));
    const batchStillPending = selected.some((row) =>
      recipientIsPending(byRecipientAfter.get(row.id), nowMs),
    );
    if (!batchStillPending) {
      await ports.batches.finalize(organizationId, batchRecord.id, {
        status: "processed",
        processedAt: nowIso(now),
      });
    }

    const campaignComplete = allRecipientsTerminal(recipients, byRecipientAfter);
    const lastCompleted = batchStillPending
      ? lease.lastCompletedBatchNumber
      : dueBatch.batchNumber;
    const following = plan.batches.find((item) => item.batchNumber === dueBatch.batchNumber + 1);
    const nextRunAt = campaignComplete
      ? null
      : batchStillPending
        ? dueBatch.scheduledAt
        : following?.scheduledAt ?? null;

    const dailyProcessedCount = resetNeeded
      ? processed
      : usedToday + processed;

    await ports.leases.upsert({
      ...lease,
      snapshotId: snapshot.id,
      streamCursor: lastCursor,
      lastCompletedBatchNumber: lastCompleted ?? null,
      nextRunAt,
      dailyProcessedCount,
      dailyCountResetDate: dayKey,
      lastError: null,
      updatedAt: nowIso(now),
      updatedByUserId: input.holderId,
    });

    await appendAudit(
      ports,
      organizationId,
      campaignId,
      "execution.batch.frozen_snapshot",
      input.holderId,
      now,
    );
    await appendAudit(
      ports,
      organizationId,
      campaignId,
      "execution.batch.completed",
      input.holderId,
      now,
    );

    return {
      campaignId,
      snapshotId: snapshot.id,
      batchId: batchRecord.id,
      batchNumber: dueBatch.batchNumber,
      dryRun: true,
      liveSheetReread: false,
      liveProviderInvoked: false,
      skippedReason: null,
      claimed,
      selected: selected.length,
      eligible: pending.length,
      suppressed,
      processed,
      failed,
      skipped,
      retried,
      nextRunAt,
      streamCursor: lastCursor,
      campaignComplete,
      leaseAcquired: true,
      recovered,
      plan,
    };
  } finally {
    if (!released) {
      await ports.leases.release(organizationId, campaignId, input.holderId);
      released = true;
      await appendAudit(
        ports,
        organizationId,
        campaignId,
        "execution.lease.released",
        input.holderId,
        now,
      );
    }
  }
}

export function marketingPacingTickToExecutionResult(
  tick: MarketingSnapshotPacingTickResult,
): {
  campaignId: string;
  batchId: string;
  dryRun: true;
  skippedReason: string | null;
  claimed: number;
  selected: number;
  eligible: number;
  suppressed: number;
  processed: number;
  failed: number;
  skipped: number;
  nextRunAt: string | null;
  streamCursor: string | null;
  campaignComplete: boolean;
} {
  return {
    campaignId: tick.campaignId,
    batchId: tick.batchId,
    dryRun: true,
    skippedReason: tick.skippedReason,
    claimed: tick.claimed,
    selected: tick.selected,
    eligible: tick.eligible,
    suppressed: tick.suppressed,
    processed: tick.processed,
    failed: tick.failed,
    skipped: tick.skipped,
    nextRunAt: tick.nextRunAt,
    streamCursor: tick.streamCursor,
    campaignComplete: tick.campaignComplete,
  };
}
