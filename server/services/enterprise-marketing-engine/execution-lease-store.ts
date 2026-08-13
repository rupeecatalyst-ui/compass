/**
 * CO-MARKETING-MKT-06 — Campaign execution lease + pacing cursor.
 */

import { MARKETING_EXECUTION_LEASE_TTL_MS } from "@/constants/enterprise-marketing-engine/execution";
import type { MarketingExecutionLease } from "@/types/enterprise-marketing-execution";
import { zonedDateKey } from "@/lib/enterprise-marketing-engine/execution/batch-schedule";

function nowIso() {
  return new Date().toISOString();
}

const leases = new Map<string, MarketingExecutionLease>();

export const marketingExecutionLeaseStore = {
  get(campaignId: string): MarketingExecutionLease | null {
    return leases.get(campaignId) ?? null;
  },

  upsert(lease: MarketingExecutionLease): MarketingExecutionLease {
    leases.set(lease.campaignId, lease);
    return lease;
  },

  delete(campaignId: string) {
    leases.delete(campaignId);
  },

  resetDailyIfNeeded(lease: MarketingExecutionLease, now: Date): MarketingExecutionLease {
    const key = zonedDateKey(now, lease.batchPolicy.timezone);
    if (lease.dailyCountResetDate === key) return lease;
    return this.upsert({
      ...lease,
      dailyProcessedCount: 0,
      dailyCountResetDate: key,
      updatedAt: nowIso(),
    });
  },

  tryAcquireLease(campaignId: string, holderId: string): boolean {
    const lease = leases.get(campaignId);
    if (!lease) return false;
    const now = Date.now();
    if (
      lease.leaseHolder &&
      lease.leaseExpiresAt &&
      Date.parse(lease.leaseExpiresAt) > now &&
      lease.leaseHolder !== holderId
    ) {
      return false;
    }
    leases.set(campaignId, {
      ...lease,
      leaseHolder: holderId,
      leaseExpiresAt: new Date(now + MARKETING_EXECUTION_LEASE_TTL_MS).toISOString(),
      updatedAt: nowIso(),
    });
    return true;
  },

  releaseLease(campaignId: string, holderId: string) {
    const lease = leases.get(campaignId);
    if (!lease || lease.leaseHolder !== holderId) return;
    leases.set(campaignId, {
      ...lease,
      leaseHolder: null,
      leaseExpiresAt: null,
      updatedAt: nowIso(),
    });
  },
};
