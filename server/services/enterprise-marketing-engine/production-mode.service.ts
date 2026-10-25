/**
 * Durable Marketing production operating mode.
 * Stored as the latest audit event so it survives restarts and deployments.
 * Absence of a record stays off. A Super Admin activation is required before any live send.
 * Enabling this mode does not launch or send any campaign.
 */

import { getConfiguredMarketingDurabilityPorts } from "@/lib/enterprise-marketing-engine/durability/composition";
import { recordMarketingAuditEvent } from "./audit";

export const MARKETING_PRODUCTION_MODE_AUDIT_KIND = "marketing.production.mode" as const;

export function marketingProductionLiveDefaultEnabled(): boolean {
  return false;
}

function eventTime(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(typeof value === "string" ? value : "").getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function isMarketingProductionLiveEnabled(organizationId: string): Promise<boolean> {
  const ports = getConfiguredMarketingDurabilityPorts();
  if (!ports || !organizationId.trim()) return marketingProductionLiveDefaultEnabled();
  const events = await ports.audit.list(organizationId);
  const latest = events
    .filter((event) => event.kind === MARKETING_PRODUCTION_MODE_AUDIT_KIND)
    .sort((left, right) => eventTime(right.createdAt) - eventTime(left.createdAt))[0];
  if (!latest) return marketingProductionLiveDefaultEnabled();
  return latest.detailJson?.enabled === true;
}

export async function setMarketingProductionLiveEnabled(input: {
  organizationId: string;
  actorUserId?: string | null;
  enabled: boolean;
}): Promise<{ enabled: boolean }> {
  recordMarketingAuditEvent({
    kind: MARKETING_PRODUCTION_MODE_AUDIT_KIND,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId ?? null,
    action: input.enabled ? "activate" : "deactivate",
    objectType: "marketing_production_mode",
    objectId: input.organizationId,
    previousState: null,
    resultingState: input.enabled ? "production" : "dry_run",
    reason: input.enabled
      ? "Super Admin activated production Marketing. Campaigns still require approval and launch."
      : "Super Admin returned Marketing to dry-run only.",
    detail: {
      enabled: input.enabled,
      sendsCampaignsAutomatically: false,
    },
  });
  return { enabled: input.enabled };
}
