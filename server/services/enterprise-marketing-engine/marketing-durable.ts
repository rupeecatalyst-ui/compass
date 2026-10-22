/**
 * Loads existing marketing durability rows when persistence mode is prisma.
 * Origin already owns audience snapshots, suppression, and the recipient ledger.
 * This module does not create a second table set and does not store sheet rows.
 */
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import type { MarketingSuppressionRecord } from "@/types/enterprise-marketing-audience";
import type { MarketingRecipientLedgerEntry } from "@/types/enterprise-marketing-execution";
import { prisma } from "@server/lib/prisma";

function unavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /does not exist|P2021|DATABASE_URL|Can't reach database|ECONNREFUSED|Unknown argument/i.test(message);
}

function suppressionChannel(value: string | null | undefined): "EMAIL" | "WHATSAPP" | "ALL" {
  if (value === "EMAIL" || value === "WHATSAPP" || value === "ALL") return value;
  return "ALL";
}

export async function hydrateMarketingSuppressions(
  organizationId: string,
  apply: (record: MarketingSuppressionRecord) => void,
): Promise<void> {
  if (!isEnterprisePersistencePrisma()) return;
  try {
    const rows = await prisma.enterpriseMarketingSuppression.findMany({
      where: { organizationId },
    });
    for (const row of rows) {
      apply({
        id: row.id,
        organizationId: row.organizationId,
        fingerprint: row.identityFingerprint,
        reason: row.reason as MarketingSuppressionRecord["reason"],
        channel: suppressionChannel(row.channel),
        note: row.note,
        createdAt: row.createdAt.toISOString(),
      });
    }
  } catch (error) {
    if (!unavailable(error)) throw error;
  }
}

export async function persistMarketingSuppression(
  record: MarketingSuppressionRecord,
): Promise<void> {
  if (!isEnterprisePersistencePrisma()) return;
  const channel = suppressionChannel(record.channel);
  try {
    await prisma.enterpriseMarketingSuppression.upsert({
      where: {
        organizationId_identityFingerprint_channel: {
          organizationId: record.organizationId,
          identityFingerprint: record.fingerprint,
          channel,
        },
      },
      create: {
        id: record.id,
        organizationId: record.organizationId,
        identityFingerprint: record.fingerprint,
        channel,
        reason: record.reason,
        consentStatus: "SUPPRESSED",
        note: record.note ?? null,
        normalizedIdentity: record.fingerprint,
        createdAt: new Date(record.createdAt),
      },
      update: {
        reason: record.reason,
        note: record.note ?? null,
      },
    });
  } catch (error) {
    if (!unavailable(error)) throw error;
  }
}

/**
 * The frozen-snapshot worker creates recipient-ledger rows.
 * This only updates a row that already exists, so a dry-run without a
 * snapshot cannot insert an email or invent a recipient.
 */
export async function persistMarketingLedgerEntry(
  organizationId: string,
  entry: MarketingRecipientLedgerEntry,
): Promise<void> {
  if (!isEnterprisePersistencePrisma() || !organizationId || !entry.idempotencyKey) return;
  try {
    const existing = await prisma.enterpriseMarketingRecipientLedger.findFirst({
      where: { organizationId, idempotencyKey: entry.idempotencyKey },
      select: { id: true },
    });
    if (!existing) return;
    await prisma.enterpriseMarketingRecipientLedger.update({
      where: { id: existing.id },
      data: {
        status: entry.status,
        lastError: entry.lastError ?? null,
        attemptCount: entry.attemptCount,
        claimedAt: entry.claimedAt ? new Date(entry.claimedAt) : null,
        processedAt: entry.processedAt ? new Date(entry.processedAt) : null,
      },
    });
  } catch (error) {
    if (!unavailable(error)) throw error;
  }
}
