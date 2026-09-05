/**
 * CO-MARKETING-REDESIGN-020 — Expire or release abandoned worker leases safely.
 */

import type { MarketingDurableExecutionLeaseRecord } from "@/types/enterprise-marketing-durability";
import type { MarketingDurabilityPorts } from "@/types/enterprise-marketing-durability-ports";

export function marketingLeaseIsAbandoned(
  lease: MarketingDurableExecutionLeaseRecord | null | undefined,
  nowMs: number,
): boolean {
  if (!lease?.leaseHolder || !lease.leaseExpiresAt) return false;
  const expiresAt = Date.parse(lease.leaseExpiresAt);
  return Number.isFinite(expiresAt) && expiresAt <= nowMs;
}

export async function expireAbandonedMarketingLease(input: {
  ports: MarketingDurabilityPorts;
  organizationId: string;
  campaignId: string;
  now: Date;
  actorUserId?: string | null;
}): Promise<{ expired: boolean; previousHolder: string | null }> {
  const lease = await input.ports.leases.getByCampaign(input.organizationId, input.campaignId);
  if (!marketingLeaseIsAbandoned(lease, input.now.getTime()) || !lease?.leaseHolder) {
    return { expired: false, previousHolder: lease?.leaseHolder ?? null };
  }
  const previousHolder = lease.leaseHolder;
  await input.ports.leases.release(input.organizationId, input.campaignId, previousHolder);
  await input.ports.audit.append({
    id: `audit-${input.campaignId}-lease-expired-${input.now.getTime()}`,
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    actorUserId: input.actorUserId ?? null,
    kind: "execution.lease.expired",
    createdAt: input.now.toISOString(),
  });
  return { expired: true, previousHolder };
}
