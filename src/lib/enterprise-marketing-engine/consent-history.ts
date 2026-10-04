/**
 * CO-MARKETING-REDESIGN-012 — Historical campaign evidence must not be rewritten.
 */

import type { MarketingDurableSnapshotRecipientRecord } from "@/types/enterprise-marketing-durability";

export function preserveMarketingSnapshotRecipients(
  recipients: MarketingDurableSnapshotRecipientRecord[],
): MarketingDurableSnapshotRecipientRecord[] {
  return recipients.map((row) => ({ ...row }));
}

export function assertMarketingSnapshotNotSilentlyPurged(input: {
  beforeIds: string[];
  afterIds: string[];
}): void {
  const after = new Set(input.afterIds);
  const missing = input.beforeIds.filter((id) => !after.has(id));
  if (missing.length) {
    throw Object.assign(
      new Error("Historical campaign snapshot recipients must not be removed silently"),
      { statusCode: 409, code: "SNAPSHOT_HISTORY_IMMUTABLE", detail: { missing } },
    );
  }
}
