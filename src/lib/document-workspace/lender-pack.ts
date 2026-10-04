/**
 * Send-to-Lender pack — records exact versions and queues cover email to Outbox.
 * Never dispatches immediately.
 */

import { queueOutboxMessage } from "@/lib/enterprise-action-center";
import type { DocumentRegistryRecord } from "@/types/document-registry";
import { isLenderEligibleDocumentVersion } from "@/lib/document-workspace/review-status";
import type { DocumentWorkspaceReviewStatus } from "@/constants/document-workspace";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import type { ContextParticipant } from "@/types/enterprise-action-center";

export type DocumentLenderPackRecord = {
  id: string;
  opportunityId: string;
  dealId: string;
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  documentIds: string[];
  versionIds: string[];
  senderLabel: string;
  queuedAt: string;
  deliveryStatus: "queued";
  outboxId: string;
};

const STORAGE_KEY = "catalyst-one:document-workspace:lender-packs";

function readPacks(): DocumentLenderPackRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DocumentLenderPackRecord[]) : [];
  } catch {
    return [];
  }
}

function writePacks(rows: DocumentLenderPackRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function eligibleRecordsForLenderPack(
  rows: Array<{ record?: DocumentRegistryRecord | null; reviewStatus: DocumentWorkspaceReviewStatus }>,
): DocumentRegistryRecord[] {
  return rows
    .filter((row) => row.record && isLenderEligibleDocumentVersion(row))
    .map((row) => row.record!);
}

export function queueDocumentLenderPack(input: {
  opportunityId: string;
  dealId: string;
  dealNumber?: string;
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  records: DocumentRegistryRecord[];
  coverBody: string;
  coverSubject: string;
  senderLabel: string;
}): DocumentLenderPackRecord {
  const versionIds = input.records.map((record) => {
    const current = record.versions.find((v) => v.isCurrent) ?? record.versions[0];
    return current?.id ?? record.id;
  });
  const queued = queueOutboxMessage({
    channel: "email",
    entityType: "lender",
    entityId: input.dealId,
    recipientId: input.recipientId,
    recipientName: input.recipientName,
    recipientType: "lender_representative",
    recipientEmail: input.recipientEmail,
    subject: input.coverSubject,
    body: input.coverBody,
  });
  const pack: DocumentLenderPackRecord = {
    id: `dlp_${Date.now().toString(36)}`,
    opportunityId: input.opportunityId,
    dealId: input.dealId,
    recipientId: input.recipientId,
    recipientName: input.recipientName,
    recipientEmail: input.recipientEmail,
    documentIds: input.records.map((r) => r.id),
    versionIds,
    senderLabel: input.senderLabel,
    queuedAt: new Date().toISOString(),
    deliveryStatus: "queued",
    outboxId: queued.id,
  };
  writePacks([pack, ...readPacks()].slice(0, 100));
  return pack;
}

export function listDocumentLenderPacks(opportunityId?: string): DocumentLenderPackRecord[] {
  const all = readPacks();
  if (!opportunityId) return all;
  return all.filter((row) => row.opportunityId === opportunityId);
}

export function mapDealLenderRecipients(deal: EnterpriseDealApiRecord): ContextParticipant[] {
  const snap =
    deal.snapshot && typeof deal.snapshot === "object"
      ? (deal.snapshot as Record<string, unknown>)
      : {};
  const lenders = Array.isArray(snap.lenders) ? snap.lenders : [];
  const mapped: ContextParticipant[] = [];
  for (const raw of lenders) {
    if (!raw || typeof raw !== "object") continue;
    const card = raw as Record<string, unknown>;
    const lenderName =
      (typeof card.lender === "string" && card.lender) ||
      deal.primaryCounterpartyName ||
      "Lender";
    const contactName =
      (typeof card.lenderSalesContactName === "string" && card.lenderSalesContactName) ||
      "Relationship Manager";
    const email =
      typeof card.lenderSalesContactOfficialEmail === "string"
        ? card.lenderSalesContactOfficialEmail
        : undefined;
    mapped.push({
      id: `lender:${deal.id}:${String(card.lenderRegistryId || card.id || mapped.length)}`,
      name: `${lenderName} · ${contactName}`,
      recipientType: "lender_representative",
      email,
    });
  }
  if (mapped.length === 0) {
    mapped.push({
      id: `lender:${deal.id}`,
      name: `${deal.primaryCounterpartyName || "Lender"} · Relationship Manager`,
      recipientType: "lender_representative",
    });
  }
  return mapped;
}
