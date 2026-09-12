/**
 * CO-MARKETING-HOSTINGER-SMTP-001B — Durable send uniqueness.
 * Canonical uniqueness is the Marketing durability ledger (Prisma in production).
 * In-memory adapter maps are defense-in-depth only.
 */

import { getConfiguredMarketingDurabilityPorts } from "@/lib/enterprise-marketing-engine/durability/composition";
import { isTerminalSuccessfulDelivery } from "@/lib/enterprise-marketing-engine/durability/retry-policy";
import type { MarketingDurableLedgerRecord } from "@/types/enterprise-marketing-durability";

export async function lookupDurableMarketingSend(
  organizationId: string,
  idempotencyKey: string,
): Promise<MarketingDurableLedgerRecord | null> {
  const ports = getConfiguredMarketingDurabilityPorts();
  if (!ports) return null;
  return ports.ledger.getByIdempotencyKey(organizationId, idempotencyKey);
}

export function marketingDurableSendAlreadyCompleted(
  record: MarketingDurableLedgerRecord | null,
): boolean {
  if (!record) return false;
  return isTerminalSuccessfulDelivery(record.status);
}
