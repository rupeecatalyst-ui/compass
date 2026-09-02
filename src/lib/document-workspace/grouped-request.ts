/**
 * Owner-grouped document request copy — one communication, grouped by owner.
 * Does not send. Callers open Action Centre / Outbox composers.
 */

import type { DocumentRequestItemState } from "@/types/document-requests";
import { getDocumentRequestRef } from "@/lib/document-requests/lod-versioning";

export type GroupedDocumentRequestBlock = {
  ownerLabel: string;
  ownerRoleLabel: string;
  items: DocumentRequestItemState[];
};

export function groupDocumentRequestItemsByOwner(
  items: DocumentRequestItemState[],
): GroupedDocumentRequestBlock[] {
  const map = new Map<string, GroupedDocumentRequestBlock>();
  for (const item of items) {
    const ownerLabel = item.ownerName?.trim() || "Shared Transaction";
    const ownerRoleLabel = item.ownerRoleLabel?.trim() || item.ownerTypeLabel || "Owner";
    const key = `${ownerRoleLabel}::${ownerLabel}`;
    const existing = map.get(key);
    if (existing) existing.items.push(item);
    else map.set(key, { ownerLabel, ownerRoleLabel, items: [item] });
  }
  return [...map.values()];
}

export function buildGroupedDocumentRequestBody(input: {
  customerName: string;
  opportunityReference: string;
  product: string;
  uploadUrl?: string;
  dueDateLabel?: string;
  blocks: GroupedDocumentRequestBlock[];
}): string {
  const sections = input.blocks.map((block) => {
    const lines = block.items.map((item) => `  • ${item.label}`).join("\n");
    return `${block.ownerRoleLabel} — ${block.ownerLabel}\n${lines}`;
  });
  const due = input.dueDateLabel ? `\nPlease share by ${input.dueDateLabel}.\n` : "\n";
  const link = input.uploadUrl
    ? `\nSecure upload link (this request only):\n${input.uploadUrl}\n`
    : "";
  return `Dear ${input.customerName}

We need the following documents for ${input.product} (${input.opportunityReference}).
Documents are grouped by owner.
${due}${sections.join("\n\n")}
${link}
This message is a draft. Nothing has been sent yet.`;
}

export function selectedRequestRefs(items: DocumentRequestItemState[]): string[] {
  return items.map((item) => getDocumentRequestRef(item)).filter(Boolean);
}
