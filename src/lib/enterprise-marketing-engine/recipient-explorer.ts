/**
 * CO-MARKETING-REDESIGN-010 — Organisation-scoped recipient explorer.
 * Permission-controlled at the service. Masks email / fingerprint. Never returns raw PII.
 */

import { redactMarketingFingerprint } from "@/lib/enterprise-marketing-engine/analytics/redact-fingerprint";
import { MARKETING_MONITORING_NOTICE } from "@/constants/enterprise-marketing-engine/monitoring";
import type {
  MarketingDurableLedgerRecord,
  MarketingDurableSnapshotRecipientRecord,
} from "@/types/enterprise-marketing-durability";
import type {
  MarketingRecipientExplorerPage,
  MarketingRecipientExplorerRow,
} from "@/types/enterprise-marketing-monitoring";

export function maskMarketingRecipientEmail(email: string | null | undefined): string {
  const raw = (email ?? "").trim();
  if (!raw) return "—";
  return redactMarketingFingerprint(raw.includes("@") ? `email:${raw}` : raw);
}

export function composeMarketingRecipientExplorer(input: {
  organizationId: string;
  durableAvailable: boolean;
  recipients?: MarketingDurableSnapshotRecipientRecord[];
  ledger?: MarketingDurableLedgerRecord[];
  campaignId?: string | null;
  page?: number;
  pageSize?: number;
}): MarketingRecipientExplorerPage {
  const pageSize = Math.min(Math.max(1, input.pageSize ?? 50), 100);
  const page = Math.max(1, input.page ?? 1);
  if (!input.durableAvailable) {
    return {
      rows: [],
      total: 0,
      page,
      pageSize,
      durableAvailable: false,
      notice: "Unavailable — durable recipient records are not connected.",
    };
  }

  const ledgerByRecipient = new Map<string, MarketingDurableLedgerRecord>();
  for (const row of input.ledger ?? []) {
    if (row.organizationId !== input.organizationId) continue;
    ledgerByRecipient.set(row.snapshotRecipientId, row);
  }

  const campaignId = input.campaignId?.trim() || null;
  const filtered = (input.recipients ?? []).filter((row) => {
    if (row.organizationId !== input.organizationId) return false;
    if (campaignId && row.campaignId !== campaignId) return false;
    return true;
  });

  const mapped: MarketingRecipientExplorerRow[] = filtered.map((row) => {
    const ledger = ledgerByRecipient.get(row.id) ?? null;
    return {
      id: row.id,
      organizationId: row.organizationId,
      campaignId: row.campaignId,
      snapshotId: row.snapshotId,
      ledgerId: ledger?.id ?? null,
      status: ledger?.status ?? "snapshotted",
      fingerprintPreview: redactMarketingFingerprint(row.recipientFingerprint),
      emailPreview: maskMarketingRecipientEmail(row.normalizedEmail),
      batchNumber: ledger?.batchNumber ?? row.assignedBatchNumber,
      sourceRowNumber: row.sourceRowNumber,
      linkedContact: Boolean(ledger?.linkedContactId),
      linkedOpportunity: Boolean(ledger?.linkedOpportunityId),
    };
  });

  const total = mapped.length;
  const start = (page - 1) * pageSize;
  return {
    rows: mapped.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    durableAvailable: true,
    notice: MARKETING_MONITORING_NOTICE,
  };
}
