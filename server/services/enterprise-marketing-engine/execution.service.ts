/**
 * CO-MARKETING-MKT-06 — Campaign scheduler + dry-run batch execution foundation.
 * No email / WhatsApp / digital provider send. Ledger stores touched recipients only.
 */

import {
  ENTERPRISE_MARKETING_EMAIL_MODE,
  ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
  isMarketingControlledTestSendEnabled,
  type MarketingCampaignStatus,
} from "@/constants/enterprise-marketing-engine";
import {
  MARKETING_CRON_MAX_CAMPAIGNS_PER_TICK,
  MARKETING_DEFAULT_BATCH_POLICY,
  MARKETING_EXECUTION_STREAM_PAGE_SIZE,
} from "@/constants/enterprise-marketing-engine/execution";
import { evaluateFilterDefinition } from "@/lib/enterprise-marketing-engine/audience-filters";
import {
  assessMarketingRowQuality,
  marketingConsentDecision,
  buildMarketingRecipientFingerprint,
  detectMarketingSheetColumns,
  isValidMarketingEmail,
  normalizeMarketingPhone,
} from "@/lib/enterprise-marketing-engine/data-quality";
import {
  computeNextRunAt,
  isWithinSendWindow,
  zonedDateKey,
} from "@/lib/enterprise-marketing-engine/execution/batch-schedule";
import { buildMarketingExecutionIdempotencyKey } from "@/lib/enterprise-marketing-engine/execution/idempotency";
import {
  assertDryRunExecutionAllowed,
  EnterpriseMarketingSafetyError,
} from "@/lib/enterprise-marketing-engine/safety";
import type { MarketingCampaign } from "@/types/enterprise-marketing-campaign";
import type { MarketingDurabilityPorts } from "@/types/enterprise-marketing-durability-ports";
import type { MarketingBatchPolicy, MarketingExecutionSummary, MarketingExecutionTickResult } from "@/types/enterprise-marketing-execution";
import type { MarketingCampaignExecutionPort } from "@/lib/enterprise-marketing-engine/ports/campaign-execution.port";
import { recordMarketingAuditEvent } from "./audit";
import { marketingAudienceDefinitionStore } from "./audience-definition-store";
import { marketingCampaignStore } from "./campaign-store";
import { marketingDataSourceService } from "./data-source.service";
import { getConfiguredMarketingDurabilityPorts } from "@/lib/enterprise-marketing-engine/durability/composition";
import {
  createMarketingPacingProviderProbe,
  marketingPacingTickToExecutionResult,
  runMarketingSnapshotPacingTick,
} from "@/lib/enterprise-marketing-engine/execution/snapshot-pacing-worker";
import { marketingExecutionBatchStore } from "./execution-batch-store";
import { marketingExecutionLedgerStore } from "./execution-ledger-store";
import { emitMarketingEngagementEvent } from "./engagement.service";
import { marketingExecutionLeaseStore } from "./execution-lease-store";
import { marketingEmailDeliveryService } from "./email-delivery.service";
import {
  createMarketingSnapshotLiveDeliverer,
  isMarketingSnapshotLiveDeliveryAuthorized,
} from "./snapshot-live-deliverer";
import { marketingWhatsAppDeliveryService } from "./whatsapp-delivery.service";
import { marketingSuppressionStore } from "./suppression-store";
import { marketingSenderIdentityStore } from "./sender-identity-store";
import { MARKETING_PACING_CRON_REGISTERED } from "@/lib/enterprise-marketing-engine/execution/cron-activation";
import {
  assessMarketingControlledFiveAudience,
  assessMarketingControlledFiveGates,
  MARKETING_CONTROLLED_FIVE_AUTHORISED_CAMPAIGN_ID,
  MARKETING_CONTROLLED_FIVE_RECIPIENT_COUNT,
  MARKETING_CONTROLLED_FIVE_SEND_BLOCK,
} from "@/lib/enterprise-marketing-engine/controlled-five-send";

const RUNNABLE: MarketingCampaignStatus[] = ["SCHEDULED", "RUNNING"];

function nowIso() {
  return new Date().toISOString();
}

function suppressionCandidates(quality: {
  fingerprint: string | null;
  email?: string | null;
  phone?: string | null;
  externalKey?: string | null;
}): string[] {
  const set = new Set<string>();
  if (quality.fingerprint) set.add(quality.fingerprint.toLowerCase());
  const emailFp = buildMarketingRecipientFingerprint({
    email: quality.email && isValidMarketingEmail(quality.email) ? quality.email : null,
    phone: null,
    externalKey: null,
  });
  const phoneFp = buildMarketingRecipientFingerprint({
    email: null,
    phone: quality.phone,
    externalKey: null,
  });
  const extFp = buildMarketingRecipientFingerprint({
    email: null,
    phone: null,
    externalKey: quality.externalKey,
  });
  if (emailFp) set.add(emailFp.toLowerCase());
  if (phoneFp) set.add(phoneFp.toLowerCase());
  if (extFp) set.add(extFp.toLowerCase());
  const digits = normalizeMarketingPhone(quality.phone ?? null);
  if (digits) set.add(`phone:${digits}`);
  return [...set];
}

