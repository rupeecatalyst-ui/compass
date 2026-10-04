/**
 * CO-MARKETING-REDESIGN-020 — Webhook replay is idempotent. Duplicate provider events are not reapplied.
 */

import type { MarketingDurableEngagementEventRecord } from "@/types/enterprise-marketing-durability";
import type { MarketingDurabilityPorts } from "@/types/enterprise-marketing-durability-ports";

export async function replayMarketingEngagementEvent(input: {
  ports: MarketingDurabilityPorts;
  event: MarketingDurableEngagementEventRecord;
}): Promise<{ duplicate: boolean; event: MarketingDurableEngagementEventRecord }> {
  const recorded = await input.ports.engagements.record(input.event);
  return { duplicate: recorded.duplicate, event: recorded.event };
}
