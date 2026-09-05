/**
 * CO-MARKETING-REDESIGN-020 — Operational health snapshot.
 * Every field is durable or explicitly labelled simulated. Never presented as live send telemetry.
 */

import {
  ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
} from "@/constants/enterprise-marketing-engine";
import {
  MARKETING_OPERATIONAL_HEALTH_NOTICE,
  MARKETING_OPERATIONAL_HEALTH_SIMULATED_NOTICE,
} from "@/constants/enterprise-marketing-engine/recovery";
import { MARKETING_PACING_CRON_REGISTERED } from "@/lib/enterprise-marketing-engine/execution/cron-activation";
import { classifyMarketingRecipientClaim } from "@/lib/enterprise-marketing-engine/durability/claim";
import { canRetryFailedMarketingDelivery } from "@/lib/enterprise-marketing-engine/durability/retry-policy";
import { marketingLeaseIsAbandoned } from "@/lib/enterprise-marketing-engine/durability/lease-recovery";
import type { MarketingRecoveryStore } from "@/lib/enterprise-marketing-engine/durability/recovery-store";
import type { MarketingDurabilityPorts } from "@/types/enterprise-marketing-durability-ports";
import type {
  MarketingHealthField,
  MarketingOperationalHealthSnapshot,
  MarketingWorkerStatus,
} from "@/types/enterprise-marketing-recovery";

function field<T>(value: T, source: "durable" | "simulated", note?: string): MarketingHealthField<T> {
  return note ? { value, source, note } : { value, source };
}

export function createSimulatedMarketingOperationalHealth(
  organizationId: string,
  campaignId: string | null = null,
  now = new Date(),
): MarketingOperationalHealthSnapshot {
  const simulated = MARKETING_OPERATIONAL_HEALTH_SIMULATED_NOTICE;
  return {
    organizationId,
    campaignId,
    generatedAt: now.toISOString(),
    dryRun: true,
    liveSend: false,
    cronRegistered: false,
    workerStatus: field("simulated_idle", "simulated", simulated),
    lastHeartbeat: field(null, "simulated", simulated),
    activeLease: field({ holderId: null, expiresAt: null, pauseState: null }, "simulated", simulated),
    nextScheduledRun: field(null, "simulated", simulated),
    delayedBatches: field(0, "simulated", simulated),
    exhaustedRetries: field(0, "simulated", simulated),
    quarantinedRecipients: field(0, "simulated", simulated),
    providerAvailability: field("unavailable", "durable", "ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED=false"),
    schedulerStatus: field("unregistered", "durable", "MARKETING_PACING_CRON_REGISTERED=false"),
    processingLatencyMs: field(null, "simulated", simulated),
    notice: MARKETING_OPERATIONAL_HEALTH_NOTICE,
  };
}

export async function composeMarketingOperationalHealth(input: {
  organizationId: string;
  campaignId?: string | null;
  ports?: MarketingDurabilityPorts | null;
  recovery?: MarketingRecoveryStore | null;
  now?: Date;
}): Promise<MarketingOperationalHealthSnapshot> {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const base = createSimulatedMarketingOperationalHealth(input.organizationId, input.campaignId ?? null, now);
  if (ENTERPRISE_MARKETING_EXECUTION_ENABLED) {
    throw Object.assign(new Error("Live marketing send is disabled"), {
      statusCode: 403,
      code: "LIVE_SEND_BLOCKED",
    });
  }

  base.providerAvailability = field(
    ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED ? "fixture" : "unavailable",
    "durable",
    "Provider connect remains off. Fixture adapters only.",
  );
  base.schedulerStatus = field(
    MARKETING_PACING_CRON_REGISTERED ? "idle" : "unregistered",
    "durable",
    "Production pacing cron is not registered.",
  );
  base.cronRegistered = false;
  base.liveSend = false;
  base.dryRun = true;

  if (!input.ports || !input.campaignId) return base;

  const lease = await input.ports.leases.getByCampaign(input.organizationId, input.campaignId);
  const batches = await input.ports.batches.listByCampaign(input.organizationId, input.campaignId);
  const ledger = await input.ports.ledger.listByCampaign(input.organizationId, input.campaignId);
  const heartbeat = input.recovery?.lastHeartbeat(input.organizationId, input.campaignId) ?? null;
  const quarantined = input.recovery?.listQuarantine(input.organizationId, input.campaignId) ?? [];

  const delayed = ledger.filter(
    (row) => classifyMarketingRecipientClaim(row, nowMs) === "delayed",
  ).length;
  const exhausted = ledger.filter(
    (row) =>
      (row.status === "failed" || row.status === "deferred" || row.status === "bounced") &&
      !canRetryFailedMarketingDelivery(row.status, row.attemptCount),
  ).length;

  let workerStatus: MarketingWorkerStatus = "idle";
  if (lease?.pauseState === "PAUSED") workerStatus = "paused";
  else if (lease?.pauseState === "STOPPED") workerStatus = "stopped";
  else if (marketingLeaseIsAbandoned(lease, nowMs)) workerStatus = "lease_expired";
  else if (lease?.leaseHolder) workerStatus = "running";
  else if (heartbeat) workerStatus = "idle";

  const processedTimes = ledger
    .map((row) => (row.processedAt && row.claimedAt ? Date.parse(row.processedAt) - Date.parse(row.claimedAt) : null))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);
  const latency =
    processedTimes.length > 0
      ? Math.round(processedTimes.reduce((sum, value) => sum + value, 0) / processedTimes.length)
      : null;

  const delayedBatches = batches.filter((batch) => {
    if (batch.status === "processed" || batch.status === "completed") return false;
    const due = Date.parse(batch.scheduledAt);
    return Number.isFinite(due) && due < nowMs;
  }).length;

  const dueSoon = lease?.nextRunAt && Date.parse(lease.nextRunAt) <= nowMs;
  if (dueSoon && workerStatus === "idle") {
    base.schedulerStatus = field("due", "durable", "Next run is due; production cron remains unregistered.");
  }

  return {
    ...base,
    campaignId: input.campaignId,
    workerStatus: field(workerStatus, lease ? "durable" : "simulated"),
    lastHeartbeat: heartbeat
      ? field(heartbeat.at, "durable")
      : field(null, "simulated", MARKETING_OPERATIONAL_HEALTH_SIMULATED_NOTICE),
    activeLease: field(
      {
        holderId: lease?.leaseHolder ?? null,
        expiresAt: lease?.leaseExpiresAt ?? null,
        pauseState: lease?.pauseState ?? null,
      },
      lease ? "durable" : "simulated",
    ),
    nextScheduledRun: field(lease?.nextRunAt ?? null, lease ? "durable" : "simulated"),
    delayedBatches: field(delayedBatches + delayed, "durable"),
    exhaustedRetries: field(exhausted, "durable"),
    quarantinedRecipients: field(
      quarantined.length,
      input.recovery ? "durable" : "simulated",
      input.recovery ? undefined : MARKETING_OPERATIONAL_HEALTH_SIMULATED_NOTICE,
    ),
    processingLatencyMs: latency != null
      ? field(latency, "durable")
      : field(null, "simulated", MARKETING_OPERATIONAL_HEALTH_SIMULATED_NOTICE),
  };
}