function resolveBatchPolicy(
  stored: MarketingBatchPolicy | null | undefined,
): MarketingBatchPolicy {
  return stored ?? MARKETING_DEFAULT_BATCH_POLICY;
}

async function tickFromFrozenSnapshot(input: {
  campaignId: string;
  campaign: MarketingCampaign;
  versionId: string;
  lease: NonNullable<ReturnType<typeof marketingExecutionLeaseStore.get>>;
  holderId: string;
  adminTriggered: boolean;
  forceRun?: boolean;
  now?: Date;
  ports: MarketingDurabilityPorts;
  controlledFiveRecipientSend?: boolean;
}): Promise<MarketingExecutionTickResult> {
  // SNAPSHOT_REQUIRED — approved execution never rereads the live Google Sheet.
  const version = await marketingCampaignStore.getVersion(input.versionId);
  if (
    input.controlledFiveRecipientSend === true &&
    input.campaignId !== MARKETING_CONTROLLED_FIVE_AUTHORISED_CAMPAIGN_ID
  ) {
    throw Object.assign(
      new Error("Controlled five-recipient send is authorised only for the designated production test campaign."),
      { statusCode: 403, code: MARKETING_CONTROLLED_FIVE_SEND_BLOCK.campaignNotAuthorised },
    );
  }
  const liveDeliveryAuthorized = isMarketingSnapshotLiveDeliveryAuthorized({
    executionEnabled: ENTERPRISE_MARKETING_EXECUTION_ENABLED,
    providerConnectEnabled: ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
    campaignStatus: input.campaign.status,
    approvedAt: input.campaign.governance?.approvedAt,
    channel: input.campaign.channel,
  });
  const probe = createMarketingPacingProviderProbe();
  const controlledFive =
    input.controlledFiveRecipientSend === true && Boolean(version) && !liveDeliveryAuthorized;
  const deliver =
    version && (liveDeliveryAuthorized || controlledFive)
      ? createMarketingSnapshotLiveDeliverer({
          organizationId: input.campaign.organizationId,
          campaignId: input.campaignId,
          campaignVersionId: input.versionId,
          campaignName: input.campaign.name,
          product: input.campaign.product,
          senderIdentityId: input.campaign.senderIdentityId,
          fromAddressHint: input.campaign.sender?.fromAddress,
          trackingEnabled: version.trackingEnabled,
          version,
          probe,
          controlledTestSend: controlledFive,
        })
      : undefined;
  const tick = await runMarketingSnapshotPacingTick({
    ports: input.ports,
    organizationId: input.campaign.organizationId,
    campaignId: input.campaignId,
    campaignVersionId: input.versionId,
    channel: input.campaign.channel,
    policy: input.lease.batchPolicy,
    holderId: input.holderId,
    now: input.now,
    forceRun: input.forceRun,
    adminTriggered: input.adminTriggered,
    campaignStatus: input.campaign.status,
    liveDeliveryAuthorized,
    controlledRecipientDeliveryAuthorized: controlledFive,
    probe,
    deliver,
    shouldSuppressDelivery: (recipient) =>
      marketingSuppressionStore.evaluateDelivery({
        organizationId: input.campaign.organizationId,
        fingerprints: [
          recipient.recipientFingerprint,
          recipient.normalizedEmail ? `email:${recipient.normalizedEmail}` : "",
        ].filter(Boolean),
        channel: input.campaign.channel,
        phase: "delivery",
        campaignId: input.campaignId,
        applyOptionalOrgSuppression: true,
      }).blocked,
  });

  recordMarketingAuditEvent({
    kind: "execution.batch.frozen_snapshot",
    organizationId: input.campaign.organizationId,
    detail: {
      campaignId: input.campaignId,
      snapshotId: tick.snapshotId,
      claimed: tick.claimed,
      processed: tick.processed,
      skipped: tick.skipped,
      batchNumber: tick.batchNumber,
      liveSheetReread: false,
      liveProviderInvoked: tick.liveProviderInvoked,
      adminTriggered: input.adminTriggered,
    },
  });

  marketingExecutionLeaseStore.upsert({
    ...input.lease,
    streamCursor: tick.streamCursor,
    nextRunAt: tick.nextRunAt,
    lastBatchId: tick.batchId || input.lease.lastBatchId,
    completedAt: tick.campaignComplete ? nowIso() : null,
    errorState: tick.skippedReason === "campaign_stopped" ? "stopped" : null,
    updatedAt: nowIso(),
  });

  return marketingPacingTickToExecutionResult(tick);
}

