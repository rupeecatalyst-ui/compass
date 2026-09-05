/**
 * CO-MARKETING-REDESIGN-002 — Pause / resume / stop / cancel are distinct.
 * Stop is final unless a separately authorised restart is invoked.
 */

import type { MarketingCampaignAction, MarketingCampaignStatus } from "@/constants/enterprise-marketing-engine/lifecycle";
import type { MarketingDurabilityPorts } from "@/types/enterprise-marketing-durability-ports";
import { assertMarketingActionAllowed } from "./lifecycle";
import { assertMarketingLeasePauseTransition } from "./lease-state";
import { isTerminalSuccessfulDelivery } from "./retry-policy";

function nowIso() {
  return new Date().toISOString();
}

export type MarketingOperationalControlAction = Extract<
  MarketingCampaignAction,
  "PAUSE" | "RESUME" | "STOP" | "CANCEL"
>;

export async function applyMarketingOperationalControl(input: {
  ports: MarketingDurabilityPorts;
  organizationId: string;
  campaignId: string;
  fromStatus: MarketingCampaignStatus;
  action: MarketingOperationalControlAction;
  actorUserId: string | null;
  authorisedRestart?: boolean;
}): Promise<{ toStatus: MarketingCampaignStatus; pauseState: string }> {
  if (input.action === "RESUME" && input.fromStatus === "STOPPED") {
    throw Object.assign(new Error("STOP is final — resume is not allowed"), {
      statusCode: 400,
      code: "STOP_IS_FINAL",
    });
  }

  const toStatus = assertMarketingActionAllowed(input.fromStatus, input.action);
  const lease = await input.ports.leases.getByCampaign(input.organizationId, input.campaignId);
  const ts = nowIso();

  if (input.action === "PAUSE") {
    if (lease) {
      assertMarketingLeasePauseTransition(lease.pauseState, "PAUSED");
      await input.ports.leases.setPauseState(input.organizationId, input.campaignId, "PAUSED");
    } else {
      await input.ports.leases.upsert({
        id: `lease-${input.campaignId}`,
        organizationId: input.organizationId,
        campaignId: input.campaignId,
        snapshotId: null,
        nextRunAt: null,
        streamCursor: null,
        lastCompletedBatchNumber: null,
        pauseState: "PAUSED",
        leaseHolder: null,
        leaseExpiresAt: null,
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
        createdAt: ts,
        updatedAt: ts,
      });
    }
  }

  if (input.action === "RESUME") {
    if (!lease) {
      throw Object.assign(new Error("Cannot resume without an execution lease"), {
        statusCode: 400,
        code: "EXECUTION_NOT_CONFIGURED",
      });
    }
    assertMarketingLeasePauseTransition(lease.pauseState, "ACTIVE");
    await input.ports.leases.setPauseState(input.organizationId, input.campaignId, "ACTIVE", {
      nextRunAt: lease.nextRunAt,
      streamCursor: lease.streamCursor,
    });
  }

  if (input.action === "STOP") {
    if (lease) {
      assertMarketingLeasePauseTransition(lease.pauseState, "STOPPED");
      await input.ports.leases.setPauseState(input.organizationId, input.campaignId, "STOPPED", {
        nextRunAt: null,
        streamCursor: lease.streamCursor,
      });
    } else {
      await input.ports.leases.upsert({
        id: `lease-${input.campaignId}`,
        organizationId: input.organizationId,
        campaignId: input.campaignId,
        snapshotId: null,
        nextRunAt: null,
        streamCursor: null,
        lastCompletedBatchNumber: null,
        pauseState: "STOPPED",
        leaseHolder: null,
        leaseExpiresAt: null,
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
        createdAt: ts,
        updatedAt: ts,
      });
    }
  }

  if (input.action === "CANCEL") {
    const entries = await input.ports.ledger.listByCampaign(input.organizationId, input.campaignId);
    for (const entry of entries) {
      if (isTerminalSuccessfulDelivery(entry.status) || entry.status === "cancelled") continue;
      if (entry.status === "processing" || entry.status === "sent" || entry.status === "delivered") continue;
      await input.ports.ledger.finalize(input.organizationId, entry.idempotencyKey, {
        status: "cancelled",
        processedAt: ts,
      });
    }
    if (lease) {
      await input.ports.leases.setPauseState(input.organizationId, input.campaignId, "STOPPED", {
        nextRunAt: null,
      });
    }
  }

  await input.ports.audit.append({
    id: `audit-${input.campaignId}-${input.action}-${Date.now()}`,
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    actorUserId: input.actorUserId,
    kind: `campaign.${input.action.toLowerCase()}`,
    createdAt: ts,
  });

  const nextLease = await input.ports.leases.getByCampaign(input.organizationId, input.campaignId);
  return { toStatus, pauseState: nextLease?.pauseState ?? (input.action === "PAUSE" ? "PAUSED" : "STOPPED") };
}

export async function authoriseMarketingExecutionRestart(input: {
  ports: MarketingDurabilityPorts;
  organizationId: string;
  campaignId: string;
  actorUserId: string | null;
  authorisedRestart: true;
}): Promise<void> {
  if (input.authorisedRestart !== true) {
    throw Object.assign(new Error("Restart requires separate authorisation"), {
      statusCode: 403,
      code: "RESTART_NOT_AUTHORISED",
    });
  }
  const lease = await input.ports.leases.getByCampaign(input.organizationId, input.campaignId);
  if (!lease || lease.pauseState !== "STOPPED") {
    throw Object.assign(new Error("Authorised restart is only valid from STOPPED"), {
      statusCode: 400,
      code: "RESTART_NOT_AVAILABLE",
    });
  }
  await input.ports.leases.setPauseState(input.organizationId, input.campaignId, "ACTIVE", {
    streamCursor: lease.streamCursor,
  });
  await input.ports.audit.append({
    id: `audit-${input.campaignId}-restart-${Date.now()}`,
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    actorUserId: input.actorUserId,
    kind: "campaign.authorised_restart",
    createdAt: nowIso(),
  });
}
