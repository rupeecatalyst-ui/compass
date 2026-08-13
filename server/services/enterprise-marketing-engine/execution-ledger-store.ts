/**
 * CO-MARKETING-MKT-06 — Minimal recipient execution ledger (touched rows only).
 */

import type {
  MarketingRecipientLedgerEntry,
  MarketingRecipientLedgerStatus,
} from "@/types/enterprise-marketing-execution";
import type { MarketingChannel } from "@/constants/enterprise-marketing-engine";

function nowIso() {
  return new Date().toISOString();
}

function ledgerKey(campaignId: string, channel: MarketingChannel, fingerprint: string) {
  return `${campaignId}:${channel}:${fingerprint}`.toLowerCase();
}

const byKey = new Map<string, MarketingRecipientLedgerEntry>();
const byCampaign = new Map<string, Set<string>>();

function indexEntry(entry: MarketingRecipientLedgerEntry) {
  byKey.set(entry.idempotencyKey, entry);
  let set = byCampaign.get(entry.campaignId);
  if (!set) {
    set = new Set();
    byCampaign.set(entry.campaignId, set);
  }
  set.add(entry.idempotencyKey);
}

export const marketingExecutionLedgerStore = {
  getByFingerprint(
    campaignId: string,
    channel: MarketingChannel,
    fingerprint: string,
  ): MarketingRecipientLedgerEntry | null {
    return byKey.get(ledgerKey(campaignId, channel, fingerprint)) ?? null;
  },

  listByCampaign(campaignId: string): MarketingRecipientLedgerEntry[] {
    const keys = byCampaign.get(campaignId);
    if (!keys) return [];
    return [...keys].map((k) => byKey.get(k)!).filter(Boolean);
  },

  listForCampaigns(campaignIds: string[]): MarketingRecipientLedgerEntry[] {
    const out: MarketingRecipientLedgerEntry[] = [];
    for (const id of campaignIds) {
      out.push(...this.listByCampaign(id));
    }
    return out;
  },

  countByStatus(campaignId: string): Record<MarketingRecipientLedgerStatus, number> {
    const counts: Record<MarketingRecipientLedgerStatus, number> = {
      eligible: 0,
      queued: 0,
      processing: 0,
      processed: 0,
      delivered: 0,
      failed: 0,
      skipped: 0,
      suppressed: 0,
    };
    for (const entry of this.listByCampaign(campaignId)) {
      counts[entry.status] += 1;
    }
    return counts;
  },

  upsert(entry: MarketingRecipientLedgerEntry): MarketingRecipientLedgerEntry {
    indexEntry(entry);
    return entry;
  },

  /**
   * Idempotent claim — unique (campaignId, channel, recipientFingerprint).
   * Survives retry / duplicate worker invocation.
   */
  tryClaim(input: {
    campaignId: string;
    campaignVersionId: string;
    channel: MarketingChannel;
    recipientFingerprint: string;
    idempotencyKey: string;
    batchId: string;
    sourceRowNumber?: number | null;
    sourceCursor?: string | null;
    allowRetryFailed?: boolean;
  }):
    | { ok: true; entry: MarketingRecipientLedgerEntry; duplicate: false }
    | { ok: false; duplicate: true; entry: MarketingRecipientLedgerEntry; reason: string } {
    const existing = byKey.get(input.idempotencyKey);
    const ts = nowIso();
    if (existing) {
      const terminal = new Set<MarketingRecipientLedgerStatus>([
        "processed",
        "delivered",
        "suppressed",
        "skipped",
      ]);
      if (terminal.has(existing.status)) {
        return { ok: false, duplicate: true, entry: existing, reason: "already_terminal" };
      }
      if (existing.status === "processing" && existing.claimedAt) {
        const age = Date.now() - Date.parse(existing.claimedAt);
        if (age < 120_000) {
          return { ok: false, duplicate: true, entry: existing, reason: "in_flight" };
        }
      }
      if (existing.status === "failed" && input.allowRetryFailed) {
        const next: MarketingRecipientLedgerEntry = {
          ...existing,
          status: "processing",
          batchId: input.batchId,
          attemptCount: existing.attemptCount + 1,
          claimedAt: ts,
          updatedAt: ts,
          lastError: null,
        };
        indexEntry(next);
        return { ok: true, entry: next, duplicate: false };
      }
      return { ok: false, duplicate: true, entry: existing, reason: "already_claimed" };
    }
    const entry: MarketingRecipientLedgerEntry = {
      id: `mkt-led-${input.campaignId}-${byKey.size + 1}`,
      campaignId: input.campaignId,
      campaignVersionId: input.campaignVersionId,
      channel: input.channel,
      recipientFingerprint: input.recipientFingerprint,
      idempotencyKey: input.idempotencyKey,
      status: "processing",
      sourceRowNumber: input.sourceRowNumber ?? null,
      sourceCursor: input.sourceCursor ?? null,
      batchId: input.batchId,
      attemptCount: 1,
      claimedAt: ts,
      processedAt: null,
      lastError: null,
      createdAt: ts,
      updatedAt: ts,
    };
    indexEntry(entry);
    return { ok: true, entry, duplicate: false };
  },

  finalize(
    idempotencyKey: string,
    patch: Pick<
      MarketingRecipientLedgerEntry,
      "status" | "processedAt" | "lastError"
    >,
  ): MarketingRecipientLedgerEntry | null {
    const existing = byKey.get(idempotencyKey);
    if (!existing) return null;
    const next = { ...existing, ...patch, updatedAt: nowIso() };
    indexEntry(next);
    return next;
  },

  /** Verify / test isolation only. */
  resetCampaign(campaignId: string) {
    const keys = byCampaign.get(campaignId);
    if (!keys) return;
    for (const k of keys) byKey.delete(k);
    byCampaign.delete(campaignId);
  },
};