async function tickBatchInternal(
  campaignId: string,
  opts?: { forceRun?: boolean; holderId?: string; adminTriggered?: boolean },
): Promise<MarketingExecutionTickResult> {
  assertDryRunExecutionAllowed("execution.tickBatch");

  const holderId = opts?.holderId ?? `worker-${Date.now()}`;
  const campaign = await marketingCampaignStore.get(campaignId);
  if (!campaign) {
    throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
  }

  if (campaign.status === "PAUSED") {
    return emptyTick(campaignId, "campaign_paused");
  }
  if (!RUNNABLE.includes(campaign.status)) {
    return emptyTick(campaignId, `status_${campaign.status.toLowerCase()}`);
  }

  let lease = marketingExecutionLeaseStore.get(campaignId);
  if (!lease) {
    throw Object.assign(new Error("Execution lease not configured — schedule or configure batch policy first"), {
      statusCode: 400,
      code: "EXECUTION_NOT_CONFIGURED",
    });
  }

  if (!marketingExecutionLeaseStore.tryAcquireLease(campaignId, holderId)) {
    return emptyTick(campaignId, "lease_held_by_other_worker");
  }

  const started = Date.now();
  const now = new Date();
  lease = marketingExecutionLeaseStore.resetDailyIfNeeded(lease, now);

  try {
    const versionId =
      campaign.activePublishedVersionId ?? campaign.currentDraftVersionId;

    const durabilityPorts = getConfiguredMarketingDurabilityPorts();
    if (durabilityPorts) {
      return tickFromFrozenSnapshot({
        campaignId,
        campaign,
        versionId,
        lease,
        holderId,
        adminTriggered: opts?.adminTriggered ?? false,
        forceRun: opts?.forceRun,
        now,
        ports: durabilityPorts,
      });
    }
    if (ENTERPRISE_MARKETING_EXECUTION_ENABLED) {
      throw Object.assign(new Error("Live execution requires a durable frozen audience snapshot"), {
        statusCode: 403,
        code: "SNAPSHOT_REQUIRED",
      });
    }

    if (
      !opts?.forceRun &&
      lease.nextRunAt &&
      Date.parse(lease.nextRunAt) > now.getTime()
    ) {
      return emptyTick(campaignId, "not_due_yet");
    }

    if (!opts?.forceRun && !isWithinSendWindow(now, lease.batchPolicy)) {
      const nextRunAt = computeNextRunAt(now, lease.batchPolicy, false);
      marketingExecutionLeaseStore.upsert({ ...lease, nextRunAt, updatedAt: nowIso() });
      return emptyTick(campaignId, "outside_send_window", nextRunAt);
    }

    if (lease.batchPolicy.endAt && now.getTime() > Date.parse(lease.batchPolicy.endAt)) {
      marketingExecutionLeaseStore.upsert({
        ...lease,
        completedAt: nowIso(),
        nextRunAt: null,
        updatedAt: nowIso(),
      });
      return emptyTick(campaignId, "campaign_end_reached");
    }

    const dailyRemaining = lease.batchPolicy.dailyMax - lease.dailyProcessedCount;
    if (dailyRemaining <= 0 && !opts?.forceRun) {
      const nextRunAt = computeNextRunAt(now, lease.batchPolicy, false);
      marketingExecutionLeaseStore.upsert({ ...lease, nextRunAt, updatedAt: nowIso() });
      return emptyTick(campaignId, "daily_cap_reached", nextRunAt);
    }

    const batchSize = Math.min(
      lease.batchPolicy.batchSize,
      opts?.forceRun ? lease.batchPolicy.batchSize : dailyRemaining,
    );

    const audienceId = campaign.audienceId;
    if (!audienceId) {
      return failBatch(campaignId, lease, "missing_audience");
    }

    const audience = marketingAudienceDefinitionStore.getForOrg(
      audienceId,
      campaign.organizationId,
    );
    if (!audience) {
      return failBatch(campaignId, lease, "audience_not_found");
    }
    await marketingSuppressionStore.hydrate(campaign.organizationId);

    const port = marketingDataSourceService.getPort(campaign.organizationId);
    if (!port.streamRows || !port.getSchema) {
      throw new EnterpriseMarketingSafetyError("execution.sourcePortIncomplete");
    }

    const schema = await port.getSchema(audience.bindingId, audience.datasetId);
    const columns = detectMarketingSheetColumns(schema.headers);
    const batchId = `batch-${campaignId}-${Date.now()}`;
    const scheduledAt = lease.nextRunAt ?? nowIso();

    let selected = 0;
    let eligible = 0;
    let suppressed = 0;
    let processed = 0;
    let failed = 0;
    let skipped = 0;
    let claimed = 0;
    let cursor: string | undefined = lease.streamCursor ?? undefined;
    let streamExhausted = false;

    while (claimed < batchSize) {
      const pageStart = cursor ? Math.max(0, Number.parseInt(cursor, 10) || 0) : 0;
      const page = await port.streamRows({
        bindingId: audience.bindingId,
        datasetId: audience.datasetId,
        cursor,
        limit: MARKETING_EXECUTION_STREAM_PAGE_SIZE,
      });
      if (page.rows.length === 0) {
        streamExhausted = true;
        break;
      }

      let consumedOnPage = 0;
      for (let i = 0; i < page.rows.length && claimed < batchSize; i += 1) {
        consumedOnPage = i + 1;
        const row = page.rows[i]!;
        const sourceRowNumber = page.sourceRowNumbers?.[i];
        selected += 1;

        const passesFilter = evaluateFilterDefinition(
          row,
          audience.filterDefinition,
          columns,
        );
        if (!passesFilter) {
          skipped += 1;
          continue;
        }

        const quality = assessMarketingRowQuality(row, columns, { sourceRowNumber });
        const consent = marketingConsentDecision(row, columns.consentColumn);
        const rowIneligible =
          !quality.fingerprint ||
          quality.issues.includes("missing_identity") ||
          quality.issues.includes("invalid_email") ||
          consent !== "granted";
        if (rowIneligible) {
          skipped += 1;
          const fp = quality.fingerprint ?? `row:${sourceRowNumber ?? selected}`;
          const idempotencyKey = buildMarketingExecutionIdempotencyKey({
            campaignId,
            channel: campaign.channel,
            recipientFingerprint: fp,
          });
          marketingExecutionLedgerStore.tryClaim({
            campaignId,
            organizationId: campaign.organizationId,
            campaignVersionId: versionId,
            channel: campaign.channel,
            recipientFingerprint: fp,
            idempotencyKey,
            batchId,
            sourceRowNumber,
            sourceCursor: cursor ?? null,
          });
          marketingExecutionLedgerStore.finalize(idempotencyKey, {
            status: "skipped",
            processedAt: nowIso(),
            lastError:
              consent !== "granted"
                ? consent === "denied"
                  ? "consent_denied"
                  : "consent_missing"
                : quality.issues.join(",") || "ineligible",
          });
          continue;
        }

        if (!quality.fingerprint) {
          skipped += 1;
          continue;
        }
        const recipientFingerprint = quality.fingerprint;

        eligible += 1;
        const idempotencyKey = buildMarketingExecutionIdempotencyKey({
          campaignId,
          channel: campaign.channel,
          recipientFingerprint,
        });

        const candidates = suppressionCandidates(quality);
        const suppressionDecision = marketingSuppressionStore.evaluateDelivery({
          organizationId: campaign.organizationId,
          fingerprints: candidates,
          channel: campaign.channel,
          phase: "delivery",
          campaignId,
          applyOptionalOrgSuppression: audience.suppressionPolicy.applyOrgSuppression,
          allowedReasons: audience.suppressionPolicy.reasons,
        });
        const suppressedMatch = suppressionDecision.blocked;

        if (suppressedMatch) {
          suppressed += 1;
          const claim = marketingExecutionLedgerStore.tryClaim({
            campaignId,
            organizationId: campaign.organizationId,
            campaignVersionId: versionId,
            channel: campaign.channel,
            recipientFingerprint,
            idempotencyKey,
            batchId,
            sourceRowNumber,
            sourceCursor: cursor ?? null,
          });
          if (claim.ok || claim.duplicate) {
            marketingExecutionLedgerStore.finalize(idempotencyKey, {
              status: "suppressed",
              processedAt: nowIso(),
              lastError: "suppression_match",
            });
            if (claim.ok) {
              await emitMarketingEngagementEvent({
                organizationId: campaign.organizationId,
                campaignId,
                campaignVersionId: versionId,
                channel: campaign.channel,
                type: "SUPPRESSED",
                recipientFingerprint,
                idempotencyKey,
                batchId,
                errorCode: "suppression_match",
              });
            }
          }
          continue;
        }

        const claim = marketingExecutionLedgerStore.tryClaim({
          campaignId,
          organizationId: campaign.organizationId,
          campaignVersionId: versionId,
          channel: campaign.channel,
          recipientFingerprint,
          idempotencyKey,
          batchId,
          sourceRowNumber,
          sourceCursor: cursor ?? null,
          allowRetryFailed: true,
        });

        if (!claim.ok) {
          skipped += 1;
          continue;
        }

        claimed += 1;
        const version = await marketingCampaignStore.getVersion(versionId);
        if (!version) {
          failed += 1;
          marketingExecutionLedgerStore.finalize(idempotencyKey, {
            status: "failed",
            processedAt: nowIso(),
            lastError: "version_missing",
          });
          await emitMarketingEngagementEvent({
            organizationId: campaign.organizationId,
            campaignId,
            campaignVersionId: versionId,
            channel: campaign.channel,
            type: "FAILED",
            recipientFingerprint,
            idempotencyKey,
            batchId,
            errorCode: "version_missing",
          });
          continue;
        }

        if (campaign.channel === "EMAIL" && quality.email) {
          const deliveryResult = await marketingEmailDeliveryService.deliverForExecutionClaim({
            organizationId: campaign.organizationId,
            campaignId,
            campaignVersionId: versionId,
            batchId,
            idempotencyKey,
            recipientFingerprint,
            recipientEmail: quality.email,
            senderIdentityId: campaign.senderIdentityId ?? null,
            fromAddressHint: campaign.sender.fromAddress,
            version,
            row,
            trackingEnabled: version.trackingEnabled,
            product: campaign.product,
            campaignName: campaign.name,
          });
          if (deliveryResult.countsAsProcessed) processed += 1;
          else if (deliveryResult.countsAsFailed) failed += 1;
          continue;
        }

        if (campaign.channel === "WHATSAPP" && quality.phone) {
          if (!campaign.whatsappTemplateId) {
            failed += 1;
            marketingExecutionLedgerStore.finalize(idempotencyKey, {
              status: "failed",
              processedAt: nowIso(),
              lastError: "whatsapp_template_required",
            });
            await emitMarketingEngagementEvent({
              organizationId: campaign.organizationId,
              campaignId,
              campaignVersionId: versionId,
              channel: campaign.channel,
              type: "FAILED",
              recipientFingerprint,
              idempotencyKey,
              batchId,
              errorCode: "whatsapp_template_required",
            });
            continue;
          }
          const deliveryResult = await marketingWhatsAppDeliveryService.deliverForExecutionClaim({
            organizationId: campaign.organizationId,
            campaignId,
            campaignVersionId: versionId,
            batchId,
            idempotencyKey,
            recipientFingerprint,
            recipientPhone: quality.phone,
            whatsappTemplateId: campaign.whatsappTemplateId,
            row,
            senderName: campaign.sender.fromName,
          });
          if (deliveryResult.countsAsProcessed) processed += 1;
          else if (deliveryResult.countsAsFailed) failed += 1;
          continue;
        }

        const externalKey = quality.externalKey ?? "";
        const simulateFail = /FAIL/i.test(externalKey);
        if (simulateFail) {
          failed += 1;
          marketingExecutionLedgerStore.finalize(idempotencyKey, {
            status: "failed",
            processedAt: nowIso(),
            lastError: "dry_run_simulated_failure",
          });
          await emitMarketingEngagementEvent({
            organizationId: campaign.organizationId,
            campaignId,
            campaignVersionId: versionId,
            channel: campaign.channel,
            type: "FAILED",
            recipientFingerprint,
            idempotencyKey,
            batchId,
            errorCode: "dry_run_simulated_failure",
          });
        } else {
          processed += 1;
          marketingExecutionLedgerStore.finalize(idempotencyKey, {
            status: "processed",
            processedAt: nowIso(),
            lastError: null,
          });
          await emitMarketingEngagementEvent({
            organizationId: campaign.organizationId,
            campaignId,
            campaignVersionId: versionId,
            channel: campaign.channel,
            type: "SENT",
            recipientFingerprint,
            idempotencyKey,
            batchId,
          });
        }
      }

      if (claimed >= batchSize && consumedOnPage < page.rows.length) {
        cursor = String(pageStart + consumedOnPage);
        break;
      }
      cursor = page.nextCursor;
      if (!page.nextCursor) {
        streamExhausted = true;
        break;
      }
    }

    const completedAt = nowIso();
    const durationMs = Date.now() - started;
    const nextRunAt =
      streamExhausted && claimed === 0
        ? null
        : computeNextRunAt(new Date(), lease.batchPolicy, true);

    marketingExecutionLeaseStore.upsert({
      ...lease,
      streamCursor: cursor ?? lease.streamCursor,
      dailyProcessedCount: lease.dailyProcessedCount + processed + failed,
      lastBatchId: batchId,
      nextRunAt,
      completedAt: streamExhausted && claimed === 0 ? completedAt : lease.completedAt,
      errorState: null,
      updatedAt: completedAt,
    });

    marketingExecutionBatchStore.record({
      id: `mkt-batch-rec-${batchId}`,
      batchId,
      campaignId,
      scheduledAt,
      startedAt: new Date(started).toISOString(),
      completedAt,
      selectedCount: selected,
      eligibleCount: eligible,
      suppressedCount: suppressed,
      processedCount: processed,
      failedCount: failed,
      skippedCount: skipped,
      durationMs,
      errorState: null,
      dryRun: true,
    });

    if (campaign.status === "SCHEDULED" && (processed > 0 || failed > 0 || suppressed > 0)) {
      await marketingCampaignStore.recordStateChange(campaignId, campaign.organizationId, {
        from: "SCHEDULED",
        to: "RUNNING",
        action: "RUN",
        actorUserId: null,
        note: "Auto-promoted on first dry-run batch",
      });
    }

    recordMarketingAuditEvent({
      kind: "execution.batch.dry_run",
      organizationId: campaign.organizationId,
      detail: {
        campaignId,
        batchId,
        selected,
        eligible,
        suppressed,
        processed,
        failed,
        skipped,
        dryRun: true,
        delivery: "none",
        adminTriggered: opts?.adminTriggered ?? false,
      },
    });

    return {
      campaignId,
      batchId,
      dryRun: true,
      skippedReason: null,
      claimed,
      selected,
      eligible,
      suppressed,
      processed,
      failed,
      skipped,
      nextRunAt,
      streamCursor: cursor ?? lease.streamCursor,
      campaignComplete: streamExhausted && claimed === 0,
    };
  } finally {
    marketingExecutionLeaseStore.releaseLease(campaignId, holderId);
  }
}

function emptyTick(
  campaignId: string,
  reason: string,
  nextRunAt: string | null = null,
): MarketingExecutionTickResult {
  return {
    campaignId,
    batchId: "",
    dryRun: true,
    skippedReason: reason,
    claimed: 0,
    selected: 0,
    eligible: 0,
    suppressed: 0,
    processed: 0,
    failed: 0,
    skipped: 0,
    nextRunAt,
    streamCursor: marketingExecutionLeaseStore.get(campaignId)?.streamCursor ?? null,
    campaignComplete: false,
  };
}

function failBatch(
  campaignId: string,
  lease: NonNullable<ReturnType<typeof marketingExecutionLeaseStore.get>>,
  error: string,
): MarketingExecutionTickResult {
  marketingExecutionLeaseStore.upsert({
    ...lease,
    errorState: error,
    updatedAt: nowIso(),
  });
  return emptyTick(campaignId, error);
}

export const marketingExecutionService = {
  async configure(
    campaignId: string,
    organizationId: string,
    batchPolicy: MarketingBatchPolicy,
    opts?: { resetCursor?: boolean },
  ) {
    assertDryRunExecutionAllowed("execution.configure");
    const campaign = await marketingCampaignStore.getForOrg(campaignId, organizationId);
    if (!campaign) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const policy = resolveBatchPolicy(batchPolicy);
    const now = new Date();
    const lease = marketingExecutionLeaseStore.upsert({
      campaignId,
      organizationId,
      batchPolicy: policy,
      nextRunAt: policy.startAt ?? computeNextRunAt(now, policy, false),
      streamCursor: opts?.resetCursor ? null : marketingExecutionLeaseStore.get(campaignId)?.streamCursor ?? null,
      dailyProcessedCount: opts?.resetCursor ? 0 : marketingExecutionLeaseStore.get(campaignId)?.dailyProcessedCount ?? 0,
      dailyCountResetDate: zonedDateKey(now, policy.timezone),
      leaseHolder: null,
      leaseExpiresAt: null,
      lastBatchId: null,
      completedAt: null,
      errorState: null,
      updatedAt: nowIso(),
    });
    await marketingCampaignStore.updateCampaign(campaignId, organizationId, { batchPolicy: policy });
    recordMarketingAuditEvent({
      kind: "execution.configure",
      organizationId,
      detail: { campaignId, batchPolicy: policy, resetCursor: opts?.resetCursor ?? false },
    });
    return lease;
  },

  async initializeFromTransition(campaignId: string, organizationId: string) {
    const campaign = await marketingCampaignStore.getForOrg(campaignId, organizationId);
    if (!campaign) return null;
    const policy = resolveBatchPolicy(campaign.batchPolicy);
    return this.configure(campaignId, organizationId, policy, { resetCursor: false });
  },

  onResume(campaignId: string) {
    const lease = marketingExecutionLeaseStore.get(campaignId);
    if (!lease) return;
    if (lease.completedAt) return;
    marketingExecutionLeaseStore.upsert({
      ...lease,
      nextRunAt: computeNextRunAt(new Date(), lease.batchPolicy, false),
      errorState: null,
      updatedAt: nowIso(),
    });
  },

  onPause(campaignId: string) {
    const lease = marketingExecutionLeaseStore.get(campaignId);
    if (!lease) return;
    marketingExecutionLeaseStore.upsert({
      ...lease,
      errorState: null,
      updatedAt: nowIso(),
    });
  },

  onStop(campaignId: string) {
    const lease = marketingExecutionLeaseStore.get(campaignId);
    if (!lease) return;
    marketingExecutionLeaseStore.upsert({
      ...lease,
      nextRunAt: null,
      completedAt: null,
      errorState: "stopped",
      updatedAt: nowIso(),
    });
  },

  onCancel(campaignId: string) {
    const lease = marketingExecutionLeaseStore.get(campaignId);
    if (!lease) return;
    marketingExecutionLeaseStore.upsert({
      ...lease,
      nextRunAt: null,
      errorState: "cancelled_before_execution",
      updatedAt: nowIso(),
    });
  },

  async tickBatch(
    campaignId: string,
    opts?: { forceRun?: boolean; holderId?: string; adminTriggered?: boolean },
  ): Promise<MarketingExecutionTickResult> {
    return tickBatchInternal(campaignId, opts);
  },

  async runNextBatch(campaignId: string, organizationId: string) {
    const campaign = await marketingCampaignStore.getForOrg(campaignId, organizationId);
    if (!campaign) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    return tickBatchInternal(campaignId, {
      forceRun: true,
      adminTriggered: true,
      holderId: `admin-${Date.now()}`,
    });
  },

  /**
   * CO-MARKETING-ACTIVATION-002 — Controlled test batch (dry-run / SIMULATED).
   * Caps batch size; never enables live provider send.
   */
  async runControlledTestBatch(
    campaignId: string,
    organizationId: string,
    testBatchSize: number,
  ) {
    assertDryRunExecutionAllowed("execution.controlledTest");
    const size = Math.max(1, Math.min(20, Math.floor(testBatchSize)));
    const campaign = await marketingCampaignStore.getForOrg(campaignId, organizationId);
    if (!campaign) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const base = resolveBatchPolicy(campaign.batchPolicy);
    const scheduleStart = campaign.schedulePlaceholder?.startAt ?? base.startAt;
    const policy: MarketingBatchPolicy = {
      ...base,
      batchSize: size,
      dailyMax: Math.max(base.dailyMax, size),
      startAt: scheduleStart ?? base.startAt,
    };
    await this.configure(campaignId, organizationId, policy, { resetCursor: false });
    const tick = await tickBatchInternal(campaignId, {
      forceRun: true,
      adminTriggered: true,
      holderId: `test-${Date.now()}`,
    });
    recordMarketingAuditEvent({
      kind: "execution.batch.dry_run",
      organizationId,
      detail: {
        campaignId,
        controlledTest: true,
        testBatchSize: size,
        simulated: true,
        actuallySent: false,
        claimed: tick.claimed,
        processed: tick.processed,
        skippedReason: tick.skippedReason ?? null,
      },
    });
    return {
      ...tick,
      controlledTest: true as const,
      testBatchSize: size,
      deliveryLabel: "SIMULATED" as const,
      actuallySent: false as const,
    };
  },

  /**
   * One authorised batch of exactly five frozen recipients.
   * Uses the controlled-test SMTP gate. Organisation-wide execution stays off.
   * Campaign status is left unchanged so the pacing cron cannot continue the send.
   */
  async runControlledFiveRecipientSend(
    campaignId: string,
    organizationId: string,
    actorUserId?: string | null,
  ) {
    assertDryRunExecutionAllowed("execution.controlledFive");
    const gates = assessMarketingControlledFiveGates({
      campaignId,
      executionEnabled: ENTERPRISE_MARKETING_EXECUTION_ENABLED,
      providerConnectEnabled: ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
      controlledTestSendEnabled: isMarketingControlledTestSendEnabled(),
      emailMode: ENTERPRISE_MARKETING_EMAIL_MODE,
      pacingCronRegistered: MARKETING_PACING_CRON_REGISTERED,
    });
    if (!gates.ok) {
      throw Object.assign(new Error(gates.message), { statusCode: 403, code: gates.code });
    }
    const campaign = await marketingCampaignStore.getForOrg(campaignId, organizationId);
    if (!campaign) {
      throw Object.assign(new Error("Campaign not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const ports = getConfiguredMarketingDurabilityPorts();
    if (!ports) {
      throw Object.assign(new Error("Controlled send requires a durable frozen audience snapshot"), {
        statusCode: 400,
        code: "SNAPSHOT_REQUIRED",
      });
    }
    const snapshots = await ports.snapshots.listByCampaign(organizationId, campaignId);
    const snapshot = [...snapshots].sort((a, b) => b.frozenAt.localeCompare(a.frozenAt))[0];
    if (!snapshot) {
      throw Object.assign(new Error("Controlled send requires a durable frozen audience snapshot"), {
        statusCode: 400,
        code: "SNAPSHOT_REQUIRED",
      });
    }
    const recipients = await ports.snapshotRecipients.listBySnapshot(organizationId, snapshot.id);
    const sender = campaign.senderIdentityId
      ? await marketingSenderIdentityStore.get(campaign.senderIdentityId, organizationId)
      : null;
    const audience = assessMarketingControlledFiveAudience({
      campaignStatus: campaign.status,
      approvedAt: campaign.governance?.approvedAt,
      channel: campaign.channel,
      eligibleCount: snapshot.eligibleCount,
      recipientCount: recipients.length,
      fromAddress: campaign.sender?.fromAddress,
      fromName: campaign.sender?.fromName,
      senderIdentityId: campaign.senderIdentityId,
      sender,
    });
    if (!audience.ok) {
      throw Object.assign(new Error(audience.message), { statusCode: 403, code: audience.code });
    }
    const versionId = campaign.activePublishedVersionId ?? campaign.currentDraftVersionId;
    const version = await marketingCampaignStore.getVersion(versionId);
    if (!version) {
      throw Object.assign(new Error("Campaign version is required before the controlled send"), {
        statusCode: 400,
        code: "VERSION_REQUIRED",
      });
    }
    const base = resolveBatchPolicy(campaign.batchPolicy);
    const policy: MarketingBatchPolicy = {
      ...base,
      batchSize: MARKETING_CONTROLLED_FIVE_RECIPIENT_COUNT,
      dailyMax: Math.max(base.dailyMax, MARKETING_CONTROLLED_FIVE_RECIPIENT_COUNT),
    };
    await this.configure(campaignId, organizationId, policy, { resetCursor: false });
    const lease = marketingExecutionLeaseStore.get(campaignId);
    if (!lease) {
      throw Object.assign(new Error("Execution lease not configured"), {
        statusCode: 400,
        code: "EXECUTION_NOT_CONFIGURED",
      });
    }
    const tick = await tickFromFrozenSnapshot({
      campaignId,
      campaign,
      versionId,
      lease,
      holderId: `controlled-five-${actorUserId ?? "admin"}-${Date.now()}`,
      adminTriggered: true,
      forceRun: true,
      ports,
      controlledFiveRecipientSend: true,
    });
    const actuallySent =
      tick.processed === MARKETING_CONTROLLED_FIVE_RECIPIENT_COUNT &&
      tick.failed === 0 &&
      tick.liveProviderInvoked === true;
    recordMarketingAuditEvent({
      kind: "execution.batch.frozen_snapshot",
      organizationId,
      actorUserId: actorUserId ?? null,
      action: "controlled_five_send",
      objectType: "campaign",
      objectId: campaignId,
      versionId,
      detail: {
        campaignId,
        controlledFive: true,
        recipientCount: recipients.length,
        processed: tick.processed,
        failed: tick.failed,
        claimed: tick.claimed,
        suppressed: tick.suppressed,
        actuallySent,
        liveProviderInvoked: tick.liveProviderInvoked === true,
        organisationExecutionEnabled: false,
      },
    });
    return {
      ...tick,
      controlledFive: true as const,
      recipientCount: MARKETING_CONTROLLED_FIVE_RECIPIENT_COUNT,
      actuallySent,
    };
  },

  getSummary(campaignId: string): MarketingExecutionSummary {
    return {
      campaignId,
      lease: marketingExecutionLeaseStore.get(campaignId),
      ledgerCounts: marketingExecutionLedgerStore.countByStatus(campaignId),
      recentBatches: marketingExecutionBatchStore.listByCampaign(campaignId, 10),
      totalBatches: marketingExecutionBatchStore.countByCampaign(campaignId),
    };
  },

  async runDueCampaigns(): Promise<{ processed: number; results: MarketingExecutionTickResult[] }> {
    assertDryRunExecutionAllowed("execution.cron");
    const results: MarketingExecutionTickResult[] = [];
    let processed = 0;
    const now = Date.now();

    for (const campaign of await marketingCampaignStore.listAll()) {
      if (processed >= MARKETING_CRON_MAX_CAMPAIGNS_PER_TICK) break;
      if (!RUNNABLE.includes(campaign.status)) continue;
      const lease = marketingExecutionLeaseStore.get(campaign.id);
      if (!lease || lease.completedAt) continue;
      if (lease.errorState === "stopped") continue;
      if (lease.nextRunAt && Date.parse(lease.nextRunAt) > now) continue;
      const result = await tickBatchInternal(campaign.id, {
        holderId: `cron-${Date.now()}-${campaign.id}`,
      });
      results.push(result);
      if (result.claimed > 0 || result.skippedReason === "outside_send_window") {
        processed += 1;
      }
    }
    return { processed, results };
  },

  /** Verify isolation — resets execution artefacts for a campaign. */
  resetCampaignExecution(campaignId: string) {
    marketingExecutionLedgerStore.resetCampaign(campaignId);
    marketingExecutionBatchStore.resetCampaign(campaignId);
    marketingExecutionLeaseStore.delete(campaignId);
  },
};

export const marketingCampaignExecutionPort: MarketingCampaignExecutionPort = {
  tickBatch: (campaignId) => marketingExecutionService.tickBatch(campaignId),
  pause: async (campaignId) => {
    marketingExecutionService.onPause(campaignId);
  },
  resume: async (campaignId) => {
    marketingExecutionService.onResume(campaignId);
  },
};

export { MARKETING_DEFAULT_BATCH_POLICY };
